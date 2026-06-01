// ─────────────────────────────────────────────────────────────────
// MA000038 — Road Transport and Distribution Award 2020
// Pure calculation engine (no DB dependencies — takes a pre-loaded
// AwardRateContext and returns earning lines).
//
// Rules implemented:
//   Ordinary hours:     38 per week, 7.6 per day (cl.29)
//   Daily overtime:     hours beyond 7.6/day (cl.32.1)
//   Weekly overtime:    hours that push weekly total beyond 38 (cl.32.1)
//   OT rates:           1.5× first 2 hours per day, 2× thereafter (cl.32.1(a))
//   Saturday:           ordinary at 1.5×; OT at 2× (cl.32.1(b))
//   Sunday:             all time 2× (cl.32.1(c))
//   Public holidays:    all time worked 2.5× (cl.41.3)
//   Night shift:        15% loading on ordinary rate — majority of hours 00:00–06:00 (cl.31)
//   Afternoon shift:    10% loading on ordinary rate — majority of hours 18:00–24:00 (cl.31)
//   Minimum engagement: 4 hours for casuals (cl.26.2); 2 hours for part-time (cl.25.4)
//   Casual loading:     25% on all hours (cl.26.1(b))
//   Higher duties:      whole-day rate elevation if >2 hrs at higher grade (cl.34)
//   Junior rates:       age-based percentage of adult rate (Schedule C)
//
// ⚠ Verify all clause references against the current award text before
//   each payroll run. Awards are updated annually by FWC.
// ─────────────────────────────────────────────────────────────────

import {
  CASUAL_LOADING,
  MINIMUM_ENGAGEMENT_HOURS,
  getJuniorRateMultiplier,
} from '@freight-payroll/shared'
import type { EmploymentType } from '@freight-payroll/shared'
import type { DayInput, EmployeeEngineInput, EarningLine, WeeklyAwardResult, AwardRateContext } from './types.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Round to 2 decimal places — all monetary amounts. */
function c(v: number): number { return Math.round(v * 100) / 100 }

/** Round to 4 decimal places — intermediate rate calculations. */
function r(v: number): number { return Math.round(v * 10000) / 10000 }

/**
 * Format a Date as 'YYYY-MM-DD' for public holiday lookups.
 * Uses local date (not UTC) to avoid midnight timezone issues.
 */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Gross worked hours for a shift (start → end minus unpaid break).
 */
function grossHoursWorked(start: Date, end: Date, breakMinutes: number): number {
  const totalMinutes = (end.getTime() - start.getTime()) / 60000
  return Math.max(0, (totalMinutes - breakMinutes) / 60)
}

// ─── Shift type detection ─────────────────────────────────────────────────────

/**
 * Determine if this shift qualifies as a night shift.
 * Night shift: majority (>50%) of worked hours fall between 00:00 and 06:00.
 * Source: MA000038 cl.31 — shift penalty provisions.
 */
function isNightShift(startTime: Date, endTime: Date, breakMinutes: number): boolean {
  const workedMinutes = (endTime.getTime() - startTime.getTime()) / 60000 - breakMinutes
  if (workedMinutes <= 0) return false

  const startHour = startTime.getHours() * 60 + startTime.getMinutes()
  const endHour   = endTime.getHours()   * 60 + endTime.getMinutes()

  // Minutes in the 00:00–06:00 window (360 minutes)
  const nightWindowStart = 0
  const nightWindowEnd   = 360

  let nightMinutes = 0
  if (startHour <= nightWindowEnd && endHour >= nightWindowStart) {
    nightMinutes = Math.min(endHour, nightWindowEnd) - Math.max(startHour, nightWindowStart)
  }

  return nightMinutes > workedMinutes / 2
}

/**
 * Determine if this shift qualifies as an afternoon shift.
 * Afternoon shift: majority (>50%) of worked hours fall between 18:00 and 24:00.
 * Source: MA000038 cl.31 — shift penalty provisions.
 * ⚠ Verify the exact definition in the current award text.
 */
