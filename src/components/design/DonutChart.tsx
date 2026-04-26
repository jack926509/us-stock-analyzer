interface DonutSegment {
  name: string
  count: number
  color: string
}

interface DonutChartProps {
  data: DonutSegment[]
  size?: number
  centerLabel?: string
}

export function DonutChart({ data, size = 160, centerLabel = "股票" }: DonutChartProps) {
  const total = data.reduce((s, x) => s + x.count, 0)
  const r = size * 0.42
  const cx = size / 2
  const cy = size / 2
  let cumulative = 0

  return (
    <svg width={size} height={size}>
      {data.map((d, i) => {
        const portion = d.count / total
        const start = cumulative * Math.PI * 2 - Math.PI / 2
        cumulative += portion
        const end = cumulative * Math.PI * 2 - Math.PI / 2
        const x1 = cx + r * Math.cos(start)
        const y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end)
        const y2 = cy + r * Math.sin(end)
        const large = portion > 0.5 ? 1 : 0
        return (
          <path
            key={i}
            d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
            fill={d.color}
            stroke="#fff"
            strokeWidth="2.5"
          />
        )
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace"
        fontSize="22"
        fontWeight="700"
        fill="#1A1A1A"
      >
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#888">
        {centerLabel}
      </text>
    </svg>
  )
}
