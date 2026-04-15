"use client"

import { cn } from "@/lib/utils"
import type { PersonaAnalysisResult, MultiPersonaSynthesis } from "@/types/personas"

interface Props {
  results: PersonaAnalysisResult[]
  synthesis: MultiPersonaSynthesis | null
}

export function DivergenceMeter({ results, synthesis }: Props) {
  const stances = results.map((r) => r.stance).filter(Boolean)
  const bullish = stances.filter((s) => s === "Bullish").length
  const bearish = stances.filter((s) => s === "Bearish").length
  const neutral = stances.filter((s) => s === "Neutral").length
  const total = stances.length

  // Compute local divergence if synthesis not yet available
  const computedScore = (() => {
    if (total < 2) return 0
    const dominant = Math.max(bullish, bearish, neutral)
    return Math.round((1 - dominant / total) * 100)
  })()

  const score = synthesis?.divergenceScore ?? computedScore

  const colorClass =
    score < 30
      ? "from-emerald-500 to-emerald-400"
      : score < 60
        ? "from-amber-500 to-yellow-400"
        : "from-rose-500 to-red-500"

  const label = score < 30 ? "高度共識" : score < 60 ? "觀點分歧" : "嚴重對立"

  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-black/[0.08]">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          分歧度 Divergence
        </h4>
        <span className={cn("text-xs font-semibold", score < 30 ? "text-emerald-700" : score < 60 ? "text-amber-700" : "text-rose-700")}>
          {label}（{score}/100）
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/[0.05]">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all", colorClass)}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-emerald-700">
          <span className="size-2 rounded-full bg-emerald-500" />
          看多 {bullish}
        </span>
        <span className="flex items-center gap-1 text-amber-700">
          <span className="size-2 rounded-full bg-amber-500" />
          中性 {neutral}
        </span>
        <span className="flex items-center gap-1 text-rose-700">
          <span className="size-2 rounded-full bg-rose-500" />
          看空 {bearish}
        </span>
      </div>

      {synthesis?.keyDisagreements && synthesis.keyDisagreements.length > 0 && (
        <div className="mt-3 border-t border-black/[0.05] pt-2 text-[11px] text-stone-600">
          <span className="font-semibold text-stone-700">關鍵分歧：</span>
          {synthesis.keyDisagreements.join("；")}
        </div>
      )}
    </div>
  )
}
