import fs from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import Papa from "papaparse"
import { RESTAURANT_SAMPLES } from "../src/data/restaurants"

interface IndepOrder {
  acceptedAt: Date
  foodReadyAt: Date
  riderArrivedAt: Date
  pickedUpAt: Date
  promised: number
}

interface IndepStat {
  daypart: string
  n: number
  medianPrep: number
  p85: number
  medianPromised: number
  rec: number | null
}

const DAYPART_KEYS = ["morning", "lunch", "afternoon", "evening"] as const
const DAYPART_LABELS: Record<string, string> = {
  morning: "Morning 05–11",
  lunch: "Lunch 11–15",
  afternoon: "Afternoon 15–19",
  evening: "Evening 19–05",
}

function fmtMin(m: number): string {
  const total = Math.round(m)
  const h = Math.floor(total / 60)
  const min = total % 60
  return h > 0 ? `${h}h ${min}m` : `${min} min`
}

function fmtPct(p: number): string {
  return `${p.toFixed(0)}%`
}

function fmtNum0(n: number): string {
  return Number.isFinite(n) ? n.toFixed(0) : "—"
}

function fmtDelta(minutes: number): string {
  if (!Number.isFinite(minutes) || Math.abs(minutes) < 0.5) return "±0"
  const rounded = Math.round(minutes)
  return rounded > 0 ? `+${rounded}` : `${rounded}`
}

function indepParse(csv: string, headers: Record<string, string>): { orders: IndepOrder[]; skipped: number; reasons: Record<string, number> } {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true })
  const reasons: Record<string, number> = {}
  const orders: IndepOrder[] = []
  const skip = (why: string) => {
    reasons[why] = (reasons[why] ?? 0) + 1
  }
  const H = headers
  for (const row of parsed.data) {
    const accepted = new Date((row[H.acceptedAt] ?? "").trim())
    const ready = new Date((row[H.foodReadyAt] ?? "").trim())
    const arrived = new Date((row[H.riderArrivedAt] ?? "").trim())
    const picked = new Date((row[H.pickedUpAt] ?? "").trim())
    const promised = Number((row[H.promisedPrepMin] ?? "").trim())
    if (
      [accepted, ready, arrived, picked].some((d) => Number.isNaN(d.getTime())) ||
      !Number.isFinite(promised)
    ) {
      skip("missing or unparseable fields")
      continue
    }
    const prep = (ready.getTime() - accepted.getTime()) / 60000
    if (prep <= 0 || prep > 240) {
      skip("unreasonable prep time")
      continue
    }
    const stop = (picked.getTime() - arrived.getTime()) / 60000
    if (stop < 0 || stop > 60) {
      skip("implausible rider stop")
      continue
    }
    orders.push({ acceptedAt: accepted, foodReadyAt: ready, riderArrivedAt: arrived, pickedUpAt: picked, promised })
  }
  return { orders, skipped: parsed.data.length - orders.length, reasons }
}

function daypartOf(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 11) return "morning"
  if (h >= 11 && h < 15) return "lunch"
  if (h >= 15 && h < 19) return "afternoon"
  return "evening"
}

