import { describe, expect, it } from "vitest"
import { guessMapping, parseCsv, STANDARD_MAPPING } from "../parse"
import {
  computeVerdict,
  daypartOf,
  daypartBreakdown,
  median,
  percentileNearestRank,
  prepOf,
  recommend,
  replay,
  roundUpTo,
} from "../stats"
import { generateExampleCsv } from "../example"
import type { Order } from "../types"

function order(
  acceptedIso: string,
  readyIso: string,
  arrivedIso: string,
  pickedIso: string,
  promised: number,
): Order {
  return {
    acceptedAt: new Date(acceptedIso),
    foodReadyAt: new Date(readyIso),
    riderArrivedAt: new Date(arrivedIso),
    pickedUpAt: new Date(pickedIso),
    promisedPrepMin: promised,
  }
}

describe("percentileNearestRank", () => {
  it("returns nearest-rank percentile", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(percentileNearestRank(values, 85)).toBe(9)
    expect(percentileNearestRank(values, 50)).toBe(5)
    expect(percentileNearestRank(values, 100)).toBe(10)
    expect(percentileNearestRank(values, 1)).toBe(1)
  })
})

describe("median", () => {
  it("handles odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })
})

describe("roundUpTo", () => {
  it("rounds up to step", () => {
    expect(roundUpTo(21.2, 5)).toBe(25)
    expect(roundUpTo(20, 5)).toBe(20)
    expect(roundUpTo(0, 5)).toBe(0)
  })
})

describe("daypartOf", () => {
  it("maps hour ranges to dayparts", () => {
    expect(daypartOf(new Date(2026, 0, 1, 5, 0))).toBe("morning")
    expect(daypartOf(new Date(2026, 0, 1, 10, 59))).toBe("morning")
    expect(daypartOf(new Date(2026, 0, 1, 11, 0))).toBe("lunch")
    expect(daypartOf(new Date(2026, 0, 1, 15, 0))).toBe("afternoon")
    expect(daypartOf(new Date(2026, 0, 1, 19, 0))).toBe("evening")
    expect(daypartOf(new Date(2026, 0, 1, 4, 59))).toBe("evening")
  })
})

describe("parseCsv", () => {
  const csv = [
    "order_id,accepted_at,food_ready_at,rider_arrived_at,picked_up_at,promised_prep_min",
    "A,2026-01-01T12:00:00,2026-01-01T12:20:00,2026-01-01T12:25:00,2026-01-01T12:30:00,15",
    "B,,,,,,,,,",
    "C,2026-01-01T12:00:00,2026-01-01T11:00:00,2026-01-01T12:25:00,2026-01-01T12:30:00,15",
    "D,2026-01-01T12:00:00,2026-01-01T12:10:00,2026-01-01T12:05:00,2026-01-01T13:30:00,15",
    "E,2026-01-01T18:00:00,2026-01-01T18:12:00,2026-01-01T18:05:00,2026-01-01T18:14:00,10",
  ].join("\n")

  it("keeps valid orders and skips invalid ones with reasons", () => {
    const report = parseCsv(csv, STANDARD_MAPPING)
    expect(report.used).toBe(2)
    expect(report.skipped).toBe(3)
    expect(report.reasons["missing or unparseable fields"]).toBe(1)
    expect(report.reasons["unreasonable prep time"]).toBe(1)
    expect(report.reasons["implausible rider stop"]).toBe(1)
  })

  it("accepts alternate column names via mapping", () => {
    const messy = [
      "id,waktu_terima,siap,kurir_datang,kurir_jatuh,janji_menit",
      "A,2026-01-01T12:00:00,2026-01-01T12:20:00,2026-01-01T12:25:00,2026-01-01T12:30:00,15",
    ].join("\n")
    const mapping = {
      acceptedAt: "waktu_terima",
      foodReadyAt: "siap",
      riderArrivedAt: "kurir_datang",
      pickedUpAt: "kurir_jatuh",
      promisedPrepMin: "janji_menit",
    }
    const report = parseCsv(messy, mapping)
    expect(report.used).toBe(1)
    expect(prepOf(report.orders[0]!)).toBe(20)
  })
})

describe("guessMapping", () => {
  it("finds standard headers", () => {
    const headers = ["order_id", "accepted_at", "food_ready_at", "rider_arrived_at", "picked_up_at", "promised_prep_min"]
    expect(guessMapping(headers)).toEqual(STANDARD_MAPPING)
  })
  it("returns empty strings for unknown headers", () => {
    const m = guessMapping(["foo", "bar"])
    expect(m.acceptedAt).toBe("")
    expect(m.foodReadyAt).toBe("")
  })
})

describe("computeVerdict", () => {
  it("computes late share, median prep, rider wait and food idle", () => {
    const orders = [
      order("2026-01-01T12:00:00", "2026-01-01T12:20:00", "2026-01-01T12:15:00", "2026-01-01T12:25:00", 15),
      order("2026-01-01T12:30:00", "2026-01-01T12:40:00", "2026-01-01T12:50:00", "2026-01-01T12:55:00", 15),
      order("2026-01-01T18:00:00", "2026-01-01T18:10:00", "2026-01-01T18:08:00", "2026-01-01T18:12:00", 12),
    ]
    const v = computeVerdict(orders)
    expect(v.total).toBe(3)
    expect(v.pctLate).toBeCloseTo((1 / 3) * 100)
    expect(v.medianPrep).toBe(10)
    expect(v.totalRiderWaitMin).toBeCloseTo(10 + 5 + 4)
    expect(v.totalFoodIdleMin).toBeCloseTo(10)
  })
})

describe("recommend", () => {
  it("returns null when too few orders", () => {
    const orders = Array.from({ length: 4 }, (_, i) =>
      order(`2026-01-01T12:0${i}:00`, `2026-01-01T12:2${i}:00`, `2026-01-01T12:3${i}:00`, `2026-01-01T12:3${i}:30`, 15),
    )
    const stat = daypartBreakdown(orders).find((s) => s.daypart === "lunch")!
    expect(recommend(stat)).toBeNull()
  })
  it("recommends p85 rounded up to 5 minutes with a floor of 10", () => {
    const preps = [10, 11, 12, 13, 14, 15, 16, 17, 32, 33]
    const orders = preps.map((p, i) =>
      order(
        `2026-01-0${(i % 9) + 1}T12:00:00`,
        `2026-01-0${(i % 9) + 1}T12:${pad(p)}:00`,
        `2026-01-0${(i % 9) + 1}T12:${pad(p)}:30`,
        `2026-01-0${(i % 9) + 1}T12:${pad(p)}:45`,
        15,
      ),
    )
    const stat = daypartBreakdown(orders).find((s) => s.daypart === "lunch")!
    expect(stat.p85Prep).toBe(32)
    expect(recommend(stat)).toBe(35)
  })
})

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function shiftIso(baseIso: string, addMinutes: number): string {
  const [d, t] = baseIso.split("T")
  const [Y, M, D] = d!.split("-").map(Number)
  const [h, mi, s] = t!.split(":").map(Number)
  const dt = new Date(Y!, M! - 1, D!, h!, mi!, s!)
  dt.setMinutes(dt.getMinutes() + addMinutes)
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` +
    `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
  )
}