function isAfternoonShift(startTime: Date, endTime: Date, breakMinutes: number): boolean {
  const workedMinutes = (endTime.getTime() - startTime.getTime()) / 60000 - breakMinutes
  if (workedMinutes <= 0) return false

  const startHour = startTime.getHours() * 60 + startTime.getMinutes()
  const endHour   = endTime.getHours()   * 60 + endTime.getMinutes()

  // Minutes in the 18:00–24:00 window (1080–1440)
  const afternoonWindowStart = 18 * 60
  const afternoonWindowEnd   = 24 * 60

  const afternoonMinutes = Math.min(endHour, afternoonWindowEnd) - Math.max(startHour, afternoonWindowStart)

  return afternoonMinutes > workedMinutes / 2
}

/**
 * Determine the shift penalty loading applicable to this shift.
 * Returns a multiplier ADDITION (not the total multiplier):
 *   e.g. 0.15 for night shift → effective rate = base × (1 + 0.15) = base × 1.15
 *
 * Night shift takes precedence over afternoon shift if both tests pass
 * (a shift cannot attract both penalties simultaneously).
 */
function shiftPenaltyLoading(
  startTime: Date,
  endTime: Date,
  breakMinutes: number,
  ctx: AwardRateContext,
): number {
  if (isNightShift(startTime, endTime, breakMinutes))     return ctx.penaltyRates.nightShift
  if (isAfternoonShift(startTime, endTime, breakMinutes)) return ctx.penaltyRates.afternoonShift
  return 0
}

// ─── Age / junior rate ────────────────────────────────────────────────────────

function ageAtDate(dob: Date, date: Date): number {
  let age = date.getFullYear() - dob.getFullYear()
  const m = date.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && date.getDate() < dob.getDate())) age--
  return age
}

// ─── Main week processor ──────────────────────────────────────────────────────

/**
 * Process a single calendar week of timesheet entries under MA000038
 * and return classified earning lines.
 *
 * @param days   - Time entries for the week, ordered Monday → Sunday.
 * @param emp    - Employee configuration (pay rate, employment type, etc.)
 * @param ctx    - Rate context loaded from the DB for this pay period.
 */