function median(values: number[]): number {
  if (values.length === 0) return NaN
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function p85NearestRank(values: number[]): number {
  if (values.length === 0) return NaN
  const s = [...values].sort((a, b) => a - b)
  const rank = Math.min(Math.max(Math.ceil(0.85 * s.length), 1), s.length)
  return s[rank - 1]!
}

function indepAnalyze(orders: IndepOrder[]) {
  const prepOf = (o: IndepOrder) => (o.foodReadyAt.getTime() - o.acceptedAt.getTime()) / 60000
  const lateCount = orders.filter((o) => prepOf(o) > o.promised).length
  const verdict = {
    total: orders.length,
    pctLate: orders.length === 0 ? 0 : (lateCount / orders.length) * 100,
    medianPrep: median(orders.map(prepOf)),
    riderWait: orders.reduce((s, o) => s + Math.max(0, (o.pickedUpAt.getTime() - o.riderArrivedAt.getTime()) / 60000), 0),
    foodIdle: orders.reduce((s, o) => s + Math.max(0, (o.riderArrivedAt.getTime() - o.foodReadyAt.getTime()) / 60000), 0),
  }
  const stats: IndepStat[] = DAYPART_KEYS.map((dp) => {
    const group = orders.filter((o) => daypartOf(o.acceptedAt) === dp)
    const preps = group.map(prepOf)
    const p85 = p85NearestRank(preps)
    const n = group.length
    return {
      daypart: dp,
      n,
      medianPrep: median(preps),
      p85,
      medianPromised: median(group.map((o) => o.promised)),
      rec: n >= 5 && Number.isFinite(p85) ? Math.max(10, Math.ceil(p85 / 5) * 5) : null,
    }
  })
  const recByDp = new Map(stats.map((s) => [s.daypart, s.rec]))
  let late = 0
  let riderWait = 0
  let foodIdle = 0
  for (const o of orders) {
    const prep = prepOf(o)
    const rec = recByDp.get(daypartOf(o.acceptedAt)) ?? null
    if (rec === null) {
      if (prep > o.promised) late += 1
      riderWait += Math.max(0, (o.pickedUpAt.getTime() - o.riderArrivedAt.getTime()) / 60000)
      foodIdle += Math.max(0, (o.riderArrivedAt.getTime() - o.foodReadyAt.getTime()) / 60000)
      continue
    }
    const shift = Math.min(Math.max(rec - o.promised, -60), 60)
    const simArrival = o.riderArrivedAt.getTime() + shift * 60000
    const handover = Math.max(0, (o.pickedUpAt.getTime() - Math.max(o.foodReadyAt.getTime(), o.riderArrivedAt.getTime())) / 60000)
    if (prep > rec) late += 1
    riderWait += Math.max(0, (o.foodReadyAt.getTime() - simArrival) / 60000) + handover
    foodIdle += Math.max(0, (simArrival - o.foodReadyAt.getTime()) / 60000)
  }
  const after = {
    pctLate: orders.length === 0 ? 0 : (late / orders.length) * 100,
    riderWait,
    foodIdle,
  }
  return { verdict, stats, after }
}

interface SampleReport {
  id: string
  name: string
  uiMatchesEngine: boolean
  rows: Record<string, unknown>
  verdict: Record<string, unknown>
  table: unknown[]
  replay: Record<string, unknown>
  summary: Record<string, unknown>
  findings: string[]
  jsErrors: string[]
}

async function loadSample(page: Page, id: string): Promise<void> {
  await page.goto("/")
  await page.getByTestId("load-example").click()
  await page.getByTestId(`sample-card-${id}`).click()
  const messy = RESTAURANT_SAMPLES.find((s) => s.id === id)?.messy
  if (messy) {
    await page.getByTestId("map-acceptedAt").selectOption("annahme_zeit")
    await page.getByTestId("map-foodReadyAt").selectOption("fertig_um")
    await page.getByTestId("map-riderArrivedAt").selectOption("kurir_da")
    await page.getByTestId("map-pickedUpAt").selectOption("kurir_weg")
    await page.getByTestId("map-promisedPrepMin").selectOption("zusage_min")
    await page.getByTestId("mapping-confirm").click()
  }
  await expect(page.getByTestId("results")).toBeVisible({ timeout: 20000 })
}

async function scrapeAudit(page: Page, id: string, name: string, csv: string): Promise<SampleReport> {
  const findings: string[]
    = []
  const jsErrors: string[] = []
  page.on("pageerror", (e) => jsErrors.push(`pageerror: ${e.message}`))
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("api/llm") && !m.text().includes("404")) {
      jsErrors.push(`console: ${m.text()}`)
    }
  })

  const messy = RESTAURANT_SAMPLES.find((s) => s.id === id)?.messy ?? false
  const parsedCsv = indepParse(
    csv,
    messy
      ? { acceptedAt: "annahme_zeit", foodReadyAt: "fertig_um", riderArrivedAt: "kurir_da", pickedUpAt: "kurir_weg", promisedPrepMin: "zusage_min" }
      : { acceptedAt: "accepted_at", foodReadyAt: "food_ready_at", riderArrivedAt: "rider_arrived_at", pickedUpAt: "picked_up_at", promisedPrepMin: "promised_prep_min" },
  )
  const indep = indepAnalyze(parsedCsv.orders)
  const csvRows = Papa.parse(csv, { header: true, skipEmptyLines: true }).data.length

  const rowReport = await page.getByTestId("row-report").innerText()
  const usedM = rowReport.match(/(\d+) orders analyzed/)
  const skippedM = rowReport.match(/(\d+) rows skipped/)
  const reasonsM = rowReport.match(/\((.*)\)/s)
  const uiUsed = Number(usedM?.[1] ?? -1)
  const uiSkipped = Number(skippedM?.[1] ?? -1)
  const uiReasons: Record<string, number> = {}
  if (reasonsM) {
    for (const part of reasonsM[1]!.split(", ")) {
      const [v, ...k] = part.trim().split(" ")
      uiReasons[k.join(" ")] = Number(v)
    }
  }

  const cards = page.locator('[data-testid="verdict-strip"] > div')
  const cardValue = (i: number) => cards.nth(i).locator("div").first().innerText()
  const uiLate = await cardValue(0)
  const uiMedianPrep = await cardValue(1)
  const uiRiderWait = await cardValue(2)
  const uiFoodIdle = await cardValue(3)

  const beforePanel = page.locator('[data-testid="before-late"]').locator("..")
  const afterPanel = page.locator('[data-testid="after-late"]').locator("..")
  const uiBeforeLate = (await page.getByTestId("before-late").innerText()).trim().split(" ")[0]!
  const uiAfterLate = (await page.getByTestId("after-late").innerText()).trim().split(" ")[0]!
  const beforeInfo = await beforePanel.getByText(/riders waiting/).innerText()
  const afterInfo = await afterPanel.getByText(/riders waiting/).innerText()
  const parseInfo = (t: string) => {
    const m = t.match(/riders waiting (.+?) · food cooling\* (.+)/)
    return { rider: m![1]!.trim(), food: m![2]!.trim() }
  }
  const uiBefore = parseInfo(beforeInfo)
  const uiAfter = parseInfo(afterInfo)
  const caption = await page.locator("p").filter({ hasText: "Deterministic replay" }).innerText()

  const tableRows = page.getByTestId("recommendation-table").locator("tbody tr")
  const uiTable: Record<string, string[]> = {}
  for (let i = 0; i < (await tableRows.count()); i++) {
    const cells = await tableRows.nth(i).locator("td").allInnerTexts()
    const label = cells[0]!
    const dp = Object.keys(DAYPART_LABELS).find((k) => DAYPART_LABELS[k] === label)!
    uiTable[dp] = cells.slice(1).map((c) => c.trim())
  }

  const summaryCard = page.getByTestId("summary-card")
  await expect(summaryCard).toBeVisible({ timeout: 20000 })
  const summaryText = await summaryCard.locator("p").innerText()
  const summaryBadge = (await summaryCard.innerText()).includes("drafted by AI") ? "ai" : "template"

  const v = indep.verdict
  const expectedVerdict = {
    late: fmtPct(v.pctLate),
    medianPrep: `${fmtNum0(v.medianPrep)} min`,
    riderWait: fmtMin(v.riderWait),
    foodIdle: fmtMin(v.foodIdle),
  }
  const expectedBefore = { rider: fmtMin(v.riderWait), food: fmtMin(v.foodIdle) }
  const expectedAfter = { rider: fmtMin(indep.after.riderWait), food: fmtMin(indep.after.foodIdle) }

  const mismatches: string[] = []
  if (uiUsed !== v.total) mismatches.push(`used: ui=${uiUsed} indep=${v.total}`)
  if (uiSkipped !== parsedCsv.skipped) mismatches.push(`skipped: ui=${uiSkipped} indep=${parsedCsv.skipped}`)
  if (JSON.stringify(uiReasons) !== JSON.stringify(parsedCsv.reasons)) {
    mismatches.push(`reasons: ui=${JSON.stringify(uiReasons)} indep=${JSON.stringify(parsedCsv.reasons)}`)
  }
  if (uiLate !== expectedVerdict.late) mismatches.push(`late: ui=${uiLate} indep=${expectedVerdict.late}`)
  if (uiMedianPrep !== expectedVerdict.medianPrep) mismatches.push(`median: ui=${uiMedianPrep} indep=${expectedVerdict.medianPrep}`)
  if (uiRiderWait !== expectedVerdict.riderWait) mismatches.push(`riderWait: ui=${uiRiderWait} indep=${expectedVerdict.riderWait}`)
  if (uiFoodIdle !== expectedVerdict.foodIdle) mismatches.push(`foodIdle: ui=${uiFoodIdle} indep=${expectedVerdict.foodIdle}`)
  if (uiBeforeLate !== fmtPct(v.pctLate)) mismatches.push(`beforeLate: ui=${uiBeforeLate} indep=${fmtPct(v.pctLate)}`)
  if (uiAfterLate !== fmtPct(indep.after.pctLate)) mismatches.push(`afterLate: ui=${uiAfterLate} indep=${fmtPct(indep.after.pctLate)}`)
  if (JSON.stringify(uiBefore) !== JSON.stringify(expectedBefore)) mismatches.push(`beforePanel: ui=${JSON.stringify(uiBefore)} indep=${JSON.stringify(expectedBefore)}`)
  if (JSON.stringify(uiAfter) !== JSON.stringify(expectedAfter)) mismatches.push(`afterPanel: ui=${JSON.stringify(uiAfter)} indep=${JSON.stringify(expectedAfter)}`)

  const expectedTable: unknown[] = []
  for (const s of indep.stats) {
    const uiCells = uiTable[s.daypart] ?? []
    const exp = {
      n: `${s.n}`,
      medianPrep: `${fmtNum0(s.medianPrep)} min`,
      p85: `${fmtNum0(s.p85)} min`,
      promised: `${fmtNum0(s.medianPromised)} min`,
      rec: s.rec === null ? "too few orders" : `${s.rec} min`,
      change: s.rec === null ? "—" : `${fmtDelta(s.rec - s.medianPromised)} min`,
    }
    const uiObj = {
      n: uiCells[0]!,
      medianPrep: uiCells[1]!,
      p85: uiCells[2]!,
      promised: uiCells[3]!,
      rec: uiCells[4]!,
      change: uiCells[5]!,
    }
    if (JSON.stringify(uiObj) !== JSON.stringify(exp)) {
      mismatches.push(`table[${s.daypart}]: ui=${JSON.stringify(uiObj)} indep=${JSON.stringify(exp)}`)
    }
    expectedTable.push({ daypart: s.daypart, ...exp })
    if (s.n > 0 && s.rec !== null && (s.rec < s.p85 || s.rec % 5 !== 0 || s.rec < 10)) {
      findings.push(`invariant: rec ${s.rec} does not cover p85 ${s.p85} or breaks rounding/minimum`)
    }
    if (s.n >= 5 && s.rec === null) findings.push(`invariant: n=${s.n} but recommendation is null`)
  }

  if (uiUsed + uiSkipped !== csvRows) {
    findings.push(`accounting: used+skipped=${uiUsed + uiSkipped} != csv data rows=${csvRows}`)
  }

  const waitDelta = indep.after.riderWait - v.riderWait
  let shortenMass = 0
  for (const o of parsedCsv.orders) {
    const rec = indep.stats.find((s) => s.daypart === daypartOf(o.acceptedAt))?.rec ?? null
    if (rec !== null) shortenMass += Math.min(Math.max(o.promised - rec, 0), 60)
  }
  if (waitDelta > 0 && waitDelta > 0.5 * shortenMass) {
    findings.push(
      `rider waiting rises ${Math.round(waitDelta)} min which is most of the total promise-shortening shift ${Math.round(shortenMass)} min — replay looks like it converts cooling into waiting (old double-count signature)`,
    )
  }
  if (/drops by -|by -\d+h/.test(caption)) {
    findings.push(`caption renders negative drop text: "${caption.match(/Late drops by[^.]*\./)?.[0] ?? ""}"`)
  }
  const coolingFell = indep.after.foodIdle < v.foodIdle
  if (coolingFell && /Cooling rises/.test(caption)) {
    findings.push(`caption claims "Cooling rises / riders arrive later" but cooling fell ${fmtMin(v.foodIdle)} → ${fmtMin(indep.after.foodIdle)} (promises shortened)`)
  }


  const sumNums: Record<string, string> = {}
  const totalM = summaryText.match(/Across ([\d,]+) orders/)
  const pctM = summaryText.match(/Across [\d,]+ orders, (\d+)%/)
  const fallsM = summaryText.match(/lateness falls to (\d+)%/)
  const dropsM = summaryText.match(/drops from ([\d,]+) to ([\d,]+) minutes/)
  const avgM = summaryText.match(/([\d.]+) to ([\d.]+) minutes per order/)
  if (totalM) sumNums.total = totalM[1]!
  if (pctM) sumNums.beforeLatePct = pctM[1]!
  if (fallsM) sumNums.afterLatePct = fallsM[1]!
  if (dropsM) {
    sumNums.riderBefore = dropsM[1]!
    sumNums.riderAfter = dropsM[2]!
  }
  if (avgM) {
    sumNums.avgBefore = avgM[1]!
    sumNums.avgAfter = avgM[2]!
  }
  const sumProblems: string[] = []
  if (totalM && Number(totalM[1]!.replace(/,/g, "")) !== v.total) sumProblems.push("total orders mismatch")
  if (fallsM && Number(fallsM[1]!) !== Math.round(indep.after.pctLate)) sumProblems.push("after late % mismatch")
  if (dropsM && (Number(dropsM[1]!.replace(/,/g, "")) !== Math.round(v.riderWait) || Number(dropsM[2]!.replace(/,/g, "")) !== Math.round(indep.after.riderWait))) {
    sumProblems.push("rider wait totals mismatch")
  }
  if (avgM && (Math.abs(Number(avgM[1]!) - v.riderWait / v.total) > 0.05 || Math.abs(Number(avgM[2]!) - indep.after.riderWait / v.total) > 0.05)) {
    sumProblems.push("rider wait averages mismatch")
  }
  if (/falls to/.test(summaryText) && indep.after.pctLate > v.pctLate + 0.5) {
    sumProblems.push(`says "falls to" but late rose ${v.pctLate.toFixed(1)}% → ${indep.after.pctLate.toFixed(1)}%`)
  }
  if (/drops from/.test(summaryText) && indep.after.riderWait > v.riderWait + 0.5) {
    sumProblems.push(`says "drops" but rider waiting rose ${Math.round(v.riderWait)} → ${Math.round(indep.after.riderWait)} min`)
  }
  if (sumProblems.length > 0) findings.push(`summary(${summaryBadge}): ${sumProblems.join("; ")}`)

  const cond = RESTAURANT_SAMPLES.find((s) => s.id === id)!.condition
  const withData = indep.stats.filter((s) => s.n > 0)
  const nulls = indep.stats.filter((s) => s.rec === null).length
  const maxDelta = Math.max(0, ...withData.map((s) => (s.rec ?? 0) - s.medianPromised))
  if (id === "kreuzberg-kanteen") {
    const m = cond.match(/(\d+)% of orders late/)
    if (m && Math.abs(v.pctLate - Number(m[1])) > 2) findings.push(`condition claims ${m[1]}% late, actual ${v.pctLate.toFixed(1)}%`)
  }
  if (id === "mitte-veggie-room" && withData.filter((s) => s.rec !== null && Math.abs(s.rec - s.medianPromised) <= 5).length < 2) {
    findings.push(`condition says "mostly keep current settings" but few dayparts stay within ±5 min`)
  }
  if (id === "tempelhof-pizza-studio" && withData.some((s) => s.rec !== null && s.rec >= s.medianPromised)) {
    findings.push(`condition says "recommendations go down" but some recommendation is >= current promise`)
  }
  if (id === "neukoelln-spaetkauf-doner") {
    const empty = indep.stats.filter((s) => s.n === 0).length
    if (empty !== 3) findings.push(`condition says "three dayparts stay empty", actual empty=${empty}`)
  }
  if (id === "charlottenburg-kaffeewerk" && nulls === 0) {
    findings.push(`condition says "most dayparts under 5-order minimum" but every daypart got a recommendation`)
  }
  if (id === "wedding-ramen-lab" && (v.pctLate < 80 || maxDelta < 20)) {
    findings.push(`condition says "~90% late, jumps of 20+ min", actual late=${v.pctLate.toFixed(1)}%, maxDelta=${maxDelta}`)
  }
  if (id === "friedrichshain-burger-depot") {
    const frac = parsedCsv.skipped / csvRows
    if (frac < 0.1 || frac > 0.2) findings.push(`condition says ~15% broken rows, actual ${(frac * 100).toFixed(1)}%`)
    const need = ["missing or unparseable fields", "unreasonable prep time", "implausible rider stop"]
    const missing = need.filter((k) => !(k in parsedCsv.reasons))
    if (missing.length > 0) findings.push(`condition says "every skip reason", missing: ${missing.join(", ")}`)
  }
  if (id === "moabit-mega-kitchen" && v.total < 1500) findings.push(`scale sample unexpectedly small: ${v.total}`)

  return {
    id,
    name,
    uiMatchesEngine: mismatches.length === 0,
    rows: { csvRows, uiUsed, uiSkipped, uiReasons, indepReasons: parsedCsv.reasons },
    verdict: { uiLate, uiMedianPrep, uiRiderWait, uiFoodIdle, indep: expectedVerdict },
    table: expectedTable,
    replay: {
      before: { late: uiBeforeLate, ...uiBefore },
      after: { late: uiAfterLate, ...uiAfter },
      indepBefore: expectedBefore,
      indepAfter: expectedAfter,
      caption,
    },
    summary: { badge: summaryBadge, numbers: sumNums, problems: sumProblems, text: summaryText },
    findings,
    jsErrors,
  }
}

