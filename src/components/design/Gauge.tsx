import { UP_COLOR } from "@/lib/format"

interface GaugeProps {
  value: number // 0–1
  label: string
  labelColor?: string
}

export function Gauge({ value, label, labelColor = UP_COLOR }: GaugeProps) {
  const angle = -90 + value * 180
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <svg width="160" height="100" viewBox="0 0 160 100">
        <path
          d="M 20 90 A 60 60 0 0 1 140 90"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 20 90 A 60 60 0 0 1 140 90"
          stroke="url(#gauge-gradient)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${value * 188} 200`}
        />
        <defs>
          <linearGradient id="gauge-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#c62828" />
            <stop offset="0.5" stopColor="#CC785C" />
            <stop offset="1" stopColor="#006e3f" />
          </linearGradient>
        </defs>
        <line
          x1="80"
          y1="90"
          x2={80 + 50 * Math.cos((angle * Math.PI) / 180)}
          y2={90 + 50 * Math.sin((angle * Math.PI) / 180)}
          stroke="#1A1A1A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="80" cy="90" r="5" fill="#1A1A1A" />
      </svg>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: labelColor,
          fontFamily: "var(--font-source-serif), Georgia, serif",
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  )
}
