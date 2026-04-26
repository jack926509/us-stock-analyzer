"use client"

import { SectionHeader } from "@/components/design/SectionHeader"
import { fmtCap } from "@/lib/format"
import type { FmpProfile, FmpQuote } from "@/lib/api/fmp"

interface Props {
  profile: FmpProfile | null
  quote?: FmpQuote | null
}

function f2(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—"
  return v.toFixed(2)
}

function fInt(v: number | null | undefined): string {
  if (v == null || isNaN(v)) return "—"
  return v.toLocaleString()
}

// Bloomberg DES (Description) 風格報價單 — 兩欄 label / value 16 列
export function QuoteSheet({ profile, quote }: Props) {
  const rows: Array<[string, string]> = [
    ["OPEN", f2(quote?.open)],
    ["HIGH", f2(quote?.dayHigh)],
    ["LOW", f2(quote?.dayLow)],
    ["PREV CLOSE", f2(quote?.previousClose)],
    ["52W HIGH", f2(quote?.yearHigh)],
    ["52W LOW", f2(quote?.yearLow)],
    ["MARKET CAP", profile?.marketCap ? fmtCap(profile.marketCap) : "—"],
    ["VOLUME", quote?.volume ? fInt(quote.volume) : "—"],
    ["EXCHANGE", profile?.exchange ?? quote?.exchange ?? "—"],
    ["BETA (5Y)", profile?.beta ? f2(profile.beta) : "—"],
    ["P/E TTM", quote?.pe ? f2(quote.pe) : "—"],
    ["SECTOR", profile?.sector ?? "—"],
    ["INDUSTRY", profile?.industry ?? "—"],
    ["COUNTRY", profile?.country ?? "—"],
    ["WEBSITE", profile?.website ? new URL(profile.website).host : "—"],
    ["SYMBOL", profile?.symbol ?? quote?.symbol ?? "—"],
  ]

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-card">
      <SectionHeader eyebrow="DESCRIPTION · DES" title="報價單" />
      <div>
        {rows.map(([l, v], i) => (
          <div
            key={l}
            className={
              "flex items-center justify-between gap-3 px-4 py-2 font-mono text-[11px] sm:px-[18px] " +
              (i === 0 ? "" : "border-t border-hair-soft")
            }
          >
            <span className="font-bold tracking-[0.04em] text-muted-foreground">{l}</span>
            <span className="truncate text-right font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
