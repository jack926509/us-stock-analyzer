// 持倉追蹤 — localStorage 為唯一持久化層（個人單機使用，跨裝置不同步可接受）

export interface Holding {
  symbol: string
  shares: number
  costBasis: number  // 平均每股成本（USD）
  addedAt: string    // ISO timestamp
}

const KEY = "portfolio_v1"

export function getHoldings(): Holding[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (h): h is Holding =>
        h && typeof h.symbol === "string" && typeof h.shares === "number" && typeof h.costBasis === "number"
    )
  } catch {
    return []
  }
}

export function setHoldings(list: Holding[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(KEY, JSON.stringify(list))
}
