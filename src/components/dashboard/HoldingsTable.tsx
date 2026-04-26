"use client"

import { useMemo, useSyncExternalStore } from "react"
import { useQueries } from "@tanstack/react-query"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { LogoTile } from "@/components/design/LogoTile"
import { ChangeBadge } from "@/components/design/ChangeBadge"
import { Sparkline } from "@/components/design/Sparkline"
import { fmtMoney, fmtPct, changeColor, makeSpark } from "@/lib/format"
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

const COLS = ["代號", "股數", "平均成本", "現價", "市值", "今日", "未實現損益", "走勢"] as const

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

  function handleRemove(symbol: string) {
    const next: Holding[] = holdings.filter((h) => h.symbol !== symbol)
    setHoldings(next)
  }

  if (holdings.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white px-5 py-12 text-center">
        <p className="text-sm text-muted-foreground">尚未新增持股</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-[18px] py-3.5">
        <span className="font-serif text-[13px] font-semibold">持股明細</span>
        <span className="text-[11px] text-muted-foreground">{holdings.length} 檔 · localStorage 儲存</span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#FAF7F0]">
            {COLS.map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-stone-500 ${
                  i === 0 ? "text-left" : i === 7 ? "text-center" : "text-right"
                }`}
              >
                {h}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const q = queries[i]?.data
            const price = q?.price ?? h.costBasis
            const dayChg = q?.changePercentage ?? 0
            const value = h.shares * price
            const cost = h.shares * h.costBasis
            const pl = value - cost
            const plPct = cost > 0 ? (pl / cost) * 100 : 0
            const up = pl >= 0
            const color = changeColor(pl)
            const points = makeSpark(
              [...h.symbol].reduce((a, c) => a + c.charCodeAt(0), 0),
              dayChg,
            )

            return (
              <tr key={h.symbol} className="border-t border-black/[0.04] transition-colors hover:bg-black/[0.02]">
                <td className="px-3 py-3">
                  <Link href={`/stock/${h.symbol}`} className="flex items-center gap-2.5">
                    <LogoTile symbol={h.symbol} size={28} />
                    <div>
                      <div className="font-num font-bold">{h.symbol}</div>
                      <div className="text-[10px] text-muted-foreground">{q?.companyName ?? "—"}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-3 py-3 text-right font-num text-stone-600">{h.shares}</td>
                <td className="px-3 py-3 text-right font-num text-stone-500">${h.costBasis.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-num font-semibold">${price.toFixed(2)}</td>
                <td className="px-3 py-3 text-right font-num font-semibold">${fmtMoney(value)}</td>
                <td className="px-3 py-3 text-right">
                  <ChangeBadge pct={dayChg} size="sm" />
                </td>
                <td
                  className="px-3 py-3 text-right font-num font-semibold"
                  style={{ color }}
                >
                  <div>{up ? "+" : "-"}${fmtMoney(Math.abs(pl))}</div>
                  <div className="text-[10px] opacity-75">{fmtPct(plPct)}</div>
                </td>
                <td className="px-3 py-2 text-center">
                  <Sparkline points={points} color={color} width={70} height={22} />
                </td>
                <td className="pr-2 text-right">
                  <button
                    onClick={() => handleRemove(h.symbol)}
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
    </div>
  )
}