describe("replay", () => {
  it("reduces lateness and rider wait when the setting is raised", () => {
    const orders = Array.from({ length: 10 }, (_, i) => {
      const accepted = `2026-01-01T12:00:${pad(i)}`
      return order(accepted, shiftIso(accepted, 20 + i * 0.5), shiftIso(accepted, 15), shiftIso(accepted, 25), 15)
    })
    const recs = daypartBreakdown(orders).map((s) => ({ ...s, recommended: 30 }))
    const before = computeVerdict(orders)
    const after = replay(orders, recs)
    expect(before.pctLate).toBe(100)
    expect(after.pctLate).toBeLessThan(before.pctLate)
    expect(after.totalRiderWaitMin).toBeLessThan(before.totalRiderWaitMin)
  })

  it("keeps orders unchanged for dayparts without a recommendation", () => {
    const orders = [
      order("2026-01-01T12:00:00", "2026-01-01T12:25:00", "2026-01-01T12:10:00", "2026-01-01T12:30:00", 15),
      order("2026-01-01T18:00:00", "2026-01-01T18:10:00", "2026-01-01T18:15:00", "2026-01-01T18:20:00", 8),
    ]
    const recs = daypartBreakdown(orders).map((s) => ({ ...s, recommended: null }))
    const after = replay(orders, recs)
    expect(after.pctLate).toBe(100)
    expect(after.totalRiderWaitMin).toBeCloseTo(25)
    expect(after.totalFoodIdleMin).toBeCloseTo(5)
  })
})

describe("generateExampleCsv", () => {
  it("is deterministic for the same seed", () => {
    expect(generateExampleCsv(42)).toBe(generateExampleCsv(42))
    expect(generateExampleCsv(42)).not.toBe(generateExampleCsv(43))
  })
  it("parses into a realistic dataset with a few broken rows", () => {
    const report = parseCsv(generateExampleCsv(42), STANDARD_MAPPING)
    expect(report.used).toBeGreaterThan(300)
    expect(report.skipped).toBeGreaterThan(0)
    const v = computeVerdict(report.orders)
    expect(v.pctLate).toBeGreaterThan(5)
    expect(v.totalRiderWaitMin).toBeGreaterThan(60)
  })
})
