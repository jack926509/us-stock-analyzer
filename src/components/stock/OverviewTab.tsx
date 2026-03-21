"use client"

import type { ReactNode } from "react"
import { MetricCard } from "./MetricCard"
import type { FmpKeyMetrics, FmpRatios, FmpIncomeStatement } from "@/lib/api/fmp"

interface FinancialData {
  income: FmpIncomeStatement[]
  keyMetrics: FmpKeyMetrics[]
  ratios: FmpRatios[]
}

interface OverviewTabProps {
  financials: FinancialData | undefined
  isLoading: boolean
}

// 格式化百分比（FMP ratios 為小數，乘以 100）
function fmtPct(v: number | undefined) {
  if (v == null || isNaN(v)) return "N/A"
  return (v * 100).toFixed(2) + "%"
}

// 格式化倍數
function fmtX(v: number | undefined) {
  if (v == null || isNaN(v) || !isFinite(v)) return "N/A"
  return v.toFixed(2) + "x"
}

function fmtRaw(v: number | undefined) {
  if (v == null || isNaN(v)) return "N/A"
  return v.toFixed(2)
}

// 計算 YoY 成長率（最新兩期）
function calcYoY(arr: number[]): number | undefined {
  if (arr.length < 2) return undefined
  const curr = arr[0]
  const prev = arr[1]
  if (!prev) return undefined
  return (curr - prev) / Math.abs(prev)
}

function trend(v: number | undefined, reversed = false): "up" | "down" | "neutral" {
  if (v == null) return "neutral"
  if (v > 0) return reversed ? "down" : "up"
  if (v < 0) return reversed ? "up" : "down"
  return "neutral"
}

// sparkline: 最舊在左（reverse API 返回的最新在前）
function spark(arr: (number | undefined)[]): number[] {
  return [...arr].reverse().filter((v): v is number => v != null && isFinite(v))
}

function MetricSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/30">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{children}</div>
    </div>
  )
}

