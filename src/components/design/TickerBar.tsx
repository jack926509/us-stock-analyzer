"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { FmpQuote } from "@/lib/api/fmp"

interface TickerItem {
  sym: string
  v: number
  d: number
}

// 非美股三指數的部分先用 mock — 等接 Finnhub/外部 commodity feed 後再換
const SUPPLEMENTARY: TickerItem[] = [
  { sym: "VIX", v: 14.82, d: -3.21 },
  { sym: "US10Y", v: 4.218, d: 0.04 },
  { sym: "BTC", v: 92341, d: 1.24 },
  { sym: "ETH", v: 3284, d: 0.81 },
  { sym: "GOLD", v: 2814, d: 0.42 },
  { sym: "WTI", v: 71.34, d: -0.81 },
  { sym: "DXY", v: 104.21, d: 0.12 },
  { sym: "EURUSD", v: 1.0842, d: -0.08 },
  { sym: "USDJPY", v: 154.21, d: 0.34 },
]

function nowEDT(): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  return fmt.format(new Date())
}

export function TickerBar() {
  const [time, setTime] = useState(nowEDT())

  useEffect(() => {
    const id = setInterval(() => setTime(nowEDT()), 1000)
    return () => clearInterval(id)
  }, [])

  const { data } = useQuery<FmpQuote[]>({
    queryKey: ["market-indices"],
    queryFn: () => fetch("/api/market").then((r) => r.json()),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  const indices: TickerItem[] = (Array.isArray(data) ? data : []).map((q) => ({
    sym: q.symbol,
    v: q.price,
    d: q.changePercentage,
  }))

  const items = [...indices, ...SUPPLEMENTARY]
  if (items.length === 0) return null

  // 軌道複製兩份做無縫循環
  const track = [...items, ...items]

  return (
    <div className="relative flex h-8 items-center overflow-hidden border-b border-white/[0.08] bg-[#0E0E0E] whitespace-nowrap">
      <div className="relative z-[2] flex h-full shrink-0 items-center gap-1.5 bg-brand px-3 font-mono text-[10px] font-bold tracking-[0.12em] text-white">
        <span className="inline-block size-1.5 rounded-full bg-up-neon shadow-[0_0_6px] shadow-up-neon" />
        LIVE · {time} EDT
      </div>
      <div className="relative flex h-full flex-1 items-center overflow-hidden">
        <div className="inline-flex animate-ticker-scroll pl-4">
          {track.map((it, i) => {
            const up = it.d >= 0
            return (
              <div
                key={`${it.sym}-${i}`}
                className="mr-6 inline-flex items-baseline gap-[7px] font-mono text-[11px]"
              >
                <span className="font-bold tracking-[0.04em] text-[#F4EFE6]">{it.sym}</span>
                <span className="text-[#F4EFE6] tabular-nums">
                  {it.v.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className={"font-semibold " + (up ? "text-up-neon" : "text-down-neon")}>
                  {up ? "▲" : "▼"} {Math.abs(it.d).toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
