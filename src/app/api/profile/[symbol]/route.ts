import { getProfile } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()

    if (!validateSymbol(symbol)) {
      return Response.json(
        { error: "Invalid symbol", code: "INVALID_SYMBOL" },
        { status: 400 }
      )
    }

    const profile = await getProfile(symbol)
    if (!profile) {
      return Response.json(
        { error: "Stock not found", code: "NOT_FOUND" },
        { status: 404 }
      )
    }
    return Response.json(profile)
  } catch (err) {
    console.error("[GET /api/profile]", err)
    return Response.json(
      { error: "Failed to fetch profile", code: "API_ERROR" },
      { status: 500 }
    )
  }
}
