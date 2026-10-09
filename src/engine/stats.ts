import type {
  Daypart,
  DaypartStat,
  Order,
  Recommendation,
  Replay,
  Verdict,
} from "./types"

export interface DaypartDef {
  id: Daypart
  label: string
  fromHour: number
  toHour: number
}

export const DAYPARTS: DaypartDef[] = [
  { id: "morning", label: "Morning 05–11", fromHour: 5, toHour: 11 },
  { id: "lunch", label: "Lunch 11–15", fromHour: 11, toHour: 15 },
  { id: "afternoon", label: "Afternoon 15–19", fromHour: 15, toHour: 19 },
  { id: "evening", label: "Evening 19–05", fromHour: 19, toHour: 29 },
]

export const MIN_ORDERS_FOR_RECOMMENDATION = 5
export const MAX_SHIFT_MIN = 60
export const ROUND_TO_MIN = 5
export const MIN_RECOMMENDED_MIN = 10

export function daypartOf(d: Date): Daypart {
  const h = d.getHours()
  if (h >= 5 && h < 11) return "morning"
  if (h >= 11 && h < 15) return "lunch"
  if (h >= 15 && h < 19) return "afternoon"
  return "evening"
}

export function daypartLabel(id: Daypart): string {
  return DAYPARTS.find((d) => d.id === id)!.label
}

export function prepOf(o: Order): number {
  return (o.foodReadyAt.getTime() - o.acceptedAt.getTime()) / 60000
}

export function riderWaitOf(o: Order): number {
  return Math.max(0, (o.pickedUpAt.getTime() - o.riderArrivedAt.getTime()) / 60000)
}

export function foodIdleOf(o: Order): number {
  return Math.max(0, (o.riderArrivedAt.getTime() - o.foodReadyAt.getTime()) / 60000)
}

export function isLate(o: Order): boolean {
  return prepOf(o) > o.promisedPrepMin
}

function sortedAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN
  const s = sortedAsc(values)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

export function percentileNearestRank(values: number[], p: number): number {
  if (values.length === 0) return NaN
  const s = sortedAsc(values)
  const rank = Math.min(Math.max(Math.ceil((p / 100) * s.length), 1), s.length)
  return s[rank - 1]!
}

export function computeVerdict(orders: Order[]): Verdict {
  const preps = orders.map(prepOf)
  const lateCount = orders.filter(isLate).length
  return {
    total: orders.length,
    pctLate: orders.length === 0 ? 0 : (lateCount / orders.length) * 100,
    medianPrep: median(preps),
    totalRiderWaitMin: orders.reduce((sum, o) => sum + riderWaitOf(o), 0),
    totalFoodIdleMin: orders.reduce((sum, o) => sum + foodIdleOf(o), 0),
  }
}

export function daypartBreakdown(orders: Order[]): DaypartStat[] {
  return DAYPARTS.map((def) => {
    const group = orders.filter((o) => daypartOf(o.acceptedAt) === def.id)
    const preps = group.map(prepOf)
    const promised = group.map((o) => o.promisedPrepMin)
    const lateCount = group.filter(isLate).length
    return {
      daypart: def.id,
      n: group.length,
      medianPrep: median(preps),
      p85Prep: percentileNearestRank(preps, 85),
      medianPromised: median(promised),
      pctLate: group.length === 0 ? 0 : (lateCount / group.length) * 100,
    }
  })
}

export function roundUpTo(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step
}

export function recommend(stat: DaypartStat): number | null {
  if (stat.n < MIN_ORDERS_FOR_RECOMMENDATION || !Number.isFinite(stat.p85Prep)) return null
  return Math.max(MIN_RECOMMENDED_MIN, roundUpTo(stat.p85Prep, ROUND_TO_MIN))
}

export function buildRecommendations(orders: Order[]): Recommendation[] {
  return daypartBreakdown(orders).map((stat) => ({ ...stat, recommended: recommend(stat) }))
}

function replayOrder(o: Order, rec: number | null): { riderWait: number; foodIdle: number; late: boolean } {
  const prep = prepOf(o)
  if (rec === null) {
    return { riderWait: riderWaitOf(o), foodIdle: foodIdleOf(o), late: prep > o.promisedPrepMin }
  }
  const shift = Math.min(Math.max(rec - o.promisedPrepMin, -MAX_SHIFT_MIN), MAX_SHIFT_MIN)
  const simArrival = new Date(o.riderArrivedAt.getTime() + shift * 60000)
  const riderWait = Math.max(0, (o.pickedUpAt.getTime() - simArrival.getTime()) / 60000)
  const foodIdle = Math.max(0, (simArrival.getTime() - o.foodReadyAt.getTime()) / 60000)
  return { riderWait, foodIdle, late: prep > rec }
}

export function replay(orders: Order[], recommendations: Recommendation[]): Replay {
  const byDaypart = new Map<Daypart, number | null>()
  for (const r of recommendations) byDaypart.set(r.daypart, r.recommended)
  let late = 0
  let riderWait = 0
  let foodIdle = 0
  for (const o of orders) {
    const res = replayOrder(o, byDaypart.get(daypartOf(o.acceptedAt)) ?? null)
    if (res.late) late += 1
    riderWait += res.riderWait
    foodIdle += res.foodIdle
  }
  return {
    pctLate: orders.length === 0 ? 0 : (late / orders.length) * 100,
    totalRiderWaitMin: riderWait,
    totalFoodIdleMin: foodIdle,
  }
}