export function OverviewTab({ financials, isLoading }: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s}>
            <div className="mb-2 h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!financials) {
    return <p className="py-8 text-center text-sm text-white/30">無法載入財務數據</p>
  }

  const { income, keyMetrics, ratios } = financials
  const km = keyMetrics[0]  // latest key metrics
  const r = ratios[0]        // latest ratios

  // Sparkline arrays (newest-first from API, reversed for chart)
  const gpmSpark = spark(ratios.map((x) => x.grossProfitMargin ? x.grossProfitMargin * 100 : undefined))
  const opmSpark = spark(ratios.map((x) => x.operatingProfitMargin ? x.operatingProfitMargin * 100 : undefined))
  const npmSpark = spark(ratios.map((x) => x.netProfitMargin ? x.netProfitMargin * 100 : undefined))
  const roeSpark = spark(ratios.map((x) => x.returnOnEquity ? x.returnOnEquity * 100 : undefined))
  const roaSpark = spark(ratios.map((x) => x.returnOnAssets ? x.returnOnAssets * 100 : undefined))
  const roicSpark = spark(keyMetrics.map((x) => x.roic ? x.roic * 100 : undefined))

  const revGrowth = calcYoY(income.map((x) => x.revenue))
  const epsGrowth = calcYoY(income.map((x) => x.epsDiluted))
  const niGrowth = calcYoY(income.map((x) => x.netIncome))

  const revSpark = spark(income.map((x) => x.revenue))
  const epsSpark = spark(income.map((x) => x.epsDiluted))
  const niSpark = spark(income.map((x) => x.netIncome))

  const peSpark = spark(keyMetrics.map((x) => x.peRatio))
  const pbSpark = spark(keyMetrics.map((x) => x.pbRatio))
  const psSpark = spark(keyMetrics.map((x) => x.psRatio))
  const evSpark = spark(keyMetrics.map((x) => x.evToEbitda))

  const crSpark = spark(ratios.map((x) => x.currentRatio))
  const qrSpark = spark(ratios.map((x) => x.quickRatio))
  const deSpark = spark(ratios.map((x) => x.debtEquityRatio))
  const icSpark = spark(ratios.map((x) => x.interestCoverage))

  return (
    <div className="space-y-6 py-4">
      {/* 獲利能力 */}
      <MetricSection title="獲利能力 Profitability">
        <MetricCard
          label="毛利率"
          labelEn="Gross Margin"
          value={fmtPct(r?.grossProfitMargin)}
          trend={trend(r?.grossProfitMargin)}
          sparklineData={gpmSpark}
        />
        <MetricCard
          label="營業利益率"
          labelEn="Operating Margin"
          value={fmtPct(r?.operatingProfitMargin)}
          trend={trend(r?.operatingProfitMargin)}
          sparklineData={opmSpark}
        />
        <MetricCard
          label="淨利率"
          labelEn="Net Profit Margin"
          value={fmtPct(r?.netProfitMargin)}
          trend={trend(r?.netProfitMargin)}
          sparklineData={npmSpark}
        />
        <MetricCard
          label="股東權益報酬率"
          labelEn="ROE"
          value={fmtPct(r?.returnOnEquity)}
          trend={trend(r?.returnOnEquity)}
          sparklineData={roeSpark}
        />
        <MetricCard
          label="資產報酬率"
          labelEn="ROA"
          value={fmtPct(r?.returnOnAssets)}
          trend={trend(r?.returnOnAssets)}
          sparklineData={roaSpark}
        />
        <MetricCard
          label="投入資本報酬率"
          labelEn="ROIC"
          value={fmtPct(km?.roic)}
          trend={trend(km?.roic)}
          sparklineData={roicSpark}
        />
      </MetricSection>

      {/* 成長性 */}
      <MetricSection title="成長性 Growth">
        <MetricCard
          label="營收成長率 (YoY)"
          labelEn="Revenue Growth"
          value={revGrowth != null ? (revGrowth * 100).toFixed(2) + "%" : "N/A"}
          trend={trend(revGrowth)}
          sparklineData={revSpark}
        />
        <MetricCard
          label="EPS 成長率 (YoY)"
          labelEn="EPS Growth"
          value={epsGrowth != null ? (epsGrowth * 100).toFixed(2) + "%" : "N/A"}
          trend={trend(epsGrowth)}
          sparklineData={epsSpark}
        />
        <MetricCard
          label="淨利成長率 (YoY)"
          labelEn="Net Income Growth"
          value={niGrowth != null ? (niGrowth * 100).toFixed(2) + "%" : "N/A"}
          trend={trend(niGrowth)}
          sparklineData={niSpark}
        />
      </MetricSection>

      {/* 估值指標 */}
      <MetricSection title="估值指標 Valuation">
        <MetricCard
          label="本益比"
          labelEn="P/E Ratio"
          value={fmtX(km?.peRatio)}
          trend="neutral"
          sparklineData={peSpark}
        />
        <MetricCard
          label="市淨率"
          labelEn="P/B Ratio"
          value={fmtX(km?.pbRatio)}
          trend="neutral"
          sparklineData={pbSpark}
        />
        <MetricCard
          label="市銷率"
          labelEn="P/S Ratio"
          value={fmtX(km?.psRatio)}
          trend="neutral"
          sparklineData={psSpark}
        />
        <MetricCard
          label="EV/EBITDA"
          labelEn="EV/EBITDA"
          value={fmtX(km?.evToEbitda)}
          trend="neutral"
          sparklineData={evSpark}
        />
        <MetricCard
          label="PEG Ratio"
          labelEn="PEG Ratio"
          value={fmtRaw(km?.pegRatio)}
          trend="neutral"
        />
        <MetricCard
          label="股息殖利率"
          labelEn="Dividend Yield"
          value={fmtPct(km?.dividendYield)}
          trend="neutral"
        />
      </MetricSection>

      {/* 財務健康 */}
      <MetricSection title="財務健康 Financial Health">
        <MetricCard
          label="流動比率"
          labelEn="Current Ratio"
          value={fmtX(r?.currentRatio)}
          trend={r?.currentRatio != null ? (r.currentRatio >= 1.5 ? "up" : r.currentRatio < 1 ? "down" : "neutral") : "neutral"}
          sparklineData={crSpark}
        />
        <MetricCard
          label="速動比率"
          labelEn="Quick Ratio"
          value={fmtX(r?.quickRatio)}
          trend={r?.quickRatio != null ? (r.quickRatio >= 1 ? "up" : "down") : "neutral"}
          sparklineData={qrSpark}
        />
        <MetricCard
          label="負債權益比"
          labelEn="Debt / Equity"
          value={fmtX(r?.debtEquityRatio)}
          trend={r?.debtEquityRatio != null ? (r.debtEquityRatio < 1 ? "up" : r.debtEquityRatio > 2 ? "down" : "neutral") : "neutral"}
          colorOverride={r?.debtEquityRatio != null ? (r.debtEquityRatio < 1 ? "text-green-400" : r.debtEquityRatio > 2 ? "text-red-400" : "text-white/70") : undefined}
          sparklineData={deSpark}
        />
        <MetricCard
          label="利息保障倍數"
          labelEn="Interest Coverage"
          value={fmtX(r?.interestCoverage)}
          trend={r?.interestCoverage != null ? (r.interestCoverage > 5 ? "up" : r.interestCoverage < 1.5 ? "down" : "neutral") : "neutral"}
          sparklineData={icSpark}
        />
      </MetricSection>
    </div>
  )
}
