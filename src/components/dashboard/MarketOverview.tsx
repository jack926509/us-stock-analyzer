"use client"

import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { FmpQuote } from "@/lib/api/fmp"

// ETF 代理：SPY ≈ S&P 500, QQQ ≈ NASDAQ 100, DIA ≈ Dow Jones
const INDEX_META: Record<string, { short: string; full: string }> = {
  SPY: { short: "S&P 500", full: "SPY" },
  QQQ: { short: "NASDAQ 100", full: "QQQ" },
  DIA: { short: "Dow Jones", full: "DIA" },
}

function IndexRow({ quote }: { quote: FmpQuote }) {
  const isUp = quote.changePercentage >= 0
  const meta = INDEX_META[quote.symbol]
  const color = isUp ? "text-[#006e3f]" : "text-[#ff4757]"
  const bg = isUp ? "bg-[#00d47e]/10" : "bg-[#ff4757]/10"

  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-2.5">
      {/* Index name */}
      <div className="w-28 shrink-0">
        <span className="text-xs font-semibold text-stone-700">{meta?.short ?? quote.symbol}</span>
        <span className="ml-1 text-[10px] text-stone-400">{meta?.full}</span>
      </div>

      {/* Price */}
      <span className="font-num w-20 shrink-0 text-sm font-bold text-stone-900 tabular-nums">
        {quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      {/* Change badge */}
      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${color} ${bg}`}>
        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {isUp ? "+" : ""}{quote.changePercentage.toFixed(2)}%
      </span>

      {/* Absolute change */}
      <span className={`text-xs tabular-nums ${color} opacity-70`}>
        ({isUp ? "+" : ""}{quote.change.toFixed(2)})
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-2.5">
      <div className="h-3.5 w-28 animate-pulse rounded bg-black/[0.07]" />
      <div className="h-3.5 w-20 animate-pulse rounded bg-black/[0.07]" />
      <div className="h-5 w-16 animate-pulse rounded-full bg-black/[0.07]" />
    </div>
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
    <div className="flex items-center divide-x divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.07] bg-white">
      {isLoading || quotes.length === 0
        ? [0, 1, 2].map((i) => <SkeletonRow key={i} />)
        : quotes.map((q) => <IndexRow key={q.symbol} quote={q} />)}
    </div>
  )
}
