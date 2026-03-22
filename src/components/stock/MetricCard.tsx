"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  labelEn: string
  value: string
  trend?: "up" | "down" | "neutral"
  sparklineData?: number[]
  colorOverride?: string // force a specific color class
}

export function MetricCard({
  label,
  labelEn,
  value,
  trend,
  sparklineData,
  colorOverride,
}: MetricCardProps) {
  const trendColor =
    colorOverride ??
    (trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-stone-500")

  const lineColor =
    colorOverride === "text-red-600" || colorOverride === "text-red-400" || trend === "down" ? "#dc2626" : "#059669"

  const chartData = sparklineData?.map((v, i) => ({ i, v })) ?? []

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white p-3 ring-1 ring-black/[0.07] hover:bg-[#e4dfd7] transition-colors">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-stone-600">{labelEn}</p>
          <p className="truncate text-xs text-stone-500">{label}</p>
        </div>
        {trend && trend !== "neutral" && (
          <div className={cn("mt-0.5 shrink-0", trendColor)}>
            {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          </div>
        )}
        {trend === "neutral" && (
          <div className="mt-0.5 shrink-0 text-stone-500">
            <Minus size={12} />
          </div>
        )}
      </div>
      <p className={cn("text-base font-semibold leading-tight font-num", trendColor)}>
        {value}
      </p>
      {chartData.length >= 2 && (
        <div className="h-8 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={lineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#1c1917",
                  padding: "4px 8px",
                }}
                formatter={(v) => [Number(v ?? 0).toFixed(2), ""]}
                labelFormatter={() => ""}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
