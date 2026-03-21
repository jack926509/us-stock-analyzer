import Anthropic from "@anthropic-ai/sdk"
import { db } from "@/lib/db"
import { analysisReports } from "@/lib/db/schema"
import { validateSymbol } from "@/lib/validations"
import { ANALYST_SYSTEM_PROMPT, buildUserPrompt, PROMPT_VERSION } from "@/config/analyst-prompt"
import { eq, desc } from "drizzle-orm"
import { getAVIncomeStatements, getAVBalanceSheets, getAVCashFlowStatements, getAVOverview } from "@/lib/api/alphavantage"
import { getCompanyProfile } from "@/lib/api/fmp"
import { getFinnhubProfile, getFinnhubQuote } from "@/lib/api/finnhub"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Data Builders ────────────────────────────────────────────────────────────

function fmtB(n: number) {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + "T"
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B"
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M"
  return n.toFixed(0)
}

async function buildFinancialSummary(symbol: string): Promise<string> {
  const [income, cashflow, balance] = await Promise.all([
    getAVIncomeStatements(symbol, "annual", 3),
    getAVCashFlowStatements(symbol, "annual", 3),
    getAVBalanceSheets(symbol, "annual", 3),
  ])

  if (!income.length) return "（無法取得財務數據）"

  const lines: string[] = []
  for (let i = 0; i < Math.min(3, income.length); i++) {
    const inc = income[i]
    const cf = cashflow[i]
    const bal = balance[i]
    const year = inc.date.substring(0, 4)
    lines.push(
      `${year}: 營收 ${fmtB(inc.revenue)}, 毛利率 ${(inc.grossProfitRatio * 100).toFixed(1)}%, ` +
      `淨利率 ${(inc.netIncomeRatio * 100).toFixed(1)}%, 淨利 ${fmtB(inc.netIncome)}` +
      (cf ? `, FCF ${fmtB(cf.freeCashFlow)}` : "") +
      (bal ? `, 總負債 ${fmtB(bal.totalDebt)}, 現金 ${fmtB(bal.cashAndCashEquivalents)}` : "")
    )
  }
  return lines.join("\n").slice(0, 1500)
}

async function buildNewsSummary(symbol: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const res = await fetch(`${baseUrl}/api/news/${symbol}`)
    if (!res.ok) return "（無法取得新聞）"
    const news = await res.json() as Array<{ title: string; summary: string; publishedAt: string; sentiment: string }>
    if (!Array.isArray(news) || !news.length) return "（近期無重大新聞）"

    return news
      .slice(0, 10)
      .map((n, i) => {
        const date = n.publishedAt.substring(0, 10)
        const sum = n.summary.slice(0, 200)
        return `${i + 1}. [${date}][${n.sentiment}] ${n.title}\n   ${sum}`
      })
      .join("\n")
      .slice(0, 2000)
  } catch {
    return "（無法取得新聞）"
  }
}

async function buildKeyMetricsSummary(symbol: string, overviewData: Awaited<ReturnType<typeof getAVOverview>>): Promise<string> {
  if (!overviewData) return "（無法取得核心指標）"
  const km = overviewData.keyMetrics[0]
  const r = overviewData.ratios[0]
  if (!km && !r) return "（無法取得核心指標）"

  const parts: string[] = []
  if (km) {
    if (km.peRatio) parts.push(`P/E: ${km.peRatio.toFixed(1)}x`)
    if (km.pbRatio) parts.push(`P/B: ${km.pbRatio.toFixed(1)}x`)
    if (km.psRatio) parts.push(`P/S: ${km.psRatio.toFixed(1)}x`)
    if (km.evToEbitda) parts.push(`EV/EBITDA: ${km.evToEbitda.toFixed(1)}x`)
    if (km.pegRatio) parts.push(`PEG: ${km.pegRatio.toFixed(2)}`)
    if (km.dividendYield) parts.push(`Dividend Yield: ${(km.dividendYield * 100).toFixed(2)}%`)
  }
  if (r) {
    if (r.returnOnEquity) parts.push(`ROE: ${(r.returnOnEquity * 100).toFixed(1)}%`)
    if (r.returnOnAssets) parts.push(`ROA: ${(r.returnOnAssets * 100).toFixed(1)}%`)
    if (r.grossProfitMargin) parts.push(`毛利率: ${(r.grossProfitMargin * 100).toFixed(1)}%`)
    if (r.netProfitMargin) parts.push(`淨利率: ${(r.netProfitMargin * 100).toFixed(1)}%`)
    if (r.debtEquityRatio) parts.push(`D/E: ${r.debtEquityRatio.toFixed(2)}`)
    if (r.currentRatio) parts.push(`流動比率: ${r.currentRatio.toFixed(2)}`)
  }
  return parts.join(" | ").slice(0, 500)
}

