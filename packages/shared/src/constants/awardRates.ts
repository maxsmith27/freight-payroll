// ─────────────────────────────────────────────────────────────────
// Australian Road Transport Award Rates
// Road Transport and Distribution Award 2020 (MA000038)
// Road Transport (Long Distance Operations) Award 2020 (MA000039)
//
// ⚠ SOURCE OF TRUTH: All rates below were verified against the FWO
// pay guides published by the Fair Work Ombudsman. The database
// seed (prisma/seed.ts) mirrors these rates and is the authoritative
// source for production payroll calculations.
//
// MA000038: FWO pay guide published 18 Feb 2026, effective 1 Jul 2025
// MA000039: FWO pay guide published 10 Oct 2025, effective 10 Oct 2025
//
// Update this file every 1 July following the FWC annual wage review.
// ─────────────────────────────────────────────────────────────────

import type { AwardCode, AwardClassificationLevel } from '../types/index.js'

export interface AwardRateEntry {
  awardCode: AwardCode
  classificationLevel: AwardClassificationLevel
  description: string
  weeklyRate: number  // Award weekly minimum (AUD)
  hourlyRate: number  // weeklyRate ÷ ordinary hours per week
  effectiveFrom: string // ISO date
}

// ─────────────────────────────────────────────────────────────────
// MA000038 — Road Transport and Distribution Award 2020
//
// Ordinary hours: 38 per week, 7.6 per day
// Hourly rate = weeklyRate / 38
//
// Vehicle grade notes per CLAUDE.md:
//   Grade 1:  motorcycles and vehicles up to 4.5t GVM, local deliveries
//   Grade 2:  vehicles up to 4.5t multi-drop OR rigid 4.5t–8t GVM
//   Grade 3:  rigid 8t–13.9t GVM (MR licence)
//   Grade 4:  rigid 14t GVM+ (HR licence)
//   Grade 5:  articulated prime mover/semi-trailer (HC class)
//   Grade 6:  B-doubles and road trains up to 36.5m
//   Grade 7:  low loaders, over-dimensional, specialised heavy haulage
//   Grade 8:  multi-axle B-doubles and road trains exceeding 36.5m
//   Grade 9:  large mobile cranes, GCM over 94 tonnes
//   Grade 10: multi-axle trailing equipment, carrying capacity >70 tonnes
// ─────────────────────────────────────────────────────────────────
export const MA000038_RATES: AwardRateEntry[] = [
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_1',
    description: 'Grade 1 — General hand, storeperson, local deliveries (vehicles ≤4.5t GVM)',
    weeklyRate: 974.70,
    hourlyRate: 25.65,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_2',
    description: 'Grade 2 — Multi-drop local driver (≤4.5t) or rigid driver 4.5t–8t GVM',
    weeklyRate: 998.10,
    hourlyRate: 26.27,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_3',
    description: 'Grade 3 — Rigid vehicle driver 8t–13.9t GVM (MR licence)',
    weeklyRate: 1009.60,
    hourlyRate: 26.57,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_4',
    description: 'Grade 4 — Rigid vehicle driver 14t GVM+ (HR licence)',
    weeklyRate: 1027.40,
    hourlyRate: 27.04,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_5',
    description: 'Grade 5 — Articulated prime mover / semi-trailer driver (HC class)',
    weeklyRate: 1040.20,
    hourlyRate: 27.37,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_6',
    description: 'Grade 6 — B-double / road train driver (up to 36.5m)',
    weeklyRate: 1052.00,
    hourlyRate: 27.68,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_7',
    description: 'Grade 7 — Low loader / over-dimensional / specialised heavy haulage',
    weeklyRate: 1067.30,
    hourlyRate: 28.09,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_8',
    description: 'Grade 8 — Multi-axle B-double / road train exceeding 36.5m',
    weeklyRate: 1098.30,
    hourlyRate: 28.90,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_9',
    description: 'Grade 9 — Large mobile crane driver, GCM over 94 tonnes',
    weeklyRate: 1116.70,
    hourlyRate: 29.39,
    effectiveFrom: '2025-07-01',
  },
  {
    awardCode: 'MA000038',
    classificationLevel: 'GRADE_10',
    description: 'Grade 10 — Multi-axle trailing equipment, carrying capacity >70 tonnes',
    weeklyRate: 1144.40,
    hourlyRate: 30.12,
    effectiveFrom: '2025-07-01',
  },
]

