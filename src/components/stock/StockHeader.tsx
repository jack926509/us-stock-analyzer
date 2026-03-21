"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FmpProfile } from "@/lib/api/fmp"

interface StockHeaderProps {
  profile: FmpProfile | null
  symbol: string
  price?: number
  changePercentage?: number
  change?: number
}

function fmt(n: number, decimals = 2) {
  return n.toFixed(decimals)
}

function fmtMarketCap(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T"
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M"
  return n.toFixed(0)
}

export function StockHeader({ profile, symbol, price, changePercentage, change }: StockHeaderProps) {
  const displayPrice = price ?? profile?.price ?? 0
  const displayChange = change ?? profile?.change ?? 0
  const displayChangePct = changePercentage ?? profile?.changePercentage ?? 0
  const isPositive = displayChangePct >= 0

  return (
    <div className="border-b border-white/5 bg-[#0d1221] px-6 py-4">
      <div className="mx-auto max-w-screen-2xl">
        {/* Back link */}
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={12} />
          返回追蹤清單
        </Link>

        <div className="flex flex-wrap items-start gap-4">
          {/* Logo */}
          {profile?.image && (
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
              <Image
                src={profile.image}
                alt={profile.companyName}
                width={48}
                height={48}
                className="size-full object-contain"
                unoptimized
              />
            </div>
          )}

          {/* Name + symbol */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {profile?.companyName ?? symbol}
              </h1>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono font-medium text-white/60">
                {profile?.symbol ?? symbol}
              </span>
              {profile?.exchange && (
                <span className="text-xs text-white/30">{profile.exchangeFullName || profile.exchange}</span>
              )}
              {profile?.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
            {profile && (
              <p className="mt-0.5 text-xs text-white/40">
                {[profile.sector, profile.industry].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Price + change */}
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-white">
              ${fmt(displayPrice)}
            </p>
            <p
              className={cn(
                "text-sm font-medium tabular-nums",
                isPositive ? "text-green-400" : "text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {fmt(displayChange)} ({isPositive ? "+" : ""}
              {fmt(displayChangePct)}%)
            </p>
          </div>

          {/* Meta stats */}
          {profile && (
            <div className="flex flex-wrap gap-4 text-right text-xs">
              {profile.marketCap > 0 && (
                <div>
                  <p className="text-white/30">市值</p>
                  <p className="font-medium text-white/70">${fmtMarketCap(profile.marketCap)}</p>
                </div>
              )}
              {profile.beta !== 0 && (
                <div>
                  <p className="text-white/30">Beta</p>
                  <p className="font-medium text-white/70">{fmt(profile.beta)}</p>
                </div>
              )}
              {profile.country && (
                <div>
                  <p className="text-white/30">國家</p>
                  <p className="font-medium text-white/70">{profile.country}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        {profile?.description && (
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-white/30 line-clamp-2">
            {profile.description}
          </p>
        )}
      </div>
    </div>
  )
}
