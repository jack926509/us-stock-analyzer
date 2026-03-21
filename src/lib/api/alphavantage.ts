import axios from "axios"
import type {
  FmpIncomeStatement,
  FmpBalanceSheet,
  FmpCashFlowStatement,
  FmpKeyMetrics,
  FmpRatios,
} from "./fmp"

const BASE_URL = "https://www.alphavantage.co/query"

function apiKey() {
  const key = process.env.ALPHA_VANTAGE_KEY
  if (!key) throw new Error("ALPHA_VANTAGE_KEY is not set")
  return key
}

// Parse AV string values — AV returns "None" for null
function num(v: unknown): number {
  if (v == null || v === "None" || v === "") return 0
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// ─── Income Statement ─────────────────────────────────────────────────────────

interface AVIncomeReport {
  fiscalDateEnding: string
  reportedCurrency: string
  grossProfit: string
  totalRevenue: string
  costOfRevenue: string
  operatingIncome: string
  operatingExpenses: string
  netIncome: string
  ebitda: string
  [key: string]: string
}

export async function getAVIncomeStatements(
  symbol: string,
  period = "annual",
  limit = 5
): Promise<FmpIncomeStatement[]> {
  try {
    const { data } = await axios.get<{ annualReports: AVIncomeReport[]; quarterlyReports: AVIncomeReport[] }>(
      BASE_URL,
      { params: { function: "INCOME_STATEMENT", symbol, apikey: apiKey() } }
    )
    const reports = period === "quarterly" ? data.quarterlyReports : data.annualReports
    if (!Array.isArray(reports)) return []

    return reports.slice(0, limit).map((r) => {
      const revenue = num(r.totalRevenue)
      const grossProfit = num(r.grossProfit)
      const operatingIncome = num(r.operatingIncome)
      const netIncome = num(r.netIncome)
      return {
        date: r.fiscalDateEnding,
        symbol,
        reportedCurrency: r.reportedCurrency ?? "USD",
        revenue,
        costOfRevenue: num(r.costOfRevenue),
        grossProfit,
        grossProfitRatio: revenue ? grossProfit / revenue : 0,
        operatingExpenses: num(r.operatingExpenses),
        operatingIncome,
        operatingIncomeRatio: revenue ? operatingIncome / revenue : 0,
        netIncome,
        netIncomeRatio: revenue ? netIncome / revenue : 0,
        eps: 0,
        epsDiluted: 0,
        ebitda: num(r.ebitda),
        weightedAverageShsOut: 0,
      }
    })
  } catch {
    return []
  }
}

// ─── Balance Sheet ─────────────────────────────────────────────────────────────

interface AVBalanceReport {
  fiscalDateEnding: string
  totalAssets: string
  totalLiabilities: string
  totalShareholderEquity: string
  cashAndCashEquivalentsAtCarryingValue: string
  cashAndShortTermInvestments: string
  inventory: string
  shortLongTermDebtTotal: string
  longTermDebt: string
  retainedEarnings: string
  goodwill: string
  [key: string]: string
}

export async function getAVBalanceSheets(
  symbol: string,
  period = "annual",
  limit = 5
): Promise<FmpBalanceSheet[]> {
  try {
    const { data } = await axios.get<{ annualReports: AVBalanceReport[]; quarterlyReports: AVBalanceReport[] }>(
      BASE_URL,
      { params: { function: "BALANCE_SHEET", symbol, apikey: apiKey() } }
    )
    const reports = period === "quarterly" ? data.quarterlyReports : data.annualReports
    if (!Array.isArray(reports)) return []

    return reports.slice(0, limit).map((r) => ({
      date: r.fiscalDateEnding,
      symbol,
      totalAssets: num(r.totalAssets),
      totalLiabilities: num(r.totalLiabilities),
      totalStockholdersEquity: num(r.totalShareholderEquity),
      cashAndCashEquivalents: num(r.cashAndCashEquivalentsAtCarryingValue),
      shortTermInvestments: num(r.shortTermInvestments ?? r.cashAndShortTermInvestments),
      inventory: num(r.inventory),
      totalDebt: num(r.shortLongTermDebtTotal),
      longTermDebt: num(r.longTermDebt),
      retainedEarnings: num(r.retainedEarnings),
      goodwill: num(r.goodwill),
    }))
  } catch {
    return []
  }
}

// ─── Cash Flow Statement ──────────────────────────────────────────────────────

interface AVCashFlowReport {
  fiscalDateEnding: string
  operatingCashflow: string
  capitalExpenditures: string
  dividendPayoutCommonStock: string
  paymentsForRepurchaseOfCommonStock: string
  cashflowFromInvestment: string
  cashflowFromFinancing: string
  [key: string]: string
}

export async function getAVCashFlowStatements(
  symbol: string,
  period = "annual",
  limit = 5
): Promise<FmpCashFlowStatement[]> {
  try {
    const { data } = await axios.get<{ annualReports: AVCashFlowReport[]; quarterlyReports: AVCashFlowReport[] }>(
      BASE_URL,
      { params: { function: "CASH_FLOW", symbol, apikey: apiKey() } }
    )
    const reports = period === "quarterly" ? data.quarterlyReports : data.annualReports
    if (!Array.isArray(reports)) return []

    return reports.slice(0, limit).map((r) => {
      const operatingCashFlow = num(r.operatingCashflow)
      const capitalExpenditure = num(r.capitalExpenditures)
      return {
        date: r.fiscalDateEnding,
        symbol,
        operatingCashFlow,
        capitalExpenditure: -Math.abs(capitalExpenditure), // capex is usually negative
        freeCashFlow: operatingCashFlow - Math.abs(capitalExpenditure),
        dividendsPaid: -Math.abs(num(r.dividendPayoutCommonStock)),
        commonStockRepurchased: -Math.abs(num(r.paymentsForRepurchaseOfCommonStock)),
        netCashUsedForInvestingActivites: num(r.cashflowFromInvestment),
        netCashUsedProvidedByFinancingActivities: num(r.cashflowFromFinancing),
      }
    })
  } catch {
    return []
  }
}

// ─── Overview (Key Metrics + Ratios from current TTM data) ───────────────────

interface AVOverview {
  PERatio: string
  PEGRatio: string
  PriceToBookRatio: string
  PriceToSalesRatioTTM: string
  EVToEBITDA: string
  EVToRevenue: string
  DividendYield: string
  EPS: string
  DilutedEPSTTM: string
  ReturnOnAssetsTTM: string
  ReturnOnEquityTTM: string
  ProfitMargin: string
  OperatingMarginTTM: string
  GrossProfitTTM: string
  RevenueTTM: string
  Beta: string
  MarketCapitalization: string
  QuarterlyEarningsGrowthYOY: string
  QuarterlyRevenueGrowthYOY: string
  LatestQuarter: string
  [key: string]: string
}

export async function getAVOverview(symbol: string): Promise<{
  keyMetrics: FmpKeyMetrics[]
  ratios: FmpRatios[]
  overview: AVOverview | null
} | null> {
  try {
    const { data } = await axios.get<AVOverview>(BASE_URL, {
      params: { function: "OVERVIEW", symbol, apikey: apiKey() },
    })

    if (!data.Symbol) return null

    const date = data.LatestQuarter ?? new Date().toISOString().substring(0, 10)
    const grossProfit = num(data.GrossProfitTTM)
    const revenue = num(data.RevenueTTM)
    const grossMargin = revenue ? grossProfit / revenue : 0

    const km: FmpKeyMetrics = {
      date,
      symbol,
      revenuePerShare: 0,
      netIncomePerShare: num(data.EPS),
      roe: num(data.ReturnOnEquityTTM),
      roa: num(data.ReturnOnAssetsTTM),
      roic: 0,
      debtToEquity: 0,
      currentRatio: 0,
      quickRatio: 0,
      peRatio: num(data.PERatio),
      pbRatio: num(data.PriceToBookRatio),
      psRatio: num(data.PriceToSalesRatioTTM),
      evToEbitda: num(data.EVToEBITDA),
      pegRatio: num(data.PEGRatio),
      freeCashFlowYield: 0,
      earningsYield: num(data.PERatio) ? 1 / num(data.PERatio) : 0,
      dividendYield: num(data.DividendYield),
    }

    const r: FmpRatios = {
      date,
      symbol,
      grossProfitMargin: grossMargin,
      operatingProfitMargin: num(data.OperatingMarginTTM),
      netProfitMargin: num(data.ProfitMargin),
      returnOnEquity: num(data.ReturnOnEquityTTM),
      returnOnAssets: num(data.ReturnOnAssetsTTM),
      returnOnCapitalEmployed: 0,
      debtEquityRatio: 0,
      currentRatio: 0,
      quickRatio: 0,
      interestCoverage: 0,
      priceToEarningsRatio: num(data.PERatio),
      priceToBookRatioTTM: num(data.PriceToBookRatio),
      priceToSalesRatioTTM: num(data.PriceToSalesRatioTTM),
      enterpriseValueMultiple: num(data.EVToEBITDA),
    }

    return { keyMetrics: [km], ratios: [r], overview: data }
  } catch {
    return null
  }
}

// ─── Calculate historical ratios from statements ──────────────────────────────

export function calcHistoricalRatios(
  income: FmpIncomeStatement[],
  balance: FmpBalanceSheet[],
  baseRatios: FmpRatios[]
): FmpRatios[] {
  // Build a map of balance data by year
  const balanceByYear = new Map(balance.map((b) => [b.date.substring(0, 4), b]))

  const historical = income.map((inc) => {
    const year = inc.date.substring(0, 4)
    const bal = balanceByYear.get(year)
    const roe = bal?.totalStockholdersEquity ? inc.netIncome / bal.totalStockholdersEquity : 0
    const roa = bal?.totalAssets ? inc.netIncome / bal.totalAssets : 0
    const debtEquityRatio = bal?.totalStockholdersEquity ? (bal.totalDebt ?? 0) / bal.totalStockholdersEquity : 0

    return {
      date: inc.date,
      symbol: inc.symbol,
      grossProfitMargin: inc.grossProfitRatio,
      operatingProfitMargin: inc.operatingIncomeRatio,
      netProfitMargin: inc.netIncomeRatio,
      returnOnEquity: roe,
      returnOnAssets: roa,
      returnOnCapitalEmployed: 0,
      debtEquityRatio,
      currentRatio: 0,
      quickRatio: 0,
      interestCoverage: 0,
      priceToEarningsRatio: 0,
      priceToBookRatioTTM: 0,
      priceToSalesRatioTTM: 0,
      enterpriseValueMultiple: 0,
    } as FmpRatios
  })

  // Merge: use TTM overview ratios as the latest, historical calculated for the rest
  if (baseRatios.length > 0 && historical.length > 0) {
    // Replace the most recent entry with TTM data where it's more complete
    const merged = [...historical]
    const ttm = baseRatios[0]
    merged[0] = {
      ...merged[0],
      grossProfitMargin: ttm.grossProfitMargin || merged[0].grossProfitMargin,
      operatingProfitMargin: ttm.operatingProfitMargin || merged[0].operatingProfitMargin,
      netProfitMargin: ttm.netProfitMargin || merged[0].netProfitMargin,
      returnOnEquity: ttm.returnOnEquity || merged[0].returnOnEquity,
      returnOnAssets: ttm.returnOnAssets || merged[0].returnOnAssets,
      priceToEarningsRatio: ttm.priceToEarningsRatio,
      priceToBookRatioTTM: ttm.priceToBookRatioTTM,
      priceToSalesRatioTTM: ttm.priceToSalesRatioTTM,
      enterpriseValueMultiple: ttm.enterpriseValueMultiple,
    }
    return merged
  }

  return historical.length > 0 ? historical : baseRatios
}

export function calcHistoricalKeyMetrics(
  income: FmpIncomeStatement[],
  balance: FmpBalanceSheet[],
  baseMetrics: FmpKeyMetrics[]
): FmpKeyMetrics[] {
  const balanceByYear = new Map(balance.map((b) => [b.date.substring(0, 4), b]))

  const historical = income.map((inc) => {
    const year = inc.date.substring(0, 4)
    const bal = balanceByYear.get(year)
    const roe = bal?.totalStockholdersEquity ? inc.netIncome / bal.totalStockholdersEquity : 0
    const roa = bal?.totalAssets ? inc.netIncome / bal.totalAssets : 0
    const debtToEquity = bal?.totalStockholdersEquity ? (bal.totalDebt ?? 0) / bal.totalStockholdersEquity : 0

    return {
      date: inc.date,
      symbol: inc.symbol,
      revenuePerShare: 0,
      netIncomePerShare: 0,
      roe,
      roa,
      roic: 0,
      debtToEquity,
      currentRatio: 0,
      quickRatio: 0,
      peRatio: 0,
      pbRatio: 0,
      psRatio: 0,
      evToEbitda: 0,
      pegRatio: 0,
      freeCashFlowYield: 0,
      earningsYield: 0,
      dividendYield: 0,
    } as FmpKeyMetrics
  })

  if (baseMetrics.length > 0 && historical.length > 0) {
    const ttm = baseMetrics[0]
    historical[0] = {
      ...historical[0],
      roe: ttm.roe || historical[0].roe,
      roa: ttm.roa || historical[0].roa,
      peRatio: ttm.peRatio,
      pbRatio: ttm.pbRatio,
      psRatio: ttm.psRatio,
      evToEbitda: ttm.evToEbitda,
      pegRatio: ttm.pegRatio,
      dividendYield: ttm.dividendYield,
      earningsYield: ttm.earningsYield,
    }
    return historical
  }

  return historical.length > 0 ? historical : baseMetrics
}
