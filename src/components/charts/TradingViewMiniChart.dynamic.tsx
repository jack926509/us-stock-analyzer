import dynamic from "next/dynamic"

export const TradingViewMiniChart = dynamic(() => import("./TradingViewMiniChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse rounded bg-white/[0.03] ring-1 ring-white/8" style={{ width: 320, height: 220 }} />
  ),
})
