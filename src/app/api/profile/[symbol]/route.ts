import { getProfile } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"
import type { NextRequest } from "next/server"

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/profile/[symbol]">
) {
  try {
    const { symbol: raw } = await ctx.params
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
