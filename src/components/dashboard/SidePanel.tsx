"use client"

import { LogoTile } from "@/components/design/LogoTile"
import { fmtPct } from "@/lib/format"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }

interface SidePanelProps {
  data: WatchlistEntry[]
}

export function SidePanel({ data }: SidePanelProps) {
  const withQuotes = data.filter((d): d is WatchlistEntry & { quote: FmpQuote } => d.quote !== null)

  const peValues = withQuotes
    .map((d) => d.quote.pe)
    .filter((pe): pe is number => typeof pe === "number" && pe > 0 && pe < 1000)
  const avgPE = peValues.length > 0 ? peValues.reduce((s, v) => s + v, 0) / peValues.length : null

  const gainers = [...withQuotes]
    .filter((d) => d.quote.changePercentage > 0)
    .sort((a, b) => b.quote.changePercentage - a.quote.changePercentage)
    .slice(0, 5)

  const losers = [...withQuotes]
    .filter((d) => d.quote.changePercentage < 0)
    .sort((a, b) => a.quote.changePercentage - b.quote.changePercentage)
    .slice(0, 5)

  return (
    <aside className="flex flex-col gap-3.5">
      {/* Avg P/E */}
      <div className="rounded-xl border border-black/[0.06] bg-white p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          清單平均 P/E
        </div>
        <div
          className="mt-1 font-num text-[32px] font-bold"
          style={{ letterSpacing: "-0.02em" }}
        >
          {avgPE ? avgPE.toFixed(1) : "—"}
        </div>
        <div className="text-[11px] text-stone-500">
          {peValues.length} 支有效 · S&P 平均 24.6
        </div>
      </div>

      {/* Top gainers */}
      <SidePanelList
        title="Top 5 漲幅"
        symbol="▲"
        symbolColor="#006e3f"
        items={gainers}
        valueColor="#006e3f"
      />

      {/* Top losers */}
      <SidePanelList
        title="Top 5 跌幅"
        symbol="▼"
        symbolColor="#c62828"
        items={losers}
        valueColor="#c62828"
      />
    </aside>
  )
}

interface SidePanelListProps {
  title: string
  symbol: string
  symbolColor: string
  items: Array<{ symbol: string; quote: FmpQuote }>
  valueColor: string
}

function SidePanelList({ title, symbol, symbolColor, items, valueColor }: SidePanelListProps) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-4">
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="text-[11px]" style={{ color: symbolColor }}>{symbol}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
          {title}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="py-2 text-[11px] text-stone-400">無資料</div>
      ) : (
        items.map((w) => (
          <div key={w.symbol} className="flex items-center justify-between py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <LogoTile symbol={w.symbol} size={20} />
              <span className="font-num font-bold">{w.symbol}</span>
            </div>
            <span className="font-num font-semibold" style={{ color: valueColor }}>
              {fmtPct(w.quote.changePercentage)}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
