// ─────────────────────────────────────────────────────────────────
// Casual Conversion Monitor
//
// Implements the casual conversion assessment under MA000038 cl.10.3
// and the NES casual conversion provisions (Fair Work Act s.65J–s.65M).
//
// Eligibility requirements:
//   1. The casual employee has been employed for at least 12 months.
//   2. During the last 6 months, the employee has worked on a regular
//      and systematic basis (regular days, consistent hours).
//
// When both conditions are met, the employer must proactively offer
// the employee conversion to permanent (full-time or part-time)
// employment within 21 days of the 12-month anniversary.
//
// Failure to comply can result in a Fair Work claim.
//
// This engine assesses eligibility based on actual shift history.
// It does NOT send notifications — that is the responsibility of
// the calling service layer.
//
// Usage:
//   const assessment = assessCasualConversion(shiftHistory, new Date())
//   if (assessment.shouldOfferConversion) { // send employer alert }
// ─────────────────────────────────────────────────────────────────

import type { CasualShiftRecord, CasualConversionAssessment } from './types.js'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Returns the ISO week key 'YYYY-Www' for grouping shifts by week. */
function isoWeekKey(date: Date): string {
  const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7  // Monday=1 … Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - day)  // move to Thursday of this ISO week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum   = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

/** Compute the median of a sorted numeric array. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Assess whether a casual employee is eligible for conversion to permanent
 * employment and whether the employer should proactively offer conversion.
 *
 * @param history  - All shift records for this employee.
 * @param refDate  - The date of the assessment (usually today).
 */
export function assessCasualConversion(
  history: CasualShiftRecord[],
  refDate: Date,
): CasualConversionAssessment {
  if (history.length === 0) {
    return {
      isEligible:            false,
      monthsEmployed:        0,
      regularityScore:       0,
      typicalDaysPerWeek:    0,
      typicalHoursPerWeek:   0,
      shouldOfferConversion: false,
      summary:               'No shift history provided.',
    }
  }

  const sorted     = [...history].sort((a, b) => a.date.getTime() - b.date.getTime())
  const firstShift = sorted[0].date

  // ── Tenure check ─────────────────────────────────────────────────────────────
  let monthsEmployed =
    (refDate.getFullYear() - firstShift.getFullYear()) * 12
    + refDate.getMonth()  - firstShift.getMonth()
  if (refDate.getDate() < firstShift.getDate()) monthsEmployed--
  monthsEmployed = Math.max(0, monthsEmployed)

  const isEligible = monthsEmployed >= 12

  // ── Group shifts by ISO week ──────────────────────────────────────────────────
  const byWeek = new Map<string, { days: Set<number>; hours: number }>()
  for (const shift of sorted) {
    const key = isoWeekKey(shift.date)
    if (!byWeek.has(key)) byWeek.set(key, { days: new Set(), hours: 0 })
    const week = byWeek.get(key)!
    week.days.add(shift.date.getDay())
    week.hours += shift.hoursWorked
  }

  const weeks        = Array.from(byWeek.values())
  const totalWeeks   = weeks.length
  const daysPerWeek  = weeks.map(w => w.days.size).sort((a, b) => a - b)
  const hoursPerWeek = weeks.map(w => w.hours).sort((a, b) => a - b)

  const typicalDaysPerWeek  = Math.round(median(daysPerWeek)  * 100) / 100
  const typicalHoursPerWeek = Math.round(median(hoursPerWeek) * 100) / 100

  // ── Regularity score (0–100) ──────────────────────────────────────────────────
  // Two components:
  //
  // 1. Day-of-week consistency (60% weight):
  //    The most common day of the week appears in what fraction of weeks?
  //    e.g. if Monday is worked in 11 out of 12 weeks → consistency = 0.917
  //
  const dayFreq = new Map<number, number>()
  for (const shift of sorted) {
    const d = shift.date.getDay()
    dayFreq.set(d, (dayFreq.get(d) ?? 0) + 1)
  }
  const maxDayFreq      = Math.max(...Array.from(dayFreq.values()), 0)
  const dayConsistency  = totalWeeks > 0 ? maxDayFreq / totalWeeks : 0   // 0–1

  // 2. Hours-per-week consistency (40% weight):
  //    Measured as 1 − coefficient of variation (stdDev / mean).
  //    A CV of 0 → perfectly consistent; CV ≥ 1 → very erratic.
  //    Clamped to [0, 1].
  const meanHours     = hoursPerWeek.reduce((s, h) => s + h, 0) / (hoursPerWeek.length || 1)
  const variance      = hoursPerWeek.reduce((s, h) => s + Math.pow(h - meanHours, 2), 0) / (hoursPerWeek.length || 1)
  const cv            = meanHours > 0 ? Math.sqrt(variance) / meanHours : 1
  const hoursConsistency = Math.max(0, Math.min(1, 1 - cv))  // 0–1

  // Combined score: 60% day, 40% hours — rounded to integer 0–100
  const regularityScore = Math.min(
    100,
    Math.max(0, Math.round(dayConsistency * 60 + hoursConsistency * 40) * 100 / 100),
  )

  // ── Conversion decision ───────────────────────────────────────────────────────
  // "Regular and systematic" is considered met when regularity score ≥ 50.
  // This threshold aligns with Fair Work jurisprudence: an employee who works
  // the same days in the majority of weeks with broadly consistent hours
  // has a regular and systematic engagement pattern.
  const isRegularSystematic  = regularityScore >= 50
  const shouldOfferConversion = isEligible && isRegularSystematic

  // ── Summary text ─────────────────────────────────────────────────────────────
  let summary: string
  if (!isEligible) {
    summary =
      `Employee has worked ${monthsEmployed} month${monthsEmployed !== 1 ? 's' : ''} — ` +
      `12 months required for casual conversion eligibility.`
  } else if (!isRegularSystematic) {
    summary =
      `Employee is eligible by tenure (${monthsEmployed} months) but the work ` +
      `pattern is irregular (regularity score: ${regularityScore}/100). ` +
      `Conversion offer is not required at this time.`
  } else {
    summary =
      `Employee is eligible for conversion to permanent employment: ` +
      `${monthsEmployed} months employed, regularity score ${regularityScore}/100. ` +
      `The employer should proactively offer conversion within 21 days.`
  }

  return {
    isEligible,
    monthsEmployed,
    regularityScore,
    typicalDaysPerWeek,
    typicalHoursPerWeek,
    shouldOfferConversion,
    summary,
  }
}
