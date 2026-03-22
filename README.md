# US Stock Analyzer

美股分析系統 — 整合即時行情、三大財務報表、同業比較、AI 研究報告的個人投資輔助工具。

---

## 功能概覽

| 模組 | 說明 |
|------|------|
| Dashboard | 三大指數（S&P 500 / NASDAQ 100 / Dow Jones）橫列即時顯示 + 追蹤清單報價，60 秒自動刷新 |
| 追蹤清單 | 新增／移除股票（多源 Logo fallback），支援排序、漲跌警示 Banner、產業分佈圓餅圖、Top 5 漲跌榜 |
| 財務報表 | 三大報表（損益表 / 資產負債表 / 現金流量表）+ 核心指標趨勢圖，年度 / 季度切換 |
| TradingView | 嵌入 K 線圖、技術指標（MA / RSI / MACD）及技術分析摘要面板 |
| 同業比較 | 自動找出行業同業（4 層 fallback），股價 / 市值 / P/E / P/B / P/S / EV/EBITDA / ROE / 毛利率對比 + Radar Chart |
| 綜合評分 | 五維度量化評分（獲利能力 / 成長 / 估值 / 財務健康 / 現金流），依行業基準調整，成長維度使用 YoY 營收成長率 |
| AI 研究報告 | Claude Sonnet 4.6 生成華爾街級別分析（含同業估值比較），Streaming 即時輸出，歷史報告可回看／刪除 |
| 近期新聞 | Finnhub 公司新聞，情緒分類（正面 / 負面 / 中性） |

---

## API Fallback 策略

FMP 免費方案每日 250 次請求，系統採多層 fallback 確保即使配額耗盡仍可運作：

| 功能 | 主要來源 | Fallback 1 | Fallback 2 |
|------|---------|-----------|-----------|
| 即時報價（watchlist） | Finnhub | FMP | SQLite cache |
| 公司基本資料 | Finnhub | FMP | — |
| 三大指數 | FMP | Finnhub | — |
| 股票搜尋 | FMP | Finnhub symbol search | — |
| 財務報表 | FMP | SQLite stale cache | — |
| 估值指標 / 財務比率 | FMP | Finnhub `/stock/metric` | SQLite cache |
| 同業清單 | FMP v4/stock_peers | Finnhub `/stock/peers` | Curated map |
| 新聞 | Finnhub | FMP news | — |

> 財務報表（損益表 / 資產負債表 / 現金流量表）僅 FMP 提供，配額耗盡後顯示 stale cache；如需穩定使用建議升級 FMP Starter（$19/月）。

---

## 同業比較 Peer Discovery

四層自動搜尋機制，確保各行業都能找到正確同業：

1. **FMP v4/stock_peers** — 行業精準，付費方案可用
2. **Finnhub /stock/peers** — 行業精準，免費，主要 fallback
3. **FMP stock-screener** — 按 sector 篩選，較廣
4. **Curated 對照表** — 35+ 個常見股票硬編碼（DAL→UAL/AAL/LUV/JBLU、NVDA→AMD/INTC 等）

---

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│               前端 (Next.js 15 App Router)               │
│                                                         │
│  Dashboard  │  個股分析  │  TradingView  │  AI 分析      │
│             │  (Tabs)   │  (Widget)     │  (Streaming)  │
└──────┬───────────┬───────────┬─────────────┬────────────┘
       │           │           │             │
┌──────▼───────────▼───────────▼─────────────▼────────────┐
│              後端 API Routes (Next.js)                   │
│                                                         │
│  /api/stocks  /api/financials  /api/peers  /api/news    │
│  /api/market  /api/profile     /api/analysis/[symbol]   │
└──────┬───────────┬───────────┬─────────────┬────────────┘
       │           │           │             │
  FMP stable   Finnhub    TradingView    Anthropic
  (財務/搜尋)  (報價/新聞/  (Widget)      (Claude Sonnet)
               同業/指標)
       │
  SQLite(開發) / Turso(生產)  via Drizzle ORM
  watchlist / financial_cache / stock_prices / analysis_reports
