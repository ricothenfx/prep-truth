import { useMemo, useState } from "react"
import ThemeToggle from "./components/ThemeToggle"
import UploadPanel from "./components/UploadPanel"
import MappingPanel from "./components/MappingPanel"
import VerdictStrip from "./components/VerdictStrip"
import DaypartChart from "./components/DaypartChart"
import RecommendationTable from "./components/RecommendationTable"
import BeforeAfter from "./components/BeforeAfter"
import { guessMapping, parseCsv, STANDARD_MAPPING } from "./engine/parse"
import { buildRecommendations, computeVerdict, replay } from "./engine/stats"
import { generateExampleCsv } from "./engine/example"
import type { Mapping } from "./engine/types"

interface MappingState {
  text: string
  label: string
  headers: string[]
  mapping: Mapping
}

export default function App() {
  const [mappingState, setMappingState] = useState<MappingState | null>(null)
  const [ready, setReady] = useState<{ label: string; text: string; mapping: Mapping } | null>(null)

  const handleText = (text: string, label: string) => {
    const firstLine = text.split("\n")[0]?.trim() ?? ""
    const headers = firstLine ? firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, "")) : []
    setReady(null)
    setMappingState({ text, label, headers, mapping: guessMapping(headers) })
  }

  const handleExample = () => {
    setMappingState(null)
    setReady({ label: "Kreuzberg Kanteen — 30 days of synthetic example orders", text: generateExampleCsv(), mapping: STANDARD_MAPPING })
  }

  const report = useMemo(
    () => (ready ? parseCsv(ready.text, ready.mapping) : null),
    [ready],
  )
  const verdict = useMemo(() => (report ? computeVerdict(report.orders) : null), [report])
  const recommendations = useMemo(() => (report ? buildRecommendations(report.orders) : null), [report])
  const after = useMemo(
    () => (report && recommendations ? replay(report.orders, recommendations) : null),
    [report, recommendations],
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="7" fill="var(--accent)" />
              <path
                d="M9 22V10h5.2c2.6 0 4.3 1.6 4.3 4s-1.7 4-4.3 4H12v4H9zm3-6.5h2c1 0 1.6-.6 1.6-1.5s-.6-1.5-1.6-1.5h-2v3z"
                fill="var(--accent-ink)"
              />
              <rect x="20" y="20" width="4" height="2.6" fill="var(--accent-ink)" />
            </svg>
            <span className="text-lg font-bold tracking-tight">Prep-Truth</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {!mappingState && !ready && (
          <section className="py-6">
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              The prep-time numbers your kitchen actually runs on.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted">
              Platforms promise delivery times from a prep-time setting that most
              restaurants set once by hand and never check. Upload your order history and
              get settings per daypart backed by your own data — with before/after proof.
            </p>
            <div className="mt-8">
              <UploadPanel onText={handleText} onExample={handleExample} />
            </div>
          </section>
        )}

        {mappingState && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-xl font-bold tracking-tight">Match columns for “{mappingState.label}”</h1>
              <button
                type="button"
                onClick={() => setMappingState(null)}
                className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
              >
                cancel
              </button>
            </div>
            <MappingPanel
              headers={mappingState.headers}
              mapping={mappingState.mapping}
              onChange={(m) => setMappingState({ ...mappingState, mapping: m })}
              onConfirm={() => {
                setReady({ label: mappingState.label, text: mappingState.text, mapping: mappingState.mapping })
                setMappingState(null)
              }}
            />
          </section>
        )}

        {ready && report && verdict && recommendations && after && (
          <section className="space-y-5" data-testid="results">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{ready.label}</h1>
                <p className="mt-1 text-sm text-muted" data-testid="row-report">
                  {report.used} orders analyzed · {report.skipped} rows skipped
                  {Object.entries(report.reasons).length > 0 && (
                    <> ({Object.entries(report.reasons).map(([k, v]) => `${v} ${k}`).join(", ")})</>
                  )}
                </p>
              </div>
              <UploadPanel compact onText={handleText} onExample={handleExample} />
            </div>

            {report.used === 0 ? (
              <div className="rounded-2xl border border-warn bg-surface p-6 text-sm">
                No usable orders found. Check the column mapping — timestamps must be
                parseable dates and promised_prep_min a number.
              </div>
            ) : (
              <>
                <VerdictStrip verdict={verdict} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <DaypartChart stats={recommendations} />
                  <BeforeAfter before={verdict} after={after} />
                </div>
                <RecommendationTable recommendations={recommendations} />
              </>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl px-4 py-4 text-xs leading-relaxed text-muted">
          Prep-Truth is an independent, open analysis tool. It is not affiliated with any
          delivery platform. Synthetic example data only; your CSVs are processed locally
          in the browser. © 2026 prep-truth contributors.
        </div>
      </footer>
    </div>
  )
}
