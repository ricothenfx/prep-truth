import { describe, expect, it } from "vitest"
import { getSample, RESTAURANT_SAMPLES } from "../restaurants"
import { guessMapping, parseCsv, STANDARD_MAPPING } from "../../engine/parse"
import { buildRecommendations, computeVerdict } from "../../engine/stats"
import type { Mapping } from "../../engine/types"

const PBB_MAPPING: Mapping = {
  acceptedAt: "annahme_zeit",
  foodReadyAt: "fertig_um",
  riderArrivedAt: "kurir_da",
  pickedUpAt: "kurir_weg",
  promisedPrepMin: "zusage_min",
}

function reportOf(id: string) {
  const sample = getSample(id)!
  return parseCsv(sample.generate(), sample.messy ? PBB_MAPPING : STANDARD_MAPPING)
}

function statsOf(id: string) {
  const report = reportOf(id)
  return {
    report,
    verdict: computeVerdict(report.orders),
    recommendations: buildRecommendations(report.orders),
  }
}

describe("restaurant sample catalog", () => {
  it("has exactly ten samples with unique ids and deterministic data", () => {
    expect(RESTAURANT_SAMPLES).toHaveLength(10)
    expect(new Set(RESTAURANT_SAMPLES.map((s) => s.id)).size).toBe(10)
    for (const s of RESTAURANT_SAMPLES) {
      expect(s.generate()).toBe(s.generate())
      expect(s.generate().split("\n")[0]).toContain(",")
    }
  })
})

describe("kreuzberg-kanteen (baseline)", () => {
  it("matches the locked seed-42 numbers", () => {
    const { report, verdict } = statsOf("kreuzberg-kanteen")
    expect(report.used).toBe(747)
    expect(report.skipped).toBe(21)
    expect(verdict.pctLate).toBeCloseTo(36.7, 1)
  })
})

describe("mitte-veggie-room (well calibrated)", () => {
  it("runs mostly on time and needs no big changes", () => {
    const { verdict, recommendations } = statsOf("mitte-veggie-room")
    expect(verdict.pctLate).toBeGreaterThan(2)
    expect(verdict.pctLate).toBeLessThan(20)
    expect(recommendations.every((r) => r.recommended !== null)).toBe(true)
    for (const r of recommendations) {
      expect(Math.abs(r.recommended! - r.medianPromised)).toBeLessThanOrEqual(5)
    }
  })
})

describe("tempelhof-pizza-studio (pessimistic)", () => {
  it("rarely runs late and should lower its promises", () => {
    const { verdict, recommendations } = statsOf("tempelhof-pizza-studio")
    expect(verdict.pctLate).toBeLessThan(5)
    const lowered = recommendations.filter((r) => r.recommended !== null && r.recommended < r.medianPromised - 5)
    expect(lowered.length).toBeGreaterThanOrEqual(3)
  })
})

describe("neukoelln-spaetkauf-doner (night only)", () => {
  it("leaves three dayparts empty and recommends for evening", () => {
    const { recommendations } = statsOf("neukoelln-spaetkauf-doner")
    const byId = Object.fromEntries(recommendations.map((r) => [r.daypart, r]))
    expect(byId.morning!.n).toBe(0)
    expect(byId.lunch!.n).toBe(0)
    expect(byId.afternoon!.n).toBe(0)
    expect(byId.evening!.n).toBeGreaterThan(50)
    expect(byId.evening!.recommended).not.toBeNull()
  })
})

describe("charlottenburg-kaffeewerk (tiny data)", () => {
  it("stays under the 5-order minimum in most dayparts", () => {
    const { report, recommendations } = statsOf("charlottenburg-kaffeewerk")
    expect(report.used).toBeGreaterThan(0)
    expect(report.used).toBeLessThan(40)
    expect(report.skipped).toBe(0)
    const tooFew = recommendations.filter((r) => r.recommended === null)
    expect(tooFew.length).toBeGreaterThanOrEqual(2)
  })
})

describe("prenzlauer-bio-brunch (messy columns)", () => {
  it("cannot be auto-mapped from header names", () => {
    const sample = getSample("prenzlauer-bio-brunch")!
    expect(sample.messy).toBe(true)
    const headers = sample.generate().split("\n")[0]!.split(",")
    const guess = guessMapping(headers)
    expect(Object.values(guess).some((v) => v === "")).toBe(true)
    const report = reportOf("prenzlauer-bio-brunch")
    expect(report.used).toBeGreaterThan(200)
    expect(report.skipped).toBeLessThan(20)
  })
})

describe("friedrichshain-burger-depot (dirty rows)", () => {
  it("skips ~15% of rows and reports every skip reason", () => {
    const { report } = statsOf("friedrichshain-burger-depot")
    const total = report.used + report.skipped
    expect(report.skipped / total).toBeGreaterThan(0.08)
    expect(report.skipped / total).toBeLessThan(0.25)
    expect(report.reasons["missing or unparseable fields"]).toBeGreaterThan(0)
    expect(report.reasons["unreasonable prep time"]).toBeGreaterThan(0)
    expect(report.reasons["implausible rider stop"]).toBeGreaterThan(0)
  })
})

describe("wedding-ramen-lab (high variance)", () => {
  it("runs very late and pushes recommendations far up", () => {
    const { verdict, recommendations } = statsOf("wedding-ramen-lab")
    expect(verdict.pctLate).toBeGreaterThan(45)
    const raised = recommendations.filter((r) => r.recommended !== null && r.recommended > r.medianPromised + 10)
    expect(raised.length).toBeGreaterThanOrEqual(2)
  })
})

describe("schoeneberg-altbau-kueche (legacy formats)", () => {
  it("mixes timestamp styles, decimals and duplicate rows yet still parses", () => {
    const sample = getSample("schoeneberg-altbau-kueche")!
    const csv = sample.generate()
    const lines = csv.split("\n").slice(1)
    expect(lines.some((l) => l.includes("Z,"))).toBe(true)
    expect(lines.some((l) => l.includes(".000,"))).toBe(true)
    expect(lines.some((l) => /,\d+\.0$/.test(l))).toBe(true)
    expect(new Set(lines).size).toBeLessThan(lines.length)
    const { report } = statsOf("schoeneberg-altbau-kueche")
    expect(report.used).toBeGreaterThan(300)
  })
})

describe("moabit-mega-kitchen (high volume)", () => {
  it("delivers a large dataset that parses cleanly", () => {
    const { report, verdict } = statsOf("moabit-mega-kitchen")
    expect(report.used).toBeGreaterThan(1200)
    expect(verdict.pctLate).toBeGreaterThan(5)
  })
})
