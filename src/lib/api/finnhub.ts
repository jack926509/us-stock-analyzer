import axios from "axios"
import type { FmpQuote } from "./fmp"

const BASE_URL = "https://finnhub.io/api/v1"

function apiKey() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error("FINNHUB_API_KEY is not set")
  return key
}

interface FinnhubQuote {
  c: number  // current price
  d: number  // change
  dp: number // change percent
  h: number  // day high
  l: number  // day low
  o: number  // open
  pc: number // previous close
  t: number  // timestamp
}

interface FinnhubProfile {
  name: string
  ticker: string
  exchange: string
  finnhubIndustry: string
  marketCapitalization: number // in millions
  logo: string
  weburl: string
}

interface FinnhubMetricResponse {
  metric: {
    "52WeekHigh"?: number
    "52WeekLow"?: number
    peAnnual?: number
    peTTM?: number
  }
}

// ─── Quote ───────────────────────────────────────────────────────────────────

export async function getFinnhubQuote(symbol: string): Promise<FmpQuote | null> {
  try {
    // Fetch quote + metrics + profile in parallel for complete data
    const [quoteRes, metricRes, profileRes] = await Promise.allSettled([
      axios.get<FinnhubQuote>(`${BASE_URL}/quote`, {
        params: { symbol, token: apiKey() },
      }),
      axios.get<FinnhubMetricResponse>(`${BASE_URL}/stock/metric`, {
        params: { symbol, metric: "all", token: apiKey() },
      }),
      axios.get<FinnhubProfile>(`${BASE_URL}/stock/profile2`, {
        params: { symbol, token: apiKey() },
      }),
    ])

    const quote = quoteRes.status === "fulfilled" ? quoteRes.value.data : null
    if (!quote?.c) return null

    const metric = metricRes.status === "fulfilled" ? metricRes.value.data?.metric : null
    const profile = profileRes.status === "fulfilled" ? profileRes.value.data : null

    return {
      symbol,
      name: profile?.name ?? symbol,
      price: quote.c,
      changePercentage: quote.dp,
      change: quote.d,
      dayLow: quote.l,
      dayHigh: quote.h,
      yearHigh: metric?.["52WeekHigh"] ?? 0,
      yearLow: metric?.["52WeekLow"] ?? 0,
      // Finnhub marketCapitalization is in millions USD
      marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1_000_000 : 0,
      exchange: profile?.exchange ?? "",
      open: quote.o,
      previousClose: quote.pc,
      volume: 0,
      pe: metric?.peTTM ?? metric?.peAnnual ?? undefined,
    }
  } catch {
    return null
  }
}

// ─── Market Indices ───────────────────────────────────────────────────────────

const INDEX_META: Record<string, { name: string }> = {
  SPY: { name: "S&P 500 (SPY)" },
  QQQ: { name: "NASDAQ 100 (QQQ)" },
  DIA: { name: "Dow Jones (DIA)" },
}

export async function getFinnhubMarketIndices(): Promise<FmpQuote[]> {
  const symbols = ["SPY", "QQQ", "DIA"]
  const results = await Promise.allSettled(symbols.map((s) => getFinnhubQuote(s)))
  return results
    .map((r, i) => {
      if (r.status !== "fulfilled" || !r.value) return null
      const q = r.value
      q.name = INDEX_META[symbols[i]]?.name ?? symbols[i]
      return q
    })
    .filter((q): q is FmpQuote => q !== null)
}

// ─── Financial Metrics (fallback for FmpKeyMetrics + FmpRatios) ──────────────

import type { FmpKeyMetrics, FmpRatios } from "./fmp"

interface FinnhubMetricAll {
  [key: string]: number | null | undefined
}

