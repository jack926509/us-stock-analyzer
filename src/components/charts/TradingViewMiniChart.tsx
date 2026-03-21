"use client"

import { useEffect, useRef } from "react"

interface Props {
  symbol: string  // TradingView format: "NASDAQ:AAPL"
  width?: number
  height?: number
}

export default function TradingViewMiniChart({ symbol, width = 320, height = 220 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.innerHTML = ""

    const widgetDiv = document.createElement("div")
    widgetDiv.className = "tradingview-widget-container__widget"

    const script = document.createElement("script")
    script.type = "text/javascript"
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width,
      height,
      locale: "zh_TW",
      dateRange: "12M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
    })

    container.appendChild(widgetDiv)
    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ""
    }
  }, [symbol, width, height])

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container overflow-hidden rounded"
      style={{ width, height }}
    />
  )
}
