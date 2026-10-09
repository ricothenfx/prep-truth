import type { DaypartStat } from "../engine/types"
import { daypartLabel } from "../engine/stats"
import { fmtNum } from "../lib/format"

interface Props {
  stats: DaypartStat[]
}

const WIDTH = 640
const HEIGHT = 240
const PAD = { top: 20, right: 12, bottom: 34, left: 44 }

export default function DaypartChart({ stats }: Props) {
  const visible = stats.filter((s) => s.n > 0)
  if (visible.length === 0) return null
  const max = Math.max(...visible.map((s) => Math.max(s.p85Prep, s.medianPromised))) * 1.1
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const group = innerW / visible.length
  const barW = Math.min(56, group * 0.26)
  const y = (v: number) => PAD.top + innerH * (1 - v / max)

  const ticks = [0, 0.5, 1].map((f) => Math.round((max * f) / 5) * 5)

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Actual prep vs promise, by daypart</h2>
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" /> median actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted opacity-50" /> promised
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border border-accent" /> p85 actual
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-3 w-full" role="img" aria-label="Bar chart of median and p85 actual prep time versus promised prep time for each daypart" data-testid="daypart-chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="fill-[var(--muted)] text-[10px]">
              {t}
            </text>
          </g>
        ))}
        {visible.map((s, i) => {
          const cx = PAD.left + group * i + group / 2
          return (
            <g key={s.daypart}>
              <rect
                x={cx - barW - 3}
                y={y(s.medianPromised)}
                width={barW}
                height={Math.max(0, PAD.top + innerH - y(s.medianPromised))}
                rx="4"
                fill="var(--muted)"
                opacity="0.45"
              >
                <title>{`${daypartLabel(s.daypart)} — promised (median): ${fmtNum(s.medianPromised, 0)} min`}</title>
              </rect>
              <rect
                x={cx + 3}
                y={y(s.medianPrep)}
                width={barW}
                height={Math.max(0, PAD.top + innerH - y(s.medianPrep))}
                rx="4"
                fill="var(--accent)"
              >
                <title>{`${daypartLabel(s.daypart)} — median actual: ${fmtNum(s.medianPrep, 0)} min`}</title>
              </rect>
              <rect
                x={cx + 3}
                y={y(s.p85Prep)}
                width={barW}
                height={Math.max(0, y(s.medianPrep) - y(s.p85Prep))}
                rx="4"
                fill="none"
                stroke="var(--accent)"
                strokeDasharray="3 3"
              >
                <title>{`${daypartLabel(s.daypart)} — p85 actual: ${fmtNum(s.p85Prep, 0)} min (1 in 7 orders takes longer)`}</title>
              </rect>
              <text x={cx} y={HEIGHT - 12} textAnchor="middle" className="fill-[var(--ink)] text-[11px] font-medium">
                {daypartLabel(s.daypart).split(" ")[0]}
              </text>
              <text x={cx} y={HEIGHT - 1} textAnchor="middle" className="fill-[var(--muted)] text-[10px]">
                {s.n} orders
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-2 text-xs text-muted">
        A promise that sits below the p85 bar means roughly 1 in 7 orders in that daypart
        runs late no matter how fast the kitchen moves.
      </p>
    </div>
  )
}
