"use client"

import { useEffect, useState } from "react"
import { useQueries } from "@tanstack/react-query"
import Link from "next/link"
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getHoldings, setHoldings, type Holding } from "@/lib/portfolio"

interface ProfileResponse {
  symbol: string
  companyName?: string
  price?: number
}

function fmtMoney(v: number, digits = 0): string {
  return v.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function PortfolioPanel() {
  const [holdings, setHoldingsState] = useState<Holding[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHoldingsState(getHoldings())
    setHydrated(true)
  }, [])

  function persist(next: Holding[]) {
    setHoldingsState(next)
    setHoldings(next)
  }

  const queries = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ["profile", h.symbol],
      queryFn: () =>
        fetch(`/api/profile/${h.symbol}`).then((r) => {
          if (!r.ok) throw new Error("fetch failed")
          return r.json() as Promise<ProfileResponse>
        }),
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
    })),
  })

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const symbol = String(fd.get("symbol") || "").trim().toUpperCase()
    const shares = Number(fd.get("shares") || 0)
    const costBasis = Number(fd.get("costBasis") || 0)
    if (!symbol || shares <= 0 || costBasis <= 0) return
    const next = [
      ...holdings.filter((h) => h.symbol !== symbol),
      { symbol, shares, costBasis, addedAt: new Date().toISOString() },
    ]
    persist(next)
    form.reset()
    setShowAdd(false)
  }

  function handleRemove(symbol: string) {
    persist(holdings.filter((h) => h.symbol !== symbol))
  }

  if (!hydrated) return null

  let totalMarketValue = 0
  let totalCost = 0
  holdings.forEach((h, i) => {
    const price = queries[i]?.data?.price ?? 0
    if (price > 0) totalMarketValue += price * h.shares
    totalCost += h.costBasis * h.shares
  })
  const totalPL = totalMarketValue - totalCost
  const totalPLPct = totalCost > 0 ? (totalPL / totalCost) * 100 : 0

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">
            我的持股
            {holdings.length > 0 && <span className="ml-2 text-sm font-normal text-stone-500">({holdings.length})</span>}
          </h2>
          <p className="text-xs text-stone-500">已實際買入的股票，每分鐘自動更新現價與未實現損益</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-md bg-[#CC785C] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#B8674F]"
        >
          <Plus size={14} />
          {showAdd ? "取消" : "新增持股"}
        </button>
      </div>

      {holdings.length > 0 && totalCost > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-card px-4 py-3 ring-1 ring-black/[0.07]">
            <p className="text-[11px] uppercase tracking-wider text-stone-500">總市值</p>
            <p className="mt-1 font-num text-lg font-semibold text-stone-900">${fmtMoney(totalMarketValue)}</p>
          </div>
          <div className="rounded-lg bg-card px-4 py-3 ring-1 ring-black/[0.07]">
            <p className="text-[11px] uppercase tracking-wider text-stone-500">總成本</p>
            <p className="mt-1 font-num text-lg font-semibold text-stone-700">${fmtMoney(totalCost)}</p>
          </div>
          <div className={cn(
            "rounded-lg px-4 py-3 ring-1",
            totalPL >= 0 ? "bg-emerald-500/10 ring-emerald-500/25" : "bg-red-500/10 ring-red-500/25"
          )}>
            <p className="text-[11px] uppercase tracking-wider text-stone-500">未實現損益</p>
            <p className={cn(
              "mt-1 font-num text-lg font-semibold",
              totalPL >= 0 ? "text-emerald-700" : "text-red-700"
            )}>
              {totalPL >= 0 ? "+" : "-"}${fmtMoney(Math.abs(totalPL))}
              <span className="ml-2 text-sm font-normal opacity-80">
                ({totalPLPct >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 ring-1 ring-black/[0.08]"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-stone-500">代號</label>
            <input
              name="symbol"
              required
              maxLength={10}
              className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm uppercase outline-none focus:border-[#CC785C]"
              placeholder="AAPL"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-stone-500">股數</label>
            <input
              name="shares"
              type="number"
              step="0.0001"
              min="0"
              required
              className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-sm font-num outline-none focus:border-[#CC785C]"
              placeholder="100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-stone-500">平均成本 (USD)</label>
            <input
              name="costBasis"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-32 rounded-md border border-stone-300 px-2 py-1.5 text-sm font-num outline-none focus:border-[#CC785C]"
              placeholder="150.00"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800"
          >
            加入
          </button>
          <p className="w-full text-[10px] text-stone-500">
            重複代號會以新值覆蓋。資料只存在這台裝置（localStorage），換裝置不同步。
          </p>
        </form>
      )}

      {holdings.length === 0 ? (
        <div className="rounded-lg bg-white px-4 py-8 text-center ring-1 ring-black/[0.08]">
          <p className="text-sm text-stone-500">尚未新增持股 — 點上方「新增持股」開始追蹤未實現損益</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-black/[0.08]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black/[0.07]">
                <th className="px-4 py-2.5 text-left font-medium text-stone-600">代號</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">股數</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">平均成本</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">現價</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">市值</th>
                <th className="px-3 py-2.5 text-right font-medium text-stone-600">未實現損益</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const q = queries[i]
                const price = q?.data?.price ?? 0
                const name = q?.data?.companyName ?? ""
                const value = price * h.shares
                const cost = h.costBasis * h.shares
                const pl = value - cost
                const plPct = cost > 0 ? (pl / cost) * 100 : 0
                const positive = pl >= 0
                const loading = q?.isLoading
                return (
                  <tr key={h.symbol} className="border-b border-black/[0.07] last:border-0 transition-colors hover:bg-[#faf6f1]">
                    <td className="px-4 py-2.5">
                      <Link href={`/stock/${h.symbol}`} className="font-semibold text-stone-900 hover:underline">
                        {h.symbol}
                      </Link>
                      {name && <p className="text-[10px] text-stone-500 truncate max-w-[140px]">{name}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-num text-stone-700">
                      {h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-num text-stone-500">
                      ${h.costBasis.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-num text-stone-700">
                      {loading ? "…" : price > 0 ? `$${price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-num text-stone-700">
                      {value > 0 ? `$${fmtMoney(value)}` : "—"}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-num font-semibold", positive ? "text-emerald-600" : "text-red-600")}>
                      {value > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span>{plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%</span>
                          <span className="text-[10px] opacity-70">
                            ({pl >= 0 ? "+$" : "-$"}{fmtMoney(Math.abs(pl))})
                          </span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => handleRemove(h.symbol)}
                        className="text-stone-400 transition-colors hover:text-red-500"
                        title="刪除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-stone-50 font-semibold">
                <td className="px-4 py-2.5 text-stone-700">合計</td>
                <td colSpan={3}></td>
                <td className="px-3 py-2.5 text-right font-num text-stone-900">
                  ${fmtMoney(totalMarketValue)}
                </td>
                <td className={cn("px-3 py-2.5 text-right font-num", totalPL >= 0 ? "text-emerald-600" : "text-red-600")}>
                  {totalCost > 0 ? (
                    <span>
                      {totalPLPct >= 0 ? "+" : ""}{totalPLPct.toFixed(2)}%
                      <span className="ml-1 text-[10px] opacity-70">
                        ({totalPL >= 0 ? "+$" : "-$"}{fmtMoney(Math.abs(totalPL))})
                      </span>
                    </span>
                  ) : "—"}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
