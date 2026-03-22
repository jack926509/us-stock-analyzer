"use client"

import { TrendingUp, TrendingDown } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }

const SECTOR_COLORS = [
  "#00d47e", "#3b82f6", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#10b981", "#f97316",
]

interface MetricsPanelProps {
  data: WatchlistEntry[]
}

export function MetricsPanel({ data }: MetricsPanelProps) {
  const withQuotes = data.filter((d) => d.quote !== null)

  // Top 5 漲幅 / 跌幅 — only include actual gainers/losers
  const top5Gainers = [...withQuotes]
    .filter((d) => d.quote!.changePercentage > 0)
    .sort((a, b) => b.quote!.changePercentage - a.quote!.changePercentage)
    .slice(0, 5)
  const top5Losers = [...withQuotes]
    .filter((d) => d.quote!.changePercentage < 0)
    .sort((a, b) => a.quote!.changePercentage - b.quote!.changePercentage)
    .slice(0, 5)

  // 平均 P/E
  const peValues = withQuotes
    .map((d) => d.quote!.pe)
    .filter((pe): pe is number => typeof pe === "number" && pe > 0 && pe < 1000)
  const avgPE = peValues.length > 0 ? peValues.reduce((s, v) => s + v, 0) / peValues.length : null

  // 產業分佈
  const sectorMap = new Map<string, number>()
  for (const item of data) {
    const sector = item.sector ?? "Other"
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1)
  }
  const sectorData = Array.from(sectorMap.entries()).map(([name, value]) => ({ name, value }))

  return (
    <div className="flex flex-col gap-4">
      {/* 平均 P/E */}
      <Card className="border-black/[0.07] bg-white p-4">
        <p className="text-xs text-muted-foreground">追蹤清單平均 P/E</p>
        <p className="mt-1 font-mono text-2xl font-bold text-stone-900">
          {avgPE ? avgPE.toFixed(1) : "—"}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">{peValues.length} 支股票有效數值</p>
      </Card>

      {/* Top 5 漲幅 */}
      <Card className="border-black/[0.07] bg-white p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-[#006e3f]" />
          <p className="text-xs font-medium text-stone-600">Top 5 漲幅</p>
        </div>
        {top5Gainers.length === 0 ? (
          <p className="text-xs text-stone-500">無資料</p>
        ) : (
          <div className="space-y-2">
            {top5Gainers.map((item) => (
              <div key={item.symbol} className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-stone-900">{item.symbol}</span>
                <span className="font-mono text-sm text-[#006e3f]">
                  +{item.quote!.changePercentage.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top 5 跌幅 */}
      <Card className="border-black/[0.07] bg-white p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <TrendingDown size={14} className="text-[#ff4757]" />
          <p className="text-xs font-medium text-stone-600">Top 5 跌幅</p>
        </div>
        {top5Losers.length === 0 ? (
          <p className="text-xs text-stone-500">無資料</p>
        ) : (
          <div className="space-y-2">
            {top5Losers.map((item) => (
              <div key={item.symbol} className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-stone-900">{item.symbol}</span>
                <span className="font-mono text-sm text-[#ff4757]">
                  {item.quote!.changePercentage.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 產業分佈圓餅圖 */}
      {sectorData.length > 0 && (
        <Card className="border-black/[0.07] bg-white p-4">
          <p className="mb-3 text-xs font-medium text-stone-600">產業分佈</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {sectorData.map((_, i) => (
                  <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#1c1917",
                }}
                formatter={(value) => [`${value} 支`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            {sectorData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1">
                <div
                  className="size-2 rounded-full"
                  style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                />
                <span className="text-[11px] text-stone-600">{s.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
