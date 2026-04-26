"use client"

import { useQuery } from "@tanstack/react-query"
import { Navbar } from "@/components/dashboard/Navbar"
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
    <div className="animate-fade-in-up flex min-h-screen flex-col bg-background text-foreground">
      <Navbar onRefresh={() => location.reload()} isRefreshing={false} />

      <StockHeader
        profile={profile ?? null}
        symbol={symbol}
        price={profile?.price}
        changePercentage={profile?.changePercentage}
        change={profile?.change}
      />

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-12 pt-5 sm:px-8">
        {/* Chart + tech analysis */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <TradingViewWidget symbol={tvSymbol} height={460} />
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              技術分析 · TradingView
            </div>
            <div className="rounded-xl border border-black/[0.06] bg-white p-4">
              <TradingViewTechAnalysis symbol={tvSymbol} width="100%" height={420} />
            </div>
          </div>
        </div>

        {/* Peer + Score + News */}
        <section className="mt-9">
          <h2
            className="m-0 font-serif text-xl font-semibold tracking-tight"
            style={{ letterSpacing: "-0.01em" }}
          >
            同業比較與評分
          </h2>
          <div className="mb-4 mt-0.5 text-[11px] text-muted-foreground">
            與同產業公司關鍵指標對比，自動換算 0–10 分綜合評分
          </div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
            <ErrorBoundary>
              <PeerComparison symbol={symbol} />
            </ErrorBoundary>
            <div className="flex flex-col gap-3.5">
              <ErrorBoundary>
                <ScoreCard
                  keyMetrics={financials?.keyMetrics ?? []}
                  ratios={financials?.ratios ?? []}
                  income={financials?.income}
                  sector={profile?.sector}
                  isLoading={financialsLoading}
                />
              </ErrorBoundary>
              <div className="rounded-xl border border-black/[0.06] bg-white p-4">
                <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  近期新聞
                </h3>
                <ErrorBoundary>
                  <NewsPanel symbol={symbol} />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </section>

        {/* Deep analysis */}
        <section className="mt-10">
          <ErrorBoundary>
            <DeepAnalysisClient symbol={symbol} />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  )
}
