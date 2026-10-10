export interface SummaryClaimInput {
  totalOrders: number
  pctLate: number
  afterPctLate: number
  riderWaitTotalMinutesBefore: number
  riderWaitTotalMinutesAfter: number
}

const DOWN =
  /\b(?:falls?|fell|drops?|dropped|decreas(?:e|es|ed|ing)|reduc(?:e|es|ed|ing)|lower(?:s|ed|ing)?)\b/i
const UP =
  /\b(?:rises?|rose|increas(?:e|es|ed|ing)|grows?|grew|climbs?|climbed|climbing|jumps?|up from)\b/i
const LATE_CLAIM =
  /lateness|late orders?|late percentage|late rate|percentage of (?:the )?late|% of them (?:being|are|were) late|% late|being late|are late|ran late|running late/i
const WAIT_CLAIM = /\briders?\b|\bwaits?\b|\bwaiting\b/i

function firstVerb(frag: string, re: RegExp): string {
  return frag.match(re)?.[0] ?? "?"
}

export function summaryClaimProblems(text: string, p: SummaryClaimInput): string[] {
  const problems: string[] = []
  const lateUp = p.afterPctLate > p.pctLate + 0.5
  const lateDown = p.afterPctLate < p.pctLate - 0.5
  const waitUp = p.riderWaitTotalMinutesAfter > p.riderWaitTotalMinutesBefore + 0.5
  const waitDown = p.riderWaitTotalMinutesAfter < p.riderWaitTotalMinutesBefore - 0.5
  const before = Math.round(p.riderWaitTotalMinutesBefore)
  const after = Math.round(p.riderWaitTotalMinutesAfter)
  for (const sentence of text.split(/[.!?]+\s+/)) {
    for (const raw of sentence.split(/,|;|\b(?:but|while|however|although|though)\b/i)) {
      const frag = raw.trim()
      if (LATE_CLAIM.test(frag)) {
        if (lateUp && DOWN.test(frag))
          problems.push(
            `says "${firstVerb(frag, DOWN)}" about lateness but late orders rise ${p.pctLate.toFixed(1)}% → ${p.afterPctLate.toFixed(1)}%`,
          )
        if (lateDown && UP.test(frag))
          problems.push(
            `says "${firstVerb(frag, UP)}" about lateness but late orders fall ${p.pctLate.toFixed(1)}% → ${p.afterPctLate.toFixed(1)}%`,
          )
      }
      if (WAIT_CLAIM.test(frag)) {
        if (waitUp && DOWN.test(frag))
          problems.push(
            `says "${firstVerb(frag, DOWN)}" about rider waiting but it rises ${before} → ${after} min`,
          )
        if (waitDown && UP.test(frag))
          problems.push(
            `says "${firstVerb(frag, UP)}" about rider waiting but it falls ${before} → ${after} min`,
          )
      }
    }
  }
  const totalM = text.match(/total of ([\d,]+) orders/)
  if (totalM && Number(totalM[1]!.replace(/,/g, "")) !== p.totalOrders) {
    problems.push(`claims ${totalM[1]} orders but the engine counted ${p.totalOrders}`)
  }
  const pctM = text.match(/([\d.]+)% of them (?:being|are|were) late/)
  if (pctM && Math.abs(Number(pctM[1]) - p.pctLate) > 0.51) {
    problems.push(`claims ${pctM[1]}% late but the engine measured ${p.pctLate.toFixed(1)}%`)
  }
  return problems
}
