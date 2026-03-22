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
