export function fmtMin(m: number): string {
  if (!Number.isFinite(m)) return "—"
  const total = Math.round(m)
  const h = Math.floor(total / 60)
  const min = total % 60
  return h > 0 ? `${h}h ${min}m` : `${min} min`
}

export function fmtPct(p: number): string {
  return Number.isFinite(p) ? `${p.toFixed(0)}%` : "—"
}

export function fmtNum(n: number, digits = 1): string {
  return Number.isFinite(n) ? n.toFixed(digits) : "—"
}

export function fmtDelta(minutes: number): string {
  if (!Number.isFinite(minutes) || Math.abs(minutes) < 0.5) return "±0"
  const rounded = Math.round(minutes)
  return rounded > 0 ? `+${rounded}` : `${rounded}`
}
