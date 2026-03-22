import axios from "axios"
import { validateSymbol } from "@/lib/validations"

const FMP_STABLE = "https://financialmodelingprep.com/stable"
const FMP_V3 = "https://financialmodelingprep.com/api/v3"

function apiKey() {
  const key = process.env.FMP_API_KEY
  if (!key) throw new Error("FMP_API_KEY is not set")
  return key
}

export interface PeerData {
  symbol: string
  companyName: string
  marketCap: number
  price: number
  peRatio: number | null
  pbRatio: number | null
  psRatio: number | null
  evToEbitda: number | null
  roe: number | null
  grossMargin: number | null
  revenueGrowth: number | null
  sector: string
  isTarget: boolean
}

async function fetchPeerData(symbol: string): Promise<PeerData | null> {
  try {
    const [profileRes, metricsRes, ratiosRes] = await Promise.allSettled([
      axios.get<Record<string, unknown>[]>(`${FMP_STABLE}/profile`, {
        params: { symbol, apikey: apiKey() },
        timeout: 8000,
      }),
      axios.get<Record<string, unknown>[]>(`${FMP_STABLE}/key-metrics`, {
        params: { symbol, period: "annual", limit: 1, apikey: apiKey() },
        timeout: 8000,
      }),
      axios.get<Record<string, unknown>[]>(`${FMP_STABLE}/ratios`, {
        params: { symbol, period: "annual", limit: 1, apikey: apiKey() },
        timeout: 8000,
      }),
    ])

    const profileData = profileRes.status === "fulfilled" ? profileRes.value.data : null
    const profile = Array.isArray(profileData) ? profileData[0] : null
    if (!profile) return null

    const km = metricsRes.status === "fulfilled" && Array.isArray(metricsRes.value.data)
      ? metricsRes.value.data[0] ?? null : null
    const rt = ratiosRes.status === "fulfilled" && Array.isArray(ratiosRes.value.data)
      ? ratiosRes.value.data[0] ?? null : null

    function num(v: unknown): number | null {
      const n = Number(v)
      return v != null && !isNaN(n) && isFinite(n) && n !== 0 ? n : null
    }

    return {
      symbol,
      companyName: String(profile.companyName ?? symbol),
      marketCap: Number(profile.marketCap ?? 0),
      price: Number(profile.price ?? 0),
      sector: String(profile.sector ?? ""),
      // stable API field names (no TTM suffix)
      peRatio: num(km?.peRatio) ?? num(rt?.priceToEarningsRatio),
      pbRatio: num(km?.pbRatio) ?? num(rt?.priceToBookRatioTTM),
      psRatio: num(km?.psRatio) ?? num(rt?.priceToSalesRatioTTM),
      evToEbitda: num(km?.evToEbitda) ?? num(rt?.enterpriseValueMultiple),
      roe: num(km?.roe) ?? num(rt?.returnOnEquity),
      grossMargin: num(rt?.grossProfitMargin),
      revenueGrowth: null, // not available in stable annual endpoints
      isTarget: false,
    }
  } catch {
    return null
  }
}

// Fallback: sector-based screener when v4/stock_peers is unavailable
async function getPeersFromScreener(
  sector: string,
  exchange: string,
  targetSymbol: string,
  targetMarketCap: number,
): Promise<string[]> {
  try {
    interface ScreenerItem { symbol: string; marketCap: number; isEtf: boolean }
    const exchangeShort = exchange.includes("NASDAQ") ? "NASDAQ"
      : exchange.includes("NYSE") ? "NYSE"
      : exchange
    const { data } = await axios.get<ScreenerItem[]>(`${FMP_V3}/stock-screener`, {
      params: {
        sector,
        exchange: exchangeShort,
        isEtf: false,
        limit: 30,
        apikey: apiKey(),
      },
      timeout: 8000,
    })
    if (!Array.isArray(data) || data.length === 0) return []

    return data
      .filter((s) => s.symbol !== targetSymbol && !s.isEtf && s.marketCap > 0)
      .sort((a, b) => {
        const diffA = Math.abs(Math.log(a.marketCap / Math.max(targetMarketCap, 1)))
        const diffB = Math.abs(Math.log(b.marketCap / Math.max(targetMarketCap, 1)))
        return diffA - diffB
      })
      .slice(0, 5)
      .map((s) => s.symbol)
  } catch {
    return []
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol" }, { status: 400 })
    }

    // Fetch target profile first
    let targetSector = ""
    let targetExchange = ""
    let targetMarketCap = 0
    try {
      const { data } = await axios.get<Record<string, unknown>[]>(`${FMP_STABLE}/profile`, {
        params: { symbol, apikey: apiKey() },
        timeout: 8000,
      })
      const p = Array.isArray(data) ? data[0] : null
      if (p) {
        targetSector = String(p.sector ?? "")
        targetExchange = String(p.exchange ?? p.exchangeFullName ?? "")
        targetMarketCap = Number(p.marketCap ?? 0)
      }
    } catch { /* ignore */ }

    // Try FMP v4 peers first
    let peerSymbols: string[] = []
    try {
      const { data } = await axios.get<Array<{ peersList: string[] }>>(
        `https://financialmodelingprep.com/api/v4/stock_peers`,
        { params: { symbol, apikey: apiKey() }, timeout: 8000 }
      )
      if (Array.isArray(data) && data[0]?.peersList) {
        peerSymbols = data[0].peersList.slice(0, 5)
      }
    } catch { /* may not be available on free tier */ }

    // Fallback: use sector screener
    if (peerSymbols.length === 0 && targetSector) {
      peerSymbols = await getPeersFromScreener(targetSector, targetExchange, symbol, targetMarketCap)
    }

    const allSymbols = [symbol, ...peerSymbols.filter((s) => s !== symbol)].slice(0, 6)
    const results = await Promise.all(allSymbols.map((s) => fetchPeerData(s)))
    const peers = results.filter(Boolean) as PeerData[]

    if (peers.length > 0) peers[0].isTarget = true

    return Response.json(peers)
  } catch (err) {
    console.error("[GET /api/peers]", err)
    return Response.json({ error: "Failed to fetch peers" }, { status: 500 })
  }
}