export function processMA000038Week(
  days: DayInput[],
  emp: EmployeeEngineInput,
  ctx: AwardRateContext,
): WeeklyAwardResult {
  const lines: EarningLine[] = []

  const isCasual = emp.employmentType === 'CASUAL'

  // ── Week-level tracking ───────────────────────────────────────────────────
  let weeklyOrdinaryHoursAccumulated = 0
  let totalOvertimeHours = 0
  let totalOrdinaryHours = 0

  // ── Sort days Monday → Sunday ─────────────────────────────────────────────
  const sortedDays = [...days].sort((a, b) => a.date.getTime() - b.date.getTime())

  for (const day of sortedDays) {
    const dow        = day.date.getDay() // 0=Sun, 6=Sat
    const isSun      = dow === 0
    const isSat      = dow === 6
    const isPH       = ctx.publicHolidays.has(localDateStr(day.date))
    const rawHours   = grossHoursWorked(day.startTime, day.endTime, day.breakMinutes)

    if (rawHours <= 0) continue

    // ── Per-day effective base rate ───────────────────────────────────────
    // Computed inside the loop so that:
    //   1. Junior rates split correctly at the employee's birthday mid-period.
    //   2. Higher duties elevate the rate for individual days.

    // Start from the loaded base rate for the employee's own grade.
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

    // ── Minimum engagement ────────────────────────────────────────────────
    const minHours = MINIMUM_ENGAGEMENT_HOURS[emp.employmentType as keyof typeof MINIMUM_ENGAGEMENT_HOURS] ?? 0
    const effectiveHours = Math.max(rawHours, minHours)

    const dateLabel = day.date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

    // ─────────────────────────────────────────────────────────────────────
    // PUBLIC HOLIDAY
    // All hours worked at 2.5× the base rate.
    // PH hours do NOT count toward the weekly ordinary hours accumulator.
    // ─────────────────────────────────────────────────────────────────────
    if (isPH) {
      const rate   = r(dayBaseRate * ctx.penaltyRates.publicHoliday)
      const amount = c(effectiveHours * rate)
      lines.push({
        earningType: 'PUBLIC_HOLIDAY',
        description: `Public holiday — ${dateLabel}`,
        hours: effectiveHours,
        rate,
        amount,
        isOTE: true,  // PH ordinary-equivalent pay is OTE
      })
      // Note: PH hours are NOT added to totalOrdinaryHours or weeklyOrdinaryHoursAccumulated.
      // They are OTE (isOTE=true above) and are captured in totalOTE via the lines,
      // but they do not consume the employee's 38h weekly ordinary budget.
      continue
    }

    // ─────────────────────────────────────────────────────────────────────
    // SUNDAY — all time at 2×
    // Sunday hours count toward the weekly ordinary hours accumulator.
    // ─────────────────────────────────────────────────────────────────────
    if (isSun) {
      const remainingOrdinary = Math.max(0, ctx.ordinaryHoursPerWeek - weeklyOrdinaryHoursAccumulated)
      const sundayOrdinary    = Math.min(effectiveHours, remainingOrdinary)
      const sundayWeeklyOT    = effectiveHours - sundayOrdinary

      if (sundayOrdinary > 0) {
        const rate   = r(dayBaseRate * ctx.penaltyRates.sundayAll)
        const amount = c(sundayOrdinary * rate)
        lines.push({
          earningType: 'WEEKEND_PENALTY',
          description: `Sunday — ${dateLabel}`,
          hours: sundayOrdinary,
          rate,
          amount,
          isOTE: true,  // Sunday ordinary time is OTE
        })
        weeklyOrdinaryHoursAccumulated += sundayOrdinary
        totalOrdinaryHours += sundayOrdinary
      }

      if (sundayWeeklyOT > 0) {
        // Weekly hours already exhausted — Sunday time beyond ordinary is OT
        const rate   = r(dayBaseRate * ctx.penaltyRates.sundayAll)  // still 2× even as OT
        const amount = c(sundayWeeklyOT * rate)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Sunday overtime — ${dateLabel}`,
          hours: sundayWeeklyOT,
          rate,
          amount,
          isOTE: false,
        })
        totalOvertimeHours += sundayWeeklyOT
      }
      continue
    }

    // ─────────────────────────────────────────────────────────────────────
    // SATURDAY
    // Ordinary Saturday time at 1.5×; any hours past the weekly 38-hr
    // budget at 2× (Saturday overtime rate, cl.32.1(b)).
    // ─────────────────────────────────────────────────────────────────────
    if (isSat) {
      const remainingOrdinary = Math.max(0, ctx.ordinaryHoursPerWeek - weeklyOrdinaryHoursAccumulated)
      // Saturday ordinary time is capped at both the daily ordinary hours limit (cl.32.1(b))
      // and the remaining weekly ordinary hours budget.
      const satOrdinary = Math.min(effectiveHours, ctx.ordinaryHoursPerDay, remainingOrdinary)
      const satOT       = effectiveHours - satOrdinary

      if (satOrdinary > 0) {
        const rate   = r(dayBaseRate * ctx.penaltyRates.saturdayOrdinary)
        const amount = c(satOrdinary * rate)
        lines.push({
          earningType: 'WEEKEND_PENALTY',
          description: `Saturday — ${dateLabel}`,
          hours: satOrdinary,
          rate,
          amount,
          isOTE: true,
        })
        weeklyOrdinaryHoursAccumulated += satOrdinary
        totalOrdinaryHours += satOrdinary
      }

      if (satOT > 0) {
        const rate   = r(dayBaseRate * ctx.penaltyRates.saturdayOvertime)
        const amount = c(satOT * rate)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Saturday overtime — ${dateLabel}`,
          hours: satOT,
          rate,
          amount,
          isOTE: false,
        })
        totalOvertimeHours += satOT
      }
      continue
    }

    // ─────────────────────────────────────────────────────────────────────
    // MONDAY TO FRIDAY
    // Split into: truly ordinary, weekly OT, daily OT.
    // Apply shift penalty loading (night/afternoon) to ordinary hours only.
    // ─────────────────────────────────────────────────────────────────────

    // Step 1: How many of today's hours fit within the daily ordinary limit (7.6)?
    const dailyOrdinaryBudget = ctx.ordinaryHoursPerDay
    const dailyOrdinaryHours  = Math.min(effectiveHours, dailyOrdinaryBudget)
    const dailyOTHours        = Math.max(0, effectiveHours - dailyOrdinaryBudget)

    // Step 2: How much of the daily ordinary slice fits within the weekly budget?
    const remainingWeeklyOrdinary = Math.max(0, ctx.ordinaryHoursPerWeek - weeklyOrdinaryHoursAccumulated)
    const trulyOrdinaryHours      = Math.min(dailyOrdinaryHours, remainingWeeklyOrdinary)
    const weeklyOTHours           = dailyOrdinaryHours - trulyOrdinaryHours  // Ordinary rate, but past weekly limit

    // Step 3: Combined OT for today (weekly OT + daily OT share the daily 2-hour bucket)
    const totalDayOTHours = weeklyOTHours + dailyOTHours

    // Step 4: Shift penalty loading
    const penaltyLoading = shiftPenaltyLoading(day.startTime, day.endTime, day.breakMinutes, ctx)
    const earningTypeForOrdinary: EarningLine['earningType'] =
      penaltyLoading === ctx.penaltyRates.nightShift
        ? 'NIGHT_PENALTY'
        : penaltyLoading === ctx.penaltyRates.afternoonShift
          ? 'AFTERNOON_PENALTY'
          : 'ORDINARY'

    // Step 5: Emit ordinary line
    if (trulyOrdinaryHours > 0) {
      const rate   = r(dayBaseRate * (1 + penaltyLoading))
      const amount = c(trulyOrdinaryHours * rate)
      lines.push({
        earningType: earningTypeForOrdinary,
        description: penaltyLoading > 0
          ? `${penaltyLoading === ctx.penaltyRates.nightShift ? 'Night shift' : 'Afternoon shift'} — ${dateLabel}`
          : `Ordinary time — ${dateLabel}`,
        hours: trulyOrdinaryHours,
        rate,
        amount,
        isOTE: true,
      })
      weeklyOrdinaryHoursAccumulated += trulyOrdinaryHours
      totalOrdinaryHours += trulyOrdinaryHours
    }

    // Step 6: Emit OT lines (first 2 hours at 1.5×, remainder at 2×)
    if (totalDayOTHours > 0) {
      const ot1Hours = Math.min(totalDayOTHours, 2)
      const ot2Hours = Math.max(0, totalDayOTHours - 2)

      if (ot1Hours > 0) {
        const rate   = r(dayBaseRate * ctx.penaltyRates.overtimeFirst2Hours)
        const amount = c(ot1Hours * rate)
        lines.push({
          earningType: 'OVERTIME_1_5X',
          description: `Overtime (1.5×) — ${dateLabel}`,
          hours: ot1Hours,
          rate,
          amount,
          isOTE: false,
        })
      }

      if (ot2Hours > 0) {
        const rate   = r(dayBaseRate * ctx.penaltyRates.overtimeAfter2Hours)
        const amount = c(ot2Hours * rate)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Overtime (2×) — ${dateLabel}`,
          hours: ot2Hours,
          rate,
          amount,
          isOTE: false,
        })
      }

      totalOvertimeHours += totalDayOTHours
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
