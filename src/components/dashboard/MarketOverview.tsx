"use client"

import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { FmpQuote } from "@/lib/api/fmp"

const INDEX_LABELS: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "Dow Jones",
}

function IndexCard({ quote }: { quote: FmpQuote }) {
  const isUp = quote.changesPercentage >= 0
  const label = INDEX_LABELS[quote.symbol] ?? quote.name

  return (
    <Card className="flex-1 border-white/5 bg-white/[0.03] p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-white">
        {quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <div className={`mt-1 flex items-center gap-1 text-sm font-medium ${isUp ? "text-[#00d47e]" : "text-[#ff4757]"}`}>
        {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        <span>{isUp ? "+" : ""}{quote.changesPercentage.toFixed(2)}%</span>
        <span className="text-xs font-normal text-muted-foreground">
          ({isUp ? "+" : ""}{quote.change.toFixed(2)})
        </span>
      </div>
    </Card>
  )
}

function IndexCardSkeleton() {
  return (
    <Card className="flex-1 animate-pulse border-white/5 bg-white/[0.03] p-4">
      <div className="h-3 w-16 rounded bg-white/10" />
      <div className="mt-2 h-6 w-28 rounded bg-white/10" />
      <div className="mt-2 h-4 w-20 rounded bg-white/10" />
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

  return (
    <div className="flex gap-4">
      {isLoading || !data
        ? [0, 1, 2].map((i) => <IndexCardSkeleton key={i} />)
        : data.map((q) => <IndexCard key={q.symbol} quote={q} />)}
    </div>
  )
}
