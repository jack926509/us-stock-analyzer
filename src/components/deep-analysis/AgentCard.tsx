"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Loader2, CheckCircle2, Circle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type AgentStatus = "pending" | "running" | "done" | "error"

interface Props {
  label: string
  status: AgentStatus
  content: string
  errorMessage?: string
  // 大師卡用 compact，裁決/最終用 full
  compact?: boolean
}

export function AgentCard({ label, status, content, errorMessage, compact }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // 串流中自動捲到底
  useEffect(() => {
    if (status === "running" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, status])

  return (
    <div
      className={cn(
        "rounded-lg ring-1 transition-all",
        status === "running"
          ? "bg-white ring-[#CC785C]/30 shadow-sm"
          : status === "done"
          ? "bg-white ring-black/[0.08]"
          : status === "error"
          ? "bg-red-50 ring-red-300/40"
          : "bg-[#EFE9DD] ring-black/[0.05]"
      )}
    >
      <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <h4 className="text-sm font-medium text-stone-800">{label}</h4>
        </div>
        <StatusLabel status={status} />
      </div>

      {(content || status === "running" || status === "error") && (
        <div
          ref={scrollRef}
          className={cn(
            "overflow-y-auto px-4 py-3",
            compact ? "max-h-72" : "max-h-[60vh]"
          )}
        >
          {status === "error" && errorMessage && (
            <p className="text-xs text-red-600">{errorMessage}</p>
          )}
          {content && (
            <div className="prose prose-sm prose-stone max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mt-4 text-base font-serif font-semibold text-stone-900 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-4 border-b border-black/[0.08] pb-1.5 text-sm font-serif font-semibold text-stone-900 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-3 text-sm font-semibold text-stone-700 first:mt-0">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mt-2 text-[13px] leading-relaxed text-stone-700">{children}</p>
                  ),
                  li: ({ children }) => (
                    <li className="text-[13px] leading-relaxed text-stone-700">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-stone-900">{children}</strong>
                  ),
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto">
                      <table className="w-full text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-black/[0.1] bg-black/5 px-2.5 py-1.5 text-left text-stone-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-black/[0.1] px-2.5 py-1.5 text-stone-600">{children}</td>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
          {status === "running" && (
            <span className="mt-1 inline-block h-3.5 w-0.5 animate-pulse bg-[#CC785C]" />
          )}
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "running") return <Loader2 size={14} className="animate-spin text-[#CC785C]" />
  if (status === "done") return <CheckCircle2 size={14} className="text-emerald-600" />
  if (status === "error") return <XCircle size={14} className="text-red-500" />
  return <Circle size={14} className="text-stone-400" />
}

function StatusLabel({ status }: { status: AgentStatus }) {
  const map = {
    pending: { text: "等待中", cls: "text-stone-400" },
    running: { text: "分析中", cls: "text-[#CC785C]" },
    done: { text: "已完成", cls: "text-emerald-600" },
    error: { text: "失敗", cls: "text-red-500" },
  }
  const { text, cls } = map[status]
  return <span className={cn("text-[11px] font-medium", cls)}>{text}</span>
}
