"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddStockDialog } from "./AddStockDialog"

interface NavbarProps {
  onRefresh: () => void
  isRefreshing: boolean
}

export function Navbar({ onRefresh, isRefreshing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.07] bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded bg-[#CC785C]">
            <span className="text-xs font-bold text-white">US</span>
          </div>
          <span className="text-base font-serif font-semibold tracking-tight text-stone-900">US Stock Analyzer</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-1.5 text-muted-foreground hover:text-stone-900"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            刷新
          </Button>
          <AddStockDialog />
        </div>
      </div>
    </header>
  )
}
