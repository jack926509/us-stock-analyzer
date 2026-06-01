"use client"

import { useState } from "react"

// 公司 logo 主要走 FMP 公開 CDN（無需 API key），抓不到時退回字母色塊
const HUES = ["#CC785C", "#1A1A1A", "#8B6F47", "#6B6357", "#A85C44"] as const

interface LogoTileProps {
  symbol: string
  size?: number
  className?: string
}

export function LogoTile({ symbol, size = 28, className }: LogoTileProps) {
  const [failed, setFailed] = useState(false)

  const hash = [...symbol].reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = HUES[hash % HUES.length]
  const label = symbol.slice(0, symbol.length > 4 ? 3 : 2)
  const radius = size * 0.22

  if (failed) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: bg,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.36,
          fontWeight: 700,
          fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
          letterSpacing: "-0.02em",
          flexShrink: 0,
        }}
      >
        {label}
      </div>
    )
  }

  return (
    <img
      src={`https://images.financialmodelingprep.com/symbol/${symbol.toUpperCase()}.png`}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "contain",
        background: "#fff",
        flexShrink: 0,
      }}
    />
  )
}
