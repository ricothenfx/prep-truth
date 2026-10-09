export const maxDuration = 60

interface Req {
  method?: string
  body?: unknown
}

interface Res {
  status: (code: number) => Res
  json: (payload: unknown) => void
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[]
}

const FIELDS = ["acceptedAt", "foodReadyAt", "riderArrivedAt", "pickedUpAt", "promisedPrepMin"] as const

function env(name: string, fallback = ""): string {
  const v = process.env[name]
  return typeof v === "string" && v.length > 0 ? v : fallback
}

function offline(res: Res, why: string): void {
  res.status(200).json({ offline: true, why })
}

function extractJson(content: string): unknown {
  const stripped = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim()
  try {
    return JSON.parse(stripped)
  } catch {
    const start = stripped.indexOf("{")
    const end = stripped.lastIndexOf("}")
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

async function chat(baseUrl: string, apiKey: string, model: string, system: string, user: string): Promise<unknown> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(50000),
  })
  if (!res.ok) throw new Error(`llm http ${res.status}`)
  const data = (await res.json()) as ChatResponse
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== "string" || content.length === 0) throw new Error("llm empty content")
  return extractJson(content)
}

function validateMapping(obj: unknown, headers: string[]): Record<string, string> | null {
  if (typeof obj !== "object" || obj === null) return null
  const mapping = (obj as { mapping?: unknown }).mapping
  if (typeof mapping !== "object" || mapping === null) return null
  const out: Record<string, string> = {}
  for (const f of FIELDS) {
    const v = (mapping as Record<string, unknown>)[f]
    if (typeof v !== "string" || !headers.includes(v)) return null
    out[f] = v
  }
  return out
}

function validateSummary(obj: unknown): string | null {
  if (typeof obj !== "object" || obj === null) return null
  const s = (obj as { summary?: unknown }).summary
  if (typeof s !== "string") return null
  const trimmed = s.trim()
  return trimmed.length >= 40 && trimmed.length <= 1500 ? trimmed : null
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" })
    return
  }
  const apiKey = env("LLM_API_KEY")
  if (env("MOCK_MODE") === "true" || apiKey === "") {
    offline(res, "no API key configured — the app runs fully offline")
    return
  }
  const baseUrl = env("LLM_BASE_URL", "https://api.openai.com/v1")
  const model = env("LLM_MODEL", "gpt-4o-mini")
  const body = req.body as { mode?: string } | undefined
  const mode = body?.mode

  try {
    if (mode === "map") {
      const { headers, sampleRows } = body as { headers?: unknown; sampleRows?: unknown }
      if (!Array.isArray(headers) || !headers.every((h) => typeof h === "string")) {
        res.status(400).json({ error: "headers must be string[]" })
        return
      }
      const rows = Array.isArray(sampleRows) ? sampleRows.slice(0, 3) : []
      const obj = await chat(
        baseUrl,
        apiKey,
        model,
        'You map restaurant order-export CSV columns. Reply with strict JSON: {"mapping":{"acceptedAt":"<header>","foodReadyAt":"<header>","riderArrivedAt":"<header>","pickedUpAt":"<header>","promisedPrepMin":"<header>"}}. Use exact header strings from the list. acceptedAt = when the kitchen accepted the order; foodReadyAt = when food was marked ready; riderArrivedAt = courier arrival; pickedUpAt = pickup; promisedPrepMin = promised prep time in minutes (a number column). If a field truly does not exist, use "".',
        `Headers: ${JSON.stringify(headers)}\nFirst rows: ${JSON.stringify(rows)}`,
      )
      const mapping = validateMapping(obj, headers as string[])
      if (!mapping) {
        offline(res, "model returned an unusable mapping")
        return
      }
      res.status(200).json({ offline: false, mapping })
      return
    }

    if (mode === "report") {
      const { payload } = body as { payload?: unknown }
      if (typeof payload !== "object" || payload === null) {
        res.status(400).json({ error: "payload required" })
        return
      }
      const obj = await chat(
        baseUrl,
        apiKey,
        model,
        'You write a short, plain-English report for a restaurant owner about their kitchen prep-time data. Use ONLY the numbers given — never invent, recompute, or convert a number. Every duration field name carries its unit: fields ending in Minutes are minutes; fields ending in TotalMinutes are sums across all orders, fields ending in AvgMinutes are per-order averages. State each number exactly as given, with its unit and correct meaning (total vs per order). Reply with strict JSON: {"summary":"..."} of 90-150 words. Structure: what the data shows, which daypart is most stressed, what setting to change, and the expected improvement. Be concrete and calm; no marketing tone.',
        JSON.stringify(payload),
      )
      const summary = validateSummary(obj)
      if (!summary) {
        offline(res, "model returned an unusable summary")
        return
      }
      res.status(200).json({ offline: false, summary })
      return
    }

    res.status(400).json({ error: "unknown mode" })
  } catch (err) {
    offline(res, `LLM call failed: ${err instanceof Error ? err.message : "unknown"}`)
  }
}
