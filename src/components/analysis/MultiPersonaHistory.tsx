"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { PERSONA_CONFIGS } from "@/config/persona-prompts"
import type { PersonaId } from "@/types/personas"
import type { MultiPersonaReportRow } from "@/lib/db/schema"

type ParsedReport = MultiPersonaReportRow & { personaIdList: PersonaId[] }

interface Props {
  symbol: string
}

const REC_COLORS: Record<string, string> = {
  "Strong Buy": "text-emerald-700 bg-emerald-500/10",
  Buy: "text-emerald-600 bg-green-500/10",
  Hold: "text-amber-700 bg-amber-500/10",
  Sell: "text-red-600 bg-red-500/10",
  "Strong Sell": "text-rose-700 bg-rose-500/10",
}

function formatDate(iso?: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function MultiPersonaHistory({ symbol }: Props) {
  const { data: reports, isLoading } = useQuery<MultiPersonaReportRow[]>({
    queryKey: ["multi-persona-reports", symbol],
    queryFn: () =>
      fetch(`/api/analysis/${symbol}/multi-persona`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch history")
        return r.json()
      }),
    staleTime: 0,
  })

  const parsed = useMemo<ParsedReport[]>(() => {
    if (!reports) return []
    return reports.map((r) => {
      let personaIdList: PersonaId[] = []
      try {
        personaIdList = JSON.parse(r.personaIds) as PersonaId[]
      } catch {
        /* malformed row — render with no pills */
      }
      return { ...r, personaIdList }
    })
  }, [reports])

  if (isLoading) {
    return <div className="text-xs text-stone-500">載入歷史報告...</div>
  }

  if (parsed.length === 0) {
    return null
  }

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
        <Clock size={12} />
        歷史多師分析（{parsed.length}）
      </h4>
      <div className="space-y-1.5">
        {parsed.map((r) => {
          const recClass = r.finalRecommendation ? REC_COLORS[r.finalRecommendation] : ""
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-xs ring-1 ring-black/[0.06]"
            >
              <span className="text-stone-500">{formatDate(r.createdAt)}</span>
              {r.finalRecommendation && (
                <span className={cn("rounded px-2 py-0.5 font-semibold", recClass)}>
                  {r.finalRecommendation}
                </span>
              )}
              {r.divergenceScore != null && (
                <span className="text-stone-600">分歧 {r.divergenceScore}</span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {r.personaIdList.map((id) => {
                  const cfg = PERSONA_CONFIGS[id]
                  if (!cfg) return null
                  return (
                    <span
                      key={id}
                      className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600"
                    >
                      {cfg.chineseName}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
