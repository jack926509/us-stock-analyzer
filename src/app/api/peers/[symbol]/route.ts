import axios from "axios"
import { validateSymbol } from "@/lib/validations"

const FMP_V3 = "https://financialmodelingprep.com/api/v3"
const FMP_V4 = "https://financialmodelingprep.com/api/v4"
const FMP_STABLE = "https://financialmodelingprep.com/stable"

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
      }),
      axios.get<Record<string, unknown>[]>(`${FMP_V3}/key-metrics-ttm/${symbol}`, {
        params: { apikey: apiKey() },
      }),
      axios.get<Record<string, unknown>[]>(`${FMP_V3}/ratios-ttm/${symbol}`, {
        params: { apikey: apiKey() },
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
      marketCap: Number(profile.mktCap ?? profile.marketCap ?? 0),
      price: Number(profile.price ?? 0),
      sector: String(profile.sector ?? ""),
      // key-metrics-ttm field names (FMP v3)
      peRatio: num(km?.peRatioTTM) ?? num(rt?.priceEarningsRatioTTM),
      pbRatio: num(km?.pbRatioTTM) ?? num(rt?.priceToBookRatioTTM),
      psRatio: num(km?.priceToSalesRatioTTM) ?? num(rt?.priceToSalesRatioTTM),
      evToEbitda: num(km?.enterpriseValueOverEBITDATTM) ?? num(rt?.enterpriseValueMultipleTTM),
      roe: num(km?.returnOnEquityTTM) ?? num(rt?.returnOnEquityTTM),
      grossMargin: num(km?.grossProfitMarginTTM) ?? num(rt?.grossProfitMarginTTM),
      revenueGrowth: num(km?.revenueGrowthTTM) ?? null,
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
    const { data } = await axios.get<ScreenerItem[]>(`${FMP_V3}/stock-screener`, {
      params: {
        sector,
        exchange: exchange.includes("NASDAQ") ? "NASDAQ" : exchange.includes("NYSE") ? "NYSE" : exchange,
        isEtf: false,
        limit: 30,
        apikey: apiKey(),
      },
    })
    if (!Array.isArray(data) || data.length === 0) return []

    // Sort by closest market cap to target, exclude target itself
    const candidates = data
      .filter((s) => s.symbol !== targetSymbol && !s.isEtf && s.marketCap > 0)
      .sort((a, b) => {
        const diffA = Math.abs(Math.log(a.marketCap / Math.max(targetMarketCap, 1)))
        const diffB = Math.abs(Math.log(b.marketCap / Math.max(targetMarketCap, 1)))
        return diffA - diffB
      })
      .slice(0, 5)
      .map((s) => s.symbol)

    return candidates
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

    // Fetch target profile first (needed for screener fallback)
    let targetSector = ""
    let targetExchange = ""
    let targetMarketCap = 0
    try {
      const { data } = await axios.get<Record<string, unknown>[]>(`${FMP_STABLE}/profile`, {
        params: { symbol, apikey: apiKey() },
      })
      const p = Array.isArray(data) ? data[0] : null
      if (p) {
        targetSector = String(p.sector ?? "")
        targetExchange = String(p.exchangeShortName ?? p.exchange ?? "")
        targetMarketCap = Number(p.mktCap ?? p.marketCap ?? 0)
      }
    } catch { /* ignore */ }

    // Try FMP v4 peers first
    let peerSymbols: string[] = []
    try {
      const { data } = await axios.get<Array<{ peersList: string[] }>>(
        `${FMP_V4}/stock_peers`,
        { params: { symbol, apikey: apiKey() } }
      )
      if (Array.isArray(data) && data[0]?.peersList) {
        peerSymbols = data[0].peersList.slice(0, 5)
      }
    } catch { /* may not be available on free tier */ }

    // Fallback: use sector screener if no peers found
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
