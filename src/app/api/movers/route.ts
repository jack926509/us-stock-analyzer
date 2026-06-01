import { getQuotes } from "@/lib/api/finnhub"

// 固定樣本池（大型權值 + 高關注）；Finnhub 免費版無 movers endpoint，改以池內排序
const UNIVERSE = [
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO",
  "BRK.B", "JPM", "V", "MA", "JNJ", "WMT", "PG", "XOM",
  "UNH", "HD", "LLY", "ABBV", "MRK", "KO", "PEP", "COST",
  "CSCO", "NFLX", "AMD", "INTC", "ORCL", "CRM", "ADBE", "QCOM",
  "PFE", "ABT", "TMO", "DHR", "MCD", "DIS", "BAC", "WFC",
  "GS", "MS", "C", "BLK", "SPGI", "AXP", "CAT", "BA",
  "GE", "RTX",
]

// GET /api/movers — 回傳 gainers / losers / active 三組
export async function GET() {
  try {
    const quotes = await getQuotes(UNIVERSE)
    if (quotes.length === 0) {
      return Response.json({ gainers: [], losers: [], active: [] })
    }
    const enriched = quotes.filter((q) => q.price > 0)
    const sortedByChange = [...enriched].sort(
      (a, b) => b.changePercentage - a.changePercentage,
    )
    const gainers = sortedByChange.slice(0, 10)
    const losers = sortedByChange.slice(-10).reverse()
    // 用 |change| 作為「活躍度」代理（成交量資料未取，此為粗略 proxy）
    const active = [...enriched]
      .sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage))
      .slice(0, 10)

    return Response.json({ gainers, losers, active })
  } catch (err) {
    console.error("[GET /api/movers]", err)
    return Response.json(
      { error: "Failed to fetch movers", code: "API_ERROR" },
      { status: 500 }
    )
  }
}
