import { searchStocks, getCompanyProfile } from "@/lib/api/fmp"
import { searchFinnhubSymbols, getFinnhubProfile } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"
import type { NextRequest } from "next/server"

// US exchange identifiers — check both exchange short code and exchangeFullName
const US_EXCHANGE_KEYWORDS = ["NASDAQ", "NYSE", "AMEX", "ARCA", "BATS", "OTC", "US"]

function isUSStock(exchange: string, exchangeFullName: string): boolean {
  const combined = `${exchange} ${exchangeFullName}`.toUpperCase()
  return US_EXCHANGE_KEYWORDS.some((kw) => combined.includes(kw))
}

// GET /api/stocks/search?q=apple — 搜尋股票（供 AddStockDialog 使用）
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim()

  if (!query || query.length < 1) {
    return Response.json([])
  }

  // ── 1. Try FMP search ────────────────────────────────────────────────────────
  try {
    const results = await searchStocks(query)
    const filtered = results
      .filter((r) => isUSStock(r.exchange ?? "", r.exchangeFullName ?? ""))
      .slice(0, 10)

    if (filtered.length > 0) return Response.json(filtered)

    // FMP returned results but none matched US filter — try direct profile
    if (results.length > 0) {
      const upper = query.toUpperCase()
      if (validateSymbol(upper)) {
        const profile = await getCompanyProfile(upper)
        if (profile && isUSStock(profile.exchange ?? "", profile.exchangeFullName ?? "")) {
          return Response.json([{
            symbol: profile.symbol,
            name: profile.companyName,
            currency: "USD",
            exchange: profile.exchange,
            exchangeFullName: profile.exchangeFullName,
          }])
        }
      }
    }
  } catch {
    // FMP unavailable — fall through to Finnhub
  }

  // ── 2. Finnhub fallback ──────────────────────────────────────────────────────
  try {
    const finnhubResults = await searchFinnhubSymbols(query)
    if (finnhubResults.length > 0) return Response.json(finnhubResults)

    // Last resort: if query looks like a valid symbol, try Finnhub profile directly
    const upper = query.toUpperCase()
    if (validateSymbol(upper)) {
      const profile = await getFinnhubProfile(upper)
      if (profile?.ticker) {
        return Response.json([{
          symbol: profile.ticker,
          name: profile.name,
          currency: "USD",
          exchange: profile.exchange || "US",
          exchangeFullName: profile.exchange || "US Exchange",
        }])
      }
    }
  } catch (err) {
    console.error("[GET /api/stocks/search] Finnhub fallback failed", err)
  }

  return Response.json([])
}