```

---

## 技術選型

| 層級 | 技術 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| 圖表 | Recharts + TradingView Widget |
| 資料快取 | TanStack Query v5 |
| ORM | Drizzle ORM + @libsql/client |
| 資料庫（開發） | SQLite（file:./dev.db） |
| 資料庫（生產） | Turso (LibSQL) |
| AI 分析 | Anthropic Claude Sonnet 4.6 |
| 財務數據 | Financial Modeling Prep (FMP stable API) |
| 即時報價 / 新聞 | Finnhub |
| 部署 | Zeabur |

---

## 快取策略

| 資料類型 | 客戶端 TTL | 伺服器端 |
|---------|-----------|---------|
| 股票報價 | 1 分鐘（TanStack Query） | SQLite stock_prices |
| 公司 Profile | 30 分鐘（TanStack Query） | — |
| 財務報表 | 24 小時（TanStack Query） | SQLite financial_cache（24h + stale fallback） |
| 同業比較 | 24 小時（TanStack Query） | — |
| 新聞 | 30 分鐘（TanStack Query） | — |
| AI 分析報告 | 永久 | DB（含 model_version、prompt_version、rating、target_price） |

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local` 並填入 API Key：

```bash
cp .env.example .env.local
```

```env
# 財務數據（必填）
FMP_API_KEY=

# 即時報價 / 新聞（必填）
FINNHUB_API_KEY=

# AI 分析（必填）
ANTHROPIC_API_KEY=

# 生產資料庫 Turso（本地開發留空，預設使用 file:./dev.db）
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# 站台密碼保護（可選，留空則開放存取）
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
| Anthropic Claude | 按用量付費 | [console.anthropic.com](https://console.anthropic.com/) |
| Turso | 500 MB 免費 | [turso.tech](https://turso.tech/) |

> 如需穩定使用財務報表功能，建議升級 FMP Starter（約 $19/月，1,500 次/天）。

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

4. 推送 `main` 分支後 Zeabur 自動建置，`zbpack.json` 設定啟動時自動執行 schema 同步：

```json
{
  "build_command": "npm run build",
  "start_command": "npx drizzle-kit push && npm start"
}
```

---

## 專案結構

```
src/
├── app/
│   ├── page.tsx                  # Dashboard 首頁
│   ├── stock/[symbol]/           # 個股分析頁
│   └── api/
│       ├── stocks/               # 追蹤清單 CRUD + 報價
│       ├── financials/[symbol]/  # 三大財報（含 SQLite cache）
│       ├── peers/[symbol]/       # 同業比較（4 層 fallback）
│       ├── news/[symbol]/        # 公司新聞
│       ├── market/               # 三大指數
│       ├── profile/[symbol]/     # 公司基本資訊
│       └── analysis/[symbol]/    # AI 分析（Streaming）
├── components/
│   ├── dashboard/                # Navbar、WatchlistTable、MarketOverview、MetricsPanel、AlertBanner
│   ├── stock/                    # StockHeader、三大報表 Tab、PeerComparison、ScoreCard
│   ├── charts/                   # TradingView Widget（dynamic import，停用 SSR）
│   └── analysis/                 # WallStreetAnalysis、NewsPanel
├── lib/
│   ├── db/                       # Drizzle schema + @libsql/client 連線
│   ├── api/                      # FMP、Finnhub 封裝（含 fallback 函式）
│   ├── scoring.ts                # 行業基準加權評分（YoY 營收成長率）
│   └── validations.ts            # Symbol 格式驗證（支援 AAPL、BRK.B、SPY）
├── config/
│   └── analyst-prompt.ts         # Claude System Prompt + User Prompt 模板（v1.1）
└── middleware.ts                  # Rate Limiting + Basic Auth
```

---

## 安全性

- 所有 API Key 僅在 server side 存取，不使用 `NEXT_PUBLIC_` 前綴
- Rate Limiting：一般 API 60 次/分鐘，AI 分析 POST 3 次/分鐘（in-memory per-IP）
- HTTP Security Headers：CSP、HSTS、X-Frame-Options、X-Content-Type-Options
- 可選 Basic Auth（設定 `SITE_PASSWORD` 環境變數）
- Drizzle ORM 參數化查詢，防止 SQL Injection
- Symbol 輸入驗證：`/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/`

---

## 免責聲明

本系統所有分析內容（含 AI 生成報告）**僅供研究參考，不構成投資建議**。投資有風險，請自行評估。
