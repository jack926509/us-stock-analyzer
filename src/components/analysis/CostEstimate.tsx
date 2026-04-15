"use client"

import { DollarSign } from "lucide-react"

// claude-sonnet-4-6 pricing reference
const INPUT_TOKENS_PER_PERSONA = 3000
const OUTPUT_TOKENS_PER_PERSONA = 800
const PM_OUTPUT_TOKENS = 500
const INPUT_COST_PER_TOKEN = 3 / 1_000_000 // $3 / 1M
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000 // $15 / 1M

export function estimateCost(personaCount: number): number {
  if (personaCount < 2) return 0
  const input = INPUT_TOKENS_PER_PERSONA * personaCount * INPUT_COST_PER_TOKEN
  const output =
    (OUTPUT_TOKENS_PER_PERSONA * personaCount + PM_OUTPUT_TOKENS) * OUTPUT_COST_PER_TOKEN
  return input + output
}

export function CostEstimate({ personaCount }: { personaCount: number }) {
  if (personaCount < 2) {
    return (
      <div className="text-xs text-stone-500">請選擇 2–4 位大師</div>
    )
  }
  const cost = estimateCost(personaCount)
  return (
    <div className="flex items-center gap-1.5 text-xs text-stone-600">
      <DollarSign size={12} />
      <span>預計費用：約 ${cost.toFixed(3)}</span>
    </div>
  )
}
