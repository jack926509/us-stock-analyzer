import { getCompanyProfile } from "@/lib/api/fmp"
import { getFinnhubProfile, getFinnhubQuote } from "@/lib/api/finnhub"
import { validateSymbol } from "@/lib/validations"

// GET /api/profile/[symbol]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params
    const symbol = rawSymbol.toUpperCase()

    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 })
    }

    // Finnhub first — saves FMP quota for financial statements
    const [fhProfile, fhQuote] = await Promise.all([
      getFinnhubProfile(symbol),
      getFinnhubQuote(symbol),
    ])

    if (fhProfile) {
      return Response.json({
        symbol,
        companyName: fhProfile.name,
        sector: fhProfile.finnhubIndustry || "",
        industry: fhProfile.finnhubIndustry || "",
        exchange: fhProfile.exchange || "",
        exchangeFullName: fhProfile.exchange || "",
        description: "",
        image: fhProfile.logo || "",
        website: fhProfile.weburl || "",
        marketCap: (fhProfile.marketCapitalization ?? 0) * 1_000_000,
        beta: 0,
        price: fhQuote?.price ?? 0,
        change: fhQuote?.change ?? 0,
        changePercentage: fhQuote?.changePercentage ?? 0,
        country: "",
      })
    }

    // Finnhub has no data — fall back to FMP
    const fmpProfile = await getCompanyProfile(symbol)
    if (fmpProfile) {
      return Response.json(fmpProfile)
    }

    // Last resort: quote-only
    if (fhQuote) {
      return Response.json({
        symbol,
        companyName: symbol,
        sector: "",
        industry: "",
        exchange: "",
        exchangeFullName: "",
        description: "",
        image: "",
        website: "",
        marketCap: 0,
        beta: 0,
        price: fhQuote.price,
        change: fhQuote.change,
        changePercentage: fhQuote.changePercentage,
        country: "",
      })
    }

    return Response.json({ error: "Stock not found", code: "NOT_FOUND" }, { status: 404 })
  } catch (err) {
    console.error("[GET /api/profile]", err)
    return Response.json({ error: "Failed to fetch profile", code: "API_ERROR" }, { status: 500 })
  }
}
