import { getQuotes } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"
import type { NextRequest } from "next/server"

// GET /api/stocks?symbols=AAPL,TSLA,NVDA
// 批次回傳指定 symbol 的最新報價，給持股與追蹤清單共用。
// Watchlist 與 Portfolio 都改由前端 localStorage 維護，後端只回報價。
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") ?? ""
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0 && validateSymbol(s))

  if (symbols.length === 0) return Response.json([])

  try {
    const quotes = await getQuotes(symbols)
    return Response.json(quotes)
  } catch (err) {
    console.error("[GET /api/stocks]", err)
    return Response.json(
      { error: "Failed to fetch quotes", code: "API_ERROR" },
      { status: 500 }
    )
  }
}
