// 持倉追蹤 — localStorage 為唯一持久化層（個人單機使用，跨裝置不同步可接受）

export interface Holding {
  symbol: string
  shares: number
  costBasis: number  // 平均每股成本（USD）
  addedAt: string    // ISO timestamp
}

const KEY = "portfolio_v1"
const SERVER_SNAPSHOT = "[]"

const listeners = new Set<() => void>()
let cachedSnapshot = SERVER_SNAPSHOT
let cacheValid = false

function readRaw(): string {
  if (typeof window === "undefined") return SERVER_SNAPSHOT
  return window.localStorage.getItem(KEY) ?? SERVER_SNAPSHOT
}

export function getSnapshot(): string {
  if (typeof window === "undefined") return SERVER_SNAPSHOT
  if (!cacheValid) {
    cachedSnapshot = readRaw()
    cacheValid = true
  }
  return cachedSnapshot
}

export function getServerSnapshot(): string {
  return SERVER_SNAPSHOT
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback)
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cacheValid = false
      listeners.forEach((cb) => cb())
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage)
  }
  return () => {
    listeners.delete(callback)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage)
    }
  }
}

export function parseHoldings(snapshot: string): Holding[] {
  try {
    const parsed = JSON.parse(snapshot)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (h): h is Holding =>
        h && typeof h.symbol === "string" && typeof h.shares === "number" && typeof h.costBasis === "number"
    )
  } catch {
    return []
  }
}

export function getHoldings(): Holding[] {
  return parseHoldings(getSnapshot())
}

export function setHoldings(list: Holding[]): void {
  if (typeof window === "undefined") return
  cachedSnapshot = JSON.stringify(list)
  cacheValid = true
  window.localStorage.setItem(KEY, cachedSnapshot)
  listeners.forEach((cb) => cb())
}
