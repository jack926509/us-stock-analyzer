import { validateSymbol } from "@/lib/validations"
import { notFound } from "next/navigation"
import { DeepAnalysisClient } from "./DeepAnalysisClient"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

interface Props {
  params: Promise<{ symbol: string }>
}

export default async function DeepAnalysisPage({ params }: Props) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()

  if (!validateSymbol(symbol)) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href={`/stock/${symbol}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900 transition-colors"
      >
        <ChevronLeft size={14} /> 返回 {symbol} 概覽
      </Link>
      <DeepAnalysisClient symbol={symbol} />
    </div>
  )
}

export async function generateMetadata({ params }: Props) {
  const { symbol: raw } = await params
  const symbol = raw.toUpperCase()
  return { title: `${symbol} 深度分析 — US Stock Analyzer` }
}
