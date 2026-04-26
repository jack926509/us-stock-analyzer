// 深度分析多代理人框架 — 事件與型別定義

export type AgentPhase = "data" | "masters" | "debate" | "risk" | "portfolio"

export type AgentId =
  // 投資大師（並行）
  | "buffett" | "lynch" | "wood" | "burry" | "ackman" | "taleb"
  // 辯論層
  | "bull" | "bear" | "manager"
  // 風險層
  | "aggressive" | "conservative" | "neutral" | "portfolio"

export type AgentEvent =
  | { type: "phase_start"; phase: AgentPhase }
  | { type: "phase_complete"; phase: AgentPhase }
  | { type: "agent_start"; phase: AgentPhase; agent: AgentId; label: string }
  | { type: "agent_chunk"; agent: AgentId; text: string }
  | { type: "agent_complete"; agent: AgentId; content: string }
  | { type: "error"; agent?: AgentId; message: string }
  | { type: "done"; finalContent: string; sections: AgentSections }

export interface AgentSections {
  masters: Partial<Record<"buffett" | "lynch" | "wood" | "burry" | "ackman" | "taleb", string>>
  debate: { bull?: string; bear?: string; manager?: string }
  risk: { aggressive?: string; conservative?: string; neutral?: string; portfolio?: string }
}

// 從現有單一分析師流程沿用的脈絡資料
export interface AnalysisContext {
  symbol: string
  companyName: string
  price: number
  marketCap: string
  pe: number | null
  range52w: string
  week52Position: string
  financialSummary: string
  keyMetricsSummary: string
  newsSummary: string
  peerSummary: string
  earningsSurprises: string
  analystConsensus: string
  insiderTrading: string
  macroContext: string
}

export const MASTER_LABELS: Record<
  "buffett" | "lynch" | "wood" | "burry" | "ackman" | "taleb",
  string
> = {
  buffett: "華倫·巴菲特（價值投資）",
  lynch: "彼得·林奇（成長合理價）",
  wood: "凱西·伍德（顛覆式創新）",
  burry: "麥可·貝瑞（逆向 / 泡沫獵手）",
  ackman: "比爾·艾克曼（集中型激進派）",
  taleb: "納西姆·塔雷伯（反脆弱 / 不對稱回報）",
}

export const AGENT_LABELS: Record<AgentId, string> = {
  ...MASTER_LABELS,
  bull: "多方研究員",
  bear: "空方研究員",
  manager: "研究主管",
  aggressive: "激進派風險分析師",
  conservative: "保守派風險分析師",
  neutral: "中立派風險分析師",
  portfolio: "投資組合經理（最終決策）",
}
