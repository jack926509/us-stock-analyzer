"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { LogoTile } from "@/components/design/LogoTile"
import { Sparkline } from "@/components/design/Sparkline"
import { SectionHeader } from "@/components/design/SectionHeader"
import { fmtCap, changeColor, makeSpark } from "@/lib/format"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }

interface WatchlistSectionProps {
  data: WatchlistEntry[]
  isLoading: boolean
}

const SECTOR_FILTERS = [
  { id: "all", label: "全部" },
  { id: "Technology", label: "科技" },
  { id: "Consumer Cyclical", label: "消費" },
  { id: "Communication Services", label: "通訊" },
  { id: "Financial Services", label: "金融" },
] as const

export function WatchlistTable({ data, isLoading }: WatchlistSectionProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<(typeof SECTOR_FILTERS)[number]["id"]>("all")
  const [deleting, setDeleting] = useState<string | null>(null)

  const sorted = useMemo(() => {
    const list = filter === "all" ? data : data.filter((d) => d.sector === filter)
    return [...list].sort(
      (a, b) => (b.quote?.changePercentage ?? 0) - (a.quote?.changePercentage ?? 0),
    )
  }, [data, filter])

  async function handleDelete(e: React.MouseEvent, symbol: string) {
    e.stopPropagation()
    setDeleting(symbol)
    try {
      const res = await fetch(`/api/stocks/${symbol}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success(`已移除 ${symbol}`)
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] })
    } catch {
      toast.error(`移除 ${symbol} 失敗`)
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-xl border border-hair bg-card">
        <div className="border-b border-hair-soft px-[18px] py-3.5">
          <div className="h-4 w-32 animate-pulse rounded bg-black/[0.06]" />
        </div>
        <div className="space-y-1 p-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-black/[0.04]" />
          ))}
        </div>
      </section>
    )
  }

  if (data.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border border-hair bg-card">
        <SectionHeader eyebrow="WATCHLIST" title="追蹤清單" />
        <div className="px-6 py-12 text-center">
          <p className="text-muted-foreground">追蹤清單為空</p>
          <p className="mt-1 text-sm text-muted-foreground/70">點擊右上角「新增股票」開始追蹤</p>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-card">
      <SectionHeader
        eyebrow={`WATCHLIST · ${data.length} ISSUES`}
        title="追蹤清單"
        right={
          <div className="flex flex-wrap gap-1.5">
            {SECTOR_FILTERS.map((c) => {
              const active = filter === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                    (active
                      ? "border-ink bg-ink text-ink-foreground"
                      : "border-hair text-foreground hover:border-foreground")
                  }
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        }
      />

      {/* desktop table */}
      <div className="hidden lg:block">
        <div
          className="grid items-center gap-2.5 bg-ink px-[18px] py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink-foreground"
          style={{ gridTemplateColumns: "32px 1fr 90px 90px 110px 80px 70px 90px 70px 24px" }}
        >
          <span>#</span>
          <span>代號 · 名稱</span>
          <span className="text-right">現價</span>
          <span className="text-right">漲跌</span>
          <span className="text-right">30D</span>
          <span className="text-right">市值</span>
          <span className="text-right">P/E</span>
          <span className="text-right">52W</span>
          <span className="text-right">%</span>
          <span />
        </div>
        {sorted.map((row, i) => {
          const q = row.quote
          const pct = q?.changePercentage ?? 0
          const up = pct >= 0
          const color = changeColor(pct)
          const points = makeSpark(
            [...row.symbol].reduce((a, c) => a + c.charCodeAt(0), 0),
            pct,
          )
          const range = q ? q.yearHigh - q.yearLow : 0
          const pos = q && range > 0 ? Math.max(0, Math.min(1, (q.price - q.yearLow) / range)) : 0.5
          return (
            <div
              key={row.symbol}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/stock/${row.symbol}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/stock/${row.symbol}`)}
              className={
                "grid cursor-pointer items-center gap-2.5 px-[18px] py-3 hover:bg-paper " +
                (i === 0 ? "" : "border-t border-hair-soft")
              }
              style={{ gridTemplateColumns: "32px 1fr 90px 90px 110px 80px 70px 90px 70px 24px" }}
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 items-center gap-2.5">
                <LogoTile symbol={row.symbol} size={28} />
                <div className="min-w-0">
                  <div className="font-mono text-[13px] font-bold leading-tight">{row.symbol}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{row.name}</div>
                </div>
              </div>
              <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
                {q ? q.price.toFixed(2) : "—"}
              </span>
              <span
                className="text-right font-mono text-xs tabular-nums"
                style={{ color: q ? color : undefined }}
              >
                {q ? `${q.change >= 0 ? "+" : ""}${q.change.toFixed(2)}` : "—"}
              </span>
              <div className="flex justify-end">
                <Sparkline points={points} color={color} width={100} height={22} fill />
              </div>
              <span className="text-right font-mono text-[11px] text-muted-foreground">
                {fmtCap(q?.marketCap ?? null)}
              </span>
              <span className="text-right font-mono text-[11px] text-muted-foreground">
                {q?.pe ? q.pe.toFixed(1) : "—"}
              </span>
              <div className="self-center">
                <div className="relative h-1 rounded-sm bg-black/[0.06]">
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-sm"
                    style={{ width: `${pos * 100}%`, background: color }}
                  />
                  <div
                    className="absolute -top-0.5 h-2 w-px bg-foreground"
                    style={{ left: `${pos * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
                  <span>{q?.yearLow.toFixed(0) ?? "—"}</span>
                  <span>{q?.yearHigh.toFixed(0) ?? "—"}</span>
                </div>
              </div>
              <span className="text-right">
                <span
                  className="inline-block min-w-[52px] rounded px-1.5 py-1 text-center font-mono text-[11px] font-bold text-white"
                  style={{ background: color }}
                >
                  {up ? "+" : ""}
                  {pct.toFixed(2)}
                </span>
              </span>
              <button
                onClick={(e) => handleDelete(e, row.symbol)}
                disabled={deleting === row.symbol}
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
        {sorted.map((row) => {
          const q = row.quote
          const pct = q?.changePercentage ?? 0
          const up = pct >= 0
          const color = changeColor(pct)
          const points = makeSpark(
            [...row.symbol].reduce((a, c) => a + c.charCodeAt(0), 0),
            pct,
          )
          return (
            <button
              key={row.symbol}
              onClick={() => router.push(`/stock/${row.symbol}`)}
              className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-paper"
            >
              <LogoTile symbol={row.symbol} size={32} />
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-bold">{row.symbol}</span>
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {q ? q.price.toFixed(2) : "—"}
                  </span>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{row.name}</div>
              </div>
              <div className="flex items-center gap-2">
                <Sparkline points={points} color={color} width={56} height={20} />
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-white tabular-nums"
                  style={{ background: color }}
                >
                  {up ? "+" : ""}
                  {pct.toFixed(2)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
