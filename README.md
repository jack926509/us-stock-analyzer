# US Stock Analyzer

美股分析系統 — 整合財務報表、即時報價、AI 華爾街分析視角的個人投資研究工具。

---

## 功能概覽

| 模組 | 說明 |
|------|------|
| Dashboard | 大盤指數（SPY/QQQ/DIA）+ 追蹤清單即時報價，60 秒自動刷新 |
| 追蹤清單 | 新增／移除股票，支援排序、產業分佈圓餅圖、Top 5 漲跌榜 |
| 財務報表 | 三大報表（損益表 / 資產負債表 / 現金流量表）+ 核心指標趨勢圖 |
| TradingView | 嵌入 K 線圖、技術指標（MA / RSI / MACD）、技術分析摘要 |
| AI 分析 | Claude claude-sonnet-4-6 生成華爾街級別研究報告，Streaming 即時顯示 |
| 同業比較 | 與同業 3–5 家公司的核心指標橫向比較 + Radar Chart |
| 評分系統 | 五維度量化評分（獲利能力 / 成長 / 估值 / 財務健康 / 現金流），依產業基準調整 |

---

## 系統架構

```
┌──────────────────────────────────────────────────────────┐
│                  前端 (Next.js 16 App Router)             │
│                                                          │
│  Dashboard  │  個股分析  │  TradingView  │  AI 分析      │
│  (Zustand)  │  (Tabs)   │  (Widget)     │  (Streaming)  │
└──────┬───────────┬────────────┬──────────────┬───────────┘
       │           │            │              │
┌──────▼───────────▼────────────▼──────────────▼───────────┐
│              後端 API Routes (Next.js)                    │
│                                                          │
│  /api/stocks  /api/financials  /api/news  /api/analysis  │
│  /api/market  /api/peers       /api/search               │
└──────┬───────────┬────────────┬──────────────┬───────────┘
       │           │            │              │
  FMP stable   Finnhub      TradingView    Anthropic
  (財務/搜尋)  (報價/新聞)   (Widget)       (AI 分析)
       │
  SQLite / Turso (Drizzle ORM)
  watchlist / financial_cache / stock_prices / analysis_reports
```

---

## 技術選型

| 層級 | 技術 | 理由 |
|------|------|------|
| 框架 | Next.js 16 (App Router) | SSR + API Routes 一站式，支援 React 19 |
| UI | shadcn/ui + Tailwind CSS v4 | 金融 Dashboard 深色主題 |
| 圖表 | Recharts v3 + TradingView Widget | 財務趨勢圖 + 專業 K 線 |
| 狀態管理 | Zustand | 輕量追蹤清單狀態 |
| 資料快取 | TanStack Query v5 | Stale-while-revalidate，減少 API 呼叫 |
| ORM | Drizzle ORM | TypeScript 型別安全，SQLite ↔ Turso 無縫切換 |
| DB（開發） | SQLite (better-sqlite3) | 本地零設定 |
| DB（生產） | Turso (LibSQL) | 邊緣部署相容 |
| AI | Anthropic Claude claude-sonnet-4-6 | ReadableStream Streaming 回應 |
| 財務資料 | FMP stable API | 搜尋、公司 Profile、財務報表 |
| 報價 | FMP stable + Finnhub fallback | FMP Premium 端點自動降級至 Finnhub |

---

## 資料流設計

### API 優先順序

```
報價請求
  → FMP stable/quote（一般美股）
  → Finnhub fallback（FMP Premium 限制的股票）

公司資訊
  → FMP stable/profile
  → Finnhub stock/profile2（fallback）

大盤指數
  → Finnhub（SPY / QQQ / DIA）
```

### 快取策略

| 資料類型 | TTL | 儲存位置 |
|---------|-----|---------|
| 股票報價 | 1 分鐘 | TanStack Query + SQLite |
| 財務報表 | 24 小時 | SQLite financial_cache |
| 新聞 | 30 分鐘 | TanStack Query |
| AI 分析報告 | 永久 | SQLite analysis_reports（含 model_version）|

---

## 資料庫 Schema

```sql
watchlist          -- 追蹤清單（symbol, name, sector, notes）
financial_cache    -- 財報快取（symbol + report_type + period 複合唯一索引）
stock_prices       -- 即時報價快取（symbol 唯一，UPSERT 更新）
analysis_reports   -- AI 分析歷史（含 model_version, prompt_version）
```

---

## 快速開始

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.local.example .env.local
# 填入以下 API Keys：
# FMP_API_KEY        https://financialmodelingprep.com
# FINNHUB_API_KEY    https://finnhub.io
# ANTHROPIC_API_KEY  https://console.anthropic.com
# ALPHA_VANTAGE_KEY  https://www.alphavantage.co（備援）

# 3. 初始化資料庫
npm run db:push

# 4. 啟動開發伺服器
npm run dev
```

瀏覽器開啟 `http://localhost:3000`

---

## 開發指令

```bash
npm run dev          # 啟動開發伺服器（Turbopack）
npm run build        # 生產環境建置
npm run lint         # ESLint 檢查
npm run format       # Prettier 格式化
npm run db:push      # 同步 schema 至資料庫
npm run db:generate  # 產生 migration 檔案
npm run db:studio    # 開啟 Drizzle Studio（資料庫 GUI）
```

---

## 安全性

- 所有 API Key 僅存於 `.env.local`，**不加 `NEXT_PUBLIC_` 前綴**，只在 Server Side 存取
- `.env.local` 已加入 `.gitignore`，僅 `.env.local.example`（空值）可 commit
- 所有 API Route 接收 `symbol` 參數前皆呼叫 `validateSymbol()` 驗證格式（`/^[A-Z]{1,5}$/`）
- Drizzle ORM 參數化查詢，無手動拼接 SQL

---

## 免責聲明

本系統所有分析內容（含 AI 生成報告）**僅供研究參考，不構成投資建議**。投資有風險，請自行評估。