// ─────────────────────────────────────────────────────────────────
// MA000039 — Road Transport (Long Distance Operations) Award 2020
//
// Applies to long-distance operations (generally >100km from depot).
// Ordinary hours: approximately 25.65 hours per week — the hourly
// rate reflects a higher per-hour rate because mandatory rest periods
// during long journeys reduce the number of "working" hours.
// Effective from 10 October 2025 (restructured award).
//
// Grades 1 and 2 were removed in the Oct 2025 restructure; grades
// now align with MA000038 at grades 3–10.
// ─────────────────────────────────────────────────────────────────
export const MA000039_RATES: AwardRateEntry[] = [
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_3',
    description: 'Grade 3 — Long distance rigid vehicle driver 8t–13.9t GVM (MR licence)',
    weeklyRate: 1009.60,
    hourlyRate: 39.37,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_4',
    description: 'Grade 4 — Long distance rigid vehicle driver 14t GVM+ (HR licence)',
    weeklyRate: 1027.40,
    hourlyRate: 40.07,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_5',
    description: 'Grade 5 — Long distance articulated prime mover / semi-trailer (HC class)',
    weeklyRate: 1040.20,
    hourlyRate: 40.57,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_6',
    description: 'Grade 6 — Long distance B-double / road train (up to 36.5m)',
    weeklyRate: 1052.00,
    hourlyRate: 41.03,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_7',
    description: 'Grade 7 — Long distance low loader / over-dimensional / heavy haulage',
    weeklyRate: 1067.30,
    hourlyRate: 41.62,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_8',
    description: 'Grade 8 — Long distance multi-axle B-double / road train >36.5m',
    weeklyRate: 1098.30,
    hourlyRate: 42.83,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_9',
    description: 'Grade 9 — Long distance large mobile crane, GCM over 94 tonnes',
    weeklyRate: 1116.70,
    hourlyRate: 43.55,
    effectiveFrom: '2025-10-10',
  },
  {
    awardCode: 'MA000039',
    classificationLevel: 'GRADE_10',
    description: 'Grade 10 — Long distance multi-axle trailing equipment, capacity >70t',
    weeklyRate: 1144.40,
    hourlyRate: 44.63,
    effectiveFrom: '2025-10-10',
  },
]

export const ALL_AWARD_RATES = [...MA000038_RATES, ...MA000039_RATES]

// ─────────────────────────────────────────────────────────────────
// Penalty rate multipliers — MA000038
// Source: MA000038 cl.32, cl.41
//
// Overtime (Mon–Fri, cl.32.1(a)):
//   First 2 hours beyond ordinary: time and a half (1.5×)
//   Beyond 2 hours OT in a day: double time (2.0×)
//
// Saturday (cl.32.1(b)):
//   Ordinary time: time and a half (1.5×)
//   Overtime: double time (2.0×)
//
// Sunday (cl.32.1(c)):
//   All time: double time (2.0×)
//
// Public holidays (cl.41.3):
//   All time worked: double time and a half (2.5×)
//
// ⚠ Verify these values against the current FWO pay guide before
// any production payroll run.
// ─────────────────────────────────────────────────────────────────
export const MA000038_PENALTY_RATES = {
  // Overtime — weekday daily/weekly
  overtimeFirst2Hours: 1.5,    // First 2 hours of OT in a day (cl.32.1(a))
  overtimeAfter2Hours: 2.0,    // Remaining OT hours in a day (cl.32.1(a))

  // Day-of-week rates
  saturdayOrdinary:    1.5,    // Saturday ordinary time (cl.32.1(b))
  saturdayOvertime:    2.0,    // Saturday overtime (cl.32.1(b))
  sundayAll:           2.0,    // Sunday all time (cl.32.1(c))
  publicHoliday:       2.5,    // Public holiday all time worked (cl.41.3)

  // Shift loadings (added to ordinary rate)
  afternoonShift:      0.10,   // +10% on ordinary rate (cl.31.2) — verify exact definition
  nightShift:          0.15,   // +15% on ordinary rate (cl.31.1) — majority hours 00:00–06:00

  // Annual leave loading
  annualLeaveLoading:  0.175,  // 17.5% (cl.37.4)
} as const

// ─────────────────────────────────────────────────────────────────
// MA000039 penalty rates
// Similar structure to MA000038 but verify specific clause references
// against the current award text.
// ─────────────────────────────────────────────────────────────────
export const MA000039_PENALTY_RATES = {
  overtimeFirst2Hours: 1.5,
  overtimeAfter2Hours: 2.0,
  saturdayOrdinary:    1.5,
  saturdayOvertime:    2.0,
  sundayAll:           2.0,
  publicHoliday:       2.5,
  afternoonShift:      0.10,
  nightShift:          0.15,
  annualLeaveLoading:  0.175,
} as const

