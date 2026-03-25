import { getMarketIndices } from "@/lib/api/fmp"
import { getFinnhubMarketIndices } from "@/lib/api/finnhub"

// GET /api/market — S&P 500 (SPY) / NASDAQ 100 (QQQ) / Dow Jones (DIA)
// Finnhub 優先（無每日上限，確保三大指數都有數據）
// FMP 僅在 Finnhub 完全失敗時作 fallback
export async function GET() {
  try {
    const data = await getFinnhubMarketIndices()
    if (data.length >= 3) return Response.json(data)
  } catch {
    // fall through to FMP
  }

  try {
    const data = await getMarketIndices()
    if (data.length > 0) return Response.json(data)
  } catch { /* ignore */ }

  console.error("[GET /api/market] both sources failed")
  return Response.json({ error: "Failed to fetch market data", code: "API_ERROR" }, { status: 500 })
}
