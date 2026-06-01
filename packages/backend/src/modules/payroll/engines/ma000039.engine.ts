// ─────────────────────────────────────────────────────────────────
// MA000039 — Road Transport (Long Distance Operations) Award 2020
// Pure calculation engine.
//
// KEY DIFFERENCES FROM MA000038:
//
// 1. Ordinary hours basis: ~25.65 hours per week (derived from
//    weekly minimum ÷ ordinary hourly rate). This is because the
//    award distinguishes between "driving time", "loading/unloading
//    time", and mandatory rest periods during long journeys.
//    Mandatory rest is not "working time" for ordinary hours purposes.
//
// 2. Ordinary hours per day: ~5.13 hrs (25.65 / 5), but in practice
//    MA000039 applies on a trip/journey basis rather than a strict
//    daily 7.6-hour basis like MA000038.
//
// 3. Grade numbering: MA000039 starts at Grade 3 (Grades 1 and 2
//    were removed in the October 2025 restructure).
//
// ⚠ This engine implements the hourly rate method. The per-km
//   rate method (where relevant) is handled via kmFloorChecker.ts.
//
// ⚠ Verify all rules against the current award text and FWO pay
//   guide before production use. MA000039 is more complex than
//   MA000038 in its treatment of working time for long journeys.
// ─────────────────────────────────────────────────────────────────

import {
  CASUAL_LOADING,
  MINIMUM_ENGAGEMENT_HOURS,
  getJuniorRateMultiplier,
} from '@freight-payroll/shared'
import type { DayInput, EmployeeEngineInput, EarningLine, WeeklyAwardResult, AwardRateContext } from './types.js'

function c(v: number): number { return Math.round(v * 100) / 100 }
function r(v: number): number { return Math.round(v * 10000) / 10000 }

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function grossHoursWorked(start: Date, end: Date, breakMinutes: number): number {
  const totalMinutes = (end.getTime() - start.getTime()) / 60000
  return Math.max(0, (totalMinutes - breakMinutes) / 60)
}

function ageAtDate(dob: Date, date: Date): number {
  let age = date.getFullYear() - dob.getFullYear()
  const m = date.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && date.getDate() < dob.getDate())) age--
  return age
}

function isNightShift(startTime: Date, endTime: Date, breakMinutes: number): boolean {
  const workedMinutes = (endTime.getTime() - startTime.getTime()) / 60000 - breakMinutes
  if (workedMinutes <= 0) return false
  const startHour = startTime.getHours() * 60 + startTime.getMinutes()
  const endHour   = endTime.getHours()   * 60 + endTime.getMinutes()
  const nightMinutes = Math.min(endHour, 360) - Math.max(startHour, 0)
  return nightMinutes > 0 && nightMinutes > workedMinutes / 2
}

function isAfternoonShift(startTime: Date, endTime: Date, breakMinutes: number): boolean {
  const workedMinutes = (endTime.getTime() - startTime.getTime()) / 60000 - breakMinutes
  if (workedMinutes <= 0) return false
  const startHour = startTime.getHours() * 60 + startTime.getMinutes()
  const endHour   = endTime.getHours()   * 60 + endTime.getMinutes()
  const afternoonMinutes = Math.min(endHour, 1440) - Math.max(startHour, 1080)
  return afternoonMinutes > 0 && afternoonMinutes > workedMinutes / 2
}

/**
 * Process a single calendar week of timesheet entries under MA000039.
 *
 * The structure mirrors MA000038 but uses MA000039 ordinary hours
 * (ordinaryHoursPerWeek ≈ 25.65, ordinaryHoursPerDay ≈ 5.13) from ctx.
 */
