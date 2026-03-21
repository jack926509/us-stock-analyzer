// ─── Stock & Watchlist ──────────────────────────────────────────────────────

export interface StockQuote {
  symbol: string
  name: string
  price: number
  changePercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number
  pe: number
  eps: number
  volume: number
  avgVolume: number
  open: number
  previousClose: number
  exchange: string
}

export interface CompanyProfile {
  symbol: string
  companyName: string
  sector: string
  industry: string
  exchange: string
  description: string
  image: string
  website: string
  mktCap: number
  beta: number
  price: number
  changes: number
  changesPercentage: number
}

export interface WatchlistEntry {
  symbol: string
  name: string
  sector?: string | null
  notes?: string | null
  addedAt?: string | null
}

// ─── Financial Statements ───────────────────────────────────────────────────

export interface IncomeStatement {
  date: string
  symbol: string
  reportedCurrency: string
  revenue: number
  costOfRevenue: number
  grossProfit: number
  grossProfitRatio: number
  operatingExpenses: number
  operatingIncome: number
  operatingIncomeRatio: number
  netIncome: number
  netIncomeRatio: number
  eps: number
  epsDiluted: number
  ebitda: number
  weightedAverageShsOut: number
}

export interface BalanceSheet {
  date: string
  symbol: string
  totalAssets: number
  totalLiabilities: number
  totalStockholdersEquity: number
  cashAndCashEquivalents: number
  shortTermInvestments: number
  inventory: number
  totalDebt: number
  longTermDebt: number
  retainedEarnings: number
  goodwill: number
}

export interface CashFlowStatement {
  date: string
  symbol: string
  operatingCashFlow: number
  capitalExpenditure: number
  freeCashFlow: number
  dividendsPaid: number
  commonStockRepurchased: number
  netCashUsedForInvestingActivites: number
  netCashUsedProvidedByFinancingActivities: number
}

// ─── Key Metrics & Ratios ───────────────────────────────────────────────────

export interface KeyMetrics {
  date: string
  symbol: string
  revenuePerShare: number
  netIncomePerShare: number
  roe: number
  roa: number
  roic: number
  debtToEquity: number
  currentRatio: number
  quickRatio: number
  peRatio: number
  pbRatio: number
  psRatio: number
  evToEbitda: number
  pegRatio: number
  freeCashFlowYield: number
  earningsYield: number
  dividendYield: number
}

export interface FinancialRatios {
  date: string
  symbol: string
  grossProfitMargin: number
  operatingProfitMargin: number
  netProfitMargin: number
  returnOnEquity: number
  returnOnAssets: number
  returnOnCapitalEmployed: number
  debtEquityRatio: number
  currentRatio: number
  quickRatio: number
  interestCoverage: number
  priceToEarningsRatio: number
  priceToBookRatioTTM: number
  priceToSalesRatioTTM: number
  enterpriseValueMultiple: number
  priceFairValue: number
}

// ─── News ───────────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string
  source: string
  url: string
  publishedAt: string
  summary: string
  sentiment: "positive" | "negative" | "neutral"
  relevanceScore: number
  imageUrl?: string
  tickers?: string[]
}

// ─── Analysis ───────────────────────────────────────────────────────────────

export type AnalysisRating = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell"

export interface AnalysisReport {
  id: number
  symbol: string
  content: string
  rating?: AnalysisRating | null
  targetPriceLow?: number | null
  targetPriceHigh?: number | null
  modelVersion: string
  promptVersion: string
  createdAt?: string | null
}

// ─── API Error ──────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "INVALID_SYMBOL"
  | "NOT_FOUND"
  | "API_ERROR"
  | "RATE_LIMIT"

export interface ApiError {
  error: string
  code: ApiErrorCode
}
