"use client"

import Link from "next/link"
import { Star, Plus, Share2, ExternalLink } from "lucide-react"
import { LogoTile } from "@/components/design/LogoTile"
import { fmtCap, changeColor } from "@/lib/format"
import type { FmpProfile } from "@/lib/api/fmp"

interface StockHeaderProps {
  profile: FmpProfile | null
  symbol: string
  price?: number
  changePercentage?: number
  change?: number
}

export function StockHeader({
  profile,
  symbol,
  price,
  changePercentage,
  change,
}: StockHeaderProps) {
  const displayPrice = price ?? profile?.price ?? 0
  const displayChange = change ?? profile?.change ?? 0
  const displayChangePct = changePercentage ?? profile?.changePercentage ?? 0
  const up = displayChangePct >= 0
  const color = changeColor(displayChangePct)

  const metaLine = [profile?.country ?? "US", profile?.exchange, profile?.sector, profile?.industry]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase()

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center gap-5 border-b border-hair bg-background px-4 py-3 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ‹ 儀表板
        </Link>
        <span className="text-muted-foreground/50">·</span>
        <span className="font-mono text-xs font-bold text-foreground">{symbol}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-1 rounded-md border border-hair bg-card px-3 py-1.5 text-[11px] font-semibold hover:bg-paper">
            <Star size={12} /> 加入追蹤
          </button>
          <button className="flex items-center gap-1 rounded-md border border-hair bg-card px-3 py-1.5 text-[11px] font-semibold hover:bg-paper">
            <Plus size={12} /> 加入持倉
          </button>
          <button className="flex items-center gap-1 rounded-md border border-hair bg-card px-3 py-1.5 text-[11px] font-semibold hover:bg-paper">
            <Share2 size={12} /> 分享
          </button>
        </div>
      </div>

      {/* Big header */}
      <div className="border-b border-hair bg-background px-4 py-5 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-[18px]">
          <LogoTile symbol={symbol} size={64} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1
                className="font-mono text-3xl font-bold tracking-tight"
                style={{ letterSpacing: "-0.01em" }}
              >
                {symbol}
              </h1>
              <span className="font-serif text-lg font-medium">
                {profile?.companyName ?? "—"}
              </span>
              {metaLine && (
                <span className="font-mono text-[11px] tracking-[0.06em] text-muted-foreground">
                  {metaLine}
                </span>
              )}
              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            <div className="mt-3.5 flex flex-wrap items-end gap-x-6 gap-y-3">
              {/* Price */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-base text-muted-foreground">$</span>
                  <span
                    className="font-mono font-bold leading-[0.95] tabular-nums text-[44px] sm:text-[56px]"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {displayPrice.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  LAST · UPDATED 60S
                </div>
              </div>

              {/* Change pill */}
              <div>
                <div
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-base font-bold text-white"
                  style={{ background: color }}
                >
                  {up ? "▲" : "▼"} {displayChange >= 0 ? "+" : ""}
                  {displayChange.toFixed(2)} {displayChangePct >= 0 ? "+" : ""}
                  {displayChangePct.toFixed(2)}%
                </div>
                {profile?.beta !== undefined && profile.beta !== 0 && (
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    BETA {profile.beta.toFixed(2)} · MCAP {fmtCap(profile.marketCap)}
                  </div>
                )}
              </div>

              {/* PRE / POST market — 留位，未串接時顯示 placeholder */}
              <div className="ml-auto flex gap-2">
                {(["PRE", "POST"] as const).map((label) => (
                  <div
                    key={label}
                    className="rounded-lg border border-hair bg-card px-3 py-2 text-right"
                  >
                    <div className="font-mono text-[9px] font-bold tracking-[0.12em] text-muted-foreground">
                      {label} MARKET
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-muted-foreground">
                      —
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">未開放</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
