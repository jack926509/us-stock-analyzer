"use client"

import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { LogoTile } from "@/components/design/LogoTile"
import { ChangeBadge } from "@/components/design/ChangeBadge"
import { fmtCap, changeColor } from "@/lib/format"
import type { FmpProfile } from "@/lib/api/fmp"

interface StockHeaderProps {
  profile: FmpProfile | null
  symbol: string
  price?: number
  changePercentage?: number
  change?: number
}

export function StockHeader({ profile, symbol, price, changePercentage, change }: StockHeaderProps) {
  const displayPrice = price ?? profile?.price ?? 0
  const displayChange = change ?? profile?.change ?? 0
  const displayChangePct = changePercentage ?? profile?.changePercentage ?? 0
  const color = changeColor(displayChangePct)

  return (
    <div className="border-b border-black/[0.07] bg-secondary px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-[1360px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} />
          返回追蹤清單
        </Link>

        <div className="mt-3 flex flex-wrap items-start gap-4 lg:flex-nowrap lg:gap-[18px]">
          <LogoTile symbol={symbol} size={56} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className="m-0 font-serif text-2xl font-semibold tracking-tight sm:text-[28px]"
                style={{ letterSpacing: "-0.02em" }}
              >
                {profile?.companyName ?? symbol}
              </h1>
              <span className="rounded bg-black/[0.08] px-2 py-0.5 font-mono text-[11px] text-stone-600">
                {profile?.symbol ?? symbol}
              </span>
              {profile?.exchange && (
                <span className="text-[11px] text-muted-foreground">{profile.exchange}</span>
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
            {profile && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[profile.sector, profile.industry, profile.country].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="text-right lg:ml-auto">
            <div
              className="font-num text-2xl font-bold tracking-tighter sm:text-3xl lg:text-[32px]"
              style={{ letterSpacing: "-0.02em" }}
            >
              ${displayPrice.toFixed(2)}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-end gap-2">
              <span className="font-num text-[13px] font-semibold" style={{ color }}>
                {displayChange >= 0 ? "+" : ""}
                {displayChange.toFixed(2)} ({displayChangePct >= 0 ? "+" : ""}
                {displayChangePct.toFixed(2)}%)
              </span>
              <ChangeBadge pct={displayChangePct} size="sm" />
            </div>
          </div>

          {/* Meta stats */}
          {profile && (
            <div className="flex w-full flex-wrap gap-5 pt-1.5 text-[11px] lg:w-auto lg:gap-[22px]">
              {profile.marketCap > 0 && (
                <Stat label="市值" value={fmtCap(profile.marketCap)} />
              )}
              {profile.beta !== 0 && (
                <Stat label="Beta" value={profile.beta.toFixed(2)} />
              )}
              {profile.country && <Stat label="國家" value={profile.country} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-stone-500">{label}</div>
      <div className="mt-0.5 font-num font-semibold text-foreground">{value}</div>
    </div>
  )
}
