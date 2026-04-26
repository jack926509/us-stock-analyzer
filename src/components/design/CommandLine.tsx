"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface SearchResult {
  symbol: string
  name: string
  exchange: string
}

const FUNCTION_KEYS = ["DES", "CHART", "PEERS", "NEWS", "AGENTS"] as const

export function CommandLine() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === "Escape") {
        inputRef.current?.blur()
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    return () => window.removeEventListener("mousedown", onClick)
  }, [])

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
        setResults(Array.isArray(data) ? data.slice(0, 8) : [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [query])

  function navigate(symbol: string, action?: string) {
    const sym = symbol.trim().toUpperCase()
    if (!sym) return
    setOpen(false)
    setQuery("")
    if (action === "AGENTS") router.push(`/stock/${sym}/deep-analysis`)
    else router.push(`/stock/${sym}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const top = results[0]?.symbol ?? query
      navigate(top)
    }
  }

  return (
    <div className="px-4 pb-1 pt-3.5 sm:px-8" ref={wrapRef}>
      <div className="relative flex h-11 items-center overflow-hidden rounded-lg bg-ink text-ink-foreground">
        <div className="flex h-full shrink-0 items-center gap-2 bg-brand px-3.5 font-mono text-[11px] font-bold tracking-[0.1em] text-white">
          <span>⌕</span>
          <span>CMD</span>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="輸入代號或指令... 例：NVDA  ·  TSLA DES  ·  AAPL CHART  ·  AGENT BUFFETT"
          className="h-full flex-1 bg-transparent px-3.5 font-mono text-[13px] text-[#F4EFE6] placeholder:text-white/40 outline-none"
        />
        <div className="hidden h-full shrink-0 items-center gap-px p-1 sm:flex">
          {FUNCTION_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => {
                const top = results[0]?.symbol ?? query
                navigate(top, k)
              }}
              className="h-full rounded px-2.5 font-mono text-[10px] font-bold tracking-[0.06em] text-[#F4EFE6] hover:bg-white/10"
            >
              {k} ›
            </button>
          ))}
        </div>
        <div className="hidden shrink-0 px-3.5 font-mono text-[10px] text-white/50 lg:block">⌘K</div>
      </div>

      {open && (results.length > 0 || searching) && (
        <div className="relative">
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-hair bg-card shadow-lg sm:w-[640px]">
            {searching && (
              <div className="px-4 py-3 font-mono text-[11px] text-muted-foreground">搜尋中…</div>
            )}
            {!searching &&
              results.map((r) => (
                <button
                  key={r.symbol + r.exchange}
                  onClick={() => navigate(r.symbol)}
                  className="flex w-full items-center justify-between border-t border-hair-soft px-4 py-2.5 text-left first:border-t-0 hover:bg-paper"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[13px] font-bold text-brand">{r.symbol}</span>
                    <span className="truncate text-xs text-foreground">{r.name}</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.exchange}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
