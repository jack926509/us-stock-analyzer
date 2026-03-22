"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { FmpCashFlowStatement } from "@/lib/api/fmp"

interface Props {
  data: FmpCashFlowStatement[]
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
  { key: "operatingCashFlow", label: "Operating Cash Flow", zh: "營業現金流" },
  { key: "capitalExpenditure", label: "Capital Expenditure", zh: "資本支出" },
  { key: "freeCashFlow", label: "Free Cash Flow", zh: "自由現金流" },
  { key: "dividendsPaid", label: "Dividends Paid", zh: "已付股息" },
  { key: "commonStockRepurchased", label: "Stock Repurchases", zh: "股票回購" },
  { key: "netCashUsedForInvestingActivites", label: "Net Cash from Investing", zh: "投資活動現金流" },
  { key: "netCashUsedProvidedByFinancingActivities", label: "Net Cash from Financing", zh: "融資活動現金流" },
] as const

export function CashFlowTab({ data, isLoading }: Props) {
  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-black/5" />
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm font-medium text-stone-500">現金流量表暫時無法取得</p>
        <p className="text-xs text-stone-400">FMP API 每日配額已達上限，財務報表數據將於配額重置後自動恢復（通常為隔日 UTC 00:00）</p>
      </div>
    )
  }

  const sorted = [...data].reverse()
  const years = sorted.map((d) => d.date.substring(0, 4))

  const fcfData = sorted.map((d, i) => ({
    year: years[i],
    "Operating CF": d.operatingCashFlow,
    "CapEx": Math.abs(d.capitalExpenditure),
    "Free CF": d.freeCashFlow,
  }))

  const capitalAllocationData = sorted.map((d, i) => ({
    year: years[i],
    "Dividends": Math.abs(d.dividendsPaid ?? 0),
    "Buybacks": Math.abs(d.commonStockRepurchased ?? 0),
    "CapEx": Math.abs(d.capitalExpenditure),
  }))

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* FCF Chart */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Operating CF vs CapEx vs Free CF
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={fcfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#78716c", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Operating CF" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="CapEx" fill="#f87171" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="Free CF" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Capital allocation */}
        <div className="rounded-lg bg-black/[0.04] p-4 ring-1 ring-black/[0.08]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
            Capital Allocation
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={capitalAllocationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="year" tick={{ fill: "#78716c", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#78716c", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Dividends" fill="#a78bfa" radius={[3, 3, 0, 0]} stackId="alloc" />
              <Bar dataKey="Buybacks" fill="#f59e0b" radius={[3, 3, 0, 0]} stackId="alloc" />
              <Bar dataKey="CapEx" fill="#f87171" radius={[3, 3, 0, 0]} stackId="alloc" />
            </ComposedChart>
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
                  const v = d[key as keyof FmpCashFlowStatement] as number
                  const isFcf = key === "freeCashFlow"
                  return (
                    <td
                      key={d.date}
                      className={`px-4 py-2 text-right tabular-nums ${
                        isFcf ? (v >= 0 ? "text-emerald-600" : "text-red-600") : v < 0 ? "text-red-600" : "text-stone-700"
                      }`}
                    >
                      {fmtNum(v ?? 0)}
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
