"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { TickerBar } from "@/components/design/TickerBar"
import { CommandLine } from "@/components/design/CommandLine"
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
      <TickerBar />
      <Navbar onRefresh={handleRefresh} isRefreshing={isFetching} />
      <CommandLine />

      <main className="flex-1 px-4 pb-12 pt-3.5 sm:px-8">
        <IndicesStrip />

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            <PortfolioHero />
            <WatchlistTable data={data} isLoading={isLoading} />
            <HoldingsTable />
          </div>
          <aside className="flex flex-col gap-5">
            <SidePanel data={data} />
            <SectorBreakdown data={data} />
            <NewsRail />
          </aside>
        </div>
      </main>
    </div>
  )
}
