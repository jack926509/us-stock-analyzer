import { searchStocks } from "@/lib/api/fmp"
import type { NextRequest } from "next/server"

// GET /api/stocks/search?q=apple — 搜尋股票（供 AddStockDialog 使用）
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim()

  if (!query || query.length < 1) {
    return Response.json([])
  }

  try {
    const results = await searchStocks(query)
    // 只回傳前 10 筆，且限制美股交易所
    const filtered = results
      .filter((r) => ["NASDAQ", "NYSE", "AMEX", "NYSE ARCA", "NYSE MKT"].includes(r.exchange))
      .slice(0, 10)
    return Response.json(filtered)
  } catch (err) {
    console.error("[GET /api/stocks/search]", err)
    return Response.json({ error: "Search failed", code: "API_ERROR" }, { status: 500 })
  }
}
