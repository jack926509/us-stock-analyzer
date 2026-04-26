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

// Returns 1-based rank for each peer in a column (null = no data)
// Positive values always rank before negatives (e.g. negative P/E = losing money = worst)
function getRankings(peers: PeerData[], col: ColDef): (number | null)[] {
  const vals = peers.map((p) => p[col.key] as number | null)

  const positives = vals
    .map((v, i) => ({ v: v as number, i }))
    .filter(({ v }) => v != null && !isNaN(v) && v > 0)
  const negatives = vals
    .map((v, i) => ({ v: v as number, i }))
    .filter(({ v }) => v != null && !isNaN(v) && v < 0)

  // Sort: best performance first
  if (col.higherBetter) {
    positives.sort((a, b) => b.v - a.v) // highest positive = rank 1
    negatives.sort((a, b) => b.v - a.v) // least negative = better among negatives
  } else {
    positives.sort((a, b) => a.v - b.v) // lowest positive = rank 1
    negatives.sort((a, b) => a.v - b.v) // more negative = worse (rank last)
  }

  const ranks: (number | null)[] = new Array(vals.length).fill(null)
  let rank = 1
  for (const { i } of positives) ranks[i] = rank++
  for (const { i } of negatives) ranks[i] = rank++
  return ranks
}

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

// Derive best/worst from rankings so negative values never count as "best"
function getBestWorst(peers: PeerData[], col: ColDef): { bestIdx: number; worstIdx: number } {
  const rankings = getRankings(peers, col)
  const validRanks = rankings.filter((r): r is number => r !== null)
  if (validRanks.length === 0) return { bestIdx: -1, worstIdx: -1 }
  const total = validRanks.length
  const bestIdx = rankings.indexOf(1)
  const worstIdx = rankings.indexOf(total)
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

  // 預先計算每個指標的排名，避免在 cell 渲染裡重複計算
  const rankingsByCol = COLUMNS.map((col) => getRankings(peers, col))

  // 綜合「划算度」：各指標排名平均，越小越划算（多空因素已在 higherBetter 處理）
  const avgRanks: (number | null)[] = peers.map((_, peerIdx) => {
    const ranks = rankingsByCol.map((arr) => arr[peerIdx]).filter((r): r is number => r != null)
    return ranks.length === 0 ? null : ranks.reduce((a, b) => a + b, 0) / ranks.length
  })
  const overallRanks: (number | null)[] = (() => {
    const indexed = avgRanks
      .map((avg, i) => ({ avg, i }))
      .filter((x): x is { avg: number; i: number } => x.avg != null)
      .sort((a, b) => a.avg - b.avg)
    const out: (number | null)[] = new Array(peers.length).fill(null)
    indexed.forEach(({ i }, rank) => { out[i] = rank + 1 })
    return out
  })()
  const bestIdx = overallRanks.indexOf(1)
  const targetIdx = peers.findIndex((p) => p.isTarget)
  const targetOverallRank = targetIdx >= 0 ? overallRanks[targetIdx] : null

  return (
    <div className="space-y-6">
      {/* 綜合「買誰更划算」結論 — 平均所有指標排名 */}
      {peers.length > 1 && bestIdx >= 0 && (
        <div className="rounded-lg bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/25">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm">
              <span className="text-stone-600">綜合最划算：</span>
              <span className="font-semibold text-emerald-700">{peers[bestIdx].symbol}</span>
              <span className="ml-1 text-stone-500">
                （平均排名 #{avgRanks[bestIdx]!.toFixed(1)} / 共 {peers.length} 檔）
              </span>
            </div>
            {targetIdx >= 0 && targetIdx !== bestIdx && targetOverallRank != null && (
              <div className="text-xs text-stone-600">
                {peers[targetIdx].symbol} 排名 <span className="font-semibold text-stone-900">#{targetOverallRank}</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-stone-500">
            排名綜合 P/E、P/B、P/S、EV/EBITDA、ROE、毛利率、營收成長 7 項指標；越前面 = 估值越合理 + 賺錢能力越強
          </p>
        </div>
      )}

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
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">綜合</th>
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
                      const rankings = getRankings(peers, col)
                      const rank = rankings[peerIdx]
                      const isBest = bestIdx === peerIdx
                      const isWorst = worstIdx === peerIdx && peers.length > 1
                      const val = peer[col.key] as number | null
                      return (
                        <td key={col.key} className="px-3 py-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
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
                            {rank != null && (
                              <span className={cn(
                                "text-[9px] font-semibold tabular-nums",
                                rank === 1 && "text-emerald-600",
                                rank === rankings.filter(r => r !== null).length && peers.length > 1 && "text-red-400",
                                rank !== 1 && rank !== rankings.filter(r => r !== null).length && "text-stone-400"
                              )}>
                                #{rank}
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right">
                      {overallRanks[peerIdx] != null ? (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1",
                            overallRanks[peerIdx] === 1
                              ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30"
                              : overallRanks[peerIdx] === peers.length
                              ? "bg-red-500/10 text-red-600 ring-red-500/20"
                              : "bg-black/5 text-stone-600 ring-black/10"
                          )}
                        >
                          #{overallRanks[peerIdx]}
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-stone-500">
          綠色 = 同業最優 · 紅色 = 同業最差 · #N = 各指標排名（負值自動排後）
        </p>
      </div>
    </div>
  )
}
