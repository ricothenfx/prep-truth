import type { Mapping } from "./types"
import { STANDARD_MAPPING } from "./parse"
import { isoLocal, makeGauss, mulberry32 } from "../data/rng"

interface Dish {
  name: string
  basePrepMin: number
}

const DISHES: Dish[] = [
  { name: "doner plate", basePrepMin: 9 },
  { name: "currywurst", basePrepMin: 8 },
  { name: "vegan bowl", basePrepMin: 12 },
  { name: "ramen", basePrepMin: 16 },
]

const PROMISED_BY_DAYPART: Record<string, number> = {
  morning: 15,
  lunch: 15,
  afternoon: 15,
  evening: 20,
}

const RUSH_FACTOR: Record<string, number> = {
  morning: 1.0,
  lunch: 1.7,
  afternoon: 1.0,
  evening: 1.45,
}

const ORDERS_PER_DAYPART: Record<string, [number, number]> = {
  morning: [2, 5],
  lunch: [6, 12],
  afternoon: [3, 7],
  evening: [5, 10],
}

const DAYPART_RANGES: { id: string; fromHour: number; toHour: number }[] = [
  { id: "morning", fromHour: 5, toHour: 11 },
  { id: "lunch", fromHour: 11, toHour: 15 },
  { id: "afternoon", fromHour: 15, toHour: 19 },
  { id: "evening", fromHour: 19, toHour: 29 },
]

const DAYS = 30
const LAST_DAY = new Date(2026, 8, 30)
const BROKEN_RATE = 0.03

export const EXAMPLE_CSV_SEED = 42

export function generateExampleCsv(seed = EXAMPLE_CSV_SEED): string {
  const rand = mulberry32(seed)
  const gauss = makeGauss(rand)
  const rows: string[] = [
    "order_id,accepted_at,food_ready_at,rider_arrived_at,picked_up_at,promised_prep_min",
  ]
  let id = 1000
  for (let day = 0; day < DAYS; day++) {
    const date = new Date(LAST_DAY)
    date.setDate(date.getDate() - (DAYS - 1 - day))
    const weekday = date.getDay()
    const weekendBoost = weekday === 5 || weekday === 6 ? 1.15 : 1
    for (const part of DAYPART_RANGES) {
      const [lo, hi] = ORDERS_PER_DAYPART[part.id]!
      const count = Math.round(gauss((lo + hi) / 2, 1.4) * weekendBoost)
      for (let k = 0; k < count; k++) {
        const hour = part.fromHour + rand() * (part.toHour - part.fromHour)
        const accepted = new Date(date)
        accepted.setHours(Math.floor(hour) % 24, Math.floor((hour % 1) * 60), Math.floor(rand() * 60))
        if (hour >= 24) accepted.setDate(accepted.getDate() + 1)
        const dish = DISHES[Math.floor(rand() * DISHES.length)]!
        const prep = Math.max(3, dish.basePrepMin * RUSH_FACTOR[part.id]! * (0.75 + rand() * 0.5))
        const ready = new Date(accepted.getTime() + prep * 60000)
        const promised = PROMISED_BY_DAYPART[part.id]!
        const arrival = new Date(accepted.getTime() + (promised + gauss(0, 5)) * 60000)
        const pickup = new Date(Math.max(ready.getTime(), arrival.getTime()) + (60 + rand() * 120) * 1000)
        const broken = rand() < BROKEN_RATE
        const field = (v: string) => (broken && rand() < 0.5 ? "" : v)
        rows.push(
          [
            `KKB-${id++}`,
            field(isoLocal(accepted)),
            field(isoLocal(ready)),
            field(isoLocal(arrival)),
            field(isoLocal(pickup)),
            broken && rand() < 0.5 ? "" : String(promised),
          ].join(","),
        )
      }
    }
  }
  return rows.join("\n")
}

export const EXAMPLE_MAPPING: Mapping = STANDARD_MAPPING
