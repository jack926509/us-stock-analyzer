import axios from "axios"

const BASE_URL = "https://financialmodelingprep.com/stable"

function apiKey() {
  const key = process.env.FMP_API_KEY
  if (!key) throw new Error("FMP_API_KEY is not set")
  return key
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FmpSearchResult {
  symbol: string
  name: string
  currency: string
  exchangeFullName: string
  exchange: string // e.g. "NASDAQ", "NYSE"
}

export interface FmpProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  exchange: string
  exchangeFullName: string
  description: string
  image: string
  website: string
  marketCap: number
  beta: number
  price: number
  change: number
  changePercentage: number
  country: string
}

export interface FmpQuote {
  symbol: string
  name: string
  price: number
  changePercentage: number // note: stable API uses camelCase without extra 's'
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number
  exchange: string
  open: number
  previousClose: number
  volume: number
  pe?: number // from ratios-ttm, optionally merged
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchStocks(query: string): Promise<FmpSearchResult[]> {
  const { data } = await axios.get<FmpSearchResult[]>(`${BASE_URL}/search-symbol`, {
    params: { query, apikey: apiKey() },
  })
  return Array.isArray(data) ? data : []
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getCompanyProfile(symbol: string): Promise<FmpProfile | null> {
  try {
    const { data } = await axios.get<FmpProfile[]>(`${BASE_URL}/profile`, {
      params: { symbol, apikey: apiKey() },
    })
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch {
    return null
  }
}

// ─── Quote (single symbol only on free tier) ─────────────────────────────────

export async function getQuote(symbol: string): Promise<FmpQuote | null> {
  try {
    const { data } = await axios.get<FmpQuote[]>(`${BASE_URL}/quote`, {
      params: { symbol, apikey: apiKey() },
    })
    return Array.isArray(data) && data.length > 0 ? data[0] : null
  } catch {
    return null
  }
}

// Fetch multiple quotes concurrently (each is a separate API call on free tier)
export async function getQuotes(symbols: string[]): Promise<FmpQuote[]> {
  if (symbols.length === 0) return []
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)))
  return results
    .filter((r): r is PromiseFulfilledResult<FmpQuote> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value)
}

// ─── Market Indices (ETF proxies) ─────────────────────────────────────────────

export async function getMarketIndices(): Promise<FmpQuote[]> {
  // SPY ≈ S&P 500, QQQ ≈ NASDAQ 100, DIA ≈ Dow Jones
  return getQuotes(["SPY", "QQQ", "DIA"])
}
