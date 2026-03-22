"use client"

import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { FmpQuote } from "@/lib/api/fmp"

// ETF 代理：SPY ≈ S&P 500, QQQ ≈ NASDAQ 100, DIA ≈ Dow Jones
const INDEX_LABELS: Record<string, string> = {
  SPY: "S&P 500 (SPY)",
  QQQ: "NASDAQ 100 (QQQ)",
  DIA: "Dow Jones (DIA)",
}

function IndexCard({ quote }: { quote: FmpQuote }) {
  const isUp = quote.changePercentage >= 0
  const label = INDEX_LABELS[quote.symbol] ?? quote.name

  return (
    <Card className="flex-1 border-black/[0.07] bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-num text-xl font-bold text-stone-900">
        {quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className={`mt-1 flex items-center gap-1 text-sm font-medium ${isUp ? "text-[#006e3f]" : "text-[#ff4757]"}`}>
        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        <span>{isUp ? "+" : ""}{quote.changePercentage.toFixed(2)}%</span>
        <span className="text-xs font-normal text-muted-foreground">
          ({isUp ? "+" : ""}{quote.change.toFixed(2)})
        </span>
      </div>
    </Card>
  )
}

function IndexCardSkeleton() {
  return (
    <Card className="flex-1 animate-pulse border-black/[0.07] bg-black/[0.04] p-4">
      <div className="h-3 w-16 rounded bg-black/[0.08]" />
      <div className="mt-2 h-6 w-28 rounded bg-black/[0.08]" />
      <div className="mt-2 h-4 w-20 rounded bg-black/[0.08]" />
    </Card>
  )
}

export function MarketOverview() {
  const { data, isLoading } = useQuery<FmpQuote[]>({
    queryKey: ["market-indices"],
    queryFn: () => fetch("/api/market").then((r) => r.json()),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const quotes = Array.isArray(data) ? data : []

  return (
    <div className="flex gap-4">
      {isLoading || quotes.length === 0
        ? [0, 1, 2].map((i) => <IndexCardSkeleton key={i} />)
        : quotes.map((q) => <IndexCard key={q.symbol} quote={q} />)}
    </div>
  )
}
