import { db } from "@/lib/db"
import { stockPrices, watchlist } from "@/lib/db/schema"
import { getCompanyProfile, getQuote } from "@/lib/api/fmp"
import { getFinnhubQuote, getFinnhubProfile } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"
import { eq, inArray } from "drizzle-orm"
import type { FmpQuote } from "@/lib/api/fmp"

// FMP 優先，失敗時 fallback 到 Finnhub
async function getQuoteWithFallback(symbol: string): Promise<FmpQuote | null> {
  const fmpQuote = await getQuote(symbol)
  if (fmpQuote && fmpQuote.price > 0) return fmpQuote
  return getFinnhubQuote(symbol)
}

// GET /api/stocks — 取得追蹤清單含最新報價
export async function GET() {
  try {
    const items = await db.select().from(watchlist)

    if (items.length === 0) {
      return Response.json([])
    }

    const symbols = items.map((item) => item.symbol)

    // Load SQLite price cache for fallback
    const cachedPrices = await db
      .select()
      .from(stockPrices)
      .where(inArray(stockPrices.symbol, symbols))
    const cacheMap = new Map(cachedPrices.map((r) => [r.symbol, r]))

    const quoteResults = await Promise.allSettled(symbols.map(getQuoteWithFallback))
    const quotes = quoteResults
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((q): q is FmpQuote => q !== null)
      .map((q) => {
        // Supplement 0/missing values from SQLite cache
        const cached = cacheMap.get(q.symbol)
        if (cached) {
          if (!q.marketCap && cached.marketCap) q.marketCap = cached.marketCap
          if (!q.yearHigh && cached.week52High) q.yearHigh = cached.week52High
          if (!q.yearLow && cached.week52Low) q.yearLow = cached.week52Low
          if (!q.pe && cached.peRatio) q.pe = cached.peRatio
        }
        return q
      })
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]))

    // 更新 stock_prices 快取
    for (const quote of quotes) {
      await db
        .insert(stockPrices)
        .values({
          symbol: quote.symbol,
          price: quote.price,
          changePercent: quote.changePercentage,
          marketCap: quote.marketCap,
          peRatio: quote.pe ?? null,
          week52High: quote.yearHigh,
          week52Low: quote.yearLow,
        })
        .onConflictDoUpdate({
          target: stockPrices.symbol,
          set: {
            price: quote.price,
            changePercent: quote.changePercentage,
            marketCap: quote.marketCap,
            peRatio: quote.pe ?? null,
            week52High: quote.yearHigh,
            week52Low: quote.yearLow,
            updatedAt: new Date().toISOString(),
          },
        })
    }

    const result = items.map((item) => ({
      ...item,
      quote: quoteMap.get(item.symbol) ?? null,
    }))

    return Response.json(result)
  } catch (err) {
    console.error("[GET /api/stocks]", err)
    return Response.json({ error: "Failed to fetch watchlist", code: "API_ERROR" }, { status: 500 })
  }
}

// POST /api/stocks — 新增追蹤標的
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { symbol?: unknown }
    const raw = typeof body.symbol === "string" ? body.symbol.trim().toUpperCase() : null

    if (!raw || !validateSymbol(raw)) {
      return Response.json({ error: "Invalid stock symbol", code: "INVALID_SYMBOL" }, { status: 400 })
    }

    // 確認是否已在清單中
    const existing = await db.select().from(watchlist).where(eq(watchlist.symbol, raw))
    if (existing.length > 0) {
      return Response.json({ error: "Stock already in watchlist", code: "API_ERROR" }, { status: 409 })
    }

    // FMP 優先取公司資訊，失敗時 fallback 到 Finnhub
    const fmpProfile = await getCompanyProfile(raw)
    let companyName = raw
    let sector: string | null = null
    let resolvedSymbol = raw

    if (fmpProfile) {
      companyName = fmpProfile.companyName
      sector = fmpProfile.sector || null
      resolvedSymbol = fmpProfile.symbol
    } else {
      const fhProfile = await getFinnhubProfile(raw)
      if (fhProfile) {
        companyName = fhProfile.name
        sector = fhProfile.finnhubIndustry || null
      } else {
        // 最後確認 Finnhub 至少能取得報價
        const quote = await getFinnhubQuote(raw)
        if (!quote) {
          return Response.json({ error: "Stock not found", code: "NOT_FOUND" }, { status: 404 })
        }
      }
    }

    const [inserted] = await db
      .insert(watchlist)
      .values({
        symbol: resolvedSymbol,
        name: companyName,
        sector,
      })
      .returning()

    return Response.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[POST /api/stocks]", err)
    return Response.json({ error: "Failed to add stock", code: "API_ERROR" }, { status: 500 })
  }
}
