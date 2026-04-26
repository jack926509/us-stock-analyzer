"use client"

import { DonutChart } from "@/components/design/DonutChart"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }

const SECTOR_COLORS = ["#CC785C", "#1A1A1A", "#8B6F47", "#A85C44", "#6B6357", "#D4956A"]

interface SectorBreakdownProps {
  data: WatchlistEntry[]
}

export function SectorBreakdown({ data }: SectorBreakdownProps) {
  const sectorMap = new Map<string, number>()
  for (const item of data) {
    const sector = item.sector ?? "Other"
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1)
  }
  const sectors = Array.from(sectorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({ name, count, color: SECTOR_COLORS[i % SECTOR_COLORS.length] }))
  const total = sectors.reduce((s, x) => s + x.count, 0)

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-6">
      <h3 className="m-0 font-serif text-base font-semibold tracking-tight">產業分佈</h3>
      <div className="mt-0.5 text-[11px] text-stone-500">
        追蹤清單依 GICS 分類佔比
      </div>
      <div className="mt-[22px] flex items-center gap-6">
        {total > 0 ? (
          <>
            <DonutChart data={sectors} size={170} />
            <div className="flex flex-1 flex-col gap-3">
              {sectors.map((s) => (
                <div key={s.name} className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  <span className="flex-1 text-xs text-stone-700">{s.name}</span>
                  <span className="font-num text-xs text-stone-500">{s.count} 支</span>
                  <span className="w-10 text-right font-num text-[11px] text-stone-500">
                    {((s.count / total) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-8 text-sm text-stone-400">尚無資料</div>
        )}
      </div>
    </div>
  )
}
