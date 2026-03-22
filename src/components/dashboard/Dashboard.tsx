"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Navbar } from "./Navbar"
import { MarketOverview } from "./MarketOverview"
import { WatchlistTable } from "./WatchlistTable"
import { MetricsPanel } from "./MetricsPanel"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }

export function Dashboard() {
  const queryClient = useQueryClient()

  const { data = [], isLoading, isFetching } = useQuery<WatchlistEntry[]>({
    queryKey: ["watchlist"],
    queryFn: () => fetch("/api/stocks").then((r) => r.json()),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey: ["watchlist"] })
    void queryClient.invalidateQueries({ queryKey: ["market-indices"] })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f3ee]">
      <Navbar onRefresh={handleRefresh} isRefreshing={isFetching} />

      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-6 py-6">
        {/* 大盤指數 */}
        <MarketOverview />

        {/* 主內容：追蹤清單 + 側邊面板 */}
        <div className="mt-6 flex gap-6">
          {/* 追蹤清單（主區域） */}
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-stone-600">
                追蹤清單
                {data.length > 0 && (
                  <span className="ml-2 text-stone-500">({data.length})</span>
                )}
              </h2>
            </div>
            <WatchlistTable data={data} isLoading={isLoading} />
          </div>

          {/* 側邊面板 */}
          {data.length > 0 && (
            <div className="w-56 shrink-0">
              <MetricsPanel data={data} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
