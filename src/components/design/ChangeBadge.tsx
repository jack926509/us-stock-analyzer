import { fmtPct, UP_COLOR, DOWN_COLOR } from "@/lib/format"

interface ChangeBadgeProps {
  pct: number
  size?: "sm" | "md"
  className?: string
}

export function ChangeBadge({ pct, size = "md", className }: ChangeBadgeProps) {
  const up = pct >= 0
  const color = up ? UP_COLOR : DOWN_COLOR
  const bg = up ? "rgba(0,212,126,0.12)" : "rgba(255,71,87,0.12)"
  const fs = size === "sm" ? 10.5 : 11.5
  const py = size === "sm" ? 1 : 2
  const px = size === "sm" ? 6 : 8

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: `${py}px ${px}px`,
        borderRadius: 999,
        color,
        background: bg,
        fontSize: fs,
        fontWeight: 600,
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ fontSize: fs * 0.85 }}>{up ? "▲" : "▼"}</span>
      {fmtPct(pct).replace("+", "")}
    </span>
  )
}