const REPORT = "test-results/audit-report.json"

test("audit all sample restaurants against independent computation", async ({ page }) => {
  test.setTimeout(600000)
  fs.mkdirSync("test-results", { recursive: true })
  const reports: SampleReport[] = []
  const failures: string[] = []
  for (const sample of RESTAURANT_SAMPLES) {
    const p = await page.context().newPage()
    await loadSample(p, sample.id)
    const report = await scrapeAudit(p, sample.id, sample.name, sample.generate())
    await p.close()
    reports.push(report)
    if (!report.uiMatchesEngine || report.jsErrors.length > 0) {
      failures.push(
        `${sample.id}: ${report.uiMatchesEngine ? "" : "UI!=engine; "}${report.jsErrors.join(" | ")}`,
      )
    }
    fs.writeFileSync(REPORT, JSON.stringify(reports, null, 2))
  }
  const lines = reports.map((r) => {
    const t = (r.table as { daypart: string; n: string; rec: string; change: string }[])
      .map((x) => `${x.daypart}:${x.n}o→${x.rec}(${x.change})`)
      .join(" ")
    const rep = r.replay as Record<string, { late: string; rider: string; food: string }>
    return [
      `${r.id}: ${r.uiMatchesEngine ? "OK" : "MISMATCH"}`,
      `  rows used=${r.rows.uiUsed} skipped=${r.rows.uiSkipped}`,
      `  verdict late=${(r.verdict as Record<string, string>).uiLate} median=${(r.verdict as Record<string, string>).uiMedianPrep} rider=${(r.verdict as Record<string, string>).uiRiderWait} food=${(r.verdict as Record<string, string>).uiFoodIdle}`,
      `  replay before(${rep.before.late} late, rider ${rep.before.rider}, food ${rep.before.food}) → after(${rep.after.late} late, rider ${rep.after.rider}, food ${rep.after.food})`,
      `  table ${t}`,
      `  summary(${(r.summary as Record<string, unknown>).badge}) findings=${r.findings.length} jsErrors=${r.jsErrors.length}`,
    ].join("\n")
  })
  console.log("\n=== AUDIT SUMMARY ===\n" + lines.join("\n") + "\n=== FINDINGS ===\n" + (failures.join("\n") || "none"))
  expect(failures, failures.join("\n\n")).toEqual([])
})
