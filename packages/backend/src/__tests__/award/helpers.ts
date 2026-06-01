// ─────────────────────────────────────────────────────────────────
// Test helpers — build mock AwardRateContext and DayInput objects
// without touching the database.
// ─────────────────────────────────────────────────────────────────

import {
  MA000038_PENALTY_RATES,
  MA000039_PENALTY_RATES,
  ORDINARY_HOURS_PER_WEEK,
  ORDINARY_HOURS_PER_DAY,
  MA000039_ORDINARY_HOURS_PER_WEEK,
} from '@freight-payroll/shared'
import type { AwardRateContext, DayInput, EmployeeEngineInput } from '../../modules/payroll/engines/types.js'

// ─── Mock context builders ──────────────────────────────────────────────────

// MA000038 classification rates (FWO pay guide, effective 1 Jul 2025)
export const MA000038_CLASSIFICATION_RATES = new Map<string, number>([
  ['GRADE_1',  25.65],
  ['GRADE_2',  26.27],
  ['GRADE_3',  26.57],
  ['GRADE_4',  27.04],
  ['GRADE_5',  27.37],
  ['GRADE_6',  27.68],
  ['GRADE_7',  28.09],
  ['GRADE_8',  28.90],
  ['GRADE_9',  29.39],
  ['GRADE_10', 30.12],
])

// MA000039 classification rates (FWO pay guide, effective 10 Oct 2025)
export const MA000039_CLASSIFICATION_RATES = new Map<string, number>([
  ['GRADE_3',  39.37],
  ['GRADE_4',  40.07],
  ['GRADE_5',  40.57],
  ['GRADE_6',  41.03],
  ['GRADE_7',  41.62],
  ['GRADE_8',  42.83],
  ['GRADE_9',  43.55],
  ['GRADE_10', 44.63],
])

export function makeMa000038Context(overrides?: Partial<AwardRateContext>): AwardRateContext {
  return {
    baseHourlyRate:         27.04,   // MA000038 Grade 4
    awardMinimumHourlyRate: 27.04,
    penaltyRates:           { ...MA000038_PENALTY_RATES },
    publicHolidays:         new Set<string>(),
    ordinaryHoursPerWeek:   ORDINARY_HOURS_PER_WEEK,
    ordinaryHoursPerDay:    ORDINARY_HOURS_PER_DAY,
    allowanceRates:         new Map(),
    classificationRates:    MA000038_CLASSIFICATION_RATES,
    ...overrides,
  }
}

export function makeMa000039Context(overrides?: Partial<AwardRateContext>): AwardRateContext {
  return {
    baseHourlyRate:         40.07,   // MA000039 Grade 4
    awardMinimumHourlyRate: 40.07,
    penaltyRates:           { ...MA000039_PENALTY_RATES },
    publicHolidays:         new Set<string>(),
    ordinaryHoursPerWeek:   MA000039_ORDINARY_HOURS_PER_WEEK,
    ordinaryHoursPerDay:    MA000039_ORDINARY_HOURS_PER_WEEK / 5,
    allowanceRates:         new Map(),
    classificationRates:    MA000039_CLASSIFICATION_RATES,
    ...overrides,
  }
}

// ─── Day builder ────────────────────────────────────────────────────────────

/**
 * Build a DayInput from a date string and shift times.
 *
 * @param dateStr   'YYYY-MM-DD'
 * @param startHour  hour (0–23) in local time
 * @param endHour    hour after startHour (if < startHour, spans midnight)
 * @param breakMins  unpaid break minutes (default 30)
 * @param kmDriven   optional km for km floor tests
 */
export function makeDay(
  dateStr: string,
  startHour: number,
  endHour: number,
  breakMins = 30,
  kmDriven?: number,
): DayInput {
  const date      = new Date(`${dateStr}T00:00:00`)
  const startTime = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00`)
  // endTime: if endHour < startHour treat as next day
  const endDateStr = endHour < startHour
    ? new Date(date.getTime() + 86400000).toISOString().split('T')[0]
    : dateStr
  const endTime   = new Date(`${endDateStr}T${String(endHour).padStart(2, '0')}:00:00`)

  return { date, startTime, endTime, breakMinutes: breakMins, state: 'NSW', kmDriven }
}

// ─── Employee input builder ─────────────────────────────────────────────────

export function makeEmployee(overrides?: Partial<EmployeeEngineInput>): EmployeeEngineInput {
  return {
    awardCode:           'MA000038',
    classificationLevel: 'GRADE_4',
    employmentType:      'FULL_TIME',
    hourlyRate:          27.04,
    periodStart:         new Date('2025-07-07'),
    state:               'NSW',
    ...overrides,
  }
}

// ─── Rounding helpers ──────────────────────────────────────────────────────

export function round2(n: number): number { return Math.round(n * 100) / 100 }
export function round4(n: number): number { return Math.round(n * 10000) / 10000 }

/**
 * Build a DayInput where exactly `exactHours` are worked (no break, no minimum).
 * Uses millisecond-precision Date arithmetic to avoid integer-minute truncation errors.
 * Use this when you need hours to sum precisely (e.g., MA000039 weekly rate tests).
 */
export function makeExactDay(dateStr: string, startHour: number, exactHours: number): DayInput {
  const date      = new Date(`${dateStr}T00:00:00`)
  const startTime = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:00:00`)
  const endTime   = new Date(startTime.getTime() + Math.round(exactHours * 3600000))
  return { date, startTime, endTime, breakMinutes: 0, state: 'NSW', kmDriven: undefined }
}
