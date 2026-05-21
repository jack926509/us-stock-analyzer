// Finnhub 為 MVP 唯一資料來源
// 免費額度：60 req/分鐘
// 端點分布：/quote · /stock/profile2 · /stock/metric · /search · /stock/financials-reported

import axios from "axios"
import type { Quote, Profile } from "@/types"

const BASE_URL = "https://finnhub.io/api/v1"

function apiKey() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error("FINNHUB_API_KEY is not set")
  return key
}

// ─── Raw response shapes ─────────────────────────────────────────────────────

interface FinnhubQuoteRaw {
  c: number  // current price
  d: number  // change
  dp: number // change percent
  h: number  // day high
  l: number  // day low
  o: number  // open
  pc: number // previous close
  t: number  // timestamp
}

interface FinnhubProfileRaw {
  name: string
  ticker: string
  exchange: string
  finnhubIndustry: string
  marketCapitalization: number // 單位：百萬美元
  logo: string
  weburl: string
  country: string
}

interface FinnhubMetricRaw {
  metric: Record<string, number | null | undefined>
}

interface FinnhubSearchRaw {
  count: number
  result: Array<{
    description: string
    displaySymbol: string
    symbol: string
    type: string
  }>
}

// ─── Quote (含 metric 補齊 52W / P/E) ─────────────────────────────────────────

export async function getQuote(symbol: string): Promise<Quote | null> {
  try {
    const [quoteRes, metricRes, profileRes] = await Promise.allSettled([
      axios.get<FinnhubQuoteRaw>(`${BASE_URL}/quote`, {
        params: { symbol, token: apiKey() },
        timeout: 8000,
      }),
      axios.get<FinnhubMetricRaw>(`${BASE_URL}/stock/metric`, {
        params: { symbol, metric: "all", token: apiKey() },
        timeout: 8000,
      }),
      axios.get<FinnhubProfileRaw>(`${BASE_URL}/stock/profile2`, {
        params: { symbol, token: apiKey() },
        timeout: 8000,
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
      change: quote.d,
      changePercentage: quote.dp,
      dayLow: quote.l,
      dayHigh: quote.h,
      yearHigh: Number(metric?.["52WeekHigh"] ?? 0),
      yearLow: Number(metric?.["52WeekLow"] ?? 0),
      marketCap: profile?.marketCapitalization
        ? profile.marketCapitalization * 1_000_000
        : 0,
      open: quote.o,
      previousClose: quote.pc,
      pe: Number(metric?.peTTM ?? metric?.peAnnual ?? 0) || undefined,
      exchange: profile?.exchange ?? "",
    }
  } catch {
    return null
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile(symbol: string): Promise<Profile | null> {
  try {
    const [profileRes, quoteRes] = await Promise.all([
      axios.get<FinnhubProfileRaw>(`${BASE_URL}/stock/profile2`, {
        params: { symbol, token: apiKey() },
        timeout: 8000,
      }),
      axios.get<FinnhubQuoteRaw>(`${BASE_URL}/quote`, {
        params: { symbol, token: apiKey() },
        timeout: 8000,
      }),
    ])

    const p = profileRes.data
    const q = quoteRes.data
    if (!p?.ticker) return null

    return {
      symbol: p.ticker,
      companyName: p.name,
      sector: p.finnhubIndustry || "",
      industry: p.finnhubIndustry || "",
      exchange: p.exchange || "",
      exchangeFullName: p.exchange || "",
      image: p.logo || "",
      website: p.weburl || "",
      marketCap: (p.marketCapitalization ?? 0) * 1_000_000,
      price: q?.c ?? 0,
      change: q?.d ?? 0,
      changePercentage: q?.dp ?? 0,
      country: p.country || "",
    }
  } catch {
    return null
  }
}

// ─── Market Indices ──────────────────────────────────────────────────────────

// 三大指數 ETF — 顯示名稱（給 TickerBar / IndicesStrip 共用）
export const INDEX_NAMES: Record<string, string> = {
  SPY: "S&P 500",
  QQQ: "NASDAQ 100",
  DIA: "Dow Jones",
}

export async function getMarketIndices(): Promise<Quote[]> {
  const symbols = Object.keys(INDEX_NAMES)
  const results = await Promise.allSettled(symbols.map(getQuote))
  return results
    .map((r, i) => {
      if (r.status !== "fulfilled" || !r.value) return null
      const q = r.value
      q.name = INDEX_NAMES[symbols[i]] ?? symbols[i]
      return q
    })
    .filter((q): q is Quote => q !== null)
}

// ─── Symbol Search (含 fallback 至 symbol-only profile 查) ────────────────────

export interface SearchHit {
  symbol: string
  name: string
  currency: string
  exchange: string
  exchangeFullName: string
}

export async function searchSymbols(query: string): Promise<SearchHit[]> {
  try {
    const { data } = await axios.get<FinnhubSearchRaw>(`${BASE_URL}/search`, {
      params: { q: query, exchange: "US", token: apiKey() },
      timeout: 6000,
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

// ─── Batch Quotes（追蹤清單 / 持股用） ────────────────────────────────────────

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map(getQuote))
  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((q): q is Quote => q !== null)
}

// ─── 給 AI 分析用的精簡基本面摘要 ─────────────────────────────────────────────

export interface FinancialSnapshot {
  symbol: string
  // 估值
  peTTM: number
  peAnnual: number
  pbAnnual: number
  psTTM: number
  // 獲利能力
  roeTTM: number
  roaTTM: number
  netMarginTTM: number
  grossMarginTTM: number
  // 財務健康
  debtToEquity: number
  currentRatio: number
  // 成長
  revenueGrowth3Y: number
  epsGrowth3Y: number
  // 規模
  marketCap: number
  // 區間
  week52High: number
  week52Low: number
  dividendYield: number
}

export async function getFinancialSnapshot(symbol: string): Promise<FinancialSnapshot | null> {
  try {
    const { data } = await axios.get<FinnhubMetricRaw>(`${BASE_URL}/stock/metric`, {
      params: { symbol, metric: "all", token: apiKey() },
      timeout: 8000,
    })
    const m = data?.metric
    if (!m) return null

    const n = (v: unknown) => {
      const x = Number(v)
      return v != null && !isNaN(x) && isFinite(x) ? x : 0
    }

    return {
      symbol,
      peTTM: n(m.peTTM),
      peAnnual: n(m.peAnnual),
      pbAnnual: n(m.pbAnnual),
      psTTM: n(m.psTTM),
      roeTTM: n(m.roeTTM),
      roaTTM: n(m.roaTTM),
      netMarginTTM: n(m.netMarginTTM),
      grossMarginTTM: n(m.grossMarginTTM),
      debtToEquity: n(m["totalDebt/totalEquityAnnual"]),
      currentRatio: n(m.currentRatioAnnual),
      revenueGrowth3Y: n(m.revenueGrowth3Y),
      epsGrowth3Y: n(m.epsGrowth3Y),
      marketCap: n(m.marketCapitalization) * 1_000_000,
      week52High: n(m["52WeekHigh"]),
      week52Low: n(m["52WeekLow"]),
      dividendYield: n(m.currentDividendYieldTTM),
    }
  } catch {
    return null
  }
}
