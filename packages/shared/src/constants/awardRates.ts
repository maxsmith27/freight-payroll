// ─────────────────────────────────────────────────────────────────
// Australian Road Transport Award Rates
// Road Transport and Distribution Award 2020 (MA000038)
// Road Transport (Long Distance Operations) Award 2020 (MA000039)
//
// Rates effective from 1 July 2025 (FY2025-26)
// Source: Fair Work Commission Annual Wage Review
// IMPORTANT: Update these rates each July 1 following the FWC determination.
// ─────────────────────────────────────────────────────────────────

import type { AwardCode, AwardClassificationLevel, VehicleGrade } from '../types/index.js'

export interface AwardRateEntry {
  awardCode: AwardCode
  classificationLevel: AwardClassificationLevel
  vehicleGrade?: VehicleGrade
  description: string
  weeklyRate: number // Award weekly rate in AUD
  hourlyRate: number // Derived: weeklyRate / 38
  effectiveFrom: string // ISO date
}

// MA000038 — Road Transport and Distribution Award 2020
// Grade levels correspond to vehicle type and work complexity
// Rates are approximate and must be verified against the current FWC determination
export const MA000038_RATES: AwardRateEntry[] = [
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_1',
    description: 'Grade 1 – General hand, storeperson, picker/packer',
    weeklyRate: 922.20,
    hourlyRate: 24.27,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_2',
    vehicleGrade: 'LIGHT_RIGID',
    description: 'Grade 2 – Light rigid vehicle driver (up to 8t GVM)',
    weeklyRate: 956.80,
    hourlyRate: 25.18,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_3',
    vehicleGrade: 'MEDIUM_RIGID',
    description: 'Grade 3 – Medium rigid vehicle driver (8–15t GVM)',
    weeklyRate: 992.40,
    hourlyRate: 26.12,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_4',
    vehicleGrade: 'HEAVY_RIGID',
    description: 'Grade 4 – Heavy rigid vehicle driver (over 15t GVM, 2 axles)',
    weeklyRate: 1029.60,
    hourlyRate: 27.09,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_5',
    vehicleGrade: 'ARTICULATED',
    description: 'Grade 5 – Articulated vehicle / combination driver',
    weeklyRate: 1068.40,
    hourlyRate: 28.12,
    effectiveFrom: '2025-07-01',
  },
]

// MA000039 — Road Transport (Long Distance Operations) Award 2020
// Applies to drivers engaged in long distance operations (generally >100km from depot)
export const MA000039_RATES: AwardRateEntry[] = [
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_1',
    vehicleGrade: 'MEDIUM_RIGID',
    description: 'Grade 1 – Two-axle rigid vehicle driver, long distance',
    weeklyRate: 1008.60,
    hourlyRate: 26.54,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_2',
    vehicleGrade: 'HEAVY_RIGID',
    description: 'Grade 2 – Three or more axle rigid vehicle, long distance',
    weeklyRate: 1045.80,
    hourlyRate: 27.52,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_3',
    vehicleGrade: 'ARTICULATED',
    description: 'Grade 3 – Articulated vehicle driver, long distance',
    weeklyRate: 1084.20,
    hourlyRate: 28.53,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_4',
    vehicleGrade: 'COMBINATION',
    description: 'Grade 4 – B-double / road train driver, long distance',
    weeklyRate: 1124.40,
    hourlyRate: 29.59,
    effectiveFrom: '2025-07-01',
  },
]

// ─────────────────────────────────────────────────────────────────
// Penalty rates — multipliers applied to the ordinary rate
// Per award schedule, verified against Road Transport Awards
// ─────────────────────────────────────────────────────────────────

export const PENALTY_RATES = {
  // Overtime
  overtime_first_3_hours: 1.5, // Time and a half
  overtime_after_3_hours: 2.0, // Double time
  overtime_sunday: 2.0, // Double time on Sundays
  overtime_public_holiday: 2.5, // Double time and a half on public holidays

  // Ordinary time maximums
  ordinary_hours_per_week: 38,
  ordinary_hours_per_day: 7.6, // 38/5

  // Shift penalties (MA000038/MA000039)
  saturday_ordinary: 1.5, // Time and a half for Saturday ordinary time
  sunday_ordinary: 2.0, // Double time for Sunday ordinary time
  public_holiday: 2.5, // Double time and a half

  // Night shift penalties (MA000038)
  night_shift_allowance_pct: 0.15, // 15% of ordinary rate added per hour
  // Night shift defined as: majority of hours fall between midnight and 6am
  early_morning_start_before_6am: 0.15, // 15% penalty

  // Annual leave loading
  annual_leave_loading: 0.175, // 17.5%
}

// ─────────────────────────────────────────────────────────────────
// Standard allowances (MA000038) — ATO-mapped
// Per the award Schedule B. Values are per-event unless otherwise noted.
// These are the minimum award allowances. Companies may pay more.
// ─────────────────────────────────────────────────────────────────

export const STANDARD_ALLOWANCES = {
  // Meal allowances (taxable)
  meal_allowance_per_occasion: 17.03,

  // Overnight/away from base (non-taxable up to ATO reasonable amounts)
  // ATO 2025-26 reasonable amounts: TD 2025/6 — update annually
  overnight_allowance_per_night: 131.00,

  // Dangerous goods (taxable)
  dangerous_goods_per_hour: 0.83,

  // Multi-drop (taxable) — where more than X drops
  multi_drop_per_drop: 2.89,

  // Wet weather (taxable)
  wet_weather_per_hour: 0.83,

  // Tool allowance per week (taxable)
  tool_allowance_weekly: 15.02,
}

// ─────────────────────────────────────────────────────────────────
// Minimum engagement — 3 hour minimum shift per MA000038 cl. 18
// ─────────────────────────────────────────────────────────────────
export const MINIMUM_ENGAGEMENT_HOURS = 3

// ─────────────────────────────────────────────────────────────────
// Helper: get base hourly rate for an employee
// ─────────────────────────────────────────────────────────────────
export function getAwardHourlyRate(
  awardCode: AwardCode,
  classificationLevel: AwardClassificationLevel,
): number {
  const rates = awardCode === 'MA000038' ? MA000038_RATES : MA000039_RATES
  const entry = rates.find(r => r.classificationLevel === classificationLevel)
  return entry?.hourlyRate ?? 0
}

export function getAwardWeeklyRate(
  awardCode: AwardCode,
  classificationLevel: AwardClassificationLevel,
): number {
  const rates = awardCode === 'MA000038' ? MA000038_RATES : MA000039_RATES
  const entry = rates.find(r => r.classificationLevel === classificationLevel)
  return entry?.weeklyRate ?? 0
}

export const ALL_AWARD_RATES = [...MA000038_RATES, ...MA000039_RATES]
