import { searchStocks, getCompanyProfile } from "@/lib/api/fmp"
import { validateSymbol } from "@/lib/validations"
import type { NextRequest } from "next/server"

// US exchange identifiers — check both exchange short code and exchangeFullName
const US_EXCHANGE_KEYWORDS = ["NASDAQ", "NYSE", "AMEX", "ARCA", "BATS", "OTC"]

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

  try {
    const results = await searchStocks(query)
    const filtered = results
      .filter((r) => isUSStock(r.exchange ?? "", r.exchangeFullName ?? ""))
      .slice(0, 10)

    // If search returns nothing and query looks like a valid symbol, try direct profile lookup
    if (filtered.length === 0) {
      const upper = query.toUpperCase()
      if (validateSymbol(upper)) {
        const profile = await getCompanyProfile(upper)
        if (profile && isUSStock(profile.exchange ?? "", profile.exchangeFullName ?? "")) {
          filtered.push({
            symbol: profile.symbol,
            name: profile.companyName,
            currency: "USD",
            exchange: profile.exchange,
            exchangeFullName: profile.exchangeFullName,
          })
        }
      }
    }

    return Response.json(filtered)
  } catch (err) {
    console.error("[GET /api/stocks/search]", err)
    return Response.json({ error: "Search failed", code: "API_ERROR" }, { status: 500 })
  }
}
