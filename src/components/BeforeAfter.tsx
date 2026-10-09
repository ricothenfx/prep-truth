import type { Replay, Verdict } from "../engine/types"
import { fmtPct } from "../lib/format"

interface Props {
  before: Verdict
  after: Replay
}

function fmtMinutes(total: number): string {
  const m = Math.round(Math.abs(total))
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m} min`
}

export default function BeforeAfter({ before, after }: Props) {
  const lateDelta = after.pctLate - before.pctLate
  const waitDelta = after.totalRiderWaitMin - before.totalRiderWaitMin
  const coolingRises = after.totalFoodIdleMin > before.totalFoodIdleMin
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">Your same orders, replayed with the new settings</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl bg-background p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Today's settings</div>
          <div className="mt-2 text-3xl font-bold tabular-nums" data-testid="before-late">
            {fmtPct(before.pctLate)} <span className="text-sm font-medium text-muted">late</span>
          </div>
          <div className="mt-1 text-sm text-muted tabular-nums">
            riders waiting {fmtMinutes(before.totalRiderWaitMin)} · food cooling*{" "}
            {fmtMinutes(before.totalFoodIdleMin)}
          </div>
        </div>
        <div className="hidden items-center md:flex">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </div>
        <div className="rounded-xl border-2 border-accent bg-background p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-accent">With recommendations</div>
          <div className="mt-2 text-3xl font-bold tabular-nums text-accent" data-testid="after-late">
            {fmtPct(after.pctLate)} <span className="text-sm font-medium text-muted">late</span>
          </div>
          <div className="mt-1 text-sm text-muted tabular-nums">
            riders waiting {fmtMinutes(after.totalRiderWaitMin)} · food cooling*{" "}
            {fmtMinutes(after.totalFoodIdleMin)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Deterministic replay of the same {before.total} orders: rider arrival times are
        re-simulated around the new promise (shifts capped at ±60 min; handover time is
        kept, so a rider whose food is already ready leaves right away). Late{" "}
        {lateDelta <= 0 ? "drops" : "rises"} by {Math.abs(lateDelta).toFixed(0)} pp, rider
        waiting {waitDelta <= 0 ? "drops" : "rises"} by {fmtMinutes(waitDelta)}. Actual
        kitchen speed never changes — only the honesty of the promise. *Cooling{" "}
        {coolingRises ? "rises" : "falls"} under this naive model because riders arrive{" "}
        {coolingRises ? "later" : "earlier"} while kitchens keep their historical cooking
        time; kitchens that time cooking to the promise avoid that.
      </p>
    </div>
  )
}
