"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { AddStockDialog } from "./AddStockDialog"

interface NavbarProps {
  onRefresh?: () => void
  isRefreshing?: boolean
  /** 麵包屑模式 — 個股詳情頁顯示「‹ 儀表板 · NVDA」而不顯示 nav tabs */
  breadcrumb?: { label: string; href?: string }[]
}

const NAV_ITEMS = [
  { label: "儀表板", href: "/" },
  { label: "追蹤清單", href: "/?tab=watchlist" },
  { label: "深度分析", href: "/?tab=analysis" },
  { label: "持股", href: "/?tab=portfolio" },
  { label: "新聞", href: "/?tab=news" },
] as const

export function Navbar({ onRefresh, isRefreshing, breadcrumb }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard = pathname === "/"

  if (breadcrumb && breadcrumb.length > 0) {
    return (
      <header className="flex items-center gap-5 border-b border-hair bg-background px-4 py-3 sm:px-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ‹ 返回
        </button>
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/60">·</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-foreground">
                  {b.label}
                </Link>
              ) : (
                <span className="font-bold text-foreground">{b.label}</span>
              )}
            </span>
          ))}
        </span>
      </header>
    )
  }

  return (
    <header className="flex flex-wrap items-center gap-x-7 gap-y-3 border-b border-hair bg-background px-4 py-3.5 sm:px-8">
      <Link href="/" className="flex items-baseline gap-2.5">
        <span className="font-serif text-xl font-bold tracking-tight">US Stock Analyzer</span>
        <span className="hidden font-mono text-[10px] tracking-[0.1em] text-muted-foreground sm:inline">
          v2.4 · TERMINAL
        </span>
      </Link>

      <nav className="-mb-[15px] hidden md:flex">
        {NAV_ITEMS.map((t) => {
          const active = isDashboard && t.href === "/"
          return (
            <Link
              key={t.label}
              href={t.href}
              className={
                "border-b-2 px-3.5 py-2 text-xs font-semibold transition-colors " +
                (active
                  ? "border-brand text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </Link>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-md border border-hair bg-card px-3 py-1.5 font-mono text-[11px] font-semibold sm:flex">
          <span className="size-1.5 rounded-full bg-up shadow-[0_0_6px] shadow-up" />
          已連線 · 60S
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-9 items-center gap-1.5 rounded-md border border-hair bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            刷新
          </button>
        )}
        <AddStockDialog />
        <div className="flex size-8 items-center justify-center rounded-lg bg-ink font-serif text-xs font-bold text-ink-foreground">
          J
        </div>
      </div>
    </header>
  )
}
