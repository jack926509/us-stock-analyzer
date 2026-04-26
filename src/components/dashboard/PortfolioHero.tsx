"use client"

import { useState, useSyncExternalStore } from "react"
import { useQueries } from "@tanstack/react-query"
import { Sparkline } from "@/components/design/Sparkline"
import { fmtMoney, makeSpark } from "@/lib/format"
import {
  getServerSnapshot,
  getSnapshot,
  parseHoldings,
  subscribe,
} from "@/lib/portfolio"

interface ProfileResponse {
  symbol: string
  companyName?: string
  price?: number
}

const PERIODS = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"] as const

const KPI_PLACEHOLDERS = [
  { l: "今日 P/L", v: "—", p: "等待行情", up: true },
  { l: "本週 P/L", v: "—", p: "等待行情", up: true },
  { l: "本月 P/L", v: "—", p: "等待行情", up: true },
  { l: "YTD P/L", v: "—", p: "等待行情", up: true },
  { l: "WIN RATE", v: "—", p: "—", up: true },
  { l: "SHARPE", v: "—", p: "—", up: true },
] as const

export function PortfolioHero() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1M")
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const holdings = parseHoldings(snapshot)

  const queries = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ["profile", h.symbol],
      queryFn: () =>
        fetch(`/api/profile/${h.symbol}`).then((r) => {
          if (!r.ok) throw new Error("fetch failed")
          return r.json() as Promise<ProfileResponse>
        }),
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
    })),
  })

  let totalValue = 0
  let totalCost = 0
  holdings.forEach((h, i) => {
    const price = queries[i]?.data?.price ?? 0
    if (price > 0) totalValue += price * h.shares
    totalCost += h.costBasis * h.shares
  })
  const totalPL = totalValue - totalCost
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0
  const up = totalPL >= 0

  const equity =
    totalCost <= 0
      ? makeSpark(7, 0)
      : makeSpark(7, up ? 1.6 : -1.6, 0.014).map(
          (v) => totalCost + ((v - 100) / 100) * totalCost * 1.4,
        )

  if (holdings.length === 0) {
    return (
      <section className="rounded-xl border border-hair bg-card p-8 text-center">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
          NAV · 投組市值 · USD
        </div>
        <p className="mt-3 font-serif text-lg font-semibold text-foreground">尚未追蹤持股</p>
        <p className="mt-1 text-xs text-muted-foreground">
          點右上方「新增股票」開始記錄成本，首頁會即時顯示市值與未實現損益。
        </p>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-card">
      <div className="grid grid-cols-1 border-b border-hair-soft lg:grid-cols-[320px_1fr]">
        {/* NAV block */}
        <div className="border-b border-hair-soft px-5 py-5 lg:border-r lg:border-b-0 lg:px-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            NAV · 投組市值 · USD
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono text-base text-muted-foreground">$</span>
            <span
              className="font-mono font-bold tabular-nums leading-[0.95] text-[40px] sm:text-[52px]"
              style={{ letterSpacing: "-0.03em" }}
            >
              {fmtMoney(totalValue)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className={"font-mono text-lg font-semibold " + (up ? "text-up" : "text-down")}>
              {up ? "▲" : "▼"} ${fmtMoney(Math.abs(totalPL))}
            </span>
            <span
              className={
                "rounded px-2 py-1 font-mono text-[13px] font-bold text-white " +
                (up ? "bg-up" : "bg-down")
              }
            >
              {up ? "+" : ""}
              {totalPLPct.toFixed(2)}%
            </span>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-[18px] gap-y-1.5 font-mono text-[11px] text-muted-foreground">
            <span>
              COST <strong className="font-semibold text-foreground">${fmtMoney(totalCost)}</strong>
            </span>
            <span>
              POS <strong className="font-semibold text-foreground">{holdings.length}</strong>
            </span>
          </div>
        </div>

        {/* Equity chart */}
        <div className="relative px-4 py-3.5 sm:px-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              EQUITY CURVE · 30D
            </span>
            <div className="flex flex-wrap gap-1">
              {PERIODS.map((p) => {
                const active = p === period
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={
                      "rounded px-2.5 py-1 font-mono text-[11px] font-bold " +
                      (active ? "bg-ink text-ink-foreground" : "text-foreground hover:bg-hair-soft")
                    }
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-1 h-[120px] sm:h-[130px]">
            <Sparkline
              points={equity}
              color="#CC785C"
              width={760}
              height={130}
              fill
              className="h-full w-full"
            />
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {KPI_PLACEHOLDERS.map((k, i) => (
          <div
            key={k.l}
            className={
              "px-4 py-3 " +
              (i < KPI_PLACEHOLDERS.length - 1
                ? "border-b border-hair-soft sm:[&:nth-child(3n)]:border-r-0 sm:border-r lg:border-b-0 lg:[&:nth-child(3n)]:border-r lg:[&:nth-child(6)]:border-r-0"
                : "")
            }
          >
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {k.l}
            </div>
            <div className="mt-1 font-mono text-lg font-bold tabular-nums text-muted-foreground">
              {k.v}
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/70">{k.p}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
