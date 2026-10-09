import type { Daypart } from "../engine/types"
import { generateExampleCsv } from "../engine/example"
import { isoLocal, makeGauss, mulberry32 } from "./rng"

export interface RestaurantSample {
  id: string
  name: string
  tagline: string
  condition: string
  size: string
  filename: string
  label: string
  messy?: boolean
  generate: () => string
}

type BrokenStyle = "empty" | "na" | "hugePrep" | "negStop"

interface GenConfig {
  seed: number
  days: number
  prefix: string
  dishes: { name: string; basePrepMin: number }[]
  promised: Record<Daypart, number>
  rush: Record<Daypart, number>
  ordersPerDaypart: Record<Daypart, [number, number]>
  spread?: number
  weekendBoost?: number
  openDayparts?: Daypart[]
  onlyWeekdays?: number[]
  brokenRate?: number
  brokenStyles?: BrokenStyle[]
  headers?: string[]
  timestampStyle?: "local" | "mixed"
  promisedDecimals?: boolean
  duplicates?: number
  riderJitterSd?: number
}

const DAYPART_RANGES: { id: Daypart; fromHour: number; toHour: number }[] = [
  { id: "morning", fromHour: 5, toHour: 11 },
  { id: "lunch", fromHour: 11, toHour: 15 },
  { id: "afternoon", fromHour: 15, toHour: 19 },
  { id: "evening", fromHour: 19, toHour: 29 },
]

const STANDARD_HEADERS = [
  "order_id",
  "accepted_at",
  "food_ready_at",
  "rider_arrived_at",
  "picked_up_at",
  "promised_prep_min",
]

function generateCsv(cfg: GenConfig): string {
  const rand = mulberry32(cfg.seed)
  const gauss = makeGauss(rand)
  const headers = cfg.headers ?? STANDARD_HEADERS
  const rows: string[] = [headers.join(",")]
  const lastDay = new Date(2026, 8, 30)
  const spread = cfg.spread ?? 0.5
  const openParts = DAYPART_RANGES.filter((p) => !cfg.openDayparts || cfg.openDayparts.includes(p.id))
  const brokenStyles: BrokenStyle[] = cfg.brokenStyles ?? ["empty"]
  const stamp = (d: Date, style: string): string => {
    if (style === "utc") return `${isoLocal(d)}Z`
    if (style === "millis") return `${isoLocal(d)}.000`
    return isoLocal(d)
  }
  let id = 1000
  for (let day = 0; day < cfg.days; day++) {
    const date = new Date(lastDay)
    date.setDate(date.getDate() - (cfg.days - 1 - day))
    if (cfg.onlyWeekdays && !cfg.onlyWeekdays.includes(date.getDay())) continue
    const weekendBoost = date.getDay() === 5 || date.getDay() === 6 ? (cfg.weekendBoost ?? 1) : 1
    for (const part of openParts) {
      const [lo, hi] = cfg.ordersPerDaypart[part.id]
      const count = Math.max(0, Math.round(gauss((lo + hi) / 2, 1.4) * weekendBoost))
      for (let k = 0; k < count; k++) {
        const rowStyle =
          cfg.timestampStyle === "mixed" ? (["local", "utc", "millis"] as const)[Math.floor(rand() * 3)]! : "local"
        const hour = part.fromHour + rand() * (part.toHour - part.fromHour)
        const accepted = new Date(date)
        accepted.setHours(Math.floor(hour) % 24, Math.floor((hour % 1) * 60), Math.floor(rand() * 60))
        if (hour >= 24) accepted.setDate(accepted.getDate() + 1)
        const dish = cfg.dishes[Math.floor(rand() * cfg.dishes.length)]!
        const prep = Math.max(3, dish.basePrepMin * cfg.rush[part.id] * (0.75 + rand() * spread))
        const ready = new Date(accepted.getTime() + prep * 60000)
        const promised = cfg.promised[part.id]
        const arrival = new Date(accepted.getTime() + (promised + gauss(0, cfg.riderJitterSd ?? 5)) * 60000)
        let pickup = new Date(Math.max(ready.getTime(), arrival.getTime()) + (60 + rand() * 120) * 1000)
        const broken = rand() < (cfg.brokenRate ?? 0)
        const style = broken ? brokenStyles[Math.floor(rand() * brokenStyles.length)]! : null
        if (style === "hugePrep") ready.setTime(ready.getTime() + 300 * 60000)
        if (style === "negStop") pickup = new Date(arrival.getTime() - (5 + rand() * 15) * 60000)
        const field = (v: string) => (style === "empty" && rand() < 0.5 ? "" : v)
        const garbage = (v: string) => (style === "na" ? "n/a" : v)
        const promisedText = cfg.promisedDecimals ? promised.toFixed(1) : String(promised)
        rows.push(
          [
            `${cfg.prefix}-${id++}`,
            field(garbage(stamp(accepted, rowStyle))),
            field(garbage(stamp(ready, rowStyle))),
            field(garbage(stamp(arrival, rowStyle))),
            field(garbage(stamp(pickup, rowStyle))),
            style === "empty" && rand() < 0.5 ? "" : promisedText,
          ].join(","),
        )
      }
    }
  }
  for (let d = 0; d < (cfg.duplicates ?? 0); d++) {
    rows.push(rows[1 + ((d * 7) % Math.max(1, rows.length - 1))]!)
  }
  return rows.join("\n")
}

