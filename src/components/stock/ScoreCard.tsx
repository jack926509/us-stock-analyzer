"use client"

import { useMemo } from "react"
import { calculateScore } from "@/lib/scoring"
import { UP_COLOR, DOWN_COLOR } from "@/lib/format"
import type { FmpKeyMetrics, FmpRatios, FmpIncomeStatement } from "@/lib/api/fmp"
import type { ScoreDimension } from "@/lib/scoring"

interface Props {
  keyMetrics: FmpKeyMetrics[]
  ratios: FmpRatios[]
  income?: FmpIncomeStatement[]
  sector?: string
  isLoading?: boolean
}

function dimensionColor(score: number): string {
  if (score >= 70) return UP_COLOR
  if (score >= 50) return "#CC785C"
  if (score >= 35) return "#888"
  return DOWN_COLOR
}

function gradeBadge(grade: string) {
  if (grade.startsWith("A")) {
    return { label: "STRONG", bg: UP_COLOR, color: "#fff" }
  }
  if (grade.startsWith("B")) {
    return { label: "GOOD", bg: "rgba(0,212,126,0.15)", color: UP_COLOR }
  }
  if (grade === "C") {
    return { label: "NEUTRAL", bg: "rgba(0,0,0,0.06)", color: "#666" }
  }
  return { label: "WEAK", bg: "rgba(255,71,87,0.12)", color: DOWN_COLOR }
}

function DimensionBar({ dim }: { dim: ScoreDimension }) {
  const color = dimensionColor(dim.score)
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-stone-700">
          {dim.label}
          <span className="ml-1 text-[10px] text-stone-400">({dim.weight}%)</span>
        </span>
        <span className="font-num font-semibold" style={{ color }}>
          {(dim.score / 10).toFixed(1)}
        </span>
      </div>
      <div className="h-[5px] rounded-sm bg-black/[0.05]">
        <div
          className="h-full rounded-sm transition-all duration-700"
          style={{ width: `${dim.score}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function ScoreCard({ keyMetrics, ratios, income, sector, isLoading }: Props) {
  const result = useMemo(() => {
    if (!keyMetrics.length && !ratios.length) return null
    return calculateScore(keyMetrics, ratios, sector, income)
  }, [keyMetrics, ratios, sector, income])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-black/[0.06] bg-white p-[18px]">
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-black/[0.05]" />
          ))}
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="rounded-xl border border-black/[0.06] bg-white p-[18px] text-center">
        <p className="text-sm text-muted-foreground">無法計算評分</p>
        <p className="mt-1 text-xs text-stone-400">財務數據不足</p>
      </div>
    )
  }

  const tenScale = result.total / 10
  const badge = gradeBadge(result.grade)

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-[18px]">
      <div className="flex items-baseline justify-between">
        <span className="font-serif text-xs font-semibold">綜合評分</span>
        <span className="text-[9px] uppercase tracking-wider text-stone-500">
          {result.sectorLabel}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className="font-num text-[44px] font-bold tracking-tighter"
          style={{ letterSpacing: "-0.02em" }}
        >
          {tenScale.toFixed(1)}
        </span>
        <span className="text-[13px] text-stone-500">/ 10</span>
        <span
          className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-3.5 flex flex-col gap-2.5">
        {result.dimensions.map((dim) => (
          <DimensionBar key={dim.name} dim={dim} />
        ))}
      </div>
    </div>
  )
}
