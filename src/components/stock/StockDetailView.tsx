"use client"

import { useQuery } from "@tanstack/react-query"
import { TickerBar } from "@/components/design/TickerBar"
import { Navbar } from "@/components/dashboard/Navbar"
import { StockHeader } from "./StockHeader"
import { ChartCard } from "./ChartCard"
import { PeerComparison } from "./PeerComparison"
import { ScoreCard } from "./ScoreCard"
import { QuoteSheet } from "./QuoteSheet"
import { StockNewsList } from "./StockNewsList"
import { ErrorBoundary } from "@/components/ui/ErrorBoundary"
import { DeepAnalysisClient } from "@/app/stock/[symbol]/deep-analysis/DeepAnalysisClient"
import type {
  FmpProfile,
  FmpQuote,
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

  // 從追蹤清單抓 FmpQuote（含 OHLC / 52W / volume）— 若該股票不在 watchlist 則為 null，
  // QuoteSheet / ChartCard OHLC strip 會顯示 "—"。後續若要支援非追蹤股，需新增 /api/quote 端點。
  const { data: watchlistData } = useQuery<Array<{ symbol: string; quote: FmpQuote | null }>>({
    queryKey: ["watchlist"],
    queryFn: () => fetch("/api/stocks").then((r) => r.json()),
    staleTime: 60 * 1000,
  })
  const quote = watchlistData?.find((w) => w.symbol === symbol)?.quote ?? null

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
      <TickerBar />
      <Navbar
        breadcrumb={[
          { label: "儀表板", href: "/" },
          { label: "追蹤清單", href: "/" },
          { label: symbol },
        ]}
      />

      <StockHeader
        profile={profile ?? null}
        symbol={symbol}
        price={quote?.price ?? profile?.price}
        changePercentage={quote?.changePercentage ?? profile?.changePercentage}
        change={quote?.change ?? profile?.change}
      />

      <main className="flex-1 px-4 pb-12 pt-5 sm:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-5">
            <ChartCard tvSymbol={tvSymbol} quote={quote ?? undefined} />
            <ErrorBoundary>
              <PeerComparison symbol={symbol} />
            </ErrorBoundary>
            <ErrorBoundary>
              <DeepAnalysisClient symbol={symbol} />
            </ErrorBoundary>
          </div>
          <aside className="flex flex-col gap-5">
            <ErrorBoundary>
              <ScoreCard
                keyMetrics={financials?.keyMetrics ?? []}
                ratios={financials?.ratios ?? []}
                income={financials?.income}
                sector={profile?.sector}
                isLoading={financialsLoading}
              />
            </ErrorBoundary>
            <QuoteSheet profile={profile ?? null} quote={quote ?? null} />
            <ErrorBoundary>
              <StockNewsList symbol={symbol} />
            </ErrorBoundary>
          </aside>
        </div>
      </main>
    </div>
  )
}
