# US Stock Analyzer

美股深度分析平台 — 整合即時行情、同業比較、**13 位 AI 代理人深度分析**、持倉追蹤的個人投資輔助工具。

採用 Claude Design 配色（米色 + 珊瑚橘 + Serif 標題）。

---

## 功能概覽

| 模組 | 說明 |
|------|------|
| Dashboard | 三大指數（S&P 500 / NASDAQ 100 / Dow Jones）即時顯示，60 秒自動刷新 |
| 我的持股 | localStorage 持倉追蹤（代號 / 股數 / 平均成本），每分鐘更新現價、未實現損益、總市值 |
| 追蹤清單 | 新增/移除股票（多源 Logo fallback），支援排序、漲跌警示 Banner、產業分佈、Top 5 漲跌榜 |
| TradingView | 嵌入 K 線圖、技術指標（MA / RSI / MACD）及技術分析摘要面板 |
| 同業比較 | 自動找出同業（4 層 fallback），P/E / P/B / P/S / EV/EBITDA / ROE / 毛利率 / 營收成長對比 + Radar Chart + **「綜合最划算」排名** |
| 綜合評分 | 五維度量化評分（獲利 / 成長 / 估值 / 財務健康 / 現金流），依行業基準調整 |
| 深度分析 | **13 位 AI 代理人**並行+串接：6 位投資大師（巴菲特、林奇、伍德、貝瑞、艾克曼、塔雷伯）+ 多空辯論（Bull / Bear / 研究主管）+ 三方風險辯論（激進 / 保守 / 中立）+ 投組經理整合，SSE Streaming 即時輸出 |
| 近期新聞 | Finnhub 公司新聞（前 5 條），情緒分類（正面 / 負面 / 中性） |

---

## 深度分析架構

四階段管線，總耗時約 2-3 分鐘：

```
Phase 1 ─ 6 位投資大師獨立分析（並行）
  巴菲特       護城河 / ROE-ROIC / 安全邊際
  林奇         PEG / 消費者熟悉度 / 十倍股分類
  伍德         顛覆式創新 / TAM / 5 年 CAGR
  貝瑞         逆向 / 資產負債表深掘 / 泡沫信號
  艾克曼       集中持股 / 活動家事件驅動
  塔雷伯       反脆弱 / 不對稱回報 / 黑天鵝抗性
            ↓
Phase 2 ─ 多空辯論
  Bull (並行) ━┓
              ┣━ Manager 研究主管裁決
  Bear (並行) ━┛
            ↓
Phase 3 ─ 風險辯論（並行）
  激進派 / 保守派 / 中立派各陳倉位邏輯
            ↓
Phase 4 ─ Portfolio Manager 整合
  輸出最終決策報告（評級 + 目標價區間 + 建議倉位 + 停損點 + Catalyst/Risk 表格）
```

每位代理人共享同一份 `AnalysisContext`（財報摘要 / 估值指標 / 同業比較 / 新聞 / 內部交易 / 分析師共識 / 總經）。

事件透過 SSE 即時推送：`phase_start` / `phase_complete` / `agent_start` / `agent_chunk` / `agent_complete` / `error` / `done`。

---

## API Fallback 策略

FMP 免費方案每日 250 次請求，多層 fallback 確保配額耗盡仍可運作：

| 功能 | 主要來源 | Fallback 1 | Fallback 2 |
|------|---------|-----------|-----------|
| 即時報價（watchlist / 持股） | Finnhub | FMP | SQLite cache |
| 公司基本資料 | Finnhub | FMP | — |
| 三大指數 | FMP | Finnhub | — |
| 股票搜尋 | FMP | Finnhub symbol search | — |
| 財務報表（深度分析用） | FMP | SQLite stale cache | — |
| 估值指標 / 財務比率 | FMP | Finnhub `/stock/metric` | SQLite cache |
| 同業清單 | FMP v4/stock_peers | Finnhub `/stock/peers` | Curated map |
| 新聞 | Finnhub | FMP news | — |

> 財務報表僅 FMP 提供，配額耗盡顯示 stale cache；如需穩定使用建議升級 FMP Starter（$19/月）。

---

## 同業比較 Peer Discovery

四層自動搜尋機制：

1. **FMP v4/stock_peers** — 行業精準，付費方案可用
2. **Finnhub /stock/peers** — 行業精準，免費，主要 fallback
3. **FMP stock-screener** — 按 sector 篩選，較廣
4. **Curated 對照表** — 35+ 個常見股票硬編碼（DAL→UAL/AAL/LUV/JBLU、NVDA→AMD/INTC 等）

---

## 系統架構

