import { getMarketIndices } from "@/lib/api/finnhub"

// GET /api/market — S&P 500 (SPY) / NASDAQ 100 (QQQ) / Dow Jones (DIA)
export async function GET() {
  try {
    const data = await getMarketIndices()
    if (data.length === 0) {
      return Response.json(
        { error: "Failed to fetch market data", code: "API_ERROR" },
        { status: 500 }
      )
    }
    return Response.json(data)
  } catch (err) {
    console.error("[GET /api/market]", err)
    return Response.json(
      { error: "Failed to fetch market data", code: "API_ERROR" },
      { status: 500 }
    )
  }
}
