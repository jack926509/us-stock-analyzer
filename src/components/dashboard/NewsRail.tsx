"use client"

import { useQuery } from "@tanstack/react-query"
import type { NewsItem } from "@/types/index"

const SENT = {
  positive: { dot: "#006e3f", label: "正面", bg: "rgba(0,212,126,0.1)" },
  negative: { dot: "#c62828", label: "負面", bg: "rgba(255,71,87,0.1)" },
  neutral: { dot: "#888", label: "中性", bg: "rgba(0,0,0,0.05)" },
} as const

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} 小時前`
  const diffD = Math.floor(diffH / 24)
  return `${diffD} 天前`
}

export function NewsRail() {
  // 用 SPY 當市場新聞代理 — Finnhub 對 SPY 的 news 偏向總體市場
  const { data, isLoading } = useQuery<NewsItem[]>({
    queryKey: ["news", "SPY"],
    queryFn: () => fetch("/api/news/SPY").then((r) => r.json()),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  })

  const items = (Array.isArray(data) ? data : []).slice(0, 5)

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="m-0 font-serif text-base font-semibold tracking-tight">市場新聞</h3>
        <span className="text-[11px] font-medium text-[#CC785C]">查看全部 →</span>
      </div>
      <div className="mt-3.5 flex flex-col">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="border-t border-black/[0.05] py-3 first:border-0">
              <div className="h-3 w-full animate-pulse rounded bg-black/[0.05]" />
              <div className="mt-1.5 h-2.5 w-24 animate-pulse rounded bg-black/[0.05]" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">暫無市場新聞</div>
        ) : (
          items.map((n) => {
            const s = SENT[n.sentiment] ?? SENT.neutral
            return (
              <a
                key={n.url + n.publishedAt}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-t border-black/[0.05] py-3 first:border-0 hover:bg-black/[0.02]"
              >
                <div className="text-[12.5px] font-medium leading-snug text-foreground">
                  {n.title}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{ background: s.bg, color: s.dot }}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-stone-500">{n.source}</span>
                  <span className="text-[10px] text-stone-300">·</span>
                  <span className="text-[10px] text-stone-500">{timeAgo(n.publishedAt)}</span>
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
