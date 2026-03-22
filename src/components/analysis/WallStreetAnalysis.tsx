"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Sparkles, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AnalysisReport } from "@/types/index"

interface Props {
  symbol: string
  price?: number
}

type Rating = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell"

const RATING_CONFIG: Record<Rating, { color: string; bg: string; border: string }> = {
  "Strong Buy":  { color: "text-emerald-700", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  "Buy":         { color: "text-emerald-600", bg: "bg-green-500/15",   border: "border-green-500/30" },
  "Hold":        { color: "text-amber-700",   bg: "bg-yellow-500/15",  border: "border-yellow-500/30" },
  "Sell":        { color: "text-red-600",     bg: "bg-red-500/15",     border: "border-red-500/30" },
  "Strong Sell": { color: "text-rose-700",    bg: "bg-rose-500/15",    border: "border-rose-500/30" },
}

function RatingBadge({ rating }: { rating: string }) {
  const cfg = RATING_CONFIG[rating as Rating]
  if (!cfg) return null
  return (
    <span
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide",
        cfg.color, cfg.bg, cfg.border
      )}
    >
      {rating}
    </span>
  )
}

function TargetPriceBar({ low, high, current }: { low: number; high: number; current?: number }) {
  if (!low || !high) return null
  const mid = (low + high) / 2
  const pct = current ? Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100)) : 50
  const upside = current && mid > 0 ? ((mid - current) / current * 100).toFixed(1) : null

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs text-stone-600">
        <span>目標價範圍</span>
        {upside && (
          <span className={Number(upside) >= 0 ? "text-emerald-600" : "text-red-600"}>
            {Number(upside) >= 0 ? "+" : ""}{upside}% upside
          </span>
        )}
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/[0.08]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500/60 to-emerald-500/60"
          style={{ width: "100%" }}
        />
        {current && (
          <div
            className="absolute inset-y-0 w-0.5 -translate-x-0.5 rounded-full bg-white"
            style={{ left: `${pct}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[11px] text-stone-600">
        <span>${low}</span>
        <span className="font-medium text-stone-500">${mid.toFixed(0)} mid</span>
        <span>${high}</span>
      </div>
    </div>
  )
}

function HistoryCard({
  report,
  isActive,
  onClick,
}: {
  report: AnalysisReport
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg p-3 text-left transition-colors ring-1",
        isActive
          ? "bg-black/[0.06] ring-black/[0.15]"
          : "bg-[#faf6f1] ring-black/[0.06] hover:bg-black/5"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock size={11} className="shrink-0 text-stone-500" />
          <span className="text-xs text-stone-600">
            {report.createdAt ? new Date(report.createdAt).toLocaleDateString("zh-TW") : "—"}
          </span>
        </div>
        {report.rating && <RatingBadge rating={report.rating} />}
      </div>
      <p className="mt-1 text-[11px] text-stone-500">{report.modelVersion} · {report.promptVersion}</p>
      {report.targetPriceLow && report.targetPriceHigh && (
        <p className="mt-0.5 text-[11px] text-stone-600">
          目標價 ${report.targetPriceLow} – ${report.targetPriceHigh}
        </p>
      )}
    </button>
  )
}

export function WallStreetAnalysis({ symbol, price }: Props) {
  const [streamContent, setStreamContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeReportId, setActiveReportId] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Auto-scroll to bottom while streaming (useEffect avoids direct DOM mutation in render loop)
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamContent, isStreaming])

  // Fetch historical reports
  const { data: reports = [] } = useQuery<AnalysisReport[]>({
    queryKey: ["analysis-reports", symbol],
    queryFn: () => fetch(`/api/analysis/${symbol}`).then((r) => r.json()),
    staleTime: 0,
  })

  // Displayed content: streaming or selected historical
  const selectedReport = activeReportId !== null
    ? reports.find((r) => r.id === activeReportId)
    : null
  const displayContent = selectedReport ? selectedReport.content : streamContent

  async function handleGenerate() {
    if (isStreaming) {
      abortRef.current?.abort()
      return
    }

    abortRef.current = new AbortController()
    setStreamContent("")
    setActiveReportId(null)
    setIsStreaming(true)

    try {
      const res = await fetch(`/api/analysis/${symbol}`, {
        method: "POST",
        signal: abortRef.current.signal,
      })

      if (res.status === 429) {
        setStreamContent("⚠️ 請求過於頻繁，請稍候 1 分鐘後再試。")
        return
      }
      if (!res.ok || !res.body) throw new Error("Analysis request failed")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let content = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        setStreamContent(content)
      }

      // Refresh historical reports list after generation
      await queryClient.invalidateQueries({ queryKey: ["analysis-reports", symbol] })
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setStreamContent((prev) => prev + "\n\n⚠️ 請求中斷，請重試。")
      }
    } finally {
      setIsStreaming(false)
    }
  }

  // Parse rating + target price from current display content
  const ratingPatterns: Rating[] = ["Strong Buy", "Strong Sell", "Buy", "Sell", "Hold"]
  const detectedRating = ratingPatterns.find((r) => displayContent.includes(r)) ?? null
  const targetMatch = displayContent.match(/\$(\d+(?:\.\d+)?)\s*[-–]\s*\$(\d+(?:\.\d+)?)/)
  const targetLow = targetMatch ? parseFloat(targetMatch[1]) : (selectedReport?.targetPriceLow ?? null)
  const targetHigh = targetMatch ? parseFloat(targetMatch[2]) : (selectedReport?.targetPriceHigh ?? null)

  const isEmpty = !displayContent && !isStreaming

  return (
    <div className="space-y-4 py-2">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">華爾街分析引擎</h3>
          <p className="text-xs text-stone-500">由 Claude claude-sonnet-4-6 生成，模擬頂級投行研究報告</p>
        </div>
        <div className="flex items-center gap-2">
          {reports.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-stone-600 ring-1 ring-black/[0.1] hover:text-stone-600 transition-colors"
            >
              <Clock size={12} />
              歷史報告 ({reports.length})
              {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={false}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              isStreaming
                ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20 hover:bg-red-500/15"
                : "bg-[#00d47e]/15 text-[#006e3f] ring-1 ring-[#00d47e]/30 hover:bg-[#00d47e]/25"
            )}
          >
            {isStreaming ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                中止生成
              </>
            ) : displayContent ? (
              <>
                <RefreshCw size={14} />
                重新分析
              </>
            ) : (
              <>
                <Sparkles size={14} />
                生成分析報告
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historical reports */}
      {showHistory && reports.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {reports.map((r) => (
            <HistoryCard
              key={r.id}
              report={r}
              isActive={activeReportId === r.id}
              onClick={() => {
                setActiveReportId(activeReportId === r.id ? null : r.id)
                setStreamContent("")
              }}
            />
          ))}
        </div>
      )}

      {/* Analysis summary header (when content available) */}
      {(detectedRating || (targetLow && targetHigh)) && displayContent && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white px-4 py-3 ring-1 ring-black/[0.08]">
          {detectedRating && (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] uppercase tracking-wider text-stone-500">評級</p>
              <RatingBadge rating={detectedRating} />
            </div>
          )}
          {targetLow && targetHigh && (
            <div className="flex-1" style={{ minWidth: 200 }}>
              <p className="text-[10px] uppercase tracking-wider text-stone-500">目標價</p>
              <TargetPriceBar low={targetLow} high={targetHigh} current={price} />
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-4 rounded-lg bg-[#faf6f1] py-16 ring-1 ring-black/[0.06]">
          <div className="flex size-14 items-center justify-center rounded-full bg-[#00d47e]/10">
            <Sparkles size={20} className="text-[#006e3f]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-stone-500">準備生成 AI 研究報告</p>
            <p className="mt-1 text-xs text-stone-500">
              分析將涵蓋基本面、估值、催化劑、風險與投資建議
            </p>
          </div>
        </div>
      )}

      {/* Streaming indicator */}
      {isStreaming && !displayContent && (
        <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-4 ring-1 ring-black/[0.08]">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="dot-bounce size-1.5 rounded-full bg-[#00d47e]"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-stone-600">正在進行華爾街級別分析，請稍候...</p>
        </div>
      )}

      {/* Analysis content */}
      {displayContent && (
        <div
          ref={scrollRef}
          className="max-h-[70vh] overflow-y-auto rounded-lg bg-[#faf6f1] p-5 ring-1 ring-black/[0.08]"
        >
          <div className="prose prose-sm prose-stone max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="mt-6 border-b border-black/[0.1] pb-2 text-base font-semibold text-stone-900 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-4 text-sm font-semibold text-stone-700">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{children}</p>
                ),
                li: ({ children }) => (
                  <li className="text-sm leading-relaxed text-stone-600">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-stone-900">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto">
                    <table className="w-full text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-black/[0.1] bg-black/5 px-3 py-1.5 text-left text-stone-600">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-black/[0.1] px-3 py-1.5 text-stone-500">{children}</td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#00d47e]/50 pl-3 text-stone-600 italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
          {isStreaming && (
            <span className="mt-1 inline-block h-4 w-0.5 animate-pulse bg-[#00d47e]" />
          )}
        </div>
      )}
    </div>
  )
}