export function processMA000039Week(
  days: DayInput[],
  emp: EmployeeEngineInput,
  ctx: AwardRateContext,
): WeeklyAwardResult {
  const lines: EarningLine[] = []

  const isCasual = emp.employmentType === 'CASUAL'

  let weeklyOrdinaryAccumulated = 0
  let totalOrdinaryHours = 0
  let totalOvertimeHours = 0

  const sortedDays = [...days].sort((a, b) => a.date.getTime() - b.date.getTime())

  for (const day of sortedDays) {
    const dow  = day.date.getDay()
    const isSun = dow === 0
    const isSat = dow === 6
    const isPH  = ctx.publicHolidays.has(localDateStr(day.date))
    const rawHours = grossHoursWorked(day.startTime, day.endTime, day.breakMinutes)
    if (rawHours <= 0) continue

    // ── Per-day effective base rate ───────────────────────────────────────────
    // Computed inside the loop so junior rates split at the birthday mid-period,
    // and higher duties elevate the rate for individual days.

    let dayBaseRate = ctx.baseHourlyRate

    // 1. Junior rate — use age on THIS day so a birthday mid-week splits correctly.
    let juniorMultiplier = 1.0
    if (emp.dateOfBirth) {
      const age = ageAtDate(emp.dateOfBirth, day.date)
      juniorMultiplier = getJuniorRateMultiplier(age)
      dayBaseRate = r(dayBaseRate * juniorMultiplier)
    }

    // 2. Higher duties — if the employee performed duties above their grade for
    //    the whole day (>2hrs at higher grade triggers whole-day elevation per award),
    //    elevate to the award minimum for the higher grade × any junior multiplier.
    if (day.isHigherDutyDay && day.higherDutyGrade) {
      const higherGradeMin = ctx.classificationRates.get(day.higherDutyGrade)
      if (higherGradeMin !== undefined) {
        const higherEffective = r(higherGradeMin * juniorMultiplier)
        if (higherEffective > dayBaseRate) {
          dayBaseRate = higherEffective
        }
      }
    }

    // 3. Casual loading — applied after junior/higher-duties so it stacks correctly.
    if (isCasual) {
      dayBaseRate = r(dayBaseRate * (1 + CASUAL_LOADING))
    }

    const minHours = MINIMUM_ENGAGEMENT_HOURS[emp.employmentType as keyof typeof MINIMUM_ENGAGEMENT_HOURS] ?? 0
    const effectiveHours = Math.max(rawHours, minHours)

    const dateLabel = day.date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

    if (isPH) {
      const rate   = r(dayBaseRate * ctx.penaltyRates.publicHoliday)
      lines.push({
        earningType: 'PUBLIC_HOLIDAY',
        description: `Public holiday — ${dateLabel}`,
        hours: effectiveHours,
        rate,
        amount: c(effectiveHours * rate),
        isOTE: true,
      })
      // PH hours are NOT added to totalOrdinaryHours or weeklyOrdinaryAccumulated.
      // They are OTE (isOTE=true above) and captured in totalOTE via the lines,
      // but they do not consume the weekly ordinary hours budget.
      continue
    }

    if (isSun) {
      const remaining = Math.max(0, ctx.ordinaryHoursPerWeek - weeklyOrdinaryAccumulated)
      const ordinary  = Math.min(effectiveHours, remaining)
      const weekOT    = effectiveHours - ordinary

      if (ordinary > 0) {
        const rate = r(dayBaseRate * ctx.penaltyRates.sundayAll)
        lines.push({
          earningType: 'WEEKEND_PENALTY',
          description: `Sunday — ${dateLabel}`,
          hours: ordinary,
          rate,
          amount: c(ordinary * rate),
          isOTE: true,
        })
        weeklyOrdinaryAccumulated += ordinary
        totalOrdinaryHours += ordinary
      }
      if (weekOT > 0) {
        const rate = r(dayBaseRate * ctx.penaltyRates.sundayAll)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Sunday overtime — ${dateLabel}`,
          hours: weekOT,
          rate,
          amount: c(weekOT * rate),
          isOTE: false,
        })
        totalOvertimeHours += weekOT
      }
      continue
    }

    if (isSat) {
      const remaining   = Math.max(0, ctx.ordinaryHoursPerWeek - weeklyOrdinaryAccumulated)
      // Saturday ordinary capped at both the daily limit AND the remaining weekly budget.
      const satOrdinary = Math.min(effectiveHours, ctx.ordinaryHoursPerDay, remaining)
      const satOT       = effectiveHours - satOrdinary

      if (satOrdinary > 0) {
        const rate = r(dayBaseRate * ctx.penaltyRates.saturdayOrdinary)
        lines.push({
          earningType: 'WEEKEND_PENALTY',
          description: `Saturday — ${dateLabel}`,
          hours: satOrdinary,
          rate,
          amount: c(satOrdinary * rate),
          isOTE: true,
        })
        weeklyOrdinaryAccumulated += satOrdinary
        totalOrdinaryHours += satOrdinary
      }
      if (satOT > 0) {
        const rate = r(dayBaseRate * ctx.penaltyRates.saturdayOvertime)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Saturday overtime — ${dateLabel}`,
          hours: satOT,
          rate,
          amount: c(satOT * rate),
          isOTE: false,
        })
        totalOvertimeHours += satOT
      }
      continue
    }

    // Mon–Fri
    const dailyOrdinary  = Math.min(effectiveHours, ctx.ordinaryHoursPerDay)
    const dailyOT        = Math.max(0, effectiveHours - ctx.ordinaryHoursPerDay)
    const remainingWeekly = Math.max(0, ctx.ordinaryHoursPerWeek - weeklyOrdinaryAccumulated)
    const trulyOrdinary   = Math.min(dailyOrdinary, remainingWeekly)
    const weeklyOT        = dailyOrdinary - trulyOrdinary
    const totalDayOT      = weeklyOT + dailyOT

    const penaltyLoading = isNightShift(day.startTime, day.endTime, day.breakMinutes)
      ? ctx.penaltyRates.nightShift
      : isAfternoonShift(day.startTime, day.endTime, day.breakMinutes)
        ? ctx.penaltyRates.afternoonShift
        : 0

    const earningType: EarningLine['earningType'] =
      penaltyLoading === ctx.penaltyRates.nightShift
        ? 'NIGHT_PENALTY'
        : penaltyLoading === ctx.penaltyRates.afternoonShift
          ? 'AFTERNOON_PENALTY'
          : 'ORDINARY'

    if (trulyOrdinary > 0) {
      const rate = r(dayBaseRate * (1 + penaltyLoading))
      lines.push({
        earningType,
        description: penaltyLoading > 0
          ? `${penaltyLoading === ctx.penaltyRates.nightShift ? 'Night shift' : 'Afternoon shift'} — ${dateLabel}`
          : `Ordinary time — ${dateLabel}`,
        hours: trulyOrdinary,
        rate,
        amount: c(trulyOrdinary * rate),
        isOTE: true,
      })
      weeklyOrdinaryAccumulated += trulyOrdinary
      totalOrdinaryHours += trulyOrdinary
    }

    if (totalDayOT > 0) {
      const ot1 = Math.min(totalDayOT, 2)
      const ot2 = Math.max(0, totalDayOT - 2)

      if (ot1 > 0) {
        const rate = r(dayBaseRate * ctx.penaltyRates.overtimeFirst2Hours)
        lines.push({
          earningType: 'OVERTIME_1_5X',
          description: `Overtime (1.5×) — ${dateLabel}`,
          hours: ot1,
          rate,
          amount: c(ot1 * rate),
          isOTE: false,
        })
      }
      if (ot2 > 0) {
        const rate = r(dayBaseRate * ctx.penaltyRates.overtimeAfter2Hours)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Overtime (2×) — ${dateLabel}`,
          hours: ot2,
          rate,
          amount: c(ot2 * rate),
          isOTE: false,
        })
      }
      totalOvertimeHours += totalDayOT
    }
  }

  const totalGross = c(lines.reduce((sum, l) => sum + l.amount, 0))
  const totalOTE   = c(lines.filter(l => l.isOTE).reduce((sum, l) => sum + l.amount, 0))

  return {
    lines,
    totalOrdinaryHours: Math.round(totalOrdinaryHours * 10000) / 10000,
    totalOvertimeHours: Math.round(totalOvertimeHours * 10000) / 10000,
    totalGross,
    totalOTE,
  }
}
