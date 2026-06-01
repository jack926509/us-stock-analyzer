import { getCompanyNews } from "@/lib/api/finnhub"
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
    const news = await getCompanyNews(symbol, 7)
    return Response.json(news)
  } catch (err) {
    console.error("[GET /api/news]", err)
    return Response.json({ error: "Failed to fetch news", code: "API_ERROR" }, { status: 500 })
  }
}
