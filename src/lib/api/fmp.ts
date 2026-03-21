import axios from "axios"

const BASE_URL = "https://financialmodelingprep.com/api"

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
  stockExchange: string
  exchangeShortName: string
}

export interface FmpProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  exchange: string
  description: string
  image: string
  website: string
  mktCap: number
  beta: number
  price: number
  changes: number
  changesPercentage: number
}

export interface FmpQuote {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number
  pe: number
  eps: number
  volume: number
  avgVolume: number
  open: number
  previousClose: number
  exchange: string
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function searchStocks(query: string): Promise<FmpSearchResult[]> {
  const { data } = await axios.get<FmpSearchResult[]>(`${BASE_URL}/v3/search`, {
    params: { query, apikey: apiKey() },
  })
  return Array.isArray(data) ? data : []
}

export async function getCompanyProfile(symbol: string): Promise<FmpProfile | null> {
  const { data } = await axios.get<FmpProfile[]>(`${BASE_URL}/v3/profile/${symbol}`, {
    params: { apikey: apiKey() },
  })
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

export async function getQuotes(symbols: string[]): Promise<FmpQuote[]> {
  if (symbols.length === 0) return []
  const joined = symbols.join(",")
  const { data } = await axios.get<FmpQuote[]>(`${BASE_URL}/v3/quote/${joined}`, {
    params: { apikey: apiKey() },
  })
  return Array.isArray(data) ? data : []
}

// 使用 ETF 作為大盤指數代理：SPY(S&P500), QQQ(NASDAQ), DIA(Dow Jones)
export async function getMarketIndices(): Promise<FmpQuote[]> {
  const { data } = await axios.get<FmpQuote[]>(`${BASE_URL}/v3/quote/SPY,QQQ,DIA`, {
    params: { apikey: apiKey() },
  })
  return Array.isArray(data) ? data : []
}
