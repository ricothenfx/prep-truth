export interface Mapping {
  acceptedAt: string
  foodReadyAt: string
  riderArrivedAt: string
  pickedUpAt: string
  promisedPrepMin: string
}

export interface Order {
  acceptedAt: Date
  foodReadyAt: Date
  riderArrivedAt: Date
  pickedUpAt: Date
  promisedPrepMin: number
}

export interface ParseReport {
  orders: Order[]
  used: number
  skipped: number
  reasons: Record<string, number>
}

export type Daypart = "morning" | "lunch" | "afternoon" | "evening"

export interface DaypartStat {
  daypart: Daypart
  n: number
  medianPrep: number
  p85Prep: number
  medianPromised: number
  pctLate: number
}

export interface Recommendation extends DaypartStat {
  recommended: number | null
}

export interface Verdict {
  total: number
  pctLate: number
  medianPrep: number
  totalRiderWaitMin: number
  totalFoodIdleMin: number
}

export interface Replay {
  pctLate: number
  totalRiderWaitMin: number
  totalFoodIdleMin: number
}
