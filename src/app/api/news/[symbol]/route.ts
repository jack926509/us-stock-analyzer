import axios from "axios"
import { validateSymbol } from "@/lib/validations"
import type { NewsItem } from "@/types/index"

const FINNHUB_BASE = "https://finnhub.io/api/v1"

function apiKey() {
  const key = process.env.FINNHUB_API_KEY
  if (!key) throw new Error("FINNHUB_API_KEY is not set")
  return key
}

// Simple keyword-based sentiment
const POS_KEYWORDS = /beat|record|growth|surge|gain|rise|profit|strong|upgrade|buy|exceed|outperform|launch|new|innovation|partnership|expansion/i
const NEG_KEYWORDS = /miss|fall|decline|loss|cut|downgrade|sell|weak|risk|concern|lawsuit|investigation|recall|layoff|debt|warning|disappoints/i

function classifySentiment(text: string): "positive" | "negative" | "neutral" {
  const posHits = (text.match(POS_KEYWORDS) || []).length
  const negHits = (text.match(NEG_KEYWORDS) || []).length
  if (posHits > negHits) return "positive"
  if (negHits > posHits) return "negative"
  return "neutral"
}

function truncate(text: string, maxLen = 200): string {
  if (!text) return ""
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text
}

interface FinnhubNewsItem {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

// GET /api/news/[symbol]
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

    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30) // last 30 days

    const fmt = (d: Date) => d.toISOString().split("T")[0]

    const { data } = await axios.get<FinnhubNewsItem[]>(`${FINNHUB_BASE}/company-news`, {
      params: {
        symbol,
        from: fmt(fromDate),
        to: fmt(toDate),
        token: apiKey(),
      },
    })

    if (!Array.isArray(data)) {
      return Response.json([])
    }

    const news: NewsItem[] = data
      .filter((item) => item.headline && item.url)
      .slice(0, 20)
      .map((item) => {
        const text = `${item.headline} ${item.summary ?? ""}`
        return {
          title: item.headline,
          source: item.source ?? "Unknown",
          url: item.url,
          publishedAt: new Date(item.datetime * 1000).toISOString(),
          summary: truncate(item.summary ?? item.headline),
          sentiment: classifySentiment(text),
          relevanceScore: 1,
          imageUrl: item.image || undefined,
          tickers: item.related ? [item.related] : [symbol],
        }
      })

    return Response.json(news)
  } catch (err) {
    console.error("[GET /api/news]", err)
    return Response.json({ error: "Failed to fetch news", code: "API_ERROR" }, { status: 500 })
  }
}
