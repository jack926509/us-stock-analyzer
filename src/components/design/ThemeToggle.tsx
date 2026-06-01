"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/useTheme"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === "dark"
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "切換為淺色主題" : "切換為深色主題"}
      title={isDark ? "切換為淺色" : "切換為深色"}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-hair text-foreground/70 transition-colors hover:bg-paper hover:text-foreground"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}
