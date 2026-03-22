"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { FmpKeyMetrics, FmpRatios } from "@/lib/api/fmp"

interface Props {
  keyMetrics: FmpKeyMetrics[]
  ratios: FmpRatios[]
  isLoading: boolean
}

const CHART_STYLE = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: "8px",
    color: "#1c1917",
    fontSize: "12px",
  },
}

interface MetricChartConfig {
  label: string
  zh: string
  color: string
  format: (v: number) => string
  data: (km: FmpKeyMetrics[], r: FmpRatios[]) => Array<{ year: string; value: number }>
}

function buildData<T>(
  arr: T[],
  getter: (item: T) => number,
  multiplier = 1
): Array<{ year: string; value: number }> {
  return [...arr]
    .reverse()
    .map((item) => {
      const d = item as { date: string }
      return { year: d.date.substring(0, 4), value: (getter(item) ?? 0) * multiplier }
    })
}

function fmtPct(v: number) { return v.toFixed(1) + "%" }
function fmtX(v: number) { return v.toFixed(2) + "x" }

const METRIC_GROUPS: { title: string; metrics: MetricChartConfig[] }[] = [
  {
    title: "獲利能力 Profitability",
    metrics: [
      { label: "Gross Margin", zh: "毛利率", color: "#34d399", format: fmtPct, data: (_, r) => buildData(r, (x) => x.grossProfitMargin, 100) },
      { label: "Operating Margin", zh: "營業利益率", color: "#a78bfa", format: fmtPct, data: (_, r) => buildData(r, (x) => x.operatingProfitMargin, 100) },
      { label: "Net Margin", zh: "淨利率", color: "#60a5fa", format: fmtPct, data: (_, r) => buildData(r, (x) => x.netProfitMargin, 100) },
      { label: "ROE", zh: "股東權益報酬率", color: "#f59e0b", format: fmtPct, data: (_, r) => buildData(r, (x) => x.returnOnEquity, 100) },
      { label: "ROA", zh: "資產報酬率", color: "#fb923c", format: fmtPct, data: (_, r) => buildData(r, (x) => x.returnOnAssets, 100) },
      { label: "ROIC", zh: "投入資本報酬率", color: "#f87171", format: fmtPct, data: (km) => buildData(km, (x) => x.roic, 100) },
    ],
  },
  {
    title: "估值 Valuation",
    metrics: [
      { label: "P/E Ratio", zh: "本益比", color: "#60a5fa", format: fmtX, data: (km) => buildData(km, (x) => x.peRatio) },
      { label: "P/B Ratio", zh: "市淨率", color: "#34d399", format: fmtX, data: (km) => buildData(km, (x) => x.pbRatio) },
      { label: "P/S Ratio", zh: "市銷率", color: "#a78bfa", format: fmtX, data: (km) => buildData(km, (x) => x.psRatio) },
      { label: "EV/EBITDA", zh: "企業價值倍數", color: "#f59e0b", format: fmtX, data: (km) => buildData(km, (x) => x.evToEbitda) },
      { label: "PEG Ratio", zh: "PEG", color: "#fb923c", format: fmtX, data: (km) => buildData(km, (x) => x.pegRatio) },
    ],
  },
  {
    title: "財務健康 Financial Health",
    metrics: [
      { label: "Current Ratio", zh: "流動比率", color: "#34d399", format: fmtX, data: (_, r) => buildData(r, (x) => x.currentRatio) },
      { label: "Quick Ratio", zh: "速動比率", color: "#60a5fa", format: fmtX, data: (_, r) => buildData(r, (x) => x.quickRatio) },
      { label: "Debt/Equity", zh: "負債權益比", color: "#f87171", format: fmtX, data: (_, r) => buildData(r, (x) => x.debtEquityRatio) },
      { label: "Interest Coverage", zh: "利息保障倍數", color: "#a78bfa", format: fmtX, data: (_, r) => buildData(r, (x) => x.interestCoverage) },
    ],
  },
  {
    title: "現金流 Cash Flow",
    metrics: [
      { label: "FCF Yield", zh: "自由現金流殖利率", color: "#34d399", format: fmtPct, data: (km) => buildData(km, (x) => x.freeCashFlowYield, 100) },
      { label: "Earnings Yield", zh: "盈餘殖利率", color: "#60a5fa", format: fmtPct, data: (km) => buildData(km, (x) => x.earningsYield, 100) },
      { label: "Dividend Yield", zh: "股息殖利率", color: "#f59e0b", format: fmtPct, data: (km) => buildData(km, (x) => x.dividendYield, 100) },
    ],
  },
]

function MiniLineChart({
  data,
  color,
  format,
  label,
  zh,
}: {
  data: Array<{ year: string; value: number }>
  color: string
  format: (v: number) => string
  label: string
  zh: string
}) {
  const latest = data[data.length - 1]?.value
  if (!data.length || !latest) return null

  return (
    <div className="rounded-lg bg-black/[0.04] p-3 ring-1 ring-black/[0.08]">
      <div className="mb-1 flex items-baseline justify-between gap-1">
        <div>
          <p className="text-[11px] font-medium text-stone-500">{label}</p>
          <p className="text-[10px] text-stone-500">{zh}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-stone-700" style={{ color }}>
          {format(latest)}
        </p>
      </div>
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 9 }} />
            <YAxis hide />
            <Tooltip
              {...CHART_STYLE}
              formatter={(v) => [format(Number(v ?? 0)), label]}
              labelStyle={{ color: "#78716c" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={{ r: 2, fill: color }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function KeyMetricsTab({ keyMetrics, ratios, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s}>
            <div className="mb-2 h-3 w-32 animate-pulse rounded bg-black/[0.08]" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-black/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!keyMetrics?.length && !ratios?.length) {
    return <p className="py-8 text-center text-sm text-stone-500">無核心指標資料</p>
  }

  return (
    <div className="space-y-6 py-4">
      {METRIC_GROUPS.map((group) => {
        const charts = group.metrics
          .map((m) => ({ ...m, chartData: m.data(keyMetrics ?? [], ratios ?? []) }))
          .filter((m) => m.chartData.length > 0)

        if (!charts.length) return null

        return (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {charts.map((m) => (
                <MiniLineChart
                  key={m.label}
                  data={m.chartData}
                  color={m.color}
                  format={m.format}
                  label={m.label}
                  zh={m.zh}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
