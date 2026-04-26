"use client"

import { TradingViewWidget } from "@/components/charts/TradingViewWidget.dynamic"
import { TradingViewTechAnalysis } from "@/components/charts/TradingViewTechAnalysis.dynamic"
import type { FmpQuote } from "@/lib/api/fmp"

interface Props {
  tvSymbol: string
  quote?: FmpQuote | null
}

function f2(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—"
  return v.toFixed(2)
}

function fVol(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—"
  if (v >= 1e9) return (v / 1e9).toFixed(1) + "B"
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M"
  if (v >= 1e3) return (v / 1e3).toFixed(0) + "K"
  return v.toFixed(0)
}

const PERIOD_BTNS = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"] as const

export function ChartCard({ tvSymbol, quote }: Props) {
  const vwap =
    quote && quote.dayHigh && quote.dayLow && quote.price
      ? (quote.dayHigh + quote.dayLow + quote.price) / 3
      : null

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair-soft px-4 py-2.5 sm:px-4">
        <div className="flex flex-wrap gap-1">
          {PERIOD_BTNS.map((p, i) => (
            <button
              key={p}
              className={
                "rounded px-2.5 py-1.5 font-mono text-[11px] font-bold " +
                (i === 2 ? "bg-ink text-ink-foreground" : "text-foreground hover:bg-hair-soft")
              }
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["CANDLE", "LINE", "AREA"] as const).map((t, i) => (
            <button
              key={t}
              className={
                "rounded border border-hair px-2.5 py-1 font-mono text-[10px] font-bold " +
                (i === 0 ? "bg-ink text-ink-foreground" : "hover:bg-hair-soft")
              }
            >
              {t}
            </button>
          ))}
          <span className="hidden h-4 w-px bg-hair sm:inline-block" />
          {(["MA", "RSI", "VOL", "MACD"] as const).map((t) => (
            <button
              key={t}
              className="rounded border border-hair px-2.5 py-1 font-mono text-[10px] font-bold hover:bg-hair-soft"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* TradingView chart */}
      <div className="grid grid-cols-1 gap-px bg-hair-soft xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 bg-card p-3 sm:p-4">
          <TradingViewWidget symbol={tvSymbol} height={400} />
        </div>
        <div className="bg-card p-3 sm:p-4">
          <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            TECH ANALYSIS · TRADINGVIEW
          </div>
          <TradingViewTechAnalysis symbol={tvSymbol} width="100%" height={360} />
        </div>
      </div>

      {/* OHLC strip */}
      <div className="grid grid-cols-4 gap-x-3 gap-y-2.5 border-t border-hair-soft bg-black/[0.02] px-4 py-2.5 sm:grid-cols-8 sm:px-[18px]">
        {[
          ["OPEN", f2(quote?.open)],
          ["HIGH", f2(quote?.dayHigh)],
          ["LOW", f2(quote?.dayLow)],
          ["CLOSE", f2(quote?.price)],
          ["VWAP", f2(vwap)],
          ["VOL", fVol(quote?.volume)],
          ["52W H", f2(quote?.yearHigh)],
          ["52W L", f2(quote?.yearLow)],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="font-mono text-[9px] font-bold tracking-[0.1em] text-muted-foreground">
              {l}
            </div>
            <div className="mt-0.5 font-mono text-[13px] font-bold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
