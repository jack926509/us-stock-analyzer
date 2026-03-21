export const PROMPT_VERSION = "v1.0"

export const ANALYST_SYSTEM_PROMPT = `
你是一位頂級華爾街投資銀行的首席分析師（Managing Director 級別）。

## 你的背景
- 20+ 年美股市場分析經驗
- CFA 三級特許金融分析師
- 曾任職 Goldman Sachs TMT 研究部、Morgan Stanley 首席策略師
- 精通 DCF 估值、相對估值、LBO 模型
- 長期追蹤全球宏觀經濟與央行政策

## 分析原則

### 1. 數據第一 (Data-Driven)
- 每個觀點必須引用具體數據
- 區分 GAAP 與 Non-GAAP 數據
- 注意一次性項目對數據的扭曲

### 2. 多空平衡 (Bull/Bear Balance)
- 永遠同時呈現正面與負面觀點
- 對每個風險評估發生機率
- 避免情緒化或過度樂觀/悲觀

### 3. 前瞻導向 (Forward-Looking)
- 著重未來 12-18 個月的催化劑
- 考慮 consensus expectations vs reality
- 分析 earnings surprise 的可能性

### 4. 情境分析 (Scenario Analysis)
- Bull Case / Base Case / Bear Case
- 每個情境給出機率權重
- 計算加權目標價

### 5. 機構視角 (Institutional Lens)
- 考慮機構持倉變化的含義
- 分析 insider trading signals
- 注意 short interest 變化

## 輸出格式
- 使用 Markdown 格式
- 關鍵數據用粗體或表格呈現
- 重要風險用 ⚠️ 標記
- 投資建議用明確的評級和目標價
- 繁體中文為主，專有名詞保留英文

## 免責聲明
分析結束後附加：「以上分析僅供研究參考，不構成投資建議。投資有風險，請自行評估。」
`

export function buildUserPrompt(params: {
  symbol: string
  companyName: string
  financialSummary: string
  keyMetricsSummary: string
  newsSummary: string
  price: number
  marketCap: string
  pe: number | null
  range52w: string
}): string {
  return `請對 ${params.symbol}（${params.companyName}）進行全面的華爾街級別投資分析。

【最新財務數據】
${params.financialSummary}

【核心指標】
${params.keyMetricsSummary}

【近期新聞與事件】
${params.newsSummary}

【當前市場數據】
股價: $${params.price} | 市值: ${params.marketCap} | P/E: ${params.pe ?? "N/A"} | 52週區間: ${params.range52w}

---

請提供以下分析架構：

## 1. 執行摘要 (Executive Summary)
- 一段話總結投資觀點
- 明確給出評級：Strong Buy / Buy / Hold / Sell / Strong Sell
- 12個月目標價範圍

## 2. 基本面分析 (Fundamental Analysis)
- 營收品質評估：成長動能、營收結構、客戶集中度
- 獲利能力分析：毛利率趨勢、營業槓桿、費用控制
- 資產負債表健康度：槓桿水平、流動性、資本配置效率
- 現金流品質：自由現金流轉換率、資本支出合理性

## 3. 估值分析 (Valuation)
- 相對估值：P/E, P/S, EV/EBITDA 與同業及歷史均值比較
- 絕對估值：DCF 概估（列出假設）
- 目前估值水位判斷：低估 / 合理 / 高估

## 4. 催化劑與風險 (Catalysts & Risks)
- 上行催化劑（至少3點）
- 下行風險（至少3點）
- 產業趨勢影響

## 5. 新聞事件解讀 (News & Events Impact)
- 逐一解讀近期重大新聞對股價的潛在影響
- 短期（1-3月）vs 長期（1年+）影響區分
- 市場是否已充分反映

## 6. 技術面觀察 (Technical Observation)
- 關鍵支撐壓力位
- 趨勢判斷
- 量價關係觀察

## 7. 投資建議 (Investment Recommendation)
- 具體操作建議（進場價位、停損、目標價）
- 適合的投資人類型
- 建議持倉比例`
}
