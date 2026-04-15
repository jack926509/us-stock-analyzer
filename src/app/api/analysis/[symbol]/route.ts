import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { analysisReports } from "@/lib/db/schema"
import { validateSymbol } from "@/lib/validations"
import {
  ANALYST_SYSTEM_PROMPT,
  buildUserPrompt,
  PROMPT_VERSION,
} from "@/config/analyst-prompt"
import { eq, desc, and } from "drizzle-orm"
import { buildAnalysisContext } from "@/lib/analysis-context"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Parsers for rating and target price ─────────────────────────────────────

function parseRating(content: string): string | null {
  const patterns = ["Strong Buy", "Strong Sell", "Buy", "Sell", "Hold"]
  for (const p of patterns) {
    if (content.includes(p)) return p
  }
  return null
}

function parseTargetPrice(content: string): { low: number | null; high: number | null } {
  const rangeMatch = content.match(/\$(\d+(?:\.\d+)?)\s*[-–]\s*\$(\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    return { low: parseFloat(rangeMatch[1]), high: parseFloat(rangeMatch[2]) }
  }
  const singleMatch = content.match(/目標價[：:]\s*\$(\d+(?:\.\d+)?)/)
  if (singleMatch) {
    const p = parseFloat(singleMatch[1])
    return { low: p, high: p }
  }
  return { low: null, high: null }
}

// ─── GET — list historical reports ───────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()
    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 })
    }

    const reports = await db
      .select()
      .from(analysisReports)
      .where(eq(analysisReports.symbol, symbol))
      .orderBy(desc(analysisReports.createdAt))
      .limit(10)

    return Response.json(reports)
  } catch (err) {
    console.error("[GET /api/analysis]", err)
    return Response.json({ error: "Failed to fetch reports", code: "API_ERROR" }, { status: 500 })
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
      .delete(analysisReports)
      .where(and(eq(analysisReports.id, id), eq(analysisReports.symbol, symbol)))

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/analysis]", err)
    return Response.json({ error: "Failed to delete report" }, { status: 500 })
  }
}

// ─── POST — generate new analysis (streaming) ────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  if (!validateSymbol(symbol)) {
    return Response.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 })
  }

  // Rate limiting is handled by middleware.ts (3 POST requests / 60s per IP)

  const ctx = await buildAnalysisContext(symbol)

  const userPrompt = buildUserPrompt({
    symbol: ctx.symbol,
    companyName: ctx.companyName,
    financialSummary: ctx.financialSummary,
    keyMetricsSummary: ctx.keyMetricsSummary,
    newsSummary: ctx.newsSummary,
    peerSummary: ctx.peerSummary,
    earningsSurprises: ctx.earningsSurprises,
    analystConsensus: ctx.analystConsensus,
    insiderTrading: ctx.insiderTrading,
    price: ctx.price,
    marketCap: ctx.marketCap,
    pe: ctx.pe,
    range52w: ctx.range52w,
    week52Position: ctx.week52Position,
    macroContext: ctx.macroContext,
  })

  let fullContent = ""

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        const claudeStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: ANALYST_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text
            fullContent += text
            controller.enqueue(encoder.encode(text))
          }
        }
      } catch (err) {
        console.error("[POST /api/analysis stream]", err)
        controller.enqueue(encoder.encode("\n\n⚠️ 分析生成過程中發生錯誤，請稍後重試。"))
      } finally {
        // Save whatever was generated — even if stream was interrupted mid-way.
        // Threshold: 100 chars to avoid storing bare error messages.
        if (fullContent.length > 100) {
          try {
            const rating = parseRating(fullContent)
            const { low, high } = parseTargetPrice(fullContent)
            await db.insert(analysisReports).values({
              symbol,
              content: fullContent,
              rating,
              targetPriceLow: low,
              targetPriceHigh: high,
              modelVersion: "claude-sonnet-4-6",
              promptVersion: PROMPT_VERSION,
            })
          } catch (dbErr) {
            console.error("[POST /api/analysis] DB save failed:", dbErr)
          }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  })
}
