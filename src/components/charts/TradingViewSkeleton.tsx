"use client"

export function TradingViewSkeleton({ height = 500 }: { height?: number }) {
  return (
    <div
      className="w-full animate-pulse rounded-lg bg-white/[0.03] ring-1 ring-white/8"
      style={{ height }}
    >
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-2 w-20 rounded bg-white/5" />
      </div>
    </div>
  )
}
