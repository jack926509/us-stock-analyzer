import dynamic from "next/dynamic"

export const TradingViewMiniChart = dynamic(() => import("./TradingViewMiniChart"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse rounded bg-black/[0.04] ring-1 ring-black/[0.07]" style={{ width: 320, height: 220 }} />
  ),
})
