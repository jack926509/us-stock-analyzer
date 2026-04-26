"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, List, Atom, Wallet, User } from "lucide-react"

const TABS = [
  { id: "dashboard", label: "儀表板", href: "/", icon: LayoutGrid },
  { id: "watchlist", label: "清單", href: "/?tab=watchlist", icon: List },
  { id: "analysis", label: "分析", href: "/?tab=analysis", icon: Atom },
  { id: "portfolio", label: "持股", href: "/?tab=portfolio", icon: Wallet },
  { id: "profile", label: "我", href: "/?tab=profile", icon: User },
] as const

// 底部 5-tab — 僅 lg 以下顯示，模仿 mobile-screens.jsx 的米色玻璃 tab bar
export function MobileTabBar() {
  const pathname = usePathname()
  const isStockDetail = pathname?.startsWith("/stock/")
  const activeId = isStockDetail ? "analysis" : "dashboard"

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-hair bg-background/90 px-2 pb-6 pt-2 backdrop-blur-md lg:hidden"
      aria-label="主導航"
    >
      {TABS.map((t) => {
        const active = t.id === activeId
        const Icon = t.icon
        return (
          <Link
            key={t.id}
            href={t.href}
            className={
              "flex flex-1 flex-col items-center gap-1 px-2 py-1.5 transition-colors " +
              (active ? "text-brand" : "text-muted-foreground")
            }
          >
            <Icon size={20} strokeWidth={1.6} />
            <span className="text-[10px] font-semibold tracking-[0.02em]">{t.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
