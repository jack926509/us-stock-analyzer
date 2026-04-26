"use client"

import { useQuery } from "@tanstack/react-query"
import { Sparkline } from "@/components/design/Sparkline"
import { ChangeBadge } from "@/components/design/ChangeBadge"
import { changeColor, makeSpark } from "@/lib/format"
import type { FmpQuote } from "@/lib/api/fmp"

const INDEX_META: Record<string, { short: string; seed: number }> = {
  SPY: { short: "S&P 500", seed: 7 },
  QQQ: { short: "NASDAQ 100", seed: 8 },
  DIA: { short: "Dow Jones", seed: 9 },
}

function IndexCard({ quote }: { quote: FmpQuote }) {
  const meta = INDEX_META[quote.symbol]
  const color = changeColor(quote.changePercentage)
  // Sparkline 走勢用 seed 衍生穩定的視覺資料 — 待歷史價格 API 接好後可換真資料
  const points = makeSpark(meta?.seed ?? 1, quote.changePercentage > 0 ? 0.4 : -0.4, 0.018)

  return (
    <div className="flex items-center gap-4 rounded-xl border border-black/[0.06] bg-white px-[18px] py-3.5">
      <div className="flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
          {meta?.short ?? quote.symbol}
          <span className="ml-1.5 font-mono text-stone-300">{quote.symbol}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2.5">
          <span
            className="font-num text-[22px] font-bold tracking-tighter tabular-nums"
            style={{ letterSpacing: "-0.02em" }}
          >
            {quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <ChangeBadge pct={quote.changePercentage} size="sm" />
          <span className="font-num text-[11px] tabular-nums" style={{ color, opacity: 0.7 }}>
            {quote.change >= 0 ? "+" : ""}
            {quote.change.toFixed(2)}
          </span>
        </div>
      </div>
      <Sparkline points={points} color={color} width={80} height={36} fill />
    </div>
  )
}

function IndexCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-black/[0.06] bg-white px-[18px] py-3.5">
      <div className="flex-1 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-black/[0.06]" />
        <div className="h-6 w-32 animate-pulse rounded bg-black/[0.06]" />
      </div>
      <div className="h-9 w-20 animate-pulse rounded bg-black/[0.06]" />
    </div>
  )
}

export function IndicesStrip() {
  const { data, isLoading } = useQuery<FmpQuote[]>({
    queryKey: ["market-indices"],
    queryFn: () => fetch("/api/market").then((r) => r.json()),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const quotes = Array.isArray(data) ? data : []

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {isLoading || quotes.length === 0
        ? [0, 1, 2].map((i) => <IndexCardSkeleton key={i} />)
        : quotes.map((q) => <IndexCard key={q.symbol} quote={q} />)}
    </div>
  )
}
