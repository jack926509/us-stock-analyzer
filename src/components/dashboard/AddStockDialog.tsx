"use client"

import { useState, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
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

interface SearchResult {
  symbol: string
  name: string
  exchange: string
}

export function AddStockDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
        const data = (await res.json()) as SearchResult[]
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [query])

  async function handleAdd(symbol: string) {
    setAdding(symbol)
    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      })

      if (res.status === 409) {
        toast.warning(`${symbol} 已在追蹤清單中`)
        return
      }

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        toast.error(err.error ?? "新增失敗")
        return
      }

      toast.success(`已加入追蹤：${symbol}`)
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] })
      setOpen(false)
    } catch {
      toast.error("網路錯誤，請稍後再試")
    } finally {
      setAdding(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 bg-[#00d47e] text-black hover:bg-[#00b86d]" />
        }
      >
        <Plus size={16} />
        新增股票
      </DialogTrigger>

      <DialogContent className="border-white/10 bg-[#111827] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">新增追蹤股票</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="輸入股票代碼或公司名稱..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-muted-foreground"
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
                onClick={() => handleAdd(r.symbol)}
                disabled={adding === r.symbol}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-[#00d47e]">{r.symbol}</span>
                  <span className="truncate text-sm text-white/80">{r.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-white/20 text-xs text-white/50">
                    {r.exchange}
                  </Badge>
                  {adding === r.symbol ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  ) : (
                    <Plus size={14} className="text-muted-foreground" />
                  )}
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
