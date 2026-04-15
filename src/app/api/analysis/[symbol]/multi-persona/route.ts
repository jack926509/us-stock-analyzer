import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { multiPersonaReports } from "@/lib/db/schema"
import { validateSymbol } from "@/lib/validations"
import { eq, desc, and } from "drizzle-orm"
import { buildAnalysisContext } from "@/lib/analysis-context"
import {
  PERSONA_CONFIGS,
  PERSONA_PROMPT_VERSION,
  PORTFOLIO_MANAGER_SYSTEM_PROMPT,
  buildPersonaUserPrompt,
  buildSynthesisPrompt,
  parsePersonaResult,
  parseSynthesis,
} from "@/config/persona-prompts"
import type {
  PersonaId,
  PersonaAnalysisResult,
  PersonaStreamEvent,
} from "@/types/personas"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = "claude-sonnet-4-6"
const PM_MAX_TOKENS = 500

// ─── GET — list historical multi-persona reports ─────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()
    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol" }, { status: 400 })
    }

    const rows = await db
      .select()
      .from(multiPersonaReports)
      .where(eq(multiPersonaReports.symbol, symbol))
      .orderBy(desc(multiPersonaReports.createdAt))
      .limit(10)

    return Response.json(rows)
  } catch (err) {
    console.error("[GET /api/analysis/multi-persona]", err)
    return Response.json({ error: "Failed to fetch reports" }, { status: 500 })
  }
}

// ─── DELETE — remove a specific report ───────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()
    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol" }, { status: 400 })
    }

    const url = new URL(req.url)
    const id = parseInt(url.searchParams.get("id") ?? "")
    if (isNaN(id)) {
      return Response.json({ error: "Invalid id" }, { status: 400 })
    }

    await db
      .delete(multiPersonaReports)
      .where(and(eq(multiPersonaReports.id, id), eq(multiPersonaReports.symbol, symbol)))

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/analysis/multi-persona]", err)
    return Response.json({ error: "Failed to delete report" }, { status: 500 })
  }
}

// ─── POST — run multi-persona analysis (SSE streaming) ───────────────────────

interface PostBody {
  personaIds?: PersonaId[]
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  if (!validateSymbol(symbol)) {
    return Response.json({ error: "Invalid symbol" }, { status: 400 })
  }

  let body: PostBody = {}
  try {
    body = (await req.json()) as PostBody
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const personaIds = body.personaIds ?? []
  if (!Array.isArray(personaIds) || personaIds.length < 2 || personaIds.length > 4) {
    return Response.json(
      { error: "personaIds must be an array of 2–4 persona IDs" },
      { status: 400 }
    )
  }

  const validIds = Object.keys(PERSONA_CONFIGS) as PersonaId[]
  const invalid = personaIds.filter((id) => !validIds.includes(id))
  if (invalid.length > 0) {
    return Response.json(
      { error: `Unknown persona IDs: ${invalid.join(", ")}` },
      { status: 400 }
    )
  }

  // Deduplicate while preserving order
  const uniquePersonaIds = Array.from(new Set(personaIds)) as PersonaId[]

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const sendEvent = (event: PersonaStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          /* stream may have been closed by client */
        }
      }

      let ctx: Awaited<ReturnType<typeof buildAnalysisContext>>
      try {
        ctx = await buildAnalysisContext(symbol)
      } catch (err) {
        console.error("[multi-persona] context build failed", err)
        sendEvent({ type: "error", message: "無法取得股票數據，請稍後再試" })
        controller.close()
        return
      }

      // Phase 1: Run N persona streams in parallel
      const collectedResults: PersonaAnalysisResult[] = []
      const collectedContents: Record<PersonaId, string> = {} as Record<PersonaId, string>

      await Promise.all(
        uniquePersonaIds.map(async (personaId) => {
          const config = PERSONA_CONFIGS[personaId]
          const userPrompt = buildPersonaUserPrompt(ctx, personaId)
          let fullContent = ""

          try {
            const claudeStream = client.messages.stream({
              model: MODEL,
              max_tokens: config.maxOutputTokens,
              system: config.systemPrompt,
              messages: [{ role: "user", content: userPrompt }],
            })

            for await (const chunk of claudeStream) {
              if (
                chunk.type === "content_block_delta" &&
                chunk.delta.type === "text_delta"
              ) {
                const text = chunk.delta.text
                fullContent += text
                sendEvent({ type: "persona_chunk", personaId, chunk: text })
              }
            }
          } catch (err) {
            console.error(`[multi-persona] ${personaId} stream failed`, err)
            sendEvent({
              type: "error",
              personaId,
              message: `${config.chineseName} 分析過程發生錯誤`,
            })
          }

          const result = parsePersonaResult(personaId, fullContent)
          collectedResults.push(result)
          collectedContents[personaId] = fullContent
          sendEvent({ type: "persona_done", personaId, result })
        })
      )

      // Phase 2: Portfolio Manager synthesis (only if we have ≥2 successful results)
      const validResults = collectedResults.filter((r) => r.content.length > 50)
      let synthContent = ""

      if (validResults.length >= 2) {
        try {
          const synthPrompt = buildSynthesisPrompt(symbol, ctx.companyName, validResults)
          const synthStream = client.messages.stream({
            model: MODEL,
            max_tokens: PM_MAX_TOKENS,
            system: PORTFOLIO_MANAGER_SYSTEM_PROMPT,
            messages: [{ role: "user", content: synthPrompt }],
          })

          for await (const chunk of synthStream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const text = chunk.delta.text
              synthContent += text
              sendEvent({ type: "synthesis_chunk", chunk: text })
            }
          }
        } catch (err) {
          console.error("[multi-persona] synthesis stream failed", err)
          sendEvent({ type: "error", message: "Portfolio Manager 仲裁過程發生錯誤" })
        }
      }

      const synthesis = parseSynthesis(synthContent, validResults)
      sendEvent({ type: "synthesis_done", synthesis })

      // Phase 3: Persist to DB
      try {
        if (validResults.length > 0) {
          await db.insert(multiPersonaReports).values({
            symbol,
            personaIds: JSON.stringify(uniquePersonaIds),
            personaResults: JSON.stringify(collectedResults),
            synthesis: JSON.stringify(synthesis),
            divergenceScore: synthesis.divergenceScore,
            finalRecommendation: synthesis.finalRecommendation,
            modelVersion: MODEL,
            promptVersion: PERSONA_PROMPT_VERSION,
          })
        }
      } catch (dbErr) {
        console.error("[multi-persona] DB save failed", dbErr)
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  })
}
