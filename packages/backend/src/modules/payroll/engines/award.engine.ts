// ─────────────────────────────────────────────────────────────────
// Award interpretation engine
// Applies the Road Transport Awards to produce earning lines
// from raw hours worked per day.
// ─────────────────────────────────────────────────────────────────

import {
  PENALTY_RATES,
  getAwardHourlyRate,
} from '@freight-payroll/shared'
import { isPublicHoliday } from '@freight-payroll/shared'
import type {
  AwardCode,
  AwardClassificationLevel,
  AustralianState,
  EarningType,
} from '@freight-payroll/shared'

export interface DayHours {
  date: Date
  startTime: Date
  endTime: Date
  breakMinutes: number
  depotState: AustralianState
}

export interface EarningLine {
  earningType: EarningType
  description: string
  hours: number
  rate: number
  amount: number
}

export interface WeeklyEarnings {
  lines: EarningLine[]
  totalOrdinaryHours: number
  totalOvertimeHours: number
  totalGross: number
}

/**
 * Process a week of time entries and produce award-compliant earning lines.
 *
 * MA000038/MA000039 overtime rules:
 * - Overtime after 38 hours in a week (on a roster cycle basis)
 * - Or after 7.6 hours in a day (daily OT)
 * - Time and a half for first 3 hours of OT, double time after
 * - Double time on Sundays
 * - 2.5x on public holidays
 * - 1.5x for Saturday ordinary time
 * - 15% night shift penalty when majority of hours between 0000-0600
 */
