import { db } from "@/lib/db"
import { financialCache } from "@/lib/db/schema"
import {
  getAVIncomeStatements,
  getAVBalanceSheets,
  getAVCashFlowStatements,
  getAVOverview,
  calcHistoricalRatios,
  calcHistoricalKeyMetrics,
} from "@/lib/api/alphavantage"
import { validateSymbol } from "@/lib/validations"
import { and, eq } from "drizzle-orm"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

function isCacheValid(fetchedAt: string | null): boolean {
  if (!fetchedAt) return false
  return Date.now() - new Date(fetchedAt).getTime() < CACHE_TTL_MS
}

async function getCachedOrFetch<T>(
  symbol: string,
  reportType: string,
  period: string,
  fetcher: () => Promise<T>
): Promise<T | null> {
  const cacheKey = `list_${period}`

  const cached = await db
    .select()
    .from(financialCache)
    .where(
      and(
        eq(financialCache.symbol, symbol),
        eq(financialCache.reportType, reportType),
        eq(financialCache.period, period),
        eq(financialCache.fiscalYear, cacheKey)
      )
    )
    .limit(1)

  if (cached.length > 0 && isCacheValid(cached[0].fetchedAt)) {
    return JSON.parse(cached[0].data) as T
  }

  const fresh = await fetcher()

  // Only cache if we got data (arrays) or non-null objects
  const hasData = Array.isArray(fresh) ? (fresh as unknown[]).length > 0 : fresh != null
  if (hasData) {
    await db
      .insert(financialCache)
      .values({
        symbol,
        reportType,
        period,
        fiscalYear: cacheKey,
        data: JSON.stringify(fresh),
      })
      .onConflictDoUpdate({
        target: [
          financialCache.symbol,
          financialCache.reportType,
          financialCache.period,
          financialCache.fiscalYear,
        ],
        set: {
          data: JSON.stringify(fresh),
          fetchedAt: new Date().toISOString(),
        },
      })
  }

  return fresh
}

// GET /api/financials/[symbol]?period=annual|quarterly
export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params
    const symbol = rawSymbol.toUpperCase()

    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 })
    }

    const url = new URL(req.url)
    const period = url.searchParams.get("period") === "quarterly" ? "quarterly" : "annual"

    // Fetch all data in parallel; statements depend on period, overview is always TTM
    const [income, balance, cashflow, overviewResult] = await Promise.all([
      getCachedOrFetch(symbol, "income", period, () => getAVIncomeStatements(symbol, period, 5)),
      getCachedOrFetch(symbol, "balance", period, () => getAVBalanceSheets(symbol, period, 5)),
      getCachedOrFetch(symbol, "cashflow", period, () => getAVCashFlowStatements(symbol, period, 5)),
      getCachedOrFetch(symbol, "overview", "annual", () => getAVOverview(symbol)),
    ])

    const inc = income ?? []
    const bal = balance ?? []
    const cf = cashflow ?? []
    const { keyMetrics: baseKm, ratios: baseRatios } = overviewResult ?? { keyMetrics: [], ratios: [] }

    // Calculate historical ratios from statements
    const ratios = calcHistoricalRatios(inc, bal, baseRatios)
    const keyMetrics = calcHistoricalKeyMetrics(inc, bal, baseKm)

    return Response.json({ income: inc, balance: bal, cashflow: cf, keyMetrics, ratios })
  } catch (err) {
    console.error("[GET /api/financials]", err)
    return Response.json({ error: "Failed to fetch financial data", code: "API_ERROR" }, { status: 500 })
  }
}
