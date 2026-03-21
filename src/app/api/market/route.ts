import { getMarketIndices } from "@/lib/api/fmp"

// GET /api/market — S&P 500, NASDAQ, DOW 即時報價
export async function GET() {
  try {
    const data = await getMarketIndices()
    return Response.json(data)
  } catch (err) {
    console.error("[GET /api/market]", err)
    return Response.json({ error: "Failed to fetch market data", code: "API_ERROR" }, { status: 500 })
  }
}
