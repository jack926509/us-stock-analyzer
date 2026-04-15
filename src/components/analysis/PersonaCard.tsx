"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import type { PersonaConfig, PersonaAnalysisResult, PersonaStance } from "@/types/personas"

interface PersonaCardState {
  content: string
  isDone: boolean
  result: PersonaAnalysisResult | null
  hasError?: boolean
}

interface Props {
  config: PersonaConfig
  state: PersonaCardState | undefined
  currentPrice?: number
}

const ACCENT_BORDER: Record<string, string> = {
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
  red: "border-l-red-500",
  slate: "border-l-slate-500",
}
const ACCENT_AVATAR: Record<string, string> = {
  amber: "bg-amber-500",
  violet: "bg-violet-500",
  red: "bg-red-500",
  slate: "bg-slate-500",
}
const ACCENT_TEXT: Record<string, string> = {
  amber: "text-amber-700",
  violet: "text-violet-700",
  red: "text-red-700",
  slate: "text-slate-700",
}

const STANCE_BADGE: Record<PersonaStance, { bg: string; text: string; label: string }> = {
  Bullish: { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-700", label: "看多" },
  Bearish: { bg: "bg-red-500/15 border-red-500/30", text: "text-red-700", label: "看空" },
  Neutral: { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-700", label: "中性" },
}

// Strip the trailing structured markers from visible markdown
function stripTrailingMarkers(content: string): string {
  return content
    .replace(/##\s*STANCE:.*$/gim, "")
    .replace(/##\s*CONFIDENCE:.*$/gim, "")
    .replace(/##\s*TARGET_LOW:.*$/gim, "")
    .replace(/##\s*TARGET_HIGH:.*$/gim, "")
    .trimEnd()
}

export function PersonaCard({ config, state, currentPrice }: Props) {
  const content = state?.content ?? ""
  const displayContent = stripTrailingMarkers(content)
  const isStreaming = !!state && !state.isDone
  const result = state?.result

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border-l-4 bg-white shadow-sm ring-1 ring-black/[0.08]",
        ACCENT_BORDER[config.accentColor] ?? "border-l-stone-500"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-black/[0.06] bg-black/[0.015] px-4 py-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
            ACCENT_AVATAR[config.accentColor] ?? "bg-stone-500"
          )}
        >
          {config.avatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-sm font-semibold", ACCENT_TEXT[config.accentColor] ?? "text-stone-700")}>
              {config.chineseName}
            </span>
            <span className="text-[11px] text-stone-500">{config.displayName}</span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-600">{config.philosophy}</p>
        </div>
        {result?.stance && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
              STANCE_BADGE[result.stance].bg,
              STANCE_BADGE[result.stance].text
            )}
          >
            {STANCE_BADGE[result.stance].label}
          </span>
        )}
      </div>

      {/* Confidence bar */}
      {result?.confidence !== null && result?.confidence !== undefined && (
        <div className="border-b border-black/[0.04] px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] text-stone-600">
            <span>信心度</span>
            <span className="font-semibold">{result.confidence}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                ACCENT_AVATAR[config.accentColor] ?? "bg-stone-500"
              )}
              style={{ width: `${Math.min(100, Math.max(0, result.confidence))}%` }}
            />
          </div>
        </div>
      )}

      {/* Target price */}
      {result?.targetPriceLow != null && result?.targetPriceHigh != null && (
        <div className="border-b border-black/[0.04] px-4 py-2 text-[11px] text-stone-600">
          <div className="flex items-center justify-between">
            <span>目標價範圍</span>
            <span className="font-semibold text-stone-800">
              ${result.targetPriceLow} – ${result.targetPriceHigh}
            </span>
          </div>
          {currentPrice && result.targetPriceLow && result.targetPriceHigh && (
            <div className="mt-0.5 text-right text-[10px] text-stone-500">
              {(() => {
                const mid = (result.targetPriceLow + result.targetPriceHigh) / 2
                const upside = ((mid - currentPrice) / currentPrice) * 100
                return (
                  <span className={upside >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {upside >= 0 ? "+" : ""}
                    {upside.toFixed(1)}% upside
                  </span>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
        {!content && isStreaming && (
          <div className="flex items-center gap-2 text-stone-500">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="dot-bounce size-1.5 rounded-full bg-stone-400"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="text-xs">思考中...</span>
          </div>
        )}
        {!content && !isStreaming && (
          <p className="text-xs text-stone-400">等待執行</p>
        )}
        {content && (
          <div className="prose prose-sm max-w-none text-stone-700">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="mt-3 text-sm font-semibold text-stone-800">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-2 text-xs font-semibold text-stone-700">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="my-1 text-xs leading-relaxed text-stone-700">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="my-1 list-disc pl-4 text-xs text-stone-700">{children}</ul>
                ),
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-stone-900">{children}</strong>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
            {isStreaming && (
              <span className="mt-1 inline-block h-3 w-0.5 animate-pulse bg-stone-500" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