function parseRating(content: string): string | null {
  const patterns = ["Strong Buy", "Strong Sell", "Buy", "Sell", "Hold"]
  for (const p of patterns) {
    if (content.includes(p)) return p
  }
  return null
}

function parseTargetPrice(content: string): { low: number | null; high: number | null } {
  // Look for patterns like "$150-$180" or "$170"
  const rangeMatch = content.match(/\$(\d+(?:\.\d+)?)\s*[-–]\s*\$(\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    return { low: parseFloat(rangeMatch[1]), high: parseFloat(rangeMatch[2]) }
  }
  const singleMatch = content.match(/目標價[：:]\s*\$(\d+(?:\.\d+)?)/)
  if (singleMatch) {
    const p = parseFloat(singleMatch[1])
    return { low: p, high: p }
  }
  return { low: null, high: null }
}

// ─── GET — list historical reports ───────────────────────────────────────────

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

    const reports = await db
      .select()
      .from(analysisReports)
      .where(eq(analysisReports.symbol, symbol))
      .orderBy(desc(analysisReports.createdAt))
      .limit(10)

    return Response.json(reports)
  } catch (err) {
    console.error("[GET /api/analysis]", err)
    return Response.json({ error: "Failed to fetch reports", code: "API_ERROR" }, { status: 500 })
  }
}

// ─── POST — generate new analysis (streaming) ────────────────────────────────

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  if (!validateSymbol(symbol)) {
    return Response.json({ error: "Invalid symbol", code: "INVALID_SYMBOL" }, { status: 400 })
  }

  // Collect all context data in parallel
  const [fmpProfile, overviewData, financialSummary] = await Promise.all([
    getCompanyProfile(symbol).catch(() => null),
    getAVOverview(symbol).catch(() => null),
    buildFinancialSummary(symbol),
  ])

  // Profile fallback
  let companyName = symbol
  let price = 0
  let marketCap = "N/A"
  let pe: number | null = null
  let yearHigh = 0
  let yearLow = 0

  if (fmpProfile) {
    companyName = fmpProfile.companyName
    price = fmpProfile.price
    marketCap = fmpProfile.marketCap > 0 ? `$${(fmpProfile.marketCap / 1e9).toFixed(1)}B` : "N/A"
  } else {
    const fhProfile = await getFinnhubProfile(symbol).catch(() => null)
    if (fhProfile) companyName = fhProfile.name
    const quote = await getFinnhubQuote(symbol).catch(() => null)
    if (quote) {
      price = quote.price
      yearHigh = quote.yearHigh
      yearLow = quote.yearLow
    }
  }

  if (overviewData?.keyMetrics[0]) {
    pe = overviewData.keyMetrics[0].peRatio || null
  }

  const [keyMetricsSummary, newsSummary] = await Promise.all([
    buildKeyMetricsSummary(symbol, overviewData),
    buildNewsSummary(symbol),
  ])

  const range52w = yearHigh && yearLow
    ? `$${yearLow.toFixed(2)} – $${yearHigh.toFixed(2)}`
    : "N/A"

  const userPrompt = buildUserPrompt({
    symbol,
    companyName,
    financialSummary,
    keyMetricsSummary,
    newsSummary,
    price,
    marketCap,
    pe,
    range52w,
  })

  let fullContent = ""

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        const claudeStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: ANALYST_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        })

        for await (const chunk of claudeStream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const text = chunk.delta.text
            fullContent += text
            controller.enqueue(encoder.encode(text))
          }
        }

        // Save to DB after full response received
        const rating = parseRating(fullContent)
        const { low, high } = parseTargetPrice(fullContent)

        await db.insert(analysisReports).values({
          symbol,
          content: fullContent,
          rating,
          targetPriceLow: low,
          targetPriceHigh: high,
          modelVersion: "claude-sonnet-4-6",
          promptVersion: PROMPT_VERSION,
        })
      } catch (err) {
        console.error("[POST /api/analysis stream]", err)
        controller.enqueue(encoder.encode("\n\n⚠️ 分析生成過程中發生錯誤，請稍後重試。"))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  })
}
