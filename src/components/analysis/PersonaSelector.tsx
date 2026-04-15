"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { PERSONA_CONFIGS } from "@/config/persona-prompts"
import type { PersonaId } from "@/types/personas"

interface Props {
  selected: PersonaId[]
  onChange: (ids: PersonaId[]) => void
  maxSelect?: number
  disabled?: boolean
}

const ACCENT_BG: Record<string, string> = {
  amber: "bg-amber-50 ring-amber-500/40",
  violet: "bg-violet-50 ring-violet-500/40",
  red: "bg-red-50 ring-red-500/40",
  slate: "bg-slate-100 ring-slate-500/40",
}

const ACCENT_TEXT: Record<string, string> = {
  amber: "text-amber-700",
  violet: "text-violet-700",
  red: "text-red-700",
  slate: "text-slate-700",
}

const ACCENT_CIRCLE: Record<string, string> = {
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  red: "bg-red-500",
  slate: "bg-slate-500",
}

export function PersonaSelector({ selected, onChange, maxSelect = 4, disabled }: Props) {
  const personas = Object.values(PERSONA_CONFIGS)

  const toggle = (id: PersonaId) => {
    if (disabled) return
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      if (selected.length >= maxSelect) return
      onChange([...selected, id])
    }
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {personas.map((p) => {
        const isSelected = selected.includes(p.id)
        const isFull = !isSelected && selected.length >= maxSelect
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => toggle(p.id)}
            disabled={disabled || isFull}
            className={cn(
              "group relative flex items-start gap-3 rounded-lg p-3 text-left transition-all",
              "ring-1",
              isSelected
                ? `${ACCENT_BG[p.accentColor] ?? "bg-stone-50 ring-stone-400"} shadow-sm`
                : "bg-white ring-black/[0.08] hover:ring-black/20",
              (disabled || isFull) && "cursor-not-allowed opacity-50"
            )}
          >
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                ACCENT_CIRCLE[p.accentColor] ?? "bg-stone-500"
              )}
            >
              {p.avatarInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-semibold", ACCENT_TEXT[p.accentColor] ?? "text-stone-700")}>
                  {p.chineseName}
                </span>
                <span className="text-[11px] text-stone-500">{p.displayName}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-stone-600">
                {p.philosophy}
              </p>
            </div>
            {isSelected && (
              <div
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                  ACCENT_CIRCLE[p.accentColor] ?? "bg-stone-500"
                )}
              >
                <Check size={12} strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
