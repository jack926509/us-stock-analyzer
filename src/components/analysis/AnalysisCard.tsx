"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Sparkles, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { SectionHeader } from "@/components/design/SectionHeader"
import type { AnalysisReport } from "@/types"

interface Props {
  symbol: string
}

const RATING_BADGE: Record<NonNullable<AnalysisReport["rating"]>, { label: string; bg: string }> = {
  "Strong Buy": { label: "強力買進", bg: "#10A37F" },
  Buy: { label: "買進", bg: "#34A853" },
  Hold: { label: "持有", bg: "#A88B5C" },
  Sell: { label: "賣出", bg: "#D55F3E" },
  "Strong Sell": { label: "強力賣出", bg: "#B33A2A" },
}

export function AnalysisCard({ symbol }: Props) {
  const [report, setReport] = useState<AnalysisReport | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/analysis/${symbol}`, { method: "POST" })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? "分析失敗")
      }
      return (await res.json()) as AnalysisReport
    },
    onSuccess: (data) => setReport(data),
  })

  const loading = mutation.isPending
  const error = mutation.error?.message
  const badge = report?.rating ? RATING_BADGE[report.rating] : null

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-card">
      <SectionHeader
        eyebrow="AI ANALYSIS · CLAUDE SONNET 4.6"
        title="全能型有價分析師"
        right={
          <button
            onClick={() => mutation.mutate()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : report ? <RefreshCw size={12} /> : <Sparkles size={12} />}
            {loading ? "分析中..." : report ? "重新分析" : "開始分析"}
          </button>
        }
      />

      <div className="p-5">
        {!report && !loading && !error && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Sparkles size={28} className="opacity-60" />
            <p className="text-sm">點擊「開始分析」由 Claude Sonnet 4.6 給出評級、目標價、多空對比與倉位建議</p>
            <p className="font-mono text-[11px] text-muted-foreground/70">預估耗時 20-40 秒</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 size={28} className="animate-spin text-brand" />
            <p className="text-sm">Claude 正在分析 {symbol}...</p>
            <p className="font-mono text-[11px] text-muted-foreground">通常 20-40 秒內完成</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 rounded-md border border-down/40 bg-down/5 p-3 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-down" />
            <div>
              <div className="font-semibold">分析失敗</div>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {report && !loading && (
          <article className="space-y-3">
            {badge && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-3 py-1.5 font-mono text-xs font-bold tracking-wide text-white"
                  style={{ background: badge.bg }}
                >
                  {badge.label} · {report.rating}
                </span>
                {report.targetPriceLow != null && report.targetPriceHigh != null && (
                  <span className="font-mono text-xs text-muted-foreground">
                    目標價 ${report.targetPriceLow}-${report.targetPriceHigh}
                  </span>
                )}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {new Date(report.generatedAt).toLocaleString("zh-TW")}
                </span>
              </div>
            )}
            <div className="prose prose-sm max-w-none font-serif prose-headings:font-serif prose-headings:font-semibold prose-p:leading-relaxed prose-table:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.content}</ReactMarkdown>
            </div>
            <p className="border-t border-hair-soft pt-3 font-mono text-[10px] text-muted-foreground/70">
              本分析由 AI 生成，僅供研究參考，不構成投資建議。
            </p>
          </article>
        )}
      </div>
    </section>
  )
}
