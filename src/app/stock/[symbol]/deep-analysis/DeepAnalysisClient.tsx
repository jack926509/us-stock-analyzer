"use client"

import { useReducer, useRef, useState } from "react"
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseSseStream } from "@/lib/agents/sse-parser"
import type { AgentEvent, AgentId, AgentPhase } from "@/lib/agents/types"
import { AGENT_LABELS, MASTER_LABELS } from "@/lib/agents/types"
import { AgentCard, type AgentStatus } from "@/components/deep-analysis/AgentCard"
import { PhaseProgress, type PhaseStatus } from "@/components/deep-analysis/PhaseProgress"

interface Props {
  symbol: string
}

type AgentState = Record<AgentId, { status: AgentStatus; content: string; errorMessage?: string }>

const ALL_AGENTS: AgentId[] = [
  "buffett", "lynch", "wood", "burry", "ackman", "taleb",
  "bull", "bear", "manager",
  "aggressive", "conservative", "neutral", "portfolio",
]

const initialAgents: AgentState = ALL_AGENTS.reduce((acc, id) => {
  acc[id] = { status: "pending", content: "" }
  return acc
}, {} as AgentState)

const initialPhases: Record<AgentPhase, PhaseStatus> = {
  data: "done", // 進場前已先抓資料
  masters: "pending",
  debate: "pending",
  risk: "pending",
  portfolio: "pending",
}

type Action =
  | { type: "reset" }
  | { type: "event"; event: AgentEvent }

function reducer(
  state: { agents: AgentState; phases: Record<AgentPhase, PhaseStatus>; errors: string[] },
  action: Action
) {
  if (action.type === "reset") {
    return {
      agents: { ...initialAgents },
      phases: { ...initialPhases },
      errors: [],
    }
  }
  const e = action.event
  switch (e.type) {
    case "phase_start":
      return { ...state, phases: { ...state.phases, [e.phase]: "running" as PhaseStatus } }
    case "phase_complete":
      return { ...state, phases: { ...state.phases, [e.phase]: "done" as PhaseStatus } }
    case "agent_start":
      return {
        ...state,
        agents: {
          ...state.agents,
          [e.agent]: { ...state.agents[e.agent], status: "running" as AgentStatus, content: "" },
        },
      }
    case "agent_chunk":
      return {
        ...state,
        agents: {
          ...state.agents,
          [e.agent]: {
            ...state.agents[e.agent],
            status: "running" as AgentStatus,
            content: state.agents[e.agent].content + e.text,
          },
        },
      }
    case "agent_complete":
      return {
        ...state,
        agents: {
          ...state.agents,
          [e.agent]: {
            status: state.agents[e.agent].status === "error" ? "error" : "done",
            content: e.content,
            errorMessage: state.agents[e.agent].errorMessage,
          } as AgentState[AgentId],
        },
      }
    case "error": {
      const errors = [...state.errors, e.agent ? `${AGENT_LABELS[e.agent]}：${e.message}` : e.message]
      if (e.agent) {
        return {
          ...state,
          errors,
          agents: {
            ...state.agents,
            [e.agent]: {
              ...state.agents[e.agent],
              status: "error" as AgentStatus,
              errorMessage: e.message,
            },
          },
        }
      }
      return { ...state, errors }
    }
    case "done":
      return state
  }
}

export function DeepAnalysisClient({ symbol }: Props) {
  const [{ agents, phases, errors }, dispatch] = useReducer(reducer, {
    agents: { ...initialAgents },
    phases: { ...initialPhases },
    errors: [],
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleStart() {
    if (isStreaming) {
      abortRef.current?.abort()
      return
    }
    abortRef.current = new AbortController()
    dispatch({ type: "reset" })
    setIsStreaming(true)

    try {
      const res = await fetch(`/api/deep-analysis/${symbol}`, {
        method: "POST",
        signal: abortRef.current.signal,
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      for await (const event of parseSseStream(res.body)) {
        dispatch({ type: "event", event })
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        dispatch({
          type: "event",
          event: { type: "error", message: `串流中斷：${err.message}` },
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }

  const portfolio = agents.portfolio

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900">
            {symbol} 深度分析
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            6 位投資大師 · 多空辯論 · 三方風險辯論 · 投組整合
          </p>
        </div>
        <button
          onClick={handleStart}
          className={cn(
            "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors",
            isStreaming
              ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20 hover:bg-red-500/15"
              : "bg-[#CC785C] text-white hover:bg-[#B8674F]"
          )}
        >
          {isStreaming ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              中止
            </>
          ) : portfolio.content ? (
            <>
              <RefreshCw size={14} />
              重新分析
            </>
          ) : (
            <>
              <Sparkles size={14} />
              啟動深度分析
            </>
          )}
        </button>
      </div>

      <PhaseProgress phases={phases} />

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-red-800">分析過程發生錯誤</p>
              {errors.map((m, i) => (
                <p key={i} className="text-xs text-red-700">{m}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. 6 位大師（網格） */}
      <Section title="投資大師獨立分析" subtitle="6 位大師基於相同資料、各自鏡頭做判斷">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(MASTER_LABELS) as Array<keyof typeof MASTER_LABELS>).map((m) => (
            <AgentCard
              key={m}
              label={AGENT_LABELS[m]}
              status={agents[m].status}
              content={agents[m].content}
              errorMessage={agents[m].errorMessage}
              compact
            />
          ))}
        </div>
      </Section>

      {/* 2. 多空辯論 */}
      <Section title="多空辯論" subtitle="兩派研究員針鋒相對，研究主管裁決">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AgentCard
            label={AGENT_LABELS.bull}
            status={agents.bull.status}
            content={agents.bull.content}
            errorMessage={agents.bull.errorMessage}
            compact
          />
          <AgentCard
            label={AGENT_LABELS.bear}
            status={agents.bear.status}
            content={agents.bear.content}
            errorMessage={agents.bear.errorMessage}
            compact
          />
        </div>
        <div className="mt-3">
          <AgentCard
            label={AGENT_LABELS.manager}
            status={agents.manager.status}
            content={agents.manager.content}
            errorMessage={agents.manager.errorMessage}
            compact
          />
        </div>
      </Section>

      {/* 3. 風險辯論 */}
      <Section title="風險辯論" subtitle="激進派 / 保守派 / 中立派各陳倉位邏輯">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AgentCard
            label={AGENT_LABELS.aggressive}
            status={agents.aggressive.status}
            content={agents.aggressive.content}
            errorMessage={agents.aggressive.errorMessage}
            compact
          />
          <AgentCard
            label={AGENT_LABELS.conservative}
            status={agents.conservative.status}
            content={agents.conservative.content}
            errorMessage={agents.conservative.errorMessage}
            compact
          />
          <AgentCard
            label={AGENT_LABELS.neutral}
            status={agents.neutral.status}
            content={agents.neutral.content}
            errorMessage={agents.neutral.errorMessage}
            compact
          />
        </div>
      </Section>

      {/* 4. Portfolio Manager 最終決策 */}
      <Section title="投組經理最終決策" subtitle="整合所有觀點，輸出可執行報告">
        <AgentCard
          label={AGENT_LABELS.portfolio}
          status={agents.portfolio.status}
          content={agents.portfolio.content}
          errorMessage={agents.portfolio.errorMessage}
        />
      </Section>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-serif font-semibold text-stone-900">{title}</h2>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}