export async function getFinnhubKeyMetrics(symbol: string): Promise<{
  keyMetrics: FmpKeyMetrics | null
  ratios: FmpRatios | null
}> {
  try {
    const { data } = await axios.get<{ metric: FinnhubMetricAll }>(`${BASE_URL}/stock/metric`, {
      params: { symbol, metric: "all", token: apiKey() },
      timeout: 8000,
    })
    const m = data?.metric
    if (!m) return { keyMetrics: null, ratios: null }

    const n = (v: unknown) => {
      const x = Number(v)
      return v != null && !isNaN(x) && isFinite(x) ? x : 0
    }
    // Finnhub margin/ratio fields are in percentage (0–100); FMP uses decimal (0–1)
    const pctToDecimal = (v: unknown) => {
      const x = Number(v)
      return v != null && !isNaN(x) && isFinite(x) ? x / 100 : 0
    }

    // Helper: try multiple key variants, return first non-zero result
    const first = (...keys: string[]) => {
      for (const k of keys) {
        const v = pctToDecimal(m[k])
        if (v !== 0) return v
      }
      return 0
    }
    const firstN = (...keys: string[]) => {
      for (const k of keys) {
        const v = n(m[k])
        if (v !== 0) return v
      }
      return 0
    }

    const keyMetrics: FmpKeyMetrics = {
      date: new Date().toISOString().slice(0, 10),
      symbol,
      revenuePerShare: firstN("revenuePerShareAnnual", "revenuePerShareTTM"),
      netIncomePerShare: firstN("epsBasicExclExtraItemsAnnual", "epsNormalizedAnnual"),
      roe: first("roeTTM", "roeAnnual"),
      roa: first("roaTTM", "roaAnnual"),
      roic: first("roiTTM", "roiAnnual"),
      debtToEquity: firstN("totalDebt/totalEquityAnnual", "ltDebt/equityAnnual"),
      currentRatio: firstN("currentRatioAnnual", "currentRatioQuarterly"),
      quickRatio: firstN("quickRatioAnnual", "quickRatioQuarterly"),
      peRatio: firstN("peTTM", "peAnnual", "peNormalizedAnnual"),
      pbRatio: firstN("pbAnnual", "pbQuarterly"),
      psRatio: firstN("psTTM", "psAnnual"),
      evToEbitda: 0,
      pegRatio: 0,
      freeCashFlowYield: 0,
      earningsYield: firstN("peTTM", "peAnnual") > 0 ? 1 / firstN("peTTM", "peAnnual") : 0,
      dividendYield: first("currentDividendYieldTTM"),
    }

    const ratios: FmpRatios = {
      date: new Date().toISOString().slice(0, 10),
      symbol,
      grossProfitMargin: first("grossMarginTTM", "grossMarginAnnual"),
      operatingProfitMargin: first("operatingMarginTTM", "operatingMarginAnnual"),
      netProfitMargin: first("netMarginTTM", "netMarginAnnual", "pretaxMarginTTM"),
      returnOnEquity: first("roeTTM", "roeAnnual"),
      returnOnAssets: first("roaTTM", "roaAnnual"),
      currentRatio: firstN("currentRatioAnnual", "currentRatioQuarterly"),
      quickRatio: firstN("quickRatioAnnual", "quickRatioQuarterly"),
      debtEquityRatio: firstN("totalDebt/totalEquityAnnual"),
      interestCoverage: firstN("netInterestCoverageAnnual", "netInterestCoverageTTM"),
      priceToEarningsRatio: firstN("peTTM", "peAnnual"),
      priceToBookRatioTTM: firstN("pbAnnual", "pbQuarterly"),
      priceToSalesRatioTTM: firstN("psTTM", "psAnnual"),
      enterpriseValueMultiple: 0,
      returnOnCapitalEmployed: first("roiTTM", "roiAnnual"),
    }

    return { keyMetrics, ratios }
  } catch {
    return { keyMetrics: null, ratios: null }
  }
}

// ─── Stock Peers (industry-level) ─────────────────────────────────────────────

export async function getFinnhubPeers(symbol: string): Promise<string[]> {
  try {
    const { data } = await axios.get<string[]>(`${BASE_URL}/stock/peers`, {
      params: { symbol, token: apiKey() },
      timeout: 6000,
    })
    return Array.isArray(data) ? data.filter((s) => s !== symbol).slice(0, 8) : []
  } catch {
    return []
  }
}

// ─── Symbol Search ────────────────────────────────────────────────────────────

interface FinnhubSearchResult {
  description: string
  displaySymbol: string
  symbol: string
  type: string
}

interface FinnhubSearchResponse {
  count: number
  result: FinnhubSearchResult[]
}

export async function searchFinnhubSymbols(query: string): Promise<Array<{
  symbol: string
  name: string
  currency: string
  exchange: string
  exchangeFullName: string
}>> {
  try {
    const { data } = await axios.get<FinnhubSearchResponse>(`${BASE_URL}/search`, {
      params: { q: query, exchange: "US", token: apiKey() },
    })
    if (!Array.isArray(data?.result)) return []
    return data.result
      .filter((r) => r.type === "Common Stock" || r.type === "ETP")
      .slice(0, 10)
      .map((r) => ({
        symbol: r.displaySymbol || r.symbol,
        name: r.description,
        currency: "USD",
        exchange: "US",
        exchangeFullName: "US Exchange",
      }))
  } catch {
    return []
  }
}

// ─── Company Profile (as fallback) ───────────────────────────────────────────

export async function getFinnhubProfile(symbol: string): Promise<FinnhubProfile | null> {
  try {
    const { data } = await axios.get<FinnhubProfile>(`${BASE_URL}/stock/profile2`, {
      params: { symbol, token: apiKey() },
    })
    return data.ticker ? data : null
  } catch {
    return null
  }
}
