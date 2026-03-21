import { db } from "@/lib/db"
import { stockPrices, watchlist } from "@/lib/db/schema"
import { getCompanyProfile, getQuotes } from "@/lib/api/fmp"
import { validateSymbol } from "@/lib/validations"
import { eq } from "drizzle-orm"

// GET /api/stocks — 取得追蹤清單含最新報價
export async function GET() {
  try {
    const items = await db.select().from(watchlist)

    if (items.length === 0) {
      return Response.json([])
    }

    const symbols = items.map((item) => item.symbol)
    const quotes = await getQuotes(symbols)
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

    // 從 FMP 拉取公司資訊
    const profile = await getCompanyProfile(raw)
    if (!profile) {
      return Response.json({ error: "Stock not found", code: "NOT_FOUND" }, { status: 404 })
    }

    const [inserted] = await db
      .insert(watchlist)
      .values({
        symbol: profile.symbol,
        name: profile.companyName,
        sector: profile.sector || null,
      })
      .returning()

    return Response.json(inserted, { status: 201 })
  } catch (err) {
    console.error("[POST /api/stocks]", err)
    return Response.json({ error: "Failed to add stock", code: "API_ERROR" }, { status: 500 })
  }
}
