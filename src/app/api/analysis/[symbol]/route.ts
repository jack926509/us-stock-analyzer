import Anthropic from "@anthropic-ai/sdk"
import axios from "axios"
import { db } from "@/lib/db"
import { analysisReports, financialCache } from "@/lib/db/schema"
import { validateSymbol } from "@/lib/validations"
import { ANALYST_SYSTEM_PROMPT, buildUserPrompt, PROMPT_VERSION } from "@/config/analyst-prompt"
import { eq, desc, and } from "drizzle-orm"
import {
  getIncomeStatements,
  getBalanceSheets,
  getCashFlowStatements,
  getKeyMetrics,
  getFinancialRatios,
  getQuote,
  getCompanyProfile,
} from "@/lib/api/fmp"
import { getFinnhubProfile, getFinnhubQuote } from "@/lib/api/finnhub"
import type { PeerData } from "@/app/api/peers/[symbol]/route"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── SQLite cache helper ──────────────────────────────────────────────────────

async function readCache<T>(symbol: string, reportType: string): Promise<T[]> {
  try {
    const rows = await db
      .select()
      .from(financialCache)
      .where(and(
        eq(financialCache.symbol, symbol),
        eq(financialCache.reportType, reportType),
        eq(financialCache.period, "annual"),
        eq(financialCache.fiscalYear, "list_annual"),
      ))
      .limit(1)
    if (rows.length > 0) return JSON.parse(rows[0].data) as T[]
  } catch { /* ignore */ }
  return []
}

// ─── Data Builders ────────────────────────────────────────────────────────────

function fmtB(n: number) {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + "T"
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + "B"
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M"
  return n.toFixed(0)
}

