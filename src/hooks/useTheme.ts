"use client"

import { useEffect, useState } from "react"

type Theme = "light" | "dark"
const KEY = "theme"

function getInitial(): Theme {
  if (typeof window === "undefined") return "light"
  const stored = window.localStorage.getItem(KEY)
  if (stored === "dark" || stored === "light") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function apply(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle("dark", theme === "dark")
}

export function useTheme(): { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    const t = getInitial()
    setThemeState(t)
    apply(t)
  }, [])

  function setTheme(next: Theme): void {
    setThemeState(next)
    apply(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // localStorage 不可用就放棄持久化
    }
  }

  return {
    theme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
    setTheme,
  }
}
