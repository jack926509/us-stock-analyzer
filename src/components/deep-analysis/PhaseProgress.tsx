"use client"

import { CheckCircle2, Loader2, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentPhase } from "@/lib/agents/types"

const PHASES: { id: AgentPhase; label: string; description: string }[] = [
  { id: "masters", label: "投資大師", description: "6 位大師獨立分析" },
  { id: "debate", label: "多空辯論", description: "Bull / Bear / 研究主管" },
  { id: "risk", label: "風險辯論", description: "激進 / 保守 / 中立" },
  { id: "portfolio", label: "投組整合", description: "最終決策報告" },
]

export type PhaseStatus = "pending" | "running" | "done"

interface Props {
  phases: Record<AgentPhase, PhaseStatus>
}

export function PhaseProgress({ phases }: Props) {
  return (
    <div className="rounded-lg bg-white px-4 py-4 ring-1 ring-black/[0.08]">
      <div className="flex items-center justify-between gap-2">
        {PHASES.map((p, i) => {
          const status = phases[p.id]
          const isLast = i === PHASES.length - 1
          return (
            <div key={p.id} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-colors",
                    status === "done" && "bg-emerald-50 ring-1 ring-emerald-300",
                    status === "running" && "bg-[#CC785C]/10 ring-1 ring-[#CC785C]/40",
                    status === "pending" && "bg-stone-100 ring-1 ring-stone-200"
                  )}
                >
                  {status === "done" && <CheckCircle2 size={16} className="text-emerald-600" />}
                  {status === "running" && <Loader2 size={16} className="animate-spin text-[#CC785C]" />}
                  {status === "pending" && <Circle size={16} className="text-stone-400" />}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium text-stone-800">{p.label}</p>
                  <p className="text-[10px] text-stone-500">{p.description}</p>
                </div>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    status === "done" ? "bg-emerald-300" : "bg-stone-200"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
