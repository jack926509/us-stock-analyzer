# US Stock Analyzer

美股分析系統 — 整合即時行情、三大財務報表、同業比較、AI 研究報告的個人投資輔助工具。

---

## 功能概覽

| 模組 | 說明 |
|------|------|
| Dashboard | S&P 500 / NASDAQ / DOW 即時指數 + 追蹤清單報價，60 秒自動刷新 |
| 追蹤清單 | 新增／移除股票（附公司 Logo），支援排序、產業分佈圓餅圖、Top 5 漲跌榜 |
| 財務報表 | 三大報表（損益表 / 資產負債表 / 現金流量表）+ 核心指標趨勢圖，年度 / 季度切換 |
| TradingView | 嵌入 K 線圖、技術指標（MA / RSI / MACD）及技術分析摘要面板 |
| 同業比較 | 與同業 3–5 家公司核心指標橫向對比 + Radar Chart |
| 綜合評分 | 五維度量化評分（獲利能力 / 成長 / 估值 / 財務健康 / 現金流），依行業基準調整 |
| AI 研究報告 | Claude claude-sonnet-4-6 生成華爾街級別分析，Streaming 即時輸出，歷史報告可回看 |
| 近期新聞 | Finnhub 公司新聞，情緒分類（正面 / 負面 / 中性） |

---

## 系統架構

```
┌─────────────────────────────────────────────────────────┐
│               前端 (Next.js 15 App Router)               │
│                                                         │
│  Dashboard  │  個股分析  │  TradingView  │  AI 分析      │
│  (Zustand)  │  (Tabs)   │  (Widget)     │  (Streaming)  │
└──────┬───────────┬───────────┬─────────────┬────────────┘
       │           │           │             │
┌──────▼───────────▼───────────▼─────────────▼────────────┐
│              後端 API Routes (Next.js)                   │
│                                                         │
│  /api/stocks  /api/financials  /api/peers  /api/news    │
│  /api/market  /api/profile     /api/analysis            │
└──────┬───────────┬───────────┬─────────────┬────────────┘
       │           │           │             │
  FMP stable   Finnhub    TradingView    Anthropic
  (財務/搜尋)  (新聞/報價)  (Widget)      (AI 分析)
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
| 狀態管理 | Zustand |
| 資料快取 | TanStack Query v5 |
| ORM | Drizzle ORM + @libsql/client |
| 資料庫（開發） | SQLite（file:./dev.db） |
| 資料庫（生產） | Turso (LibSQL) |
| AI 分析 | Anthropic Claude claude-sonnet-4-6 |
| 財務數據 | Financial Modeling Prep (FMP stable API) |
| 新聞 | Finnhub |
| 部署 | Zeabur |

---

## 快取策略

| 資料類型 | TTL | 說明 |
|---------|-----|------|
| 股票報價 | 1 分鐘 | TanStack Query，頁面自動刷新 |
| 財務報表 | 24 小時 | TanStack Query |
| 同業比較 | 24 小時 | TanStack Query |
| 新聞 | 30 分鐘 | TanStack Query |
| AI 分析報告 | 永久 | Turso DB（含 model_version、prompt_version） |

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

# 新聞（必填）
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
│       ├── stocks/               # 追蹤清單 CRUD
│       ├── financials/[symbol]/  # 三大財報
│       ├── peers/[symbol]/       # 同業比較
│       ├── news/[symbol]/        # 公司新聞
│       ├── profile/[symbol]/     # 公司基本資訊
│       └── analysis/[symbol]/    # AI 分析（Streaming）
├── components/
│   ├── dashboard/                # Navbar、WatchlistTable、MarketOverview、MetricsPanel
│   ├── stock/                    # StockHeader、三大報表 Tab、PeerComparison、ScoreCard
│   ├── charts/                   # TradingView Widget（dynamic import，停用 SSR）
│   └── analysis/                 # WallStreetAnalysis、NewsPanel
├── lib/
│   ├── db/                       # Drizzle schema + @libsql/client 連線
│   ├── api/                      # FMP、Finnhub、Alpha Vantage 封裝
│   ├── scoring.ts                # 行業基準加權評分模組
│   └── validations.ts            # Symbol 格式驗證（支援 AAPL、BRK.B、SPY）
├── config/
│   └── analyst-prompt.ts         # Claude System Prompt + User Prompt 模板
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