```
┌──────────────────────────────────────────────────────────────┐
│           前端 (Next.js 16 App Router + React 19)             │
│                                                              │
│  Dashboard      │  個股頁                                     │
│  ─ 我的持股      │  ─ TradingView K 線                         │
│  ─ 追蹤清單      │  ─ 同業比較 + 綜合評分                       │
│  ─ 大盤指數      │  ─ 深度分析（13 代理人 SSE Streaming）        │
└────────┬───────────────┬──────────────┬──────────────┬───────┘
         │               │              │              │
┌────────▼───────────────▼──────────────▼──────────────▼───────┐
│                  後端 API Routes (Next.js)                    │
│                                                              │
│  /api/stocks      /api/financials   /api/peers   /api/news   │
│  /api/market      /api/profile      /api/deep-analysis/[symbol]
└────────┬───────────────┬──────────────┬──────────────┬───────┘
         │               │              │              │
   FMP stable       Finnhub       TradingView     Anthropic
   (財務 / 搜尋)    (報價/新聞/    (Widget)        Claude Sonnet 4.6
                    同業/指標)                     (13 並行代理人)
         │
   SQLite (開發) / Turso (生產)  via Drizzle ORM
   watchlist / financial_cache / stock_prices /
   analysis_reports / deep_analysis_reports
```

---

## 技術選型

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| UI | shadcn/ui + Tailwind CSS v4 |
| 字體 | Source Serif 4（英數）+ Noto Serif TC（中文）標題；Geist + Noto Sans TC 內文 |
| 圖表 | Recharts + TradingView Widget |
| 資料快取 | TanStack Query v5 |
| ORM | Drizzle ORM + @libsql/client |
| 資料庫（開發） | SQLite（file:./dev.db） |
| 資料庫（生產） | Turso (LibSQL) |
| AI 分析 | Anthropic Claude Sonnet 4.6（`claude-sonnet-4-6`，13 並行代理人） |
| 串流 | Web Streams API + SSE（`event: <type>\ndata: <json>`） |
| 持倉儲存 | localStorage（純前端，跨裝置不同步） |
| 財務數據 | Financial Modeling Prep (FMP stable API) |
| 即時報價 / 新聞 | Finnhub |
| 部署 | Zeabur |

---

## Claude Design 設計系統

| Token | 值 | 用途 |
|-------|---|------|
| `--background` | `#F4EFE6` | 全站背景（米色） |
| `--foreground` | `#1A1A1A` | 主文字（深炭） |
| `--brand` / `--accent` / `--ring` | `#CC785C` | 品牌珊瑚橘（按鈕、CTA、active state） |
| `--secondary` | `#E8E2D5` | 次要區塊背景（米灰） |
| `--card` / `--popover` | `#FFFFFF` | 卡片白底 |
| `--muted` | `#EFE9DD` | 弱化背景 |
| `--border` | `#D9D2C2` | 邊框 |
| 標題字體 | Source Serif 4 + Noto Serif TC | h1 / h2 / h3 / `.font-serif` 自動套用 |

> 漲跌色維持美股慣例：上漲 emerald-600 / 下跌 red-600。

---

## 快取策略

| 資料類型 | 客戶端 TTL | 伺服器端 |
|---------|-----------|---------|
| 股票報價 | 60 秒（auto refetch） | SQLite stock_prices |
| 公司 Profile | 30 分鐘 | — |
| 財務報表 | 24 小時 | SQLite financial_cache（24h + stale fallback） |
| 同業比較 | 24 小時 | — |
| 新聞 | 30 分鐘 | — |
| 深度分析報告 | 永久 | DB `deep_analysis_reports`（含 finalContent / sections / rating / target_price / model_version / prompt_version） |
| 持倉資料 | 永久 | localStorage（key: `portfolio_v1`） |

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local` 並填入 API Key：

```env
# 財務數據（必填）
FMP_API_KEY=

# 即時報價 / 新聞（必填）
FINNHUB_API_KEY=

# AI 深度分析（必填）
ANTHROPIC_API_KEY=

# 生產資料庫 Turso（本地開發留空，預設使用 file:./dev.db）
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# 站台密碼保護（可選）
SITE_PASSWORD=
```

### 3. 初始化本地資料庫

```bash
npx drizzle-kit push
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

---

## API Key 申請

