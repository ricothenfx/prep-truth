import type { Verdict } from "../engine/types"
import { fmtMin, fmtNum, fmtPct } from "../lib/format"

interface Props {
  verdict: Verdict
}

export default function VerdictStrip({ verdict }: Props) {
  const cards = [
    {
      value: fmtPct(verdict.pctLate),
      label: "orders late at the kitchen",
      hint: "actual prep exceeded the promised prep time",
      tone: verdict.pctLate > 20 ? "warn" : "ok",
    },
    {
      value: `${fmtNum(verdict.medianPrep, 0)} min`,
      label: "median actual prep",
      hint: "half of your orders took longer than this",
      tone: "ok",
    },
    {
      value: fmtMin(verdict.totalRiderWaitMin),
      label: "rider waiting, total",
      hint: "riders standing at your counter because food wasn't ready",
      tone: "ok",
    },
    {
      value: fmtMin(verdict.totalFoodIdleMin),
      label: "food waiting, total",
      hint: "food sitting ready, going cold before pickup",
      tone: "ok",
    },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="verdict-strip">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-line bg-surface p-4">
          <div
            className={`text-2xl font-bold tabular-nums ${
              c.tone === "warn" ? "text-warn" : "text-ink"
            }`}
            data-testid={c.label.includes("late") ? "verdict-late" : undefined}
          >
            {c.value}
          </div>
          <div className="mt-1 text-sm font-medium">{c.label}</div>
          <div className="mt-0.5 text-xs leading-snug text-muted">{c.hint}</div>
        </div>
      ))}
    </div>
  )
}
