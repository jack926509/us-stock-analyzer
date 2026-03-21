"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { FmpIncomeStatement } from "@/lib/api/fmp"

interface Props {
  data: FmpIncomeStatement[]
  isLoading: boolean
}

function fmtNum(v: number) {
  const abs = Math.abs(v)
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + "T"
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + "M"
  if (abs >= 1e3) return (v / 1e3).toFixed(2) + "K"
  return v.toFixed(2)
}

function fmtPct(v: number) {
  return (v * 100).toFixed(1) + "%"
}

const CHART_STYLE = {
  contentStyle: {
    background: "#0f1629",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "12px",
  },
  itemStyle: { color: "#ccc" },
}

const ROWS = [
  { key: "revenue", label: "Revenue", zh: "營收" },
  { key: "costOfRevenue", label: "Cost of Revenue", zh: "銷售成本" },
  { key: "grossProfit", label: "Gross Profit", zh: "毛利" },
  { key: "operatingExpenses", label: "Operating Expenses", zh: "營業費用" },
  { key: "operatingIncome", label: "Operating Income", zh: "營業利益" },
  { key: "netIncome", label: "Net Income", zh: "淨利" },
  { key: "eps", label: "EPS", zh: "每股盈餘" },
  { key: "epsDiluted", label: "Diluted EPS", zh: "稀釋 EPS" },
  { key: "ebitda", label: "EBITDA", zh: "EBITDA" },
  { key: "weightedAverageShsOut", label: "Shares Outstanding", zh: "流通股數" },
] as const

export function IncomeStatementTab({ data, isLoading }: Props) {
  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-white/5" />
  }
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">無損益表資料</p>
  }

  // Sorted oldest → newest for charts
  const sorted = [...data].reverse()
  const years = sorted.map((d) => d.date.substring(0, 4))

  const revenueNetData = sorted.map((d, i) => ({
    year: years[i],
    Revenue: d.revenue,
    "Net Income": d.netIncome,
  }))

  const marginData = sorted.map((d, i) => ({
    year: years[i],
    "Gross Margin": parseFloat((d.grossProfitRatio * 100).toFixed(1)),
    "Operating Margin": parseFloat((d.operatingIncomeRatio * 100).toFixed(1)),
    "Net Margin": parseFloat((d.netIncomeRatio * 100).toFixed(1)),
  }))

  const epsData = sorted.map((d, i) => ({
    year: years[i],
    EPS: d.eps,
    "Diluted EPS": d.epsDiluted,
  }))

  return (
    <div className="space-y-6 py-4">
      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Revenue vs Net Income */}
        <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Revenue vs Net Income
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={revenueNetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: "#ffffff60", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#ffffff60", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff60" }} />
              <Line type="monotone" dataKey="Revenue" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
              <Line type="monotone" dataKey="Net Income" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: "#60a5fa" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Margin Trends */}
        <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Margin Trends (%)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: "#ffffff60", fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v + "%"} tick={{ fill: "#ffffff60", fontSize: 11 }} width={40} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [v + "%", ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff60" }} />
              <Line type="monotone" dataKey="Gross Margin" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Operating Margin" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Net Margin" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* EPS */}
        <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">EPS</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={epsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: "#ffffff60", fontSize: 11 }} />
              <YAxis tick={{ fill: "#ffffff60", fontSize: 11 }} width={40} />
              <Tooltip {...CHART_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff60" }} />
              <Bar dataKey="EPS" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Diluted EPS" fill="#60a5fa" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg ring-1 ring-white/8">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/8 bg-white/[0.03]">
              <th className="px-4 py-2.5 text-left font-semibold text-white/50">科目</th>
              {data.map((d) => (
                <th key={d.date} className="px-4 py-2.5 text-right font-semibold text-white/50">
                  {d.date.substring(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label, zh }) => (
              <tr key={key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-2 text-white/60">
                  {label}
                  <span className="ml-1 text-white/30">({zh})</span>
                </td>
                {data.map((d) => {
                  const v = d[key as keyof FmpIncomeStatement] as number
                  const isEps = key === "eps" || key === "epsDiluted"
                  return (
                    <td
                      key={d.date}
                      className={`px-4 py-2 text-right tabular-nums ${v < 0 ? "text-red-400" : "text-white/80"}`}
                    >
                      {isEps ? v?.toFixed(2) : fmtNum(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
