export type PersonaId = "buffett" | "cathie_wood" | "michael_burry" | "nassim_taleb"

export type PersonaStance = "Bullish" | "Bearish" | "Neutral"

export interface PersonaConfig {
  id: PersonaId
  displayName: string
  chineseName: string
  philosophy: string
  avatarInitials: string
  accentColor: string
  systemPrompt: string
  maxOutputTokens: number
}

export interface PersonaAnalysisResult {
  personaId: PersonaId
  content: string
  stance: PersonaStance | null
  targetPriceLow: number | null
  targetPriceHigh: number | null
  confidence: number | null
}

export type PersonaStreamEvent =
  | { type: "persona_chunk"; personaId: PersonaId; chunk: string }
  | { type: "persona_done"; personaId: PersonaId; result: PersonaAnalysisResult }
  | { type: "synthesis_chunk"; chunk: string }
  | { type: "synthesis_done"; synthesis: MultiPersonaSynthesis }
  | { type: "error"; personaId?: PersonaId; message: string }

export interface MultiPersonaSynthesis {
  summary: string
  stances: Partial<Record<PersonaId, PersonaStance>>
  divergenceScore: number
  finalRecommendation: string
  keyDisagreements: string[]
}

export interface MultiPersonaReport {
  id: number
  symbol: string
  personaIds: string
  personaResults: string
  synthesis: string
  divergenceScore: number | null
  finalRecommendation: string | null
  modelVersion: string
  promptVersion: string
  createdAt: string | null
}