| 服務 | 免費額度 | 申請網址 |
|------|---------|---------|
| Financial Modeling Prep | 250 次/天 | [financialmodelingprep.com](https://financialmodelingprep.com/) |
| Finnhub | 60 次/分鐘 | [finnhub.io](https://finnhub.io/) |
| Anthropic Claude | 按用量付費（深度分析每次約 $0.30-0.50） | [console.anthropic.com](https://console.anthropic.com/) |
| Turso | 500 MB 免費 | [turso.tech](https://turso.tech/) |

> 深度分析一次跑 10 次 Claude 呼叫，2-3 分鐘。每日多次使用建議監控 Anthropic 帳單。

---

## 部署到 Zeabur

1. Fork 此 repo 並在 [Zeabur](https://zeabur.com/) 連結 GitHub repo
2. 在 Zeabur 後台設定環境變數（同上方 `.env.local` 內容）
3. 建立 Turso 資料庫：

```bash
turso db create us-stock-analyzer
turso db show us-stock-analyzer --url     # → TURSO_DATABASE_URL
turso db tokens create us-stock-analyzer  # → TURSO_AUTH_TOKEN
```

4. 推送 `main` 分支後 Zeabur 自動建置：

```json
{
  "build_command": "npm run build",
  "start_command": "npx drizzle-kit push || true && npm start"
}
```

> Zeabur / nginx 會 buffer SSE 回應，深度分析 API route 已加 `Cache-Control: no-cache, no-transform` + `X-Accel-Buffering: no` 確保即時推流。

---

## 專案結構

```
src/
├── app/
│   ├── page.tsx                       # Dashboard 首頁
│   ├── layout.tsx                     # Root layout + 字體載入
│   ├── globals.css                    # Claude Design palette + Tailwind v4 theme
│   ├── stock/[symbol]/
│   │   ├── page.tsx                   # 個股頁（同業 + 深度分析）
│   │   └── deep-analysis/             # 深度分析全螢幕模式
│   │       ├── page.tsx
│   │       └── DeepAnalysisClient.tsx
│   └── api/
│       ├── stocks/                    # 追蹤清單 CRUD + 報價
│       ├── financials/[symbol]/       # 三大財報（含 SQLite cache，深度分析用）
│       ├── peers/[symbol]/            # 同業比較（4 層 fallback）
│       ├── news/[symbol]/             # 公司新聞
│       ├── market/                    # 三大指數
│       ├── profile/[symbol]/          # 公司基本資訊
│       └── deep-analysis/[symbol]/    # 13 代理人 SSE Streaming + DB 寫入
├── components/
│   ├── dashboard/                     # Navbar / WatchlistTable / MarketOverview /
│   │                                  #   MetricsPanel / AlertBanner / PortfolioPanel
│   ├── stock/                         # StockHeader / PeerComparison / ScoreCard / StockDetailView
│   ├── deep-analysis/                 # AgentCard / PhaseProgress
│   ├── charts/                        # TradingView Widget（dynamic import，停用 SSR）
│   └── analysis/                      # NewsPanel
├── lib/
│   ├── db/                            # Drizzle schema + @libsql/client 連線
│   ├── api/
│   │   ├── fmp.ts / finnhub.ts        # 第三方 API 封裝
│   │   └── context-builders.ts        # 將原始資料轉成 LLM-friendly 摘要
│   ├── agents/                        # 深度分析核心
│   │   ├── orchestrator.ts            #   4 階段 async generator
│   │   ├── runner.ts                  #   共用 Claude streaming wrapper
│   │   ├── event-queue.ts             #   並行串流合併
│   │   ├── sse-parser.ts              #   前端 SSE 解析
│   │   ├── types.ts                   #   AgentEvent / AgentId / AnalysisContext
│   │   ├── masters/                   #   6 位大師 system prompts
│   │   ├── debate/                    #   Bull / Bear / Manager
│   │   └── risk/                      #   Aggressive / Conservative / Neutral / Portfolio
│   ├── portfolio.ts                   # localStorage 持倉 helpers
│   ├── scoring.ts                     # 行業基準加權評分
│   └── validations.ts                 # Symbol 格式驗證
└── proxy.ts                            # Rate Limiting + Basic Auth（Next.js 16 取代 middleware.ts）
```

---

## 安全性

- 所有 API Key 僅在 server side 存取，不使用 `NEXT_PUBLIC_` 前綴
- Rate Limiting：一般 API 60 次/分鐘，深度分析 POST 2 次/分鐘（in-memory per-IP，避免重複按 button 燒 Claude 配額）
- 可選 Basic Auth（設定 `SITE_PASSWORD` 環境變數）
- Drizzle ORM 參數化查詢，防止 SQL Injection
- Symbol 輸入驗證：`/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/`

---

## 免責聲明

本系統所有分析內容（含 AI 生成的 13 代理人報告）**僅供研究參考，不構成投資建議**。投資有風險，請自行評估。
