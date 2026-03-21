interface Props {
  params: Promise<{ symbol: string }>
}

export default async function StockPage({ params }: Props) {
  const { symbol } = await params

  return (
    <main className="flex-1 p-6">
      <h1 className="text-2xl font-bold text-white">{symbol}</h1>
      <p className="text-muted-foreground mt-2">個股分析頁 — Prompt 4 實作後取代此頁</p>
    </main>
  )
}
