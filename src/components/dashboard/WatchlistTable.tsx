"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { LogoTile } from "@/components/design/LogoTile"
import { ChangeBadge } from "@/components/design/ChangeBadge"
import { Sparkline } from "@/components/design/Sparkline"
import { fmtCap, changeColor, makeSpark } from "@/lib/format"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }
type Tab = "all" | "gainers" | "sectors"

const COLS = ["代碼", "公司名稱", "現價", "漲跌幅", "30 日走勢", "市值", "P/E", "52 週區間", ""] as const

interface WatchlistSectionProps {
  data: WatchlistEntry[]
  isLoading: boolean
}

export function WatchlistTable({ data, isLoading }: WatchlistSectionProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>("all")
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = (() => {
    if (tab === "gainers") {
      return [...data].sort(
        (a, b) => (b.quote?.changePercentage ?? 0) - (a.quote?.changePercentage ?? 0),
      )
    }
    if (tab === "sectors") {
      return [...data].sort((a, b) => (a.sector ?? "").localeCompare(b.sector ?? ""))
    }
    return data
  })()

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
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-black/[0.05]" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-black/[0.1] py-16 text-center">
        <p className="text-muted-foreground">追蹤清單為空</p>
        <p className="mt-1 text-sm text-stone-500">點擊右上角「新增股票」開始追蹤</p>
      </div>
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h2
            className="m-0 font-serif text-xl font-semibold tracking-tight"
          >
            追蹤清單
          </h2>
          <div className="mt-0.5 text-[11px] text-stone-500">
            {data.length} 支關注但未持倉的股票 · 60 秒自動刷新
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-black/[0.05] p-1">
          {[
            { id: "all" as const, label: `全部 · ${data.length}` },
            { id: "gainers" as const, label: "漲幅" },
            { id: "sectors" as const, label: "依產業" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#FAF7F0]">
              {COLS.map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500 ${
                    i === 0 || i === 1 ? "text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const q = row.quote
              const pct = q?.changePercentage ?? 0
              const color = changeColor(pct)
              const points = makeSpark(
                [...row.symbol].reduce((a, c) => a + c.charCodeAt(0), 0),
                pct,
              )
              const range = q ? q.yearHigh - q.yearLow : 0
              const pos = q && range > 0 ? Math.max(0, Math.min(1, (q.price - q.yearLow) / range)) : 0.5

              return (
                <tr
                  key={row.symbol}
                  className="cursor-pointer border-t border-black/[0.04] transition-colors hover:bg-black/[0.02]"
                  onClick={() => router.push(`/stock/${row.symbol}`)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <LogoTile symbol={row.symbol} size={28} />
                      <span className="font-num text-[13px] font-bold">{row.symbol}</span>
                    </div>
                  </td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-stone-600">{row.name}</td>
                  <td className="px-3 py-3 text-right font-num font-semibold">
                    {q ? `$${q.price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {q ? <ChangeBadge pct={pct} size="sm" /> : <span className="text-stone-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Sparkline points={points} color={color} width={80} height={24} className="ml-auto" />
                  </td>
                  <td className="px-3 py-3 text-right font-num text-stone-600">
                    {fmtCap(q?.marketCap ?? null)}
                  </td>
                  <td className="px-3 py-3 text-right font-num text-stone-600">
                    {q?.pe ? q.pe.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {q && range > 0 ? (
                      <>
                        <div className="relative ml-auto h-1 w-[90px] rounded bg-black/[0.07]">
                          <div
                            className="absolute -top-[3px] h-[10px] w-0.5 rounded-sm bg-[#CC785C]"
                            style={{ left: `${pos * 100}%` }}
                          />
                        </div>
                        <div className="mt-0.5 font-num text-[9px] text-stone-500">
                          ${q.yearLow.toFixed(0)} – ${q.yearHigh.toFixed(0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={(e) => handleDelete(e, row.symbol)}
                      disabled={deleting === row.symbol}
                      className="text-stone-400 transition-colors hover:text-[#c62828]"
                      title="移除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
