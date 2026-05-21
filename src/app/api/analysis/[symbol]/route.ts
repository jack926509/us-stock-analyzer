import { getFinancialSnapshot, getProfile, getQuote } from "@/lib/api/finnhub"
import {
  MODEL,
  PROMPT_VERSION,
  parseRating,
  parseTargetPrice,
  runAnalysis,
} from "@/lib/analysis"
import { validateSymbol } from "@/lib/validations"
import type { AnalysisReport } from "@/types"

export const maxDuration = 60

// POST /api/analysis/[symbol] — 觸發全能型 AI 分析
// 回傳 AnalysisReport（content + rating + 目標價）；不持久化。
export async function POST(
  _req: Request,
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

    const [profile, quote, snapshot] = await Promise.all([
      getProfile(symbol),
      getQuote(symbol),
      getFinancialSnapshot(symbol),
    ])

    if (!profile && !quote) {
      return Response.json(
        { error: "Stock not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }

    const content = await runAnalysis({ symbol, profile, quote, snapshot })
    const rating = parseRating(content)
    const { low, high } = parseTargetPrice(content)

    const report: AnalysisReport & { model: string; promptVersion: string } = {
      symbol,
      content,
      rating,
      targetPriceLow: low,
      targetPriceHigh: high,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      promptVersion: PROMPT_VERSION,
    }

    return Response.json(report)
  } catch (err) {
    console.error("[POST /api/analysis]", err)
    return Response.json(
      { error: "Failed to generate analysis", code: "API_ERROR" },
      { status: 500 }
    )
  }
}
