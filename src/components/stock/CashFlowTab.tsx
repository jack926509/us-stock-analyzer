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
    background: "#0f1629",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#fff",
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
  if (isLoading) return <div className="h-64 animate-pulse rounded-lg bg-white/5" />
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-white/30">無現金流量表資料</p>
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
        <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Operating CF vs CapEx vs Free CF
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={fcfData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: "#ffffff60", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#ffffff60", fontSize: 11 }} width={50} />
              <Tooltip {...CHART_STYLE} formatter={(v) => [fmtNum(Number(v ?? 0)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Operating CF" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="CapEx" fill="#f87171" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="Free CF" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Capital allocation */}
        <div className="rounded-lg bg-white/[0.03] p-4 ring-1 ring-white/8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
            Capital Allocation
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={capitalAllocationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: "#ffffff60", fontSize: 11 }} />
              <YAxis tickFormatter={fmtNum} tick={{ fill: "#ffffff60", fontSize: 11 }} width={50} />
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
                  const v = d[key as keyof FmpCashFlowStatement] as number
                  const isFcf = key === "freeCashFlow"
                  return (
                    <td
                      key={d.date}
                      className={`px-4 py-2 text-right tabular-nums ${
                        isFcf ? (v >= 0 ? "text-green-400" : "text-red-400") : v < 0 ? "text-red-400" : "text-white/80"
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
