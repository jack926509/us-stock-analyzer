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
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: "8px",
    color: "#1c1917",
    fontSize: "12px",
  },
  itemStyle: { color: "#57534e" },
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
    return <div className="h-64 animate-pulse rounded-lg bg-black/5" />
  }
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm font-medium text-stone-500">損益表暫時無法取得</p>
        <p className="text-xs text-stone-400">FMP API 每日配額已達上限，財務報表數據將於配額重置後自動恢復（通常為隔日 UTC 00:00）</p>
      </div>
    )
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
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Revenue vs Net Income
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={revenueNetData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#78716c", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Line type="monotone" dataKey="Revenue" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
              <Line type="monotone" dataKey="Net Income" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: "#60a5fa" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Margin Trends */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Margin Trends (%)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tickFormatter={(v) => v + "%"} tick={{ fill: "#78716c", fontSize: 11 }} width={40} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [v + "%", ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Line type="monotone" dataKey="Gross Margin" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Operating Margin" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Net Margin" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* EPS */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">EPS</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={epsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tick={{ fill: "#78716c", fontSize: 11 }} width={40} />
              <Tooltip {...CHART_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Bar dataKey="EPS" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Diluted EPS" fill="#60a5fa" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg ring-1 ring-black/[0.08]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black/[0.07] bg-black/[0.04]">
              <th className="px-4 py-2.5 text-left font-semibold text-stone-600">科目</th>
              {data.map((d) => (
                <th key={d.date} className="px-4 py-2.5 text-right font-semibold text-stone-600">
                  {d.date.substring(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label, zh }) => (
              <tr key={key} className="border-b border-black/[0.07] hover:bg-black/[0.03] transition-colors">
                <td className="px-4 py-2 text-stone-500">
                  {label}
                  <span className="ml-1 text-stone-500">({zh})</span>
                </td>
                {data.map((d) => {
                  const v = d[key as keyof FmpIncomeStatement] as number
                  const isEps = key === "eps" || key === "epsDiluted"
                  return (
                    <td
                      key={d.date}
                      className={`px-4 py-2 text-right tabular-nums ${v < 0 ? "text-red-600" : "text-stone-700"}`}
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
