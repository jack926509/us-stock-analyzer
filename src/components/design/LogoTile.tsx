// 由代號雜湊出 Claude palette 暖色塊 — 不抓真實 logo，速度快、一致性高
const HUES = ["#CC785C", "#1A1A1A", "#8B6F47", "#6B6357", "#A85C44"] as const

interface LogoTileProps {
  symbol: string
  size?: number
  className?: string
}

export function LogoTile({ symbol, size = 28, className }: LogoTileProps) {
  const hash = [...symbol].reduce((a, c) => a + c.charCodeAt(0), 0)
  const bg = HUES[hash % HUES.length]
  const label = symbol.slice(0, symbol.length > 4 ? 3 : 2)

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
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
