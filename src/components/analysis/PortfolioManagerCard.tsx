"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Gavel } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MultiPersonaSynthesis } from "@/types/personas"

interface Props {
  content: string
  synthesis: MultiPersonaSynthesis | null
  isStreaming: boolean
}

const REC_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  "Strong Buy": { bg: "bg-emerald-500/15", text: "text-emerald-700", border: "border-emerald-500/30" },
  Buy: { bg: "bg-green-500/15", text: "text-emerald-600", border: "border-green-500/30" },
  Hold: { bg: "bg-amber-500/15", text: "text-amber-700", border: "border-amber-500/30" },
  Sell: { bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30" },
  "Strong Sell": { bg: "bg-rose-500/15", text: "text-rose-700", border: "border-rose-500/30" },
}

// Strip trailing markers from display
function stripTrailingMarkers(content: string): string {
  return content
    .replace(/##\s*FINAL_RECOMMENDATION:.*$/gim, "")
    .replace(/##\s*DIVERGENCE_SCORE:.*$/gim, "")
    .trimEnd()
}

export function PortfolioManagerCard({ content, synthesis, isStreaming }: Props) {
  const displayContent = stripTrailingMarkers(content)
  const rec = synthesis?.finalRecommendation
  const recStyle = rec ? REC_STYLE[rec] : null

  return (
    <div className="overflow-hidden rounded-lg bg-gradient-to-br from-stone-50 to-amber-50/30 shadow-sm ring-1 ring-amber-500/20">
      <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <Gavel size={16} className="text-amber-700" />
        <h3 className="text-sm font-semibold text-amber-900">投資組合經理 · 綜合仲裁</h3>
        {rec && recStyle && (
          <span
            className={cn(
              "ml-auto rounded-full border px-3 py-0.5 text-xs font-bold",
              recStyle.bg,
              recStyle.text,
              recStyle.border
            )}
          >
            {rec}
          </span>
        )}
      </div>

      <div className="px-4 py-3">
        {!content && isStreaming && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="dot-bounce size-1.5 rounded-full bg-amber-500"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span>Portfolio Manager 仲裁中...</span>
          </div>
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
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-black/[0.08] bg-black/[0.03] px-2 py-1 text-left font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-black/[0.08] px-2 py-1">{children}</td>
                ),
                ul: ({ children }) => (
                  <ul className="my-1 list-disc pl-4 text-xs">{children}</ul>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-stone-900">{children}</strong>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
            {isStreaming && (
              <span className="mt-1 inline-block h-3 w-0.5 animate-pulse bg-amber-500" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
