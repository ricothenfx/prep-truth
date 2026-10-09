import { expect, it } from "vitest"
import { parseCsv, STANDARD_MAPPING } from "../parse"
import { buildRecommendations, computeVerdict, replay } from "../stats"
import { generateExampleCsv } from "../example"
import { daypartLabel } from "../stats"

it("readme numbers (seed 42) stay stable", () => {
  const report = parseCsv(generateExampleCsv(42), STANDARD_MAPPING)
  const verdict = computeVerdict(report.orders)
  const recs = buildRecommendations(report.orders)
  const after = replay(report.orders, recs)

  const lines = [
    `| Metric | Value |`,
    `|---|---|`,
    `| Orders analyzed | ${report.used} |`,
    `| Rows skipped | ${report.skipped} |`,
    `| Orders late | ${verdict.pctLate.toFixed(1)}% |`,
    `| Median actual prep | ${verdict.medianPrep.toFixed(1)} min |`,
    `| Rider waiting (total) | ${Math.round(verdict.totalRiderWaitMin)} min |`,
    `| Food waiting (total) | ${Math.round(verdict.totalFoodIdleMin)} min |`,
    ...recs.map(
      (r) =>
        `| Rec ${daypartLabel(r.daypart)} | ${r.recommended === null ? "—" : `${r.recommended} min`} (current median promise ${r.medianPromised}) |`,
    ),
    `| Late after replay | ${after.pctLate.toFixed(1)}% |`,
    `| Rider waiting after | ${Math.round(after.totalRiderWaitMin)} min |`,
    `| Food waiting after | ${Math.round(after.totalFoodIdleMin)} min |`,
  ]
  console.log(lines.join("\n"))

  expect(report.used).toBe(747)
  expect(report.skipped).toBe(21)
  expect(verdict.pctLate).toBeCloseTo(36.7, 1)
  expect(verdict.medianPrep).toBeCloseTo(14.2, 1)
  expect(Math.round(verdict.totalRiderWaitMin)).toBe(3367)
  expect(Math.round(verdict.totalFoodIdleMin)).toBe(2935)
  expect(recs.map((r) => r.recommended)).toEqual([20, 30, 15, 25])
  expect(after.pctLate).toBeCloseTo(7.2, 1)
  expect(Math.round(after.totalRiderWaitMin)).toBe(763)
  expect(Math.round(after.totalFoodIdleMin)).toBe(7081)
  expect(generateExampleCsv(42)).toBe(generateExampleCsv(42))
})
