// ─────────────────────────────────────────────────────────────────
// Award engine — shared type definitions
// ─────────────────────────────────────────────────────────────────

import type {
  AwardCode,
  AwardClassificationLevel,
  AustralianState,
  EmploymentType,
  EarningType,
} from '@freight-payroll/shared'

export type { AustralianState }

// ─── Rate context ────────────────────────────────────────────────────────────
// All rates needed for a pay period, pre-loaded from the database.
// Using a context object keeps the pure calculation functions free of DB
// dependencies and makes them easy to test with mock data.

export interface AwardRateContext {
  /** Base hourly rate for the employee's award + grade, at the pay period date. */
  baseHourlyRate: number

  /** The award minimum rate (used for floor checks; may differ if employee is paid above award). */
  awardMinimumHourlyRate: number

  /** Penalty multipliers for this award, from the DB. */
  penaltyRates: {
    overtimeFirst2Hours: number  // MA000038/39 cl.32: 1.5
    overtimeAfter2Hours: number  // MA000038/39 cl.32: 2.0
    saturdayOrdinary:    number  // 1.5
    saturdayOvertime:    number  // 2.0
    sundayAll:           number  // 2.0
    publicHoliday:       number  // 2.5
    afternoonShift:      number  // +0.10 loading on ordinary rate
    nightShift:          number  // +0.15 loading on ordinary rate
    annualLeaveLoading:  number  // 0.175 (17.5%)
  }

  /** Set of date strings ('YYYY-MM-DD') that are public holidays for this employee's state. */
  publicHolidays: ReadonlySet<string>

  /** Award-specific ordinary hours per week (38 for MA000038, ~25.65 for MA000039). */
  ordinaryHoursPerWeek: number

  /** Award-specific ordinary hours per day (7.6 for MA000038). */
  ordinaryHoursPerDay: number

  /**
   * Allowance rates for this award + period, keyed by allowance code.
   * Loaded from the DB by rateLoader; passed into calculateAllowances().
   */
  allowanceRates: ReadonlyMap<string, LoadedAllowanceRate>

  /**
   * Award minimum hourly rates for every classification level of this award
   * at the pay period date. Used by the higher duties handler to look up the
   * rate for the elevated grade without an extra DB call.
   * Keyed by AwardClassificationLevel.
   */
  classificationRates: ReadonlyMap<AwardClassificationLevel, number>
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface DayInput {
  /** Calendar date of this shift. */
  date: Date

  /** Full datetime when the shift started. */
  startTime: Date

  /** Full datetime when the shift ended. */
  endTime: Date

  /** Total unpaid break time in minutes. */
  breakMinutes: number

  /** State for public holiday lookup. */
  state: AustralianState

  /** Kilometres driven this day (for km-pay employees and floor checks). */
  kmDriven?: number

  /** If the employee performed higher-grade duties, the higher grade. */
  higherDutyGrade?: AwardClassificationLevel

  /** If true, higher duty rate applies for the full day (triggered when >2hrs at higher grade). */
  isHigherDutyDay?: boolean
}

export interface EmployeeEngineInput {
  awardCode: AwardCode
  classificationLevel: AwardClassificationLevel
  employmentType: EmploymentType

  /**
   * Employee's actual pay rate (may be above award minimum).
   * All OT and penalty multipliers are applied to this rate.
   * Must have been validated ≥ award minimum before reaching the engine.
   */
  hourlyRate: number

  /**
   * Rate per km for km-paid employees.
   * If provided alongside timesheet hours, the km floor check will run.
   */
  ratePerKm?: number

  /**
   * Date of birth — used to determine if junior rate applies.
   * If not provided, adult rate assumed.
   */
  dateOfBirth?: Date

  /** Pay period start date (used for age calculation at period start). */
  periodStart: Date

  /**
   * State of employment — drives public holiday entitlements and
   * state-specific leave rules. Must be set for every employee.
   */
  state: AustralianState
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface EarningLine {
  earningType: EarningType
  description: string

  /** Hours this line covers (0 for non-hourly lines like per-km). */
  hours: number

  /** Rate per hour (or rate per unit for non-hourly). */
  rate: number

  /** hours × rate, rounded to 2 decimal places. */
  amount: number

  /**
   * True if this earning is Ordinary Time Earnings (OTE) for super purposes.
   * ATO guidance: ordinary + most allowances + penalty on ordinary time = OTE.
   * Pure overtime hours (beyond ordinary) = NOT OTE.
   */
  isOTE: boolean
}

export interface WeeklyAwardResult {
  /** All earning lines for the week, in order generated. */
  lines: EarningLine[]

  /** Total ordinary hours (for super OTE calculation and record-keeping). */
  totalOrdinaryHours: number

  /** Total overtime hours (for record-keeping). */
  totalOvertimeHours: number

  /** Sum of all line amounts. */
  totalGross: number

  /** Sum of OTE amounts (for super calculation). */
  totalOTE: number
}

export interface KmFloorResult {
  /** The km-based earnings before any top-up. */
  kmEarnings: number

