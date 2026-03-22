"use client"

import { useQuery } from "@tanstack/react-query"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"
import type { PeerData } from "@/app/api/peers/[symbol]/route"

interface Props {
  symbol: string
}

function fmt(v: number | null, decimals = 1, suffix = "x"): string {
  if (v == null || isNaN(v) || v === 0) return "—"
  return v.toFixed(decimals) + suffix
}

function fmtPct(v: number | null): string {
  if (v == null || isNaN(v)) return "—"
  return (v * 100).toFixed(1) + "%"
}

function fmtMktCap(v: number): string {
  if (v >= 1e12) return "$" + (v / 1e12).toFixed(2) + "T"
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B"
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(0) + "M"
  return "—"
}

interface ColDef {
  key: keyof PeerData
  label: string
  format: (v: number | null) => string
  higherBetter: boolean
}

const COLUMNS: ColDef[] = [
  { key: "peRatio",      label: "P/E",         format: (v) => fmt(v, 1, "x"),  higherBetter: false },
  { key: "pbRatio",      label: "P/B",         format: (v) => fmt(v, 1, "x"),  higherBetter: false },
  { key: "psRatio",      label: "P/S",         format: (v) => fmt(v, 1, "x"),  higherBetter: false },
  { key: "evToEbitda",   label: "EV/EBITDA",   format: (v) => fmt(v, 1, "x"),  higherBetter: false },
  { key: "roe",          label: "ROE",         format: fmtPct,                  higherBetter: true },
  { key: "grossMargin",  label: "毛利率",       format: fmtPct,                  higherBetter: true },
  { key: "revenueGrowth",label: "營收成長",     format: fmtPct,                  higherBetter: true },
]

// Normalize a column's values to 0-100 for radar chart
function normalizeForRadar(peers: PeerData[], col: ColDef): number[] {
  const vals = peers.map((p) => p[col.key] as number | null)
  const valid = vals.filter((v): v is number => v != null && !isNaN(v) && v !== 0)
  if (valid.length === 0) return vals.map(() => 50)
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  if (min === max) return vals.map(() => 75)
  return vals.map((v) => {
    if (v == null || isNaN(v) || v === 0) return 50
    const normalized = ((v - min) / (max - min)) * 100
    return col.higherBetter ? normalized : 100 - normalized
  })
}

// Find best/worst indices in a column (among non-null values)
function getBestWorst(peers: PeerData[], col: ColDef): { bestIdx: number; worstIdx: number } {
  const vals = peers.map((p) => p[col.key] as number | null)
  let bestIdx = -1
  let worstIdx = -1
  let bestVal = col.higherBetter ? -Infinity : Infinity
  let worstVal = col.higherBetter ? Infinity : -Infinity

  vals.forEach((v, i) => {
    if (v == null || isNaN(v) || v === 0) return
    if (col.higherBetter ? v > bestVal : v < bestVal) { bestVal = v; bestIdx = i }
    if (col.higherBetter ? v < worstVal : v > worstVal) { worstVal = v; worstIdx = i }
  })
  return { bestIdx, worstIdx }
}

const RADAR_COLORS = ["#00d47e", "#60a5fa", "#f59e0b", "#e879f9", "#fb923c", "#34d399"]

export function PeerComparison({ symbol }: Props) {
  const { data: peers = [], isLoading } = useQuery<PeerData[]>({
    queryKey: ["peers", symbol],
    queryFn: () => fetch(`/api/peers/${symbol}`).then((r) => r.json()),
    staleTime: 24 * 60 * 60 * 1000, // 24h — peer data changes infrequently
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-black/5" />
        ))}
      </div>
    )
  }

  if (!peers.length) {
    return (
      <div className="py-10 text-center text-sm text-stone-500">
        無同業比較資料
      </div>
    )
  }

  // Build radar chart data
  const radarData = COLUMNS.map((col) => {
    const normalized = normalizeForRadar(peers, col)
    const entry: Record<string, unknown> = { subject: col.label }
    peers.forEach((p, i) => { entry[p.symbol] = Math.round(normalized[i]) })
    return entry
  })

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      {peers.length > 1 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            多維度雷達比較（歸一化 0–100）
          </h4>
          <div className="rounded-lg bg-[#faf6f1] p-4 ring-1 ring-black/[0.08]">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="rgba(0,0,0,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#78716c", fontSize: 11 }}
                />
                {peers.map((p, i) => (
                  <Radar
                    key={p.symbol}
                    name={p.symbol}
                    dataKey={p.symbol}
                    stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                    fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                    fillOpacity={p.isTarget ? 0.15 : 0.05}
                    strokeWidth={p.isTarget ? 2 : 1.5}
                  />
                ))}
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#1c1917",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              {peers.map((p, i) => (
                <div key={p.symbol} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-4 rounded-full"
                    style={{ background: RADAR_COLORS[i % RADAR_COLORS.length] }}
                  />
                  <span className={cn("text-xs", p.isTarget ? "font-semibold text-stone-900" : "text-stone-600")}>
                    {p.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          指標對比
        </h4>
        <div className="overflow-x-auto rounded-lg ring-1 ring-black/[0.08]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white">
                <th className="px-4 py-2.5 text-left font-medium text-stone-600">公司</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">股價</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">市值</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2.5 text-right font-medium text-stone-600">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {peers.map((peer, peerIdx) => {
                return (
                  <tr
                    key={peer.symbol}
                    className={cn(
                      "border-b border-black/[0.07] last:border-0 transition-colors hover:bg-[#faf6f1]",
                      peer.isTarget && "bg-black/[0.04]"
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {peer.isTarget && (
                          <span className="rounded bg-[#00d47e]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#006e3f]">
                            目標
                          </span>
                        )}
                        <div>
                          <p className={cn("font-semibold", peer.isTarget ? "text-stone-900" : "text-stone-600")}>
                            {peer.symbol}
                          </p>
                          <p className="text-[10px] text-stone-500 truncate max-w-[120px]">{peer.companyName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-num text-stone-700">
                      {peer.price > 0 ? `$${peer.price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-stone-500">
                      {fmtMktCap(peer.marketCap)}
                    </td>
                    {COLUMNS.map((col) => {
                      const { bestIdx, worstIdx } = getBestWorst(peers, col)
                      const isBest = bestIdx === peerIdx
                      const isWorst = worstIdx === peerIdx && peers.length > 1
                      const val = peer[col.key] as number | null
                      return (
                        <td key={col.key} className="px-3 py-2.5 text-right">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5",
                              isBest && "bg-emerald-500/15 text-emerald-700 font-semibold",
                              isWorst && !isBest && "bg-red-500/10 text-red-600",
                              !isBest && !isWorst && "text-stone-500"
                            )}
                          >
                            {col.format(val)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-stone-500">
          綠色 = 同業最優 · 紅色 = 同業最差（依各指標方向判斷）
        </p>
      </div>
    </div>
  )
}
