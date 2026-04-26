"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Navbar } from "./Navbar"
import { IndicesStrip } from "./IndicesStrip"
import { PortfolioHero } from "./PortfolioHero"
import { HoldingsTable } from "./HoldingsTable"
import { SidePanel } from "./SidePanel"
import { WatchlistTable } from "./WatchlistTable"
import { SectorBreakdown } from "./SectorBreakdown"
import { NewsRail } from "./NewsRail"
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar onRefresh={handleRefresh} isRefreshing={isFetching} />

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-12 pt-5 sm:px-8">
        <IndicesStrip />

        <div className="mt-6">
          <PortfolioHero />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <HoldingsTable />
          <SidePanel data={data} />
        </div>

        <div className="mt-8">
          <WatchlistTable data={data} isLoading={isLoading} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          <SectorBreakdown data={data} />
          <NewsRail />
        </div>
      </main>
    </div>
  )
}
