import Papa from "papaparse"
import type { Mapping, Order, ParseReport } from "./types"

export const MAX_PREP_MIN = 240
export const MAX_RIDER_STOP_MIN = 60

export const STANDARD_MAPPING: Mapping = {
  acceptedAt: "accepted_at",
  foodReadyAt: "food_ready_at",
  riderArrivedAt: "rider_arrived_at",
  pickedUpAt: "picked_up_at",
  promisedPrepMin: "promised_prep_min",
}

export function guessMapping(headers: string[]): Mapping {
  const candidates: Record<keyof Mapping, string[]> = {
    acceptedAt: ["accepted_at", "accepted", "accept_time", "order_accepted", "acceptedat"],
    foodReadyAt: ["food_ready_at", "food_ready", "ready_at", "ready_time", "foodreadyat"],
    riderArrivedAt: ["rider_arrived_at", "rider_arrival", "courier_arrived_at", "rider_arrivedat"],
    pickedUpAt: ["picked_up_at", "pickup_at", "pickedup_at", "pickedupat"],
    promisedPrepMin: ["promised_prep_min", "promised_prep", "prep_time_promise", "promisedpreppmin"],
  }
  const lower = headers.map((h) => h.trim().toLowerCase())
  const pick = (key: keyof Mapping): string => {
    for (const c of candidates[key]) {
      const i = lower.indexOf(c)
      if (i !== -1) return headers[i]!
    }
    return ""
  }
  return {
    acceptedAt: pick("acceptedAt"),
    foodReadyAt: pick("foodReadyAt"),
    riderArrivedAt: pick("riderArrivedAt"),
    pickedUpAt: pick("pickedUpAt"),
    promisedPrepMin: pick("promisedPrepMin"),
  }
}

export function parseCsv(text: string, mapping: Mapping): ParseReport {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })
  const reasons: Record<string, number> = {}
  const orders: Order[] = []
  const skip = (why: string) => {
    reasons[why] = (reasons[why] ?? 0) + 1
  }
  for (const row of parsed.data) {
    const accepted = new Date((row[mapping.acceptedAt] ?? "").trim())
    const ready = new Date((row[mapping.foodReadyAt] ?? "").trim())
    const arrived = new Date((row[mapping.riderArrivedAt] ?? "").trim())
    const picked = new Date((row[mapping.pickedUpAt] ?? "").trim())
    const promised = Number((row[mapping.promisedPrepMin] ?? "").trim())
    if (
      [accepted, ready, arrived, picked].some((d) => Number.isNaN(d.getTime())) ||
      !Number.isFinite(promised)
    ) {
      skip("missing or unparseable fields")
      continue
    }
    const prep = (ready.getTime() - accepted.getTime()) / 60000
    if (prep <= 0 || prep > MAX_PREP_MIN) {
      skip("unreasonable prep time")
      continue
    }
    const stop = (picked.getTime() - arrived.getTime()) / 60000
    if (stop < 0 || stop > MAX_RIDER_STOP_MIN) {
      skip("implausible rider stop")
      continue
    }
    orders.push({
      acceptedAt: accepted,
      foodReadyAt: ready,
      riderArrivedAt: arrived,
      pickedUpAt: picked,
      promisedPrepMin: promised,
    })
  }
  return {
    orders,
    used: orders.length,
    skipped: parsed.data.length - orders.length,
    reasons,
  }
}