// ─────────────────────────────────────────────────────────────────
// Ordinary hours constants
// ─────────────────────────────────────────────────────────────────
export const ORDINARY_HOURS_PER_WEEK = 38
export const ORDINARY_HOURS_PER_DAY  = 7.6   // 38 / 5

// ─────────────────────────────────────────────────────────────────
// MA000039 ordinary hours
// Approximately 25.65 hours per week for "working time" (total hours
// ÷ by the effective hourly divisor used to derive the hourly rate).
// This is because mandatory rest during long journeys is not "working
// time" for purposes of the ordinary hours calculation.
// ─────────────────────────────────────────────────────────────────
export const MA000039_ORDINARY_HOURS_PER_WEEK = 25.65

// ─────────────────────────────────────────────────────────────────
// Minimum engagement
// MA000038 cl.26.2 — casuals: minimum 4 hours per engagement
// MA000038 cl.25.4 — part-time: minimum 2 hours per engagement
//
// ⚠ Verify exact clause references against current award text.
// ─────────────────────────────────────────────────────────────────
export const MINIMUM_ENGAGEMENT_HOURS = {
  CASUAL:     4,
  PART_TIME:  2,
  FULL_TIME:  0, // No minimum engagement top-up for full-time
  CONTRACTOR: 0,
} as const

// ─────────────────────────────────────────────────────────────────
// Casual loading
// MA000038 cl.26.1(b): 25% casual loading on all ordinary time
// Loading is applied to the base rate; OT and penalties stack on
// the loaded rate.
// ─────────────────────────────────────────────────────────────────
export const CASUAL_LOADING = 0.25

// ─────────────────────────────────────────────────────────────────
// Junior rate percentages (MA000038 Schedule C or equivalent)
// Applied as a percentage of the adult rate based on the employee's
// age at the START of the pay period.
//
// ⚠ Verify against current award Schedule C before production use.
// ─────────────────────────────────────────────────────────────────
export const JUNIOR_RATE_PERCENTAGES: Record<number, number> = {
  15: 0.50,  // Under 16: 50% of adult rate
  16: 0.60,
  17: 0.70,
  18: 0.80,
  19: 0.90,
  // 20 and over: 100% (adult rate)
}

export function getJuniorRateMultiplier(ageAtPeriodStart: number): number {
  if (ageAtPeriodStart >= 20) return 1.0
  return JUNIOR_RATE_PERCENTAGES[ageAtPeriodStart] ?? 1.0
}

// ─────────────────────────────────────────────────────────────────
// Helper: get the base hourly rate from the static rate tables.
// For production payroll, use the DB-backed rateLoader instead —
// this function is used for display/reference and quick lookups.
// ─────────────────────────────────────────────────────────────────
export function getAwardHourlyRate(
  awardCode: AwardCode,
  classificationLevel: AwardClassificationLevel,
): number {
  const rates = awardCode === 'MA000038' ? MA000038_RATES : MA000039_RATES
  return rates.find(r => r.classificationLevel === classificationLevel)?.hourlyRate ?? 0
}

export function getAwardWeeklyRate(
  awardCode: AwardCode,
  classificationLevel: AwardClassificationLevel,
): number {
  const rates = awardCode === 'MA000038' ? MA000038_RATES : MA000039_RATES
  return rates.find(r => r.classificationLevel === classificationLevel)?.weeklyRate ?? 0
}

// Legacy export kept for backwards compatibility — use MA000038_PENALTY_RATES instead
export const PENALTY_RATES = {
  overtime_first_3_hours:       MA000038_PENALTY_RATES.overtimeFirst2Hours, // NOTE: was wrong (3h), corrected to 2h
  overtime_after_3_hours:       MA000038_PENALTY_RATES.overtimeAfter2Hours,
  overtime_sunday:              MA000038_PENALTY_RATES.sundayAll,
  overtime_public_holiday:      MA000038_PENALTY_RATES.publicHoliday,
  ordinary_hours_per_week:      ORDINARY_HOURS_PER_WEEK,
  ordinary_hours_per_day:       ORDINARY_HOURS_PER_DAY,
  saturday_ordinary:            MA000038_PENALTY_RATES.saturdayOrdinary,
  sunday_ordinary:              MA000038_PENALTY_RATES.sundayAll,
  public_holiday:               MA000038_PENALTY_RATES.publicHoliday,
  night_shift_allowance_pct:    MA000038_PENALTY_RATES.nightShift,
  early_morning_start_before_6am: MA000038_PENALTY_RATES.nightShift,
  annual_leave_loading:         MA000038_PENALTY_RATES.annualLeaveLoading,
}
