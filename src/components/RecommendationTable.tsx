import type { Recommendation } from "../engine/types"
import { daypartLabel } from "../engine/stats"
import { fmtDelta, fmtNum } from "../lib/format"

interface Props {
  recommendations: Recommendation[]
}

export default function RecommendationTable({ recommendations }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-base font-semibold">Recommended prep-time settings</h2>
      <p className="mt-1 text-sm text-muted">
        The promise should cover the p85 of actual prep — fast enough to stay honest,
        slow enough to be true. That is the number below.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm" data-testid="recommendation-table">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-medium">Daypart</th>
              <th className="py-2 pr-3 font-medium">Orders</th>
              <th className="py-2 pr-3 font-medium">Median actual</th>
              <th className="py-2 pr-3 font-medium">p85 actual</th>
              <th className="py-2 pr-3 font-medium">Current promise</th>
              <th className="py-2 pr-3 font-medium">Recommended</th>
              <th className="py-2 font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((r) => (
              <tr key={r.daypart} className="border-b border-line last:border-0">
                <td className="py-2.5 pr-3 font-medium">{daypartLabel(r.daypart)}</td>
                <td className="py-2.5 pr-3 tabular-nums text-muted">{r.n}</td>
                <td className="py-2.5 pr-3 tabular-nums">{fmtNum(r.medianPrep, 0)} min</td>
                <td className="py-2.5 pr-3 tabular-nums">{fmtNum(r.p85Prep, 0)} min</td>
                <td className="py-2.5 pr-3 tabular-nums">{fmtNum(r.medianPromised, 0)} min</td>
                <td className="py-2.5 pr-3 tabular-nums font-bold text-accent" data-testid={`rec-${r.daypart}`}>
                  {r.recommended !== null ? `${r.recommended} min` : "too few orders"}
                </td>
                <td
                  className={`py-2.5 tabular-nums ${
                    r.recommended === null
                      ? "text-muted"
                      : r.recommended > r.medianPromised
                        ? "text-warn"
                        : r.recommended < r.medianPromised
                          ? "text-good"
                          : "text-muted"
                  }`}
                >
                  {r.recommended === null ? "—" : `${fmtDelta(r.recommended - r.medianPromised)} min`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
