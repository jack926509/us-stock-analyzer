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

export function StockDetailView({ symbol }: Props) {
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual")

  const { data: profile } = useQuery<FmpProfile>({
    queryKey: ["profile", symbol],
    queryFn: () =>
      fetch(`/api/profile/${symbol}`).then((r) => {
        if (!r.ok) throw new Error("Profile fetch failed")
        return r.json()
      }),
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  })

  const { data: financials, isLoading: financialsLoading } = useQuery<FinancialsData>({
    queryKey: ["financials", symbol, period],
    queryFn: () =>
      fetch(`/api/financials/${symbol}?period=${period}`).then((r) => {
        if (!r.ok) throw new Error("Financials fetch failed")
        return r.json()
      }),
    staleTime: 24 * 60 * 60 * 1000, // 24h (matches server cache)
    retry: 1,
  })

  return (
    <div className="flex flex-col bg-[#0a0e1a]">
      {/* Company Header */}
      <StockHeader
        profile={profile ?? null}
        symbol={symbol}
        price={profile?.price}
        changePercentage={profile?.changePercentage}
        change={profile?.change}
      />

      {/* Main content */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-6 py-6">
        <Tabs defaultValue="overview" className="gap-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <TabsList className="h-auto shrink-0 flex-wrap gap-1 bg-white/5 p-1">
              <TabsTrigger value="overview" className="text-xs">總覽</TabsTrigger>
              <TabsTrigger value="income" className="text-xs">損益表</TabsTrigger>
              <TabsTrigger value="balance" className="text-xs">資產負債表</TabsTrigger>
              <TabsTrigger value="cashflow" className="text-xs">現金流量表</TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">核心指標</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI 分析</TabsTrigger>
            </TabsList>

            {/* Period toggle for statement tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
              <button
                onClick={() => setPeriod("annual")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  period === "annual"
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                年度
              </button>
              <button
                onClick={() => setPeriod("quarterly")}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  period === "quarterly"
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
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

          <TabsContent value="ai">
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#00d47e]/10">
                <span className="text-xl">🤖</span>
              </div>
              <p className="text-sm font-medium text-white/60">AI 分析引擎</p>
              <p className="max-w-xs text-xs text-white/30">
                華爾街級別 AI 研究報告將在 Prompt 6 實作後顯示於此
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
