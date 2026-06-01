import { getFinancialSnapshot } from "@/lib/api/finnhub"
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
    const snap = await getFinancialSnapshot(symbol)
    if (!snap) {
      return Response.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 })
    }
    return Response.json(snap)
  } catch (err) {
    console.error("[GET /api/financials]", err)
    return Response.json({ error: "Failed to fetch financials", code: "API_ERROR" }, { status: 500 })
  }
}