export function processWeeklyHours(
  days: DayHours[],
  awardCode: AwardCode,
  classificationLevel: AwardClassificationLevel,
  baseHourlyRate?: number, // override award rate if employee has a custom rate above award
): WeeklyEarnings {
  const baseRate = baseHourlyRate ?? getAwardHourlyRate(awardCode, classificationLevel)
  const lines: EarningLine[] = []

  let weeklyOrdinaryHours = 0
  let weeklyOvertimeHours = 0

  for (const day of days) {
    const dayOfWeek = day.date.getDay() // 0=Sun, 6=Sat
    const isPublicHol = isPublicHoliday(day.date, day.depotState)
    const isSunday = dayOfWeek === 0
    const isSaturday = dayOfWeek === 6

    // Gross worked hours (excluding unpaid breaks)
    const grossMinutes =
      (day.endTime.getTime() - day.startTime.getTime()) / 60000 - day.breakMinutes
    const grossHours = Math.max(0, grossMinutes / 60)

    // Minimum engagement applies — minimum 3 hours
    const payableHours = Math.max(grossHours, grossHours > 0 ? 3 : 0)

    const dateStr = day.date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

    if (isPublicHol) {
      // All hours at 2.5x
      const rate = roundRate(baseRate * PENALTY_RATES.overtime_public_holiday)
      lines.push({
        earningType: 'PUBLIC_HOLIDAY',
        description: `Public Holiday — ${dateStr}`,
        hours: payableHours,
        rate,
        amount: roundCurrency(payableHours * rate),
      })
      // Public holiday hours don't count toward the 38hr weekly threshold
      continue
    }

    if (isSunday) {
      // All hours at 2x (double time)
      const rate = roundRate(baseRate * PENALTY_RATES.sunday_ordinary)
      lines.push({
        earningType: 'WEEKEND_PENALTY',
        description: `Sunday — ${dateStr}`,
        hours: payableHours,
        rate,
        amount: roundCurrency(payableHours * rate),
      })
      weeklyOrdinaryHours += payableHours
      continue
    }

    if (isSaturday) {
      // Saturday ordinary time at 1.5x (per MA000038)
      const ordinarySaturdayHours = Math.min(payableHours, PENALTY_RATES.ordinary_hours_per_day)
      const overtimeSaturdayHours = Math.max(0, payableHours - ordinarySaturdayHours)

      if (ordinarySaturdayHours > 0) {
        const rate = roundRate(baseRate * PENALTY_RATES.saturday_ordinary)
        lines.push({
          earningType: 'WEEKEND_PENALTY',
          description: `Saturday — ${dateStr}`,
          hours: ordinarySaturdayHours,
          rate,
          amount: roundCurrency(ordinarySaturdayHours * rate),
        })
        weeklyOrdinaryHours += ordinarySaturdayHours
      }

      if (overtimeSaturdayHours > 0) {
        const rate = roundRate(baseRate * PENALTY_RATES.overtime_after_3_hours)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Saturday Overtime — ${dateStr}`,
          hours: overtimeSaturdayHours,
          rate,
          amount: roundCurrency(overtimeSaturdayHours * rate),
        })
        weeklyOvertimeHours += overtimeSaturdayHours
      }
      continue
    }

    // Monday–Friday
    // Daily overtime: first 7.6 hours at ordinary, then OT
    const dailyOrdinaryHours = Math.min(payableHours, PENALTY_RATES.ordinary_hours_per_day)
    const dailyOvertimeHours = Math.max(0, payableHours - PENALTY_RATES.ordinary_hours_per_day)

    // Check night shift: does the majority of work fall between 0000–0600?
    const isNightShift = isNightShiftWork(day.startTime, day.endTime)

    const ordinaryRate = isNightShift
      ? roundRate(baseRate * (1 + PENALTY_RATES.night_shift_allowance_pct))
      : baseRate

    if (dailyOrdinaryHours > 0) {
      const remainingBeforeWeeklyOT = Math.max(
        0,
        PENALTY_RATES.ordinary_hours_per_week - weeklyOrdinaryHours,
      )
      const trulyOrdinaryHours = Math.min(dailyOrdinaryHours, remainingBeforeWeeklyOT)
      const weeklyOTHours = dailyOrdinaryHours - trulyOrdinaryHours

      if (trulyOrdinaryHours > 0) {
        lines.push({
          earningType: isNightShift ? 'NIGHT_PENALTY' : 'ORDINARY',
          description: isNightShift ? `Night Shift — ${dateStr}` : `Ordinary — ${dateStr}`,
          hours: trulyOrdinaryHours,
          rate: ordinaryRate,
          amount: roundCurrency(trulyOrdinaryHours * ordinaryRate),
        })
        weeklyOrdinaryHours += trulyOrdinaryHours
      }

      if (weeklyOTHours > 0) {
        // These daily hours push us over 38 for the week
        const rate = roundRate(baseRate * PENALTY_RATES.overtime_first_3_hours)
        lines.push({
          earningType: 'OVERTIME_1_5X',
          description: `Weekly OT (1.5x) — ${dateStr}`,
          hours: weeklyOTHours,
          rate,
          amount: roundCurrency(weeklyOTHours * rate),
        })
        weeklyOvertimeHours += weeklyOTHours
      }
    }

    if (dailyOvertimeHours > 0) {
      // Daily overtime: first 3 hours at 1.5x, then 2x
      const otFirst3 = Math.min(dailyOvertimeHours, 3)
      const otAfter3 = Math.max(0, dailyOvertimeHours - 3)

      if (otFirst3 > 0) {
        const rate = roundRate(baseRate * PENALTY_RATES.overtime_first_3_hours)
        lines.push({
          earningType: 'OVERTIME_1_5X',
          description: `Overtime (1.5x) — ${dateStr}`,
          hours: otFirst3,
          rate,
          amount: roundCurrency(otFirst3 * rate),
        })
        weeklyOvertimeHours += otFirst3
      }

      if (otAfter3 > 0) {
        const rate = roundRate(baseRate * PENALTY_RATES.overtime_after_3_hours)
        lines.push({
          earningType: 'OVERTIME_2X',
          description: `Overtime (2x) — ${dateStr}`,
          hours: otAfter3,
          rate,
          amount: roundCurrency(otAfter3 * rate),
        })
        weeklyOvertimeHours += otAfter3
      }
    }
  }

  const totalGross = lines.reduce((sum, l) => sum + l.amount, 0)

  return {
    lines,
    totalOrdinaryHours: roundRate(weeklyOrdinaryHours),
    totalOvertimeHours: roundRate(weeklyOvertimeHours),
    totalGross: roundCurrency(totalGross),
  }
}

/**
 * Determine if a shift is a night shift.
 * Night shift: majority of hours (>50%) fall between midnight and 0600.
 */
function isNightShiftWork(startTime: Date, endTime: Date): boolean {
  const start = startTime.getHours() * 60 + startTime.getMinutes()
  const end = endTime.getHours() * 60 + endTime.getMinutes()
  const totalMinutes = end - start

  // Minutes in the 0000–0600 window
  const nightStart = 0
  const nightEnd = 360 // 6am

  const nightMinutes =
    Math.min(end, nightEnd) - Math.max(start, nightStart)

  return nightMinutes > totalMinutes / 2
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function roundRate(value: number): number {
  return Math.round(value * 10000) / 10000
}
