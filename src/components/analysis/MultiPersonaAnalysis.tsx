"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Sparkles, Square, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { PERSONA_CONFIGS } from "@/config/persona-prompts"
import type {
  PersonaId,
  PersonaAnalysisResult,
  PersonaStreamEvent,
  MultiPersonaSynthesis,
} from "@/types/personas"
import { PersonaSelector } from "./PersonaSelector"
import { CostEstimate } from "./CostEstimate"
import { PersonaCard } from "./PersonaCard"
import { DivergenceMeter } from "./DivergenceMeter"
import { PortfolioManagerCard } from "./PortfolioManagerCard"
import { MultiPersonaHistory } from "./MultiPersonaHistory"

interface Props {
  symbol: string
  price?: number
}

type Phase = "idle" | "running" | "synthesis" | "done"

interface CardState {
  content: string
  isDone: boolean
  result: PersonaAnalysisResult | null
}

type CardStates = Partial<Record<PersonaId, CardState>>

const DEFAULT_SELECTION: PersonaId[] = ["buffett", "cathie_wood"]

export function MultiPersonaAnalysis({ symbol, price }: Props) {
  const [selectedPersonas, setSelectedPersonas] = useState<PersonaId[]>(DEFAULT_SELECTION)
  const [cardStates, setCardStates] = useState<CardStates>({})
  const [synthContent, setSynthContent] = useState("")
  const [synthesis, setSynthesis] = useState<MultiPersonaSynthesis | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()

  // Chunk buffers flushed on each animation frame — avoids a setState per SSE
  // delta, which would otherwise fire thousands of renders during a run.
  const personaBuffersRef = useRef<Partial<Record<PersonaId, string>>>({})
  const synthBufferRef = useRef("")
  const flushScheduledRef = useRef(false)

  const isRunning = phase === "running" || phase === "synthesis"

  // Abort any in-flight stream if the user navigates away mid-run.
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const flushBuffers = useCallback(() => {
    flushScheduledRef.current = false
    const personaBuffers = personaBuffersRef.current
    const personaIds = Object.keys(personaBuffers) as PersonaId[]

    if (personaIds.length > 0) {
      setCardStates((prev) => {
        const next = { ...prev }
        for (const id of personaIds) {
          const delta = personaBuffers[id]
          if (!delta) continue
          const existing = next[id] ?? { content: "", isDone: false, result: null }
          next[id] = { ...existing, content: existing.content + delta }
        }
        return next
      })
      personaBuffersRef.current = {}
    }

    if (synthBufferRef.current) {
      const delta = synthBufferRef.current
      synthBufferRef.current = ""
      setSynthContent((prev) => prev + delta)
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return
    flushScheduledRef.current = true
    if (typeof requestAnimationFrame === "undefined") {
      // SSR / test environment fallback
      queueMicrotask(flushBuffers)
    } else {
      requestAnimationFrame(flushBuffers)
    }
  }, [flushBuffers])

  const resetState = useCallback((ids: PersonaId[]) => {
    const initial: CardStates = {}
    for (const id of ids) {
      initial[id] = { content: "", isDone: false, result: null }
    }
    setCardStates(initial)
    setSynthContent("")
    setSynthesis(null)
    setErrorMsg(null)
    personaBuffersRef.current = {}
    synthBufferRef.current = ""
  }, [])

  const handleEvent = useCallback(
    (event: PersonaStreamEvent) => {
      switch (event.type) {
        case "persona_chunk": {
          const buf = personaBuffersRef.current
          buf[event.personaId] = (buf[event.personaId] ?? "") + event.chunk
          scheduleFlush()
          break
        }
        case "persona_done": {
          flushBuffers()
          setCardStates((prev) => {
            const existing = prev[event.personaId] ?? {
              content: "",
              isDone: false,
              result: null,
            }
            return {
              ...prev,
              [event.personaId]: {
                ...existing,
                isDone: true,
                result: event.result,
              },
            }
          })
          break
        }
        case "synthesis_chunk": {
          setPhase((p) => (p === "running" ? "synthesis" : p))
          synthBufferRef.current += event.chunk
          scheduleFlush()
          break
        }
        case "synthesis_done": {
          flushBuffers()
          setSynthesis(event.synthesis)
          break
        }
        case "error": {
          setErrorMsg(event.message)
          break
        }
      }
    },
    [flushBuffers, scheduleFlush]
  )

  const handleRun = async () => {
    if (isRunning) {
      abortRef.current?.abort()
      return
    }
    if (selectedPersonas.length < 2 || selectedPersonas.length > 4) return

    resetState(selectedPersonas)
    setPhase("running")
    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/analysis/${symbol}/multi-persona`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaIds: selectedPersonas }),
        signal: abortRef.current.signal,
      })

      if (res.status === 429) {
        setErrorMsg("請求過於頻繁，請稍候 1 分鐘後再試")
        setPhase("idle")
        return
      }
      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "請求失敗"))
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith("data:")) continue
          const payload = line.slice(5).trim()
          if (!payload) continue
          try {
            handleEvent(JSON.parse(payload) as PersonaStreamEvent)
          } catch {
            /* malformed line — skip */
          }
        }
      }

      flushBuffers()
      setPhase("done")
      await queryClient.invalidateQueries({ queryKey: ["multi-persona-reports", symbol] })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setPhase("idle")
        return
      }
      console.error("[multi-persona] run failed", err)
      setErrorMsg("多師分析執行失敗，請重試")
      setPhase("idle")
    }
  }

  const doneResults = selectedPersonas
    .map((id) => cardStates[id]?.result)
    .filter((r): r is PersonaAnalysisResult => r != null)
  const doneCount = doneResults.length

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-stone-600" />
        <h3 className="text-sm font-semibold text-stone-900">多師論道</h3>
        <p className="text-xs text-stone-500">
          平行執行多位投資大師的分析，並由 Portfolio Manager 仲裁
        </p>
      </div>

      <div className="rounded-lg bg-[#faf6f1] p-3 ring-1 ring-black/[0.06]">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          選擇大師（2–4 位）
        </h4>
        <PersonaSelector
          selected={selectedPersonas}
          onChange={setSelectedPersonas}
          maxSelect={4}
          disabled={isRunning}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 ring-1 ring-black/[0.08]">
        <CostEstimate personaCount={selectedPersonas.length} />
        <button
          onClick={handleRun}
          disabled={!isRunning && (selectedPersonas.length < 2 || selectedPersonas.length > 4)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            isRunning
              ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/20 hover:bg-red-500/15"
              : "bg-[#00d47e]/15 text-[#006e3f] ring-1 ring-[#00d47e]/30 hover:bg-[#00d47e]/25 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {isRunning ? (
            <>
              <Square size={14} />
              中止執行
            </>
          ) : (
            <>
              <Sparkles size={14} />
              執行多師分析
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2 text-xs text-red-700 ring-1 ring-red-500/20">
          {errorMsg}
        </div>
      )}

      {selectedPersonas.length > 0 && (phase !== "idle" || doneCount > 0) && (
        <div
          className={cn(
            "grid gap-4",
            selectedPersonas.length <= 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2"
          )}
        >
          {selectedPersonas.map((id) => {
            const config = PERSONA_CONFIGS[id]
            if (!config) return null
            return (
              <PersonaCard
                key={id}
                config={config}
                state={cardStates[id]}
                currentPrice={price}
              />
            )
          })}
        </div>
      )}

      {doneCount >= 2 && (
        <DivergenceMeter results={doneResults} synthesis={synthesis} />
      )}

      {(phase === "synthesis" || synthContent || synthesis) && (
        <PortfolioManagerCard
          content={synthContent}
          synthesis={synthesis}
          isStreaming={phase === "synthesis"}
        />
      )}

      <div className="pt-2">
        <MultiPersonaHistory symbol={symbol} />
      </div>
    </div>
  )
}
