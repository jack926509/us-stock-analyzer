import { create } from "zustand"

interface WatchlistItem {
  symbol: string
  name: string
  sector?: string | null
  notes?: string | null
}

interface StockPrice {
  symbol: string
  price?: number | null
  changePercent?: number | null
  marketCap?: number | null
  peRatio?: number | null
  week52High?: number | null
  week52Low?: number | null
}

interface StoreState {
  watchlist: WatchlistItem[]
  prices: Record<string, StockPrice>
  setWatchlist: (items: WatchlistItem[]) => void
  addToWatchlist: (item: WatchlistItem) => void
  removeFromWatchlist: (symbol: string) => void
  updatePrices: (prices: StockPrice[]) => void
}

export const useStore = create<StoreState>((set) => ({
  watchlist: [],
  prices: {},

  setWatchlist: (items) => set({ watchlist: items }),

  addToWatchlist: (item) =>
    set((state) => ({
      watchlist: state.watchlist.some((w) => w.symbol === item.symbol)
        ? state.watchlist
        : [...state.watchlist, item],
    })),

  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((w) => w.symbol !== symbol),
    })),

  updatePrices: (prices) =>
    set((state) => ({
      prices: {
        ...state.prices,
        ...Object.fromEntries(prices.map((p) => [p.symbol, p])),
      },
    })),
}))
