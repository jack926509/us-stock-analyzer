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

// ─── Quote ───────────────────────────────────────────────────────────────────

export async function getFinnhubQuote(symbol: string): Promise<FmpQuote | null> {
  try {
    const { data } = await axios.get<FinnhubQuote>(`${BASE_URL}/quote`, {
      params: { symbol, token: apiKey() },
    })

    // Finnhub returns { c: 0 } when symbol not found
    if (!data.c) return null

    return {
      symbol,
      name: symbol,
      price: data.c,
      changePercentage: data.dp,
      change: data.d,
      dayLow: data.l,
      dayHigh: data.h,
      yearHigh: 0,
      yearLow: 0,
      marketCap: 0,
      exchange: "",
      open: data.o,
      previousClose: data.pc,
      volume: 0,
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
