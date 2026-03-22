"use client"

import { useMemo } from "react"
import { calculateScore } from "@/lib/scoring"
import { cn } from "@/lib/utils"
import type { FmpKeyMetrics, FmpRatios } from "@/lib/api/fmp"
import type { ScoreDimension } from "@/lib/scoring"

interface Props {
  keyMetrics: FmpKeyMetrics[]
  ratios: FmpRatios[]
  sector?: string
  isLoading?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#059669"
  if (score >= 55) return "#2563eb"
  if (score >= 40) return "#d97706"
  return "#dc2626"
}

function getGradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-600"
  if (grade.startsWith("B")) return "text-blue-600"
  if (grade === "C") return "text-amber-600"
  return "text-red-600"
}

// SVG circular gauge
function CircularGauge({ score, grade }: { score: number; grade: string }) {
  const radius = 54
  const stroke = 8
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className="relative flex items-center justify-center">
      <svg width={140} height={140} className="-rotate-90">
        {/* Track */}
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={70}
          cy={70}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-stone-900">{score}</span>
        <span className={cn("text-lg font-bold", getGradeColor(grade))}>{grade}</span>
      </div>
    </div>
  )
}

function DimensionBar({ dim }: { dim: ScoreDimension }) {
  const color = getScoreColor(dim.score)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-600">{dim.label}</span>
          <span className="text-[10px] text-stone-500">({dim.weight}%)</span>
        </div>
        <span className="text-xs font-semibold" style={{ color }}>
          {dim.score}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${dim.score}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function ScoreCard({ keyMetrics, ratios, sector, isLoading }: Props) {
  const result = useMemo(() => {
    if (!keyMetrics.length && !ratios.length) return null
    return calculateScore(keyMetrics, ratios, sector)
  }, [keyMetrics, ratios, sector])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-lg bg-black/5" />
        <div className="h-6 animate-pulse rounded bg-black/5" />
        <div className="h-6 animate-pulse rounded bg-black/5" />
        <div className="h-6 animate-pulse rounded bg-black/5" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="py-10 text-center text-sm text-stone-500">
        無法計算評分，財務數據不足
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-[#faf6f1] p-5 ring-1 ring-black/[0.08]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-stone-900">綜合財務評分</h4>
          <p className="mt-0.5 text-[11px] text-stone-500">
            評分基準：{result.sectorLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Circular gauge */}
        <div className="shrink-0">
          <CircularGauge score={result.total} grade={result.grade} />
          <p className="mt-1 text-center text-[11px] text-stone-500">滿分 100 分</p>
        </div>

        {/* Dimension bars */}
        <div className="flex-1 space-y-3 w-full">
          {result.dimensions.map((dim) => (
            <DimensionBar key={dim.name} dim={dim} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-[10px] text-stone-500">
        * 評分僅供參考，基於現有財務數據計算。成長性維度使用 PEG 比率作為代理指標，數據有限時準確度降低。
      </p>
    </div>
  )
}
