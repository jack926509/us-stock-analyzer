"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { StockHeader } from "./StockHeader"
import { OverviewTab } from "./OverviewTab"
import { IncomeStatementTab } from "./IncomeStatementTab"
import { BalanceSheetTab } from "./BalanceSheetTab"
import { CashFlowTab } from "./CashFlowTab"
import { KeyMetricsTab } from "./KeyMetricsTab"
import { TradingViewWidget } from "@/components/charts/TradingViewWidget.dynamic"
import { TradingViewTechAnalysis } from "@/components/charts/TradingViewTechAnalysis.dynamic"
import { WallStreetAnalysis } from "@/components/analysis/WallStreetAnalysis"
import { NewsPanel } from "@/components/analysis/NewsPanel"
import { PeerComparison } from "./PeerComparison"
import { ScoreCard } from "./ScoreCard"
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

// Map FMP exchange names to TradingView exchange prefix
function getTVSymbol(symbol: string, exchange?: string): string {
  if (!exchange) return symbol
  const e = exchange.toUpperCase()
  if (e.includes("NASDAQ")) return `NASDAQ:${symbol}`
  if (e.includes("NYSE")) return `NYSE:${symbol}`
  if (e.includes("AMEX") || e.includes("ARCA")) return `AMEX:${symbol}`
  return symbol
}

export function StockDetailView({ symbol }: Props) {
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual")

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
    queryKey: ["financials", symbol, period],
    queryFn: () =>
      fetch(`/api/financials/${symbol}?period=${period}`).then((r) => {
        if (!r.ok) throw new Error("Financials fetch failed")
        return r.json()
      }),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })

  const tvSymbol = getTVSymbol(symbol, profile?.exchange ?? profile?.exchangeFullName)

  return (
    <div className="animate-fade-in-up flex flex-col bg-[#f7f3ee]">
      {/* Company Header */}
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
          {/* Main chart */}
          <div className="min-w-0 flex-1">
            <TradingViewWidget symbol={tvSymbol} height={500} />
          </div>

          {/* Technical Analysis sidebar — visible on xl screens */}
          <div className="hidden w-[320px] shrink-0 xl:block">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
              技術分析
            </div>
            <TradingViewTechAnalysis symbol={tvSymbol} width={320} height={490} />
          </div>
        </div>

        {/* Tech Analysis on smaller screens — below chart */}
        <div className="mt-4 xl:hidden">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
            技術分析
          </div>
          <TradingViewTechAnalysis symbol={tvSymbol} width="100%" height={425} />
        </div>
      </div>

      {/* Financial Data Tabs */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-6 py-6">
        <Tabs defaultValue="overview" className="gap-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <TabsList className="h-auto shrink-0 flex-wrap gap-1 bg-[#e8e3db] p-1 ring-1 ring-black/[0.06]">
              <TabsTrigger value="overview" className="text-xs">總覽</TabsTrigger>
              <TabsTrigger value="income" className="text-xs">損益表</TabsTrigger>
              <TabsTrigger value="balance" className="text-xs">資產負債表</TabsTrigger>
              <TabsTrigger value="cashflow" className="text-xs">現金流量表</TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">核心指標</TabsTrigger>
              <TabsTrigger value="peers" className="text-xs">同業比較</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI 分析</TabsTrigger>
            </TabsList>

            {/* Period toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-black/5 p-1">
              <button
                onClick={() => setPeriod("annual")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  period === "annual"
                    ? "bg-black/[0.1] text-stone-900"
                    : "text-stone-600 hover:text-stone-600"
                }`}
              >
                年度
              </button>
              <button
                onClick={() => setPeriod("quarterly")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  period === "quarterly"
                    ? "bg-black/[0.1] text-stone-900"
                    : "text-stone-600 hover:text-stone-600"
                }`}
              >
                季度
              </button>
            </div>
          </div>

          <TabsContent value="overview">
            <OverviewTab
              financials={
                financials
                  ? {
                      income: financials.income,
                      keyMetrics: financials.keyMetrics,
                      ratios: financials.ratios,
                    }
                  : undefined
              }
              isLoading={financialsLoading}
            />
          </TabsContent>

          <TabsContent value="income">
            <IncomeStatementTab data={financials?.income ?? []} isLoading={financialsLoading} />
          </TabsContent>

          <TabsContent value="balance">
            <BalanceSheetTab data={financials?.balance ?? []} isLoading={financialsLoading} />
          </TabsContent>

          <TabsContent value="cashflow">
            <CashFlowTab data={financials?.cashflow ?? []} isLoading={financialsLoading} />
          </TabsContent>

          <TabsContent value="metrics">
            <KeyMetricsTab
              keyMetrics={financials?.keyMetrics ?? []}
              ratios={financials?.ratios ?? []}
              isLoading={financialsLoading}
            />
          </TabsContent>

          <TabsContent value="peers">
            <div className="grid grid-cols-1 gap-6 py-2 xl:grid-cols-[1fr_360px]">
              {/* Peer Comparison */}
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  同業比較
                </h3>
                <PeerComparison symbol={symbol} />
              </div>

              {/* Score Card */}
              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  綜合評分
                </h3>
                <ScoreCard
                  keyMetrics={financials?.keyMetrics ?? []}
                  ratios={financials?.ratios ?? []}
                  sector={profile?.sector}
                  isLoading={financialsLoading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai">
            <div className="grid grid-cols-1 gap-6 py-2 xl:grid-cols-[1fr_360px]">
              {/* AI Analysis */}
              <WallStreetAnalysis symbol={symbol} price={profile?.price} />

              {/* News sidebar */}
              <div className="min-w-0">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  近期新聞
                </h3>
                <NewsPanel symbol={symbol} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
