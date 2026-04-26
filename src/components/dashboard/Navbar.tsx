"use client"

import { RefreshCw, Search } from "lucide-react"
import { AddStockDialog } from "./AddStockDialog"

interface NavbarProps {
  onRefresh: () => void
  isRefreshing: boolean
}

const NAV_ITEMS = ["儀表板", "個股分析", "深度分析", "我的持股", "追蹤清單"] as const

export function Navbar({ onRefresh, isRefreshing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.07] bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-3.5 sm:px-8">
        {/* Brand + nav */}
        <div className="flex items-center gap-7">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#CC785C] text-[11px] font-extrabold tracking-tighter text-white">
              US
            </div>
            <span className="font-serif text-[17px] font-semibold tracking-tight text-foreground">
              US Stock Analyzer
            </span>
          </div>
          <nav className="hidden items-center gap-1 text-[13px] md:flex">
            {NAV_ITEMS.map((label, i) => (
              <span
                key={label}
                className={
                  i === 0
                    ? "rounded-md bg-[#CC785C]/10 px-3 py-1.5 font-semibold text-foreground"
                    : "rounded-md px-3 py-1.5 font-medium text-muted-foreground"
                }
              >
                {label}
              </span>
            ))}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden h-9 w-60 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-xs text-stone-400 lg:flex">
            <Search size={13} />
            <span className="flex-1">搜尋代號或公司名稱…</span>
            <kbd className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </div>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-9 items-center gap-1.5 rounded-md border border-black/[0.1] bg-white px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            刷新
          </button>
          <AddStockDialog />
        </div>
      </div>
    </header>
  )
}
