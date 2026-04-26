"use client"

import { useSyncExternalStore } from "react"
import { useQueries } from "@tanstack/react-query"
import { Sparkline } from "@/components/design/Sparkline"
import { ChangeBadge } from "@/components/design/ChangeBadge"
import { fmtMoney, makeSpark, UP_COLOR, DOWN_COLOR } from "@/lib/format"
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

const PERIODS = ["1D", "1W", "1M", "3M", "YTD"] as const

export function PortfolioHero() {
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
  const color = up ? UP_COLOR : DOWN_COLOR

  // 走勢線視覺資料 — 待加上歷史持倉快照後可改真資料
  const equity =
    totalCost <= 0
      ? makeSpark(7, 0)
      : makeSpark(7, up ? 1.5 : -1.5, 0.012).map(
          (v) => totalCost + ((v - 100) / 100) * totalCost * 1.4,
        )

  // 空狀態 — 鼓勵新增持股
  if (holdings.length === 0) {
    return (
      <section className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center">
        <p className="font-serif text-lg font-semibold text-foreground">尚未追蹤持股</p>
        <p className="mt-1 text-xs text-muted-foreground">
          點右上方「新增股票」開始記錄成本，首頁會即時顯示市值與未實現損益。
        </p>
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 gap-6 rounded-2xl border border-black/[0.06] bg-white p-6 lg:grid-cols-2">
      {/* Left: numbers */}
      <div>
        <div className="mb-1 flex items-baseline gap-2.5">
          <h2 className="m-0 font-serif text-lg font-semibold tracking-tight text-foreground">
            我的持股
          </h2>
          <span className="text-xs text-stone-500">
            {holdings.length} 檔 · 即時更新
          </span>
        </div>
        <div className="mb-[18px] text-[11px] text-stone-500">
          已實際買入 — 每分鐘自動更新現價、未實現損益、總市值
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-stone-500">$</span>
          <span
            className="font-num text-[40px] font-bold leading-none tabular-nums sm:text-[56px]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {fmtMoney(totalValue, 0)}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <span
            className="font-num text-base font-semibold"
            style={{ color }}
          >
            {up ? "+" : "-"}${fmtMoney(Math.abs(totalPL))}
          </span>
          <ChangeBadge pct={totalPLPct} />
          <span className="text-[11px] text-stone-500">
            未實現損益 · 總成本 ${fmtMoney(totalCost)}
          </span>
        </div>

        {/* Mini stats */}
        <div className="mt-[22px] grid grid-cols-3 gap-3.5 border-t border-black/[0.06] pt-[18px]">
          {[
            { label: "今日損益", placeholder: "—" },
            { label: "本週", placeholder: "—" },
            { label: "年初至今", placeholder: "—" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
                {s.label}
              </div>
              <div className="mt-1 font-num text-[17px] font-bold text-stone-400">
                {s.placeholder}
              </div>
              <div className="font-num text-[11px] text-stone-400">
                資料準備中
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: equity curve */}
      <div className="flex flex-col rounded-xl bg-[#FAF7F0] p-[18px]">
        <div className="mb-2 flex justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            投組市值走勢 · 30 天
          </span>
          <div className="flex gap-1">
            {PERIODS.map((p, i) => (
              <button
                key={p}
                className={`rounded font-num text-[10px] font-medium ${
                  i === 2
                    ? "bg-foreground px-2 py-0.5 text-white"
                    : "px-2 py-0.5 text-muted-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-h-[180px] flex-1">
          <Sparkline points={equity} color="#CC785C" width={520} height={180} fill className="w-full h-full" />
          <div className="absolute right-[60px] top-3 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] text-white shadow-md">
            <span className="font-num">${fmtMoney(totalValue)}</span>
            <div className="font-num text-[9px] opacity-60">NOW</div>
          </div>
        </div>
        <div className="mt-1.5 flex justify-between font-num text-[10px] text-stone-400">
          <span>30D</span>
          <span>21D</span>
          <span>14D</span>
          <span>7D</span>
          <span>NOW</span>
        </div>
      </div>
    </section>
  )
}
