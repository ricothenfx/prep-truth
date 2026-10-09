import Papa from "papaparse"
import type { Mapping } from "../engine/types"

const FIELDS: (keyof Mapping)[] = ["acceptedAt", "foodReadyAt", "riderArrivedAt", "pickedUpAt", "promisedPrepMin"]

export interface SummaryResult {
  text: string
  source: "ai" | "template"
}

async function postLlm(payload: unknown, timeoutMs = 20000): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    if (data.offline === true) return null
    return data
  } catch {
    return null
  }
}

export interface MappingSuggestion {
  mapping: Mapping
  source: "ai"
}

export async function suggestAiMapping(headers: string[], csvText: string): Promise<MappingSuggestion | null> {
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true })
  const sampleRows = parsed.data.slice(0, 3).map((row) => headers.map((h) => row[h] ?? ""))
  const data = await postLlm({ mode: "map", headers, sampleRows })
  if (!data || typeof data.mapping !== "object" || data.mapping === null) return null
  const mapping = data.mapping as Record<string, unknown>
  const out = {} as Mapping
  for (const f of FIELDS) {
    const v = mapping[f]
    if (typeof v !== "string") return null
    out[f] = v
  }
  return { mapping: out, source: "ai" }
}

export interface SummaryPayload {
  totalOrders: number
  pctLate: number
  medianPrep: number
  worstDaypart: string | null
  worstLatePct: number | null
  recommendations: { daypart: string; from: number; to: number | null }[]
  afterPctLate: number
  riderWaitTotalMinutesBefore: number
  riderWaitTotalMinutesAfter: number
  riderWaitAvgMinutesBefore: number
  riderWaitAvgMinutesAfter: number
}

export async function generateSummary(payload: SummaryPayload): Promise<SummaryResult> {
  const data = await postLlm({ mode: "report", payload }, 30000)
  const text = data && typeof data.summary === "string" ? data.summary.trim() : ""
  if (text.length >= 40 && text.length <= 1500) {
    return { text, source: "ai" }
  }
  return { text: templateSummary(payload), source: "template" }
}

export function templateSummary(p: SummaryPayload): string {
  const changed = p.recommendations.filter((r) => r.to !== null)
  const raised = changed.filter((r) => r.to! > r.from)
  const parts: string[] = []
  parts.push(
    `Across ${p.totalOrders} orders, ${p.pctLate.toFixed(0)}% ran past their promised prep time ` +
      `and the median kitchen took ${Math.round(p.medianPrep)} minutes.`,
  )
  if (p.worstDaypart && p.worstLatePct !== null) {
    parts.push(
      `${p.worstDaypart} is your most stressed window — ${p.worstLatePct.toFixed(0)}% of those orders went late.`,
    )
  }
  if (changed.length > 0) {
    const list = changed
      .map((r) => `${r.daypart} ${Math.round(r.from)}→${r.to} min`)
      .join(", ")
    parts.push(
      `Based on your own data (the p85 of actual prep), adjust the promise: ${list}. ` +
        (raised.length > 0
          ? "A higher number does not slow the kitchen down — it sends riders at a more honest time."
          : "Your current settings are already ahead of reality in some windows."),
    )
  }
  parts.push(
    `Replaying the same orders with these settings, lateness falls to ${p.afterPctLate.toFixed(0)}% ` +
      `and total rider waiting drops from ${Math.round(p.riderWaitTotalMinutesBefore)} to ` +
      `${Math.round(p.riderWaitTotalMinutesAfter)} minutes — about ` +
      `${p.riderWaitAvgMinutesBefore.toFixed(1)} to ${p.riderWaitAvgMinutesAfter.toFixed(1)} minutes per order.`,
  )
  return parts.join(" ")
}