export const RESTAURANT_SAMPLES: RestaurantSample[] = [
  {
    id: "kreuzberg-kanteen",
    name: "Kreuzberg Kanteen",
    tagline: "Round-the-clock canteen with lunch and evening rushes.",
    condition: "Optimistic promises — 37% of orders late. The original locked example.",
    size: "30 days · ~750 orders",
    filename: "kreuzberg-kanteen.csv",
    label: "Kreuzberg Kanteen — 30 days of synthetic example orders",
    generate: () => generateExampleCsv(42),
  },
  {
    id: "mitte-veggie-room",
    name: "Mitte Veggie Room",
    tagline: "Calm vegetarian kitchen that already calibrated its numbers.",
    condition: "Well-calibrated — low lateness, recommendations mostly keep current settings.",
    size: "30 days · ~850 orders",
    filename: "mitte-veggie-room.csv",
    label: "Mitte Veggie Room — well-calibrated kitchen, 30 days",
    generate: () =>
      generateCsv({
        seed: 7,
        days: 30,
        prefix: "MVR",
        dishes: [
          { name: "buddha bowl", basePrepMin: 10 },
          { name: "falafel wrap", basePrepMin: 7 },
          { name: "miso soup", basePrepMin: 6 },
          { name: "tofu teriyaki", basePrepMin: 12 },
        ],
        promised: { morning: 12, lunch: 18, afternoon: 13, evening: 18 },
        rush: { morning: 1.0, lunch: 1.25, afternoon: 1.0, evening: 1.15 },
        ordersPerDaypart: { morning: [3, 6], lunch: [8, 14], afternoon: [4, 8], evening: [6, 10] },
        weekendBoost: 1.1,
        brokenRate: 0.01,
        riderJitterSd: 4,
      }),
  },
  {
    id: "tempelhof-pizza-studio",
    name: "Tempelhof Pizza Studio",
    tagline: "Fast pizzeria that promises far too much time.",
    condition: "Pessimistic promises — food sits ready and cools; recommendations go down.",
    size: "21 days · ~600 orders",
    filename: "tempelhof-pizza-studio.csv",
    label: "Tempelhof Pizza Studio — pessimistic promises, 21 days",
    generate: () =>
      generateCsv({
        seed: 11,
        days: 21,
        prefix: "TPS",
        dishes: [
          { name: "margherita", basePrepMin: 7 },
          { name: "pepperoni", basePrepMin: 8 },
          { name: "calzone", basePrepMin: 9 },
          { name: "insalata", basePrepMin: 4 },
        ],
        promised: { morning: 25, lunch: 35, afternoon: 25, evening: 30 },
        rush: { morning: 1.0, lunch: 1.2, afternoon: 0.9, evening: 1.05 },
        ordersPerDaypart: { morning: [3, 6], lunch: [8, 13], afternoon: [4, 8], evening: [5, 10] },
        brokenRate: 0.005,
        riderJitterSd: 3,
      }),
  },
  {
    id: "neukoelln-spaetkauf-doner",
    name: "Neukölln Spätkauf Döner",
    tagline: "Late-night window, open only in the evening and night.",
    condition: "Night-only — three dayparts stay empty; small dataset, one recommendation.",
    size: "30 days · ~360 orders",
    filename: "neukoelln-spaetkauf-doner.csv",
    label: "Neukölln Spätkauf Döner — night kitchen only, 30 days",
    generate: () =>
      generateCsv({
        seed: 23,
        days: 30,
        prefix: "NSD",
        dishes: [
          { name: "döner box", basePrepMin: 8 },
          { name: "lahmacun", basePrepMin: 7 },
          { name: "falafel box", basePrepMin: 6 },
          { name: "köfte plate", basePrepMin: 10 },
        ],
        promised: { morning: 15, lunch: 15, afternoon: 15, evening: 15 },
        rush: { morning: 1.0, lunch: 1.0, afternoon: 1.0, evening: 1.7 },
        ordersPerDaypart: { morning: [8, 16], lunch: [8, 16], afternoon: [8, 16], evening: [8, 16] },
        openDayparts: ["evening"],
        brokenRate: 0.02,
      }),
  },
  {
    id: "charlottenburg-kaffeewerk",
    name: "Charlottenburg Kaffeewerk",
    tagline: "New café, two days of orders on the books.",
    condition: "Tiny dataset — most dayparts fall under the 5-order minimum.",
    size: "2 days · ~12 orders",
    filename: "charlottenburg-kaffeewerk.csv",
    label: "Charlottenburg Kaffeewerk — tiny dataset, 2 days",
    generate: () =>
      generateCsv({
        seed: 31,
        days: 2,
        prefix: "CKW",
        dishes: [
          { name: "flat white", basePrepMin: 4 },
          { name: "croissant", basePrepMin: 3 },
          { name: "avocado toast", basePrepMin: 8 },
          { name: "eggs benedict", basePrepMin: 11 },
        ],
        promised: { morning: 10, lunch: 10, afternoon: 10, evening: 10 },
        rush: { morning: 1.0, lunch: 1.1, afternoon: 0.9, evening: 0.9 },
        ordersPerDaypart: { morning: [1, 3], lunch: [2, 4], afternoon: [1, 3], evening: [1, 2] },
      }),
  },
  {
    id: "prenzlauer-bio-brunch",
    name: "Prenzlauer Bio-Brunch",
    tagline: "Organic brunch spot exporting German column names.",
    condition: "Non-standard columns — forces the mapping flow (AI suggestion + manual confirm).",
    size: "14 days · ~360 orders",
    filename: "prenzlauer-bio-brunch.csv",
    label: "Prenzlauer Bio-Brunch — German POS export, needs column mapping",
    messy: true,
    generate: () =>
      generateCsv({
        seed: 5,
        days: 14,
        prefix: "PBB",
        headers: ["bestellung", "annahme_zeit", "fertig_um", "kurir_da", "kurir_weg", "zusage_min"],
        dishes: [
          { name: "eggs benedict", basePrepMin: 11 },
          { name: "pancakes", basePrepMin: 9 },
          { name: "granola bowl", basePrepMin: 5 },
          { name: "breakfast burrito", basePrepMin: 8 },
        ],
        promised: { morning: 14, lunch: 20, afternoon: 12, evening: 16 },
        rush: { morning: 1.0, lunch: 1.5, afternoon: 1.1, evening: 1.2 },
        ordersPerDaypart: { morning: [2, 5], lunch: [7, 12], afternoon: [4, 8], evening: [5, 9] },
        brokenRate: 0.01,
      }),
  },
  {
    id: "friedrichshain-burger-depot",
    name: "Friedrichshain Burger Depot",
    tagline: "High-traffic burger line with a sloppy POS export.",
    condition: "Dirty export — ~15% broken rows exercising every skip reason.",
    size: "30 days · ~900 rows",
    filename: "friedrichshain-burger-depot.csv",
    label: "Friedrichshain Burger Depot — 15% broken rows, 30 days",
    generate: () =>
      generateCsv({
        seed: 13,
        days: 30,
        prefix: "FBD",
        dishes: [
          { name: "cheeseburger", basePrepMin: 9 },
          { name: "double patty", basePrepMin: 12 },
          { name: "fries box", basePrepMin: 5 },
          { name: "chicken burger", basePrepMin: 10 },
        ],
        promised: { morning: 12, lunch: 15, afternoon: 10, evening: 15 },
        rush: { morning: 1.1, lunch: 1.6, afternoon: 1.0, evening: 1.3 },
        ordersPerDaypart: { morning: [3, 6], lunch: [8, 14], afternoon: [4, 8], evening: [6, 11] },
        brokenRate: 0.15,
        brokenStyles: ["empty", "na", "hugePrep", "negStop"],
      }),
  },
  {
    id: "wedding-ramen-lab",
    name: "Wedding Ramen Lab",
    tagline: "Hand-pulled noodles — prep times swing wildly.",
    condition: "High variance — wild prep spread, ~90% orders late, recommendation jumps of 20+ minutes.",
    size: "30 days · ~950 orders",
    filename: "wedding-ramen-lab.csv",
    label: "Wedding Ramen Lab — high-variance kitchen, 30 days",
    generate: () =>
      generateCsv({
        seed: 17,
        days: 30,
        prefix: "WRL",
        dishes: [
          { name: "tonkotsu ramen", basePrepMin: 18 },
          { name: "spicy miso ramen", basePrepMin: 17 },
          { name: "gyoza", basePrepMin: 8 },
          { name: "karaage bento", basePrepMin: 13 },
        ],
        promised: { morning: 12, lunch: 15, afternoon: 12, evening: 15 },
        rush: { morning: 1.1, lunch: 1.6, afternoon: 1.0, evening: 1.5 },
        ordersPerDaypart: { morning: [3, 7], lunch: [8, 15], afternoon: [4, 8], evening: [7, 12] },
        spread: 1.3,
        brokenRate: 0.02,
      }),
  },
  {
    id: "schoeneberg-altbau-kueche",
    name: "Schöneberg Altbau Küche",
    tagline: "Old POS export: mixed timestamp styles and duplicates.",
    condition: "Legacy formats — UTC/local mix, decimal promises, duplicated rows.",
    size: "20 days · ~480 rows",
    filename: "schoeneberg-altbau-kueche.csv",
    label: "Schöneberg Altbau Küche — legacy export, mixed formats",
    generate: () =>
      generateCsv({
        seed: 29,
        days: 20,
        prefix: "SAK",
        dishes: [
          { name: "schnitzel", basePrepMin: 14 },
          { name: "käse spätzle", basePrepMin: 10 },
          { name: "goulash", basePrepMin: 12 },
          { name: "potato soup", basePrepMin: 7 },
        ],
        promised: { morning: 20, lunch: 25, afternoon: 20, evening: 25 },
        rush: { morning: 1.0, lunch: 1.4, afternoon: 0.95, evening: 1.15 },
        ordersPerDaypart: { morning: [2, 5], lunch: [6, 11], afternoon: [3, 7], evening: [5, 9] },
        brokenRate: 0.01,
        timestampStyle: "mixed",
        promisedDecimals: true,
        duplicates: 6,
      }),
  },
  {
    id: "moabit-mega-kitchen",
    name: "Moabit Mega Kitchen",
    tagline: "Delivery-only ghost kitchen at full scale.",
    condition: "High volume — 45 days and ~1,900 orders; a scale test for the page.",
    size: "45 days · ~1,900 orders",
    filename: "moabit-mega-kitchen.csv",
    label: "Moabit Mega Kitchen — 45 days at scale, ~1,900 orders",
    generate: () =>
      generateCsv({
        seed: 37,
        days: 45,
        prefix: "MMK",
        dishes: [
          { name: "pad thai", basePrepMin: 10 },
          { name: "green curry", basePrepMin: 9 },
          { name: "spring rolls", basePrepMin: 5 },
          { name: "mango sticky rice", basePrepMin: 4 },
        ],
        promised: { morning: 12, lunch: 15, afternoon: 12, evening: 15 },
        rush: { morning: 1.05, lunch: 1.55, afternoon: 1.0, evening: 1.25 },
        ordersPerDaypart: { morning: [5, 8], lunch: [12, 18], afternoon: [6, 10], evening: [10, 16] },
        weekendBoost: 1.15,
        brokenRate: 0.02,
      }),
  },
]

export function getSample(id: string): RestaurantSample | undefined {
  return RESTAURANT_SAMPLES.find((s) => s.id === id)
}
