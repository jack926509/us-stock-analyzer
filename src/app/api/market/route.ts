import { getFinnhubMarketIndices } from "@/lib/api/finnhub"

// GET /api/market — S&P 500 (SPY) / NASDAQ 100 (QQQ) / Dow Jones (DIA) via Finnhub
export async function GET() {
  try {
    const data = await getFinnhubMarketIndices()
    return Response.json(data)
  } catch (err) {
    console.error("[GET /api/market]", err)
    return Response.json({ error: "Failed to fetch market data", code: "API_ERROR" }, { status: 500 })
  }
}
