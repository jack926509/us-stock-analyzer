"use client"

import { useQuery } from "@tanstack/react-query"
import { StockHeader } from "./StockHeader"
import { TradingViewWidget } from "@/components/charts/TradingViewWidget.dynamic"
import { TradingViewTechAnalysis } from "@/components/charts/TradingViewTechAnalysis.dynamic"
import { PeerComparison } from "./PeerComparison"
import { ScoreCard } from "./ScoreCard"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { NewsPanel } from "@/components/analysis/NewsPanel"
import { DeepAnalysisClient } from "@/app/stock/[symbol]/deep-analysis/DeepAnalysisClient"
import type {
  FmpProfile,
  FmpIncomeStatement,
  FmpBalanceSheet,
  FmpCashFlowStatement,
  FmpKeyMetrics,
  FmpRatios,
} from "@/lib/api/fmp"

interface FinancialsData {
  income: FmpIncomeStatement[]
  balance: FmpBalanceSheet[]
  cashflow: FmpCashFlowStatement[]
  keyMetrics: FmpKeyMetrics[]
  ratios: FmpRatios[]
}

interface Props {
  symbol: string
}

function getTVSymbol(symbol: string, exchange?: string): string {
  if (!exchange) return symbol
  const e = exchange.toUpperCase()
  if (e.includes("NASDAQ")) return `NASDAQ:${symbol}`
  if (e.includes("NYSE")) return `NYSE:${symbol}`
  if (e.includes("AMEX") || e.includes("ARCA")) return `AMEX:${symbol}`
  return symbol
}

export function StockDetailView({ symbol }: Props) {
  const { data: profile } = useQuery<FmpProfile>({
    queryKey: ["profile", symbol],
    queryFn: () =>
      fetch(`/api/profile/${symbol}`).then((r) => {
        if (!r.ok) throw new Error("Profile fetch failed")
        return r.json()
      }),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const { data: financials, isLoading: financialsLoading } = useQuery<FinancialsData>({
    queryKey: ["financials", symbol, "annual"],
    queryFn: () =>
      fetch(`/api/financials/${symbol}?period=annual`).then((r) => {
        if (!r.ok) throw new Error("Financials fetch failed")
        return r.json()
      }),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })

  const tvSymbol = getTVSymbol(symbol, profile?.exchange ?? profile?.exchangeFullName)

  return (
    <div className="animate-fade-in-up flex flex-col bg-background">
      <StockHeader
        profile={profile ?? null}
        symbol={symbol}
        price={profile?.price}
        changePercentage={profile?.changePercentage}
        change={profile?.change}
      />

      {/* TradingView Chart + Technical Analysis */}
      <div className="mx-auto w-full max-w-screen-2xl px-6 pt-5">
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <TradingViewWidget symbol={tvSymbol} height={500} />
          </div>
          <div className="hidden w-[320px] shrink-0 xl:block">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
              技術分析
            </div>
            <TradingViewTechAnalysis symbol={tvSymbol} width={320} height={490} />
          </div>
        </div>
        <div className="mt-4 xl:hidden">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            技術分析
          </div>
          <TradingViewTechAnalysis symbol={tvSymbol} width="100%" height={425} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-10 px-6 py-8">
        {/* 同業比較 + 綜合評分 */}
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-lg font-semibold text-stone-900">
              同業比較與評分
            </h2>
            <p className="text-xs text-stone-500">
              與同產業公司關鍵指標對比，自動換算 0-10 分綜合評分
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <ErrorBoundary>
              <PeerComparison symbol={symbol} />
            </ErrorBoundary>
            <div className="space-y-6">
              <ErrorBoundary>
                <ScoreCard
                  keyMetrics={financials?.keyMetrics ?? []}
                  ratios={financials?.ratios ?? []}
                  income={financials?.income}
                  sector={profile?.sector}
                  isLoading={financialsLoading}
                />
              </ErrorBoundary>
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  近期新聞
                </h3>
                <ErrorBoundary>
                  <NewsPanel symbol={symbol} />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </section>

        {/* 深度分析 — 6 位大師 + 多空辯論 + 風險辯論 + 投組整合 */}
        <section>
          <ErrorBoundary>
            <DeepAnalysisClient symbol={symbol} />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  )
}
