import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 將大數字格式化為 T/B/M/K 單位顯示
 * isReversedPolarity: true 表示「數值越低越好」的指標（如 D/E ratio），
 * 避免負數被誤標為紅色
 */
export function formatFinancialNumber(
  value: number,
  isReversedPolarity = false
): { formatted: string; colorClass: string } {
  const abs = Math.abs(value)
  let formatted: string

  if (abs >= 1_000_000_000_000) {
    formatted = (value / 1_000_000_000_000).toFixed(2) + "T"
  } else if (abs >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(2) + "B"
  } else if (abs >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(2) + "M"
  } else if (abs >= 1_000) {
    formatted = (value / 1_000).toFixed(2) + "K"
  } else {
    formatted = value.toFixed(2)
  }

  let colorClass = "text-foreground"
  if (value < 0) {
    colorClass = isReversedPolarity ? "text-green-500" : "text-red-500"
  } else if (value > 0) {
    colorClass = isReversedPolarity ? "text-red-500" : "text-green-500"
  }

  return { formatted, colorClass }
}

export function formatPercent(value: number, decimals = 2): string {
  return (value * 100).toFixed(decimals) + "%"
}

export function formatMultiple(value: number, decimals = 2): string {
  return value.toFixed(decimals) + "x"
}
