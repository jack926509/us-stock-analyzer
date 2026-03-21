"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { FmpQuote } from "@/lib/api/fmp"
import type { Watchlist } from "@/lib/db/schema"

type WatchlistEntry = Watchlist & { quote: FmpQuote | null }
type SortKey = "symbol" | "price" | "changePercent" | "marketCap" | "peRatio"
type SortDir = "asc" | "desc"

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="text-white/20" />
  return dir === "asc"
    ? <ArrowUp size={12} className="text-[#00d47e]" />
    : <ArrowDown size={12} className="text-[#00d47e]" />
}

function formatMarketCap(v: number | null): string {
  if (!v) return "—"
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  return `$${v.toFixed(0)}`
}

interface WatchlistTableProps {
  data: WatchlistEntry[]
  isLoading: boolean
}

export function WatchlistTable({ data, isLoading }: WatchlistTableProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>("changePercent")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [deleting, setDeleting] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const sorted = [...data].sort((a, b) => {
    let av: number, bv: number
    switch (sortKey) {
      case "symbol":
        return sortDir === "asc"
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol)
      case "price":
        av = a.quote?.price ?? 0
        bv = b.quote?.price ?? 0
        break
      case "changePercent":
        av = a.quote?.changesPercentage ?? 0
        bv = b.quote?.changesPercentage ?? 0
        break
      case "marketCap":
        av = a.quote?.marketCap ?? 0
        bv = b.quote?.marketCap ?? 0
        break
      case "peRatio":
        av = a.quote?.pe ?? 0
        bv = b.quote?.pe ?? 0
        break
      default:
        return 0
    }
    return sortDir === "asc" ? av - bv : bv - av
  })

  async function handleDelete(e: React.MouseEvent, symbol: string) {
    e.stopPropagation()
    setDeleting(symbol)
    try {
      const res = await fetch(`/api/stocks/${symbol}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success(`已移除 ${symbol}`)
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] })
    } catch {
      toast.error(`移除 ${symbol} 失敗`)
    } finally {
      setDeleting(null)
    }
  }

  function SortableHead({ label, col }: { label: string; col: SortKey }) {
    return (
      <TableHead
        className="cursor-pointer select-none text-white/50 hover:text-white"
        onClick={() => handleSort(col)}
      >
        <div className="flex items-center gap-1">
          {label}
          <SortIcon col={col} active={sortKey === col} dir={sortDir} />
        </div>
      </TableHead>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center">
        <p className="text-muted-foreground">追蹤清單為空</p>
        <p className="mt-1 text-sm text-white/30">點擊右上角「新增股票」開始追蹤</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <Table>
        <TableHeader>
          <TableRow className="border-white/5 hover:bg-transparent">
            <SortableHead label="代碼" col="symbol" />
            <TableHead className="text-white/50">公司名稱</TableHead>
            <SortableHead label="現價" col="price" />
            <SortableHead label="漲跌幅" col="changePercent" />
            <SortableHead label="市值" col="marketCap" />
            <SortableHead label="P/E" col="peRatio" />
            <TableHead className="text-white/50">52週高低</TableHead>
            <TableHead className="text-white/50" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const q = row.quote
            const isUp = (q?.changesPercentage ?? 0) >= 0
            return (
              <TableRow
                key={row.symbol}
                className="cursor-pointer border-white/5 transition-colors hover:bg-white/[0.03]"
                onClick={() => router.push(`/stock/${row.symbol}`)}
              >
                <TableCell>
                  <span className="font-mono font-bold text-white">{row.symbol}</span>
                </TableCell>
                <TableCell className="max-w-[180px] truncate text-white/70">
                  {row.name}
                </TableCell>
                <TableCell className="font-mono text-white">
                  {q ? `$${q.price.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell>
                  {q ? (
                    <Badge
                      variant="outline"
                      className={`border-0 font-mono text-xs ${
                        isUp
                          ? "bg-[#00d47e]/10 text-[#00d47e]"
                          : "bg-[#ff4757]/10 text-[#ff4757]"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {q.changesPercentage.toFixed(2)}%
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="font-mono text-white/70">
                  {formatMarketCap(q?.marketCap ?? null)}
                </TableCell>
                <TableCell className="font-mono text-white/70">
                  {q?.pe ? q.pe.toFixed(1) : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-white/50">
                  {q ? (
                    <span>
                      <span className="text-[#00d47e]">${q.yearHigh.toFixed(2)}</span>
                      {" / "}
                      <span className="text-[#ff4757]">${q.yearLow.toFixed(2)}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deleting === row.symbol}
                    onClick={(e) => handleDelete(e, row.symbol)}
                    className="h-7 px-2 text-white/30 hover:bg-[#ff4757]/10 hover:text-[#ff4757]"
                  >
                    <Trash2 size={13} />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