  /** The award floor amount (hours × effective base rate). */
  floorAmount: number

  /** True if km earnings met or exceeded the floor. */
  metFloor: boolean

  /** Top-up required (0 if floor was met). */
  topUpAmount: number
}

// ─── Allowance types ──────────────────────────────────────────────────────────

/**
 * An allowance rate record pre-loaded from the DB by rateLoader.
 * Mirrors the DB `award_allowance_rates` table (with Decimal → number).
 */
export interface LoadedAllowanceRate {
  code: string
  name: string
  /** Mirrors AllowanceRateType enum from Prisma. */
  rateType: 'FIXED' | 'PER_KM' | 'PER_DAY' | 'PER_HOUR' | 'PER_WEEK' | 'PER_NIGHT'
  /** Rate per unit (dollars). */
  amount: number
  isTaxable: boolean
  stpCategory: string | null
  description: string
}

/**
 * An allowance requested for this pay period.
 * Quantity meaning depends on rateType:
 *   FIXED     → number of occasions (usually 1)
 *   PER_DAY   → number of days the allowance applies
 *   PER_HOUR  → total hours worked (engine multiplies)
 *   PER_KM    → kilometres driven
 *   PER_WEEK  → always 1 (one week)
 *   PER_NIGHT → nights away from home base
 */
export interface RequestedAllowance {
  code: string
  quantity: number
  /** Optional description override for the earning line. */
  description?: string
}

// ─── Annualised salary reconciliation ────────────────────────────────────────

/**
 * Input for an annualised salary reconciliation.
 * Used when an employee is on a formal annualised salary agreement (ASA)
 * under MA000038 cl.17 or MA000039 equivalent.
 */
export interface AnnualisedSalaryInput {
  /** The agreed annual salary (gross, before tax). */
  annualisedSalaryPerAnnum: number

  /** Pre-computed award earnings for each week in the reconciliation period. */
  weeklyResults: WeeklyAwardResult[]

  /**
   * Number of calendar days in the reconciliation period.
   * Used to prorate the annual salary: proratedSalary = salary × (days / 365).
   * Defaults to 365 if not provided (full year).
   */
  periodDays?: number
}

export interface AnnualisedSalaryReconciliation {
  /** Calendar days covered by this reconciliation. */
  periodDays: number

  /** Total of what the award would have paid across all weeks. */
  totalAwardEarnings: number

  /** Prorated salary paid for this period. */
  totalSalaryPaid: number

  /**
   * Amount the annualised salary exceeded award earnings (positive = compliant surplus).
   * Negative means a shortfall (non-compliant).
   */
  surplus: number

  /** Shortfall the employer must top up (0 if compliant). */
  shortfall: number

  /** True if annualised salary covered all award entitlements. */
  isCompliant: boolean

  /** Per-week breakdown for audit trail. */
  weeklyBreakdown: Array<{
    weekIndex: number
    awardEarnings: number
    salaryEquivalent: number
    weekSurplus: number
  }>
}

// ─── Casual conversion monitor ────────────────────────────────────────────────

export interface CasualShiftRecord {
  /** Date of the shift. */
  date: Date
  /** Hours worked (net of breaks). */
  hoursWorked: number
}

/**
 * Result of assessing a casual employee's conversion eligibility.
 * MA000038 cl.10.3 / NES casual conversion provisions.
 */
export interface CasualConversionAssessment {
  /** True if the employee has worked ≥ 12 months and meets the regular/systematic test. */
  isEligible: boolean

  /** Months since the first shift in the provided history. */
  monthsEmployed: number

  /**
   * Regularity score 0–100.
   * 100 = perfectly consistent same days every week.
   * Below 50 = irregular pattern, conversion less likely to be required.
   */
  regularityScore: number

  /** Median days worked per week over the assessment period. */
  typicalDaysPerWeek: number

  /** Median hours worked per week over the assessment period. */
  typicalHoursPerWeek: number

  /**
   * Whether the employer is required to proactively offer conversion.
   * True when isEligible AND regularity indicates regular/systematic engagement.
   */
  shouldOfferConversion: boolean

  /**
   * Human-readable summary of the assessment result.
   */
  summary: string
}

export interface AllowanceLine {
  code: string
  name: string
  /** Mirrors AllowanceRateType enum. */
  rateType: string
  /** Units applied (days, hours, km, nights, or occasions). */
  quantity: number
  /** Rate per unit (dollars). */
  unitRate: number
  /** quantity × unitRate, rounded to 2 decimal places. */
  amount: number
  isTaxable: boolean
  stpCategory: string | null
  description: string
}

// ─── Orchestrator result ───────────────────────────────────────────────────────

/**
 * Complete result from processing one employee's pay week.
 * Contains earnings, allowances, km floor check result, and the loaded context
 * (kept for audit trail and display purposes).
 */
export interface EmployeePayWeekResult {
  earnings: WeeklyAwardResult
  allowances: AllowanceLine[]
  /** null if employee is not km-paid or no km driven. */
  kmFloor: KmFloorResult | null
  /** The rate context used — kept for audit trail. */
  context: AwardRateContext
}
