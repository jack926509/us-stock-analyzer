import { getPeers, getQuotes, getProfile } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()
    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 })
    }
    const peers = await getPeers(symbol)
    if (peers.length === 0) return Response.json([])

    // 抓報價與簡介，給前端做 mini table
    const [quotes, ...profiles] = await Promise.all([
      getQuotes(peers),
      ...peers.map((s) => getProfile(s)),
    ])
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]))
    const data = peers.map((sym, i) => {
      const q = quoteMap.get(sym)
      const p = profiles[i]
      return {
        symbol: sym,
        name: p?.companyName ?? sym,
        price: q?.price ?? null,
        changePercentage: q?.changePercentage ?? null,
        marketCap: q?.marketCap ?? p?.marketCap ?? null,
      }
    })
    return Response.json(data)
  } catch (err) {
    console.error("[GET /api/peers]", err)
    return Response.json({ error: "Failed to fetch peers", code: "API_ERROR" }, { status: 500 })
  }
}