async function buildFinancialSummary(symbol: string): Promise<string> {
  let [income, cashflow, balance] = await Promise.all([
    getIncomeStatements(symbol, "annual", 3),
    getCashFlowStatements(symbol, "annual", 3),
    getBalanceSheets(symbol, "annual", 3),
  ])

  // Fallback: read from SQLite financial_cache when FMP quota exhausted
  if (!income.length) income = await readCache(symbol, "income")
  if (!cashflow.length) cashflow = await readCache(symbol, "cashflow")
  if (!balance.length) balance = await readCache(symbol, "balance")

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

const POS_KEYWORDS = /beat|record|growth|surge|gain|rise|profit|strong|upgrade|buy|exceed|outperform|launch|new|innovation|partnership|expansion/i
const NEG_KEYWORDS = /miss|fall|decline|loss|cut|downgrade|sell|weak|risk|concern|lawsuit|investigation|recall|layoff|debt|warning|disappoints/i

function classifyNewsSentiment(text: string): string {
  const pos = (text.match(POS_KEYWORDS) || []).length
  const neg = (text.match(NEG_KEYWORDS) || []).length
  if (pos > neg) return "positive"
  if (neg > pos) return "negative"
  return "neutral"
}

async function buildNewsSummary(symbol: string): Promise<string> {
  try {
    const key = process.env.FINNHUB_API_KEY
    if (!key) return "（無法取得新聞）"

    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
    const fmt = (d: Date) => d.toISOString().split("T")[0]

    const { data } = await axios.get<Array<{ headline: string; summary?: string; datetime: number; url: string }>>(
      "https://finnhub.io/api/v1/company-news",
      { params: { symbol, from: fmt(fromDate), to: fmt(toDate), token: key } }
    )

    if (!Array.isArray(data) || !data.length) return "（近期無重大新聞）"

    return data
      .filter((n) => n.headline && n.url)
      .slice(0, 10)
      .map((n, i) => {
        const date = new Date(n.datetime * 1000).toISOString().substring(0, 10)
        const summary = (n.summary ?? n.headline).slice(0, 200)
        const sentiment = classifyNewsSentiment(`${n.headline} ${n.summary ?? ""}`)
        return `${i + 1}. [${date}][${sentiment}] ${n.headline}\n   ${summary}`
      })
      .join("\n")
      .slice(0, 2000)
  } catch {
    return "（無法取得新聞）"
  }
}

async function buildKeyMetricsSummary(symbol: string): Promise<string> {
  let [kms, ratios] = await Promise.all([
    getKeyMetrics(symbol, "annual", 1).catch(() => []),
    getFinancialRatios(symbol, "annual", 1).catch(() => []),
  ])

  // Fallback: SQLite cache
  if (!kms.length) kms = await readCache(symbol, "keyMetrics")
  if (!ratios.length) ratios = await readCache(symbol, "ratios")

  const km = kms[0]
  const r = ratios[0]
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

async function buildPeerSummary(symbol: string): Promise<string> {
  try {
    const { default: axiosLib } = await import("axios")
    const FMP_STABLE = "https://financialmodelingprep.com/stable"
    const key = process.env.FMP_API_KEY
    if (!key) return "（無法取得同業數據）"

    // Fetch target peers via FMP v4
    let peerSymbols: string[] = []
    try {
      const { data } = await axiosLib.get<Array<{ peersList: string[] }>>(
        "https://financialmodelingprep.com/api/v4/stock_peers",
        { params: { symbol, apikey: key }, timeout: 6000 }
      )
      if (Array.isArray(data) && data[0]?.peersList) {
        peerSymbols = data[0].peersList.slice(0, 4)
      }
    } catch { /* ignore */ }

    const allSymbols = [symbol, ...peerSymbols.filter((s) => s !== symbol)].slice(0, 5)

    const results = await Promise.allSettled(
      allSymbols.map(async (sym): Promise<PeerData | null> => {
        try {
          const [profRes, kmRes, rtRes] = await Promise.allSettled([
            axiosLib.get<Record<string, unknown>[]>(`${FMP_STABLE}/profile`, { params: { symbol: sym, apikey: key }, timeout: 6000 }),
            axiosLib.get<Record<string, unknown>[]>(`${FMP_STABLE}/key-metrics`, { params: { symbol: sym, period: "annual", limit: 1, apikey: key }, timeout: 6000 }),
            axiosLib.get<Record<string, unknown>[]>(`${FMP_STABLE}/ratios`, { params: { symbol: sym, period: "annual", limit: 1, apikey: key }, timeout: 6000 }),
          ])
          const prof = profRes.status === "fulfilled" && Array.isArray(profRes.value.data) ? profRes.value.data[0] : null
          if (!prof) return null
          const km = kmRes.status === "fulfilled" && Array.isArray(kmRes.value.data) ? kmRes.value.data[0] : null
          const rt = rtRes.status === "fulfilled" && Array.isArray(rtRes.value.data) ? rtRes.value.data[0] : null
          const n = (v: unknown) => { const x = Number(v); return v != null && !isNaN(x) && isFinite(x) && x !== 0 ? x : null }
          return {
            symbol: sym, companyName: String(prof.companyName ?? sym),
            marketCap: Number(prof.marketCap ?? 0), price: Number(prof.price ?? 0),
            sector: String(prof.sector ?? ""), isTarget: sym === symbol,
            peRatio: n(km?.peRatio) ?? n(rt?.priceToEarningsRatio),
            pbRatio: n(km?.pbRatio), psRatio: n(km?.psRatio),
            evToEbitda: n(km?.evToEbitda) ?? n(rt?.enterpriseValueMultiple),
            roe: n(km?.roe) ?? n(rt?.returnOnEquity),
            grossMargin: n(rt?.grossProfitMargin), revenueGrowth: null,
          }
        } catch { return null }
      })
    )

    const peers = results.map((r) => r.status === "fulfilled" ? r.value : null).filter((p): p is PeerData => p !== null)
    if (!peers.length) return "（無同業數據）"

    const fmt = (v: number | null, d = 1, sfx = "x") => v != null ? v.toFixed(d) + sfx : "N/A"
    const fmtPct = (v: number | null) => v != null ? (v * 100).toFixed(1) + "%" : "N/A"
    const fmtCap = (v: number) => v >= 1e12 ? `$${(v / 1e12).toFixed(1)}T` : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : "N/A"

    const header = "公司 | 市值 | P/E | P/B | P/S | EV/EBITDA | ROE | 毛利率"
    const rows = peers.map((p) =>
      `${p.symbol}${p.isTarget ? "★" : ""} | ${fmtCap(p.marketCap)} | ${fmt(p.peRatio)} | ${fmt(p.pbRatio)} | ${fmt(p.psRatio)} | ${fmt(p.evToEbitda)} | ${fmtPct(p.roe)} | ${fmtPct(p.grossMargin)}`
    )
    return [header, ...rows].join("\n").slice(0, 800)
  } catch {
    return "（無法取得同業數據）"
  }
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

// ─── DELETE — remove a specific report ───────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: raw } = await params
    const symbol = raw.toUpperCase()
    if (!validateSymbol(symbol)) {
      return Response.json({ error: "Invalid symbol" }, { status: 400 })
    }

    const url = new URL(req.url)
    const id = parseInt(url.searchParams.get("id") ?? "")
    if (isNaN(id)) {
      return Response.json({ error: "Invalid id" }, { status: 400 })
    }

    await db
      .delete(analysisReports)
      .where(and(eq(analysisReports.id, id), eq(analysisReports.symbol, symbol)))

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/analysis]", err)
    return Response.json({ error: "Failed to delete report" }, { status: 500 })
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

  // Rate limiting is handled by middleware.ts (3 POST requests / 60s per IP)

  // Collect all context data in parallel (all from FMP — no Alpha Vantage)
  const [fmpProfile, fmpQuote, financialSummary, keyMetricsSummary, newsSummary, peerSummary] = await Promise.all([
    getCompanyProfile(symbol).catch(() => null),
    getQuote(symbol).catch(() => null),
    buildFinancialSummary(symbol),
    buildKeyMetricsSummary(symbol),
    buildNewsSummary(symbol),
    buildPeerSummary(symbol),
  ])

  // Profile fallback to Finnhub if FMP returns nothing
  let companyName = fmpProfile?.companyName ?? symbol
  let price = fmpProfile?.price ?? fmpQuote?.price ?? 0
  const marketCap = fmpProfile?.marketCap && fmpProfile.marketCap > 0
    ? `$${(fmpProfile.marketCap / 1e9).toFixed(1)}B`
    : "N/A"
  const pe: number | null = fmpQuote?.pe ?? null
  let yearHigh = fmpQuote?.yearHigh ?? 0
  let yearLow = fmpQuote?.yearLow ?? 0

  if (!fmpProfile) {
    const fhProfile = await getFinnhubProfile(symbol).catch(() => null)
    if (fhProfile) companyName = fhProfile.name
    if (!fmpQuote) {
      const fhQuote = await getFinnhubQuote(symbol).catch(() => null)
      if (fhQuote) {
        price = fhQuote.price
        yearHigh = fhQuote.yearHigh
        yearLow = fhQuote.yearLow
      }
    }
  }

  const range52w = yearHigh && yearLow
    ? `$${yearLow.toFixed(2)} – $${yearHigh.toFixed(2)}`
    : "N/A"

  const userPrompt = buildUserPrompt({
    symbol,
    companyName,
    financialSummary,
    keyMetricsSummary,
    newsSummary,
    peerSummary,
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
      } catch (err) {
        console.error("[POST /api/analysis stream]", err)
        controller.enqueue(encoder.encode("\n\n⚠️ 分析生成過程中發生錯誤，請稍後重試。"))
      } finally {
        // Save whatever was generated — even if stream was interrupted mid-way.
        // Threshold: 100 chars to avoid storing bare error messages.
        if (fullContent.length > 100) {
          try {
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
          } catch (dbErr) {
            console.error("[POST /api/analysis] DB save failed:", dbErr)
          }
        }
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
