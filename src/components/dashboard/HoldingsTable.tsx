"use client"

import { useMemo, useSyncExternalStore } from "react"
import { useQueries } from "@tanstack/react-query"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { LogoTile } from "@/components/design/LogoTile"
import { Sparkline } from "@/components/design/Sparkline"
import { SectionHeader } from "@/components/design/SectionHeader"
import { fmtMoney, changeColor, makeSpark } from "@/lib/format"
import {
  getServerSnapshot,
  getSnapshot,
  parseHoldings,
  setHoldings,
  subscribe,
  type Holding,
} from "@/lib/portfolio"

interface ProfileResponse {
  symbol: string
  companyName?: string
  price?: number
  changePercentage?: number
}

const ALLOC_COLORS = ["#CC785C", "#1A1A1A", "#8B6F47", "#A85C44", "#6B6357", "#D4956A"]

export function HoldingsTable() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const holdings = useMemo(() => parseHoldings(snapshot), [snapshot])

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

  const enriched = holdings.map((h, i) => {
    const q = queries[i]?.data
    const price = q?.price ?? h.costBasis
    return { ...h, price, dayChg: q?.changePercentage ?? 0, name: q?.companyName ?? "—" }
  })

  const totalValue = enriched.reduce((s, h) => s + h.shares * h.price, 0) || 1

  function handleRemove(symbol: string) {
    const next: Holding[] = holdings.filter((h) => h.symbol !== symbol)
    setHoldings(next)
  }

  if (holdings.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border border-hair bg-card">
        <SectionHeader eyebrow="PORTFOLIO · MARK-TO-MKT" title="持股管理" />
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          尚未新增持股 — 點右上角「新增股票」開始記錄
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-card">
      <SectionHeader
        eyebrow="PORTFOLIO · MARK-TO-MKT"
        title="持股管理"
        right={
          <span className="font-mono text-[10px] text-muted-foreground">
            {holdings.length} 檔 · localStorage
          </span>
        }
      />

      {/* Allocation bar */}
      <div className="px-[18px] pt-6 pb-3.5">
        <div className="flex h-2 overflow-hidden rounded-sm">
          {enriched.map((h, i) => {
            const pct = (h.shares * h.price) / totalValue * 100
            return (
              <div
                key={h.symbol}
                className="relative"
                style={{ width: `${pct}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
              >
                {pct >= 6 && (
                  <div className="absolute -top-[22px] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-bold">
                    {h.symbol} {pct.toFixed(0)}%
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* desktop table */}
      <div className="hidden lg:block">
        <div
          className="grid items-center gap-2.5 bg-ink px-[18px] py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-foreground"
          style={{ gridTemplateColumns: "36px 1fr 80px 100px 130px 110px 110px 70px 24px" }}
        >
          <span>#</span>
          <span>POSITION</span>
          <span className="text-right">SHARES</span>
          <span className="text-right">AVG COST</span>
          <span className="text-right">30D · 現價</span>
          <span className="text-right">市值</span>
          <span className="text-right">P/L</span>
          <span className="text-right">%</span>
          <span />
        </div>
        {enriched.map((h, i) => {
          const value = h.shares * h.price
          const cost = h.shares * h.costBasis
          const pl = value - cost
          const plPct = cost > 0 ? (pl / cost) * 100 : 0
          const up = pl >= 0
          const color = changeColor(pl)
          const points = makeSpark(
            [...h.symbol].reduce((a, c) => a + c.charCodeAt(0), 0),
            h.dayChg,
          )
          return (
            <div
              key={h.symbol}
              className={
                "grid items-center gap-2.5 px-[18px] py-3.5 hover:bg-paper " +
                (i === 0 ? "" : "border-t border-hair-soft")
              }
              style={{ gridTemplateColumns: "36px 1fr 80px 100px 130px 110px 110px 70px 24px" }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                />
                <span className="font-mono text-[11px] text-muted-foreground">{i + 1}</span>
              </div>
              <Link href={`/stock/${h.symbol}`} className="flex items-center gap-2.5">
                <LogoTile symbol={h.symbol} size={32} />
                <div className="min-w-0">
                  <div className="font-mono text-[13px] font-bold">{h.symbol}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{h.name}</div>
                </div>
              </Link>
              <span className="text-right font-mono text-xs font-semibold tabular-nums">
                {h.shares.toLocaleString()}
              </span>
              <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                ${h.costBasis.toFixed(2)}
              </span>
              <div className="flex flex-col items-end">
                <Sparkline points={points} color={color} width={110} height={18} />
                <span className="mt-0.5 font-mono text-xs font-bold tabular-nums">
                  ${h.price.toFixed(2)}
                </span>
              </div>
              <span className="text-right font-mono text-[13px] font-bold tabular-nums">
                ${fmtMoney(value)}
              </span>
              <span
                className="text-right font-mono text-[13px] font-bold tabular-nums"
                style={{ color }}
              >
                {up ? "+" : "-"}${fmtMoney(Math.abs(pl), 0)}
              </span>
              <span className="text-right">
                <span
                  className="inline-block min-w-[56px] rounded px-1.5 py-1 text-center font-mono text-[11px] font-bold text-white"
                  style={{ background: color }}
                >
                  {up ? "+" : ""}
                  {plPct.toFixed(2)}
                </span>
              </span>
              <button
                onClick={() => handleRemove(h.symbol)}
                className="text-muted-foreground/60 transition-colors hover:text-down"
                title="移除"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {/* mobile cards */}
      <div className="divide-y divide-hair-soft lg:hidden">
        {enriched.map((h, i) => {
          const value = h.shares * h.price
          const pl = value - h.shares * h.costBasis
          const plPct = h.costBasis > 0 ? (pl / (h.shares * h.costBasis)) * 100 : 0
          const up = pl >= 0
          const color = changeColor(pl)
          return (
            <Link
              key={h.symbol}
              href={`/stock/${h.symbol}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-paper"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                />
                <LogoTile symbol={h.symbol} size={28} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-bold">{h.symbol}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {h.shares}股 × ${h.price.toFixed(2)}
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{h.name}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold tabular-nums" style={{ color }}>
                  {up ? "+" : ""}
                  {plPct.toFixed(2)}%
                </div>
                <div className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  ${fmtMoney(value)}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
