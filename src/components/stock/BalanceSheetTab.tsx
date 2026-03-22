"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { FmpBalanceSheet } from "@/lib/api/fmp"

interface Props {
  data: FmpBalanceSheet[]
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

const CHART_STYLE = {
  contentStyle: {
    background: "#ffffff",
    border: "1px solid rgba(0,0,0,0.1)",
    borderRadius: "8px",
    color: "#1c1917",
    fontSize: "12px",
  },
}

const ROWS = [
  { key: "totalAssets", label: "Total Assets", zh: "總資產" },
  { key: "cashAndCashEquivalents", label: "Cash & Equivalents", zh: "現金及約當現金" },
  { key: "shortTermInvestments", label: "Short-term Investments", zh: "短期投資" },
  { key: "inventory", label: "Inventory", zh: "存貨" },
  { key: "goodwill", label: "Goodwill", zh: "商譽" },
  { key: "totalLiabilities", label: "Total Liabilities", zh: "總負債" },
  { key: "totalDebt", label: "Total Debt", zh: "總債務" },
  { key: "longTermDebt", label: "Long-term Debt", zh: "長期負債" },
  { key: "totalStockholdersEquity", label: "Stockholders Equity", zh: "股東權益" },
  { key: "retainedEarnings", label: "Retained Earnings", zh: "保留盈餘" },
] as const

const PIE_COLORS = ["#34d399", "#f87171", "#60a5fa"]

export function BalanceSheetTab({ data, isLoading }: Props) {
  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-black/5" />
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-stone-500">無資產負債表資料</p>
  }

  const sorted = [...data].reverse()
  const years = sorted.map((d) => d.date.substring(0, 4))

  const stackedData = sorted.map((d, i) => ({
    year: years[i],
    Assets: d.totalAssets,
    Liabilities: d.totalLiabilities,
    Equity: d.totalStockholdersEquity,
  }))

  const debtData = sorted.map((d, i) => ({
    year: years[i],
    "Total Debt": d.totalDebt,
    "Long-term Debt": d.longTermDebt,
    Cash: d.cashAndCashEquivalents,
  }))

  // Latest composition pie
  const latest = data[0]
  const pieData = [
    { name: "Equity", value: Math.max(0, latest.totalStockholdersEquity) },
    { name: "Liabilities", value: Math.max(0, latest.totalLiabilities) },
    { name: "Other", value: Math.max(0, latest.totalAssets - latest.totalLiabilities - latest.totalStockholdersEquity) },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {/* Assets vs Liabilities vs Equity */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Assets / Liabilities / Equity
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#78716c", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Bar dataKey="Assets" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Liabilities" fill="#f87171" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Equity" fill="#34d399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Debt vs Cash */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Debt vs Cash
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={debtData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#78716c", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Bar dataKey="Total Debt" fill="#f87171" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Long-term Debt" fill="#fb923c" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Cash" fill="#34d399" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Latest composition pie */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Latest Balance Sheet Composition
          </p>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...CHART_STYLE}
                  formatter={(v) => [fmtNum(Number(v ?? 0)), ""]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#78716c" }}
                  formatter={(value) => <span style={{ color: "#44403c" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
                  const v = d[key as keyof FmpBalanceSheet] as number
                  return (
                    <td
                      key={d.date}
                      className={`px-4 py-2 text-right tabular-nums ${v < 0 ? "text-red-600" : "text-stone-700"}`}
                    >
                      {fmtNum(v)}
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
