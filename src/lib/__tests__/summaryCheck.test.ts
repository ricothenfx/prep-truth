import { describe, expect, it } from "vitest"
import { roundSummaryPayload, type SummaryPayload } from "../api"
import { summaryClaimProblems } from "../summaryCheck"

const optimistic = {
  totalOrders: 747,
  pctLate: 36.7,
  afterPctLate: 7.2,
  riderWaitTotalMinutesBefore: 3373,
  riderWaitTotalMinutesAfter: 1824,
}

const pessimistic = {
  totalOrders: 474,
  pctLate: 0,
  afterPctLate: 5.7,
  riderWaitTotalMinutesBefore: 1033,
  riderWaitTotalMinutesAfter: 1224,
}

describe("summaryClaimProblems", () => {
  it("flags an inverted lateness claim (the Schöneberg production slip)", () => {
    const text =
      "The data shows a total of 474 orders with no late orders reported. " +
      "Implementing these changes is expected to decrease the percentage of late orders " +
      "from 5.7% after adjustments."
    expect(summaryClaimProblems(text, pessimistic)).toHaveLength(1)
  })

  it("accepts an honest pessimistic readout (lateness rises, rider waiting rises)", () => {
    const text =
      "The data shows a total of 474 orders with no late orders reported. " +
      "Lateness is projected to rise to 5.7% — the honest cost of shorter promises. " +
      "However, rider wait times increase from an average of 2.18 minutes to 2.59 minutes."
    expect(summaryClaimProblems(text, pessimistic)).toHaveLength(0)
  })

  it("accepts an honest optimistic readout (lateness falls, rider waiting drops)", () => {
    const text =
      "The data shows a total of 747 orders, with 36.7% of them being late. " +
      "Implementing these changes is expected to reduce the late percentage to 7.2%. " +
      "Additionally, rider wait times drop from an average of 4.5 minutes to 2.4 minutes."
    expect(summaryClaimProblems(text, optimistic)).toHaveLength(0)
  })

  it("flags an inverted rider-wait claim", () => {
    const text = "Rider wait times drop from an average of 2.18 minutes to 2.59 minutes."
    expect(summaryClaimProblems(text, pessimistic)).toHaveLength(1)
  })

  it("flags a wrong order count", () => {
    const text = "The data shows a total of 999 orders, with 36.7% of them being late."
    expect(summaryClaimProblems(text, optimistic)).toHaveLength(1)
  })

  it("flags a wrong late percentage", () => {
    const text = "The data shows a total of 747 orders, with 12.5% of them being late."
    expect(summaryClaimProblems(text, optimistic)).toHaveLength(1)
  })

  it("does not flag neutral sentences mentioning late riders", () => {
    const text =
      "Lowering the promise does not cook any faster; it stops riders being sent so early " +
      "that they stand around. No daypart is currently late."
    expect(summaryClaimProblems(text, pessimistic)).toHaveLength(0)
  })

  it("allows small rounding differences in quoted percentages", () => {
    const text = "The data shows a total of 747 orders, with 36.7% of them being late."
    expect(summaryClaimProblems(text, { ...optimistic, pctLate: 36.68 })).toHaveLength(0)
  })
})

describe("roundSummaryPayload", () => {
  const payload: SummaryPayload = {
    totalOrders: 1952,
    pctLate: 9.89344,
    medianPrep: 8.0523,
    worstDaypart: "Lunch 11–15",
    worstLatePct: 22.5036,
    recommendations: [{ daypart: "Lunch 11–15", from: 15, to: 20 }],
    afterPctLate: 0.6721,
    riderWaitTotalMinutesBefore: 5529.733,
    riderWaitTotalMinutesAfter: 4652.381,
    riderWaitAvgMinutesBefore: 2.8333,
    riderWaitAvgMinutesAfter: 2.3829,
  }

  it("rounds every float to one decimal and keeps counts and ints intact", () => {
    const r = roundSummaryPayload(payload)
    expect(r.pctLate).toBe(9.9)
    expect(r.medianPrep).toBe(8.1)
    expect(r.worstLatePct).toBe(22.5)
    expect(r.afterPctLate).toBe(0.7)
    expect(r.riderWaitTotalMinutesBefore).toBe(5529.7)
    expect(r.riderWaitTotalMinutesAfter).toBe(4652.4)
    expect(r.riderWaitAvgMinutesBefore).toBe(2.8)
    expect(r.riderWaitAvgMinutesAfter).toBe(2.4)
    expect(r.totalOrders).toBe(1952)
    expect(r.recommendations[0]).toEqual({ daypart: "Lunch 11–15", from: 15, to: 20 })
  })

  it("keeps a null worst daypart null", () => {
    expect(roundSummaryPayload({ ...payload, worstDaypart: null, worstLatePct: null }).worstDaypart).toBeNull()
  })
})
