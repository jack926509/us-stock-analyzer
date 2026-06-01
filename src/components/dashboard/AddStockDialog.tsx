"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Search, Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { addToWatchlist, getWatchlist } from "@/lib/watchlist"
import { useSymbolSearch, type SearchResult } from "@/hooks/useSymbolSearch"

export function AddStockDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { results, searching } = useSymbolSearch(query, { debounceMs: 400 })

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  function handleAdd(item: SearchResult) {
    const upper = item.symbol.toUpperCase()
    if (getWatchlist().some((w) => w.symbol === upper)) {
      toast.warning(`${upper} 已在追蹤清單中`)
      return
    }
    // sector 由後續 quote/profile 回流時補；先快速加入，不擋 UX
    addToWatchlist({ symbol: upper, name: item.name, sector: null })
    toast.success(`已加入追蹤：${upper}`)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 bg-[#CC785C] text-white hover:bg-[#B8674F]" />
        }
      >
        <Plus size={16} />
        新增股票
      </DialogTrigger>

      <DialogContent className="border-black/[0.1] bg-white text-stone-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-stone-900">新增追蹤股票</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="輸入股票代碼或公司名稱..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-black/[0.1] bg-black/5 pl-9 text-stone-900 placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}

          {!searching && results.length === 0 && query.trim() && (
            <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的股票</p>
          )}

          {!searching && results.length === 0 && !query.trim() && (
            <p className="py-8 text-center text-sm text-muted-foreground">輸入股票代碼或公司名稱搜尋</p>
          )}

          {!searching &&
            results.map((r) => (
              <button
                key={r.symbol}
                onClick={() => handleAdd(r)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#CC785C]">{r.symbol}</span>
                  <span className="truncate text-sm text-stone-700">{r.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-black/[0.12] text-xs text-stone-600">
                    {r.exchange}
                  </Badge>
                  <Plus size={14} className="text-muted-foreground" />
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
