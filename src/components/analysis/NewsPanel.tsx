"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink, ChevronDown, ChevronUp, Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NewsItem } from "@/types/index"

interface Props {
  symbol: string
}

type SentimentFilter = "all" | "positive" | "negative" | "neutral"

const SENTIMENT_CONFIG = {
  positive: { label: "正面", color: "text-green-400", bg: "bg-green-500/10 text-green-400 ring-green-500/20" },
  negative: { label: "負面", color: "text-red-400", bg: "bg-red-500/10 text-red-400 ring-red-500/20" },
  neutral:  { label: "中性", color: "text-white/50", bg: "bg-white/5 text-white/50 ring-white/10" },
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  if (diffH < 1) return `${Math.floor(diffMs / 60_000)}m 前`
  if (diffH < 24) return `${diffH}h 前`
  return `${Math.floor(diffH / 24)}d 前`
}

function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SENTIMENT_CONFIG[item.sentiment]

  return (
    <div className="border-b border-white/5 py-3 last:border-0">
      <div
        className="flex cursor-pointer items-start gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Sentiment indicator */}
        <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full ring-1", cfg.bg)} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium ring-1", cfg.bg)}>
              {cfg.label}
            </span>
            <span className="text-[11px] text-white/30">{item.source}</span>
            <span className="text-[11px] text-white/20">{timeAgo(item.publishedAt)}</span>
          </div>
          <p className="mt-1 text-sm font-medium leading-snug text-white/80">
            {item.title}
          </p>
        </div>

        <div className="mt-1 shrink-0 text-white/30">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="ml-5 mt-2 space-y-2">
          {item.summary && (
            <p className="text-xs leading-relaxed text-white/50">{item.summary}</p>
          )}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-[#00d47e] hover:underline"
          >
            閱讀原文 <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  )
}

export function NewsPanel({ symbol }: Props) {
  const [filter, setFilter] = useState<SentimentFilter>("all")

  const { data: news = [], isLoading, isError } = useQuery<NewsItem[]>({
    queryKey: ["news", symbol],
    queryFn: () => fetch(`/api/news/${symbol}`).then((r) => r.json()),
    staleTime: 30 * 60 * 1000, // 30 min
    retry: 1,
  })

  const filtered = filter === "all" ? news : news.filter((n) => n.sentiment === filter)

  // Sentiment counts
  const counts = {
    positive: news.filter((n) => n.sentiment === "positive").length,
    negative: news.filter((n) => n.sentiment === "negative").length,
    neutral: news.filter((n) => n.sentiment === "neutral").length,
  }

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    )
  }

  if (isError || !Array.isArray(news)) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Newspaper size={24} className="text-white/20" />
        <p className="text-sm text-white/30">無法載入新聞</p>
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Newspaper size={24} className="text-white/20" />
        <p className="text-sm text-white/30">近 30 天無相關新聞</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "positive", "negative", "neutral"] as SentimentFilter[]).map((f) => {
          const count = f === "all" ? news.length : counts[f]
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors ring-1",
                filter === f
                  ? f === "all"
                    ? "bg-white/15 text-white ring-white/20"
                    : f === "positive"
                    ? "bg-green-500/20 text-green-400 ring-green-500/30"
                    : f === "negative"
                    ? "bg-red-500/20 text-red-400 ring-red-500/30"
                    : "bg-white/10 text-white/60 ring-white/15"
                  : "bg-transparent text-white/40 ring-white/10 hover:text-white/70"
              )}
            >
              {f === "all" ? "全部" : SENTIMENT_CONFIG[f].label}
              <span className="ml-1 opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* News list */}
      <div className="rounded-lg bg-white/[0.02] px-4 ring-1 ring-white/8">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/30">無此情緒類別的新聞</p>
        ) : (
          filtered.map((item) => <NewsCard key={item.url + item.publishedAt} item={item} />)
        )}
      </div>
    </div>
  )
}
