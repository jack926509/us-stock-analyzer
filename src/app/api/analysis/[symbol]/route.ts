import { getFinancialSnapshot, getProfile, getQuote } from "@/lib/api/finnhub"
import {
  MODEL,
  PROMPT_VERSION,
  parseRating,
  parseTargetPrice,
  runAnalysis,
  runAnalysisStream,
} from "@/lib/analysis"
import { validateSymbol } from "@/lib/validations"
import type { AnalysisReport } from "@/types"

export const maxDuration = 60

type AnalysisResponse = AnalysisReport & { model: string; promptVersion: string }

// 防多分頁 / 重整 race：同一 symbol 同時間只跑一次（一次 Claude call ~$0.02-0.04）
const inflight = new Map<string, Promise<AnalysisResponse>>()

class NotFoundError extends Error {}

async function generateReport(symbol: string): Promise<AnalysisResponse> {
  const [profile, quote, snapshot] = await Promise.all([
    getProfile(symbol),
    getQuote(symbol),
    getFinancialSnapshot(symbol),
  ])

  if (!profile && !quote) {
    throw new NotFoundError()
  }

  const content = await runAnalysis({ symbol, profile, quote, snapshot })
  const rating = parseRating(content)
  const { low, high } = parseTargetPrice(content)

  return {
    symbol,
    content,
    rating,
    targetPriceLow: low,
    targetPriceHigh: high,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    promptVersion: PROMPT_VERSION,
  }
}

async function streamingResponse(symbol: string): Promise<Response> {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))
      try {
        const [profile, quote, snapshot] = await Promise.all([
          getProfile(symbol),
          getQuote(symbol),
          getFinancialSnapshot(symbol),
        ])
        if (!profile && !quote) {
          send({ type: "error", code: "NOT_FOUND", message: "Stock not found" })
          controller.close()
          return
        }
        const content = await runAnalysisStream(
          { symbol, profile, quote, snapshot },
          (delta) => send({ type: "chunk", text: delta }),
        )
        const rating = parseRating(content)
        const { low, high } = parseTargetPrice(content)
        const report: AnalysisResponse = {
          symbol,
          content,
          rating,
          targetPriceLow: low,
          targetPriceHigh: high,
          generatedAt: new Date().toISOString(),
          model: MODEL,
          promptVersion: PROMPT_VERSION,
        }
        send({ type: "done", report })
      } catch (err) {
        console.error("[POST /api/analysis stream]", err)
        send({ type: "error", code: "API_ERROR", message: "Failed to generate analysis" })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  })
}

// POST /api/analysis/[symbol] — 觸發全能型 AI 分析
// 預設一次性 JSON 回傳；加 ?stream=1 進入 NDJSON 串流模式。
export async function POST(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!validateSymbol(symbol)) {
      return Response.json(
        { error: "Invalid symbol", code: "INVALID_SYMBOL" },
        { status: 400 }
      )
    }

    const wantStream = new URL(req.url).searchParams.get("stream") === "1"
    if (wantStream) {
      return streamingResponse(symbol)
    }

    let promise = inflight.get(symbol)
    if (!promise) {
      promise = generateReport(symbol).finally(() => {
        inflight.delete(symbol)
      })
      inflight.set(symbol, promise)
    }

    const report = await promise
    return Response.json(report)
  } catch (err) {
    if (err instanceof NotFoundError) {
      return Response.json(
        { error: "Stock not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }
    console.error("[POST /api/analysis]", err)
    return Response.json(
      { error: "Failed to generate analysis", code: "API_ERROR" },
      { status: 500 }
    )
  }
}
