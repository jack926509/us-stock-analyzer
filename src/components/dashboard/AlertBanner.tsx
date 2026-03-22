"use client"

import { useMemo } from "react"
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }

interface Alert {
  symbol: string
  message: string
  type: "up" | "down" | "warn"
}

function buildAlerts(data: WatchlistEntry[]): Alert[] {
  const alerts: Alert[] = []
  for (const entry of data) {
    const q = entry.quote
    if (!q) continue
    const pct = q.changePercentage ?? 0
    if (pct >= 5) {
      alerts.push({ symbol: q.symbol, message: `上漲 +${pct.toFixed(1)}%`, type: "up" })
    } else if (pct <= -5) {
      alerts.push({ symbol: q.symbol, message: `下跌 ${pct.toFixed(1)}%`, type: "down" })
    }
    if (q.price && q.yearLow && q.price <= q.yearLow * 1.05) {
      alerts.push({ symbol: q.symbol, message: `接近 52 週低點 $${q.yearLow}`, type: "warn" })
    }
  }
  return alerts
}

const ICON = {
  up:   <TrendingUp size={13} />,
  down: <TrendingDown size={13} />,
  warn: <AlertTriangle size={13} />,
}

const STYLE = {
  up:   "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
  down: "bg-red-500/10 text-red-700 ring-red-500/20",
  warn: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
}

interface Props {
  data: WatchlistEntry[]
}

export function AlertBanner({ data }: Props) {
  const alerts = useMemo(() => buildAlerts(data), [data])

  if (alerts.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {alerts.map((a, i) => (
        <div
          key={`${a.symbol}-${a.type}-${i}`}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1",
            STYLE[a.type]
          )}
        >
          {ICON[a.type]}
          <span className="font-semibold">{a.symbol}</span>
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  )
}
