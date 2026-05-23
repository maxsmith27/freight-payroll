// ─────────────────────────────────────────────────────────────────
// ATO PAYG Withholding — FY2025-26 (1 July 2025 – 30 June 2026)
//
// Source: ATO NAT 3539 — Statement of formulas for calculating
// amounts to be withheld, and NAT 1008 — Weekly tax table
//
// Tax brackets reflect the Stage 3 tax cuts (enacted 1 July 2024):
//   $0 – $18,200:         Nil
//   $18,201 – $45,000:    19c per $1 over $18,200
//   $45,001 – $135,000:   32.5c per $1 over $45,000 + $5,092
//   $135,001 – $190,000:  37c per $1 over $135,000 + $34,342
//   $190,001+:            45c per $1 over $190,000 + $54,742
//
// IMPORTANT: Update this file each 1 July using the current ATO
// Statement of Formulas (NAT 3539). Check ato.gov.au/taxtables.
// ─────────────────────────────────────────────────────────────────

import type { TaxResidencyStatus, PayFrequency } from '../types/index.js'

export const FINANCIAL_YEAR = '2025-26'
export const TAX_YEAR_START = '2025-07-01'
export const TAX_YEAR_END = '2026-06-30'

// ─────────────────────────────────────────────────────────────────
// Annual income tax brackets — resident individuals
// ─────────────────────────────────────────────────────────────────
export interface TaxBracket {
  from: number
  to: number | null // null = unlimited
  base: number // tax on lower bound
  rate: number // marginal rate above lower bound
}

export const RESIDENT_TAX_BRACKETS: TaxBracket[] = [
  { from: 0, to: 18200, base: 0, rate: 0 },
  { from: 18201, to: 45000, base: 0, rate: 0.19 },
  { from: 45001, to: 135000, base: 5092, rate: 0.325 },
  { from: 135001, to: 190000, base: 34342, rate: 0.37 },
  { from: 190001, to: null, base: 54742, rate: 0.45 },
]

// Scale 1: resident, does NOT claim the tax-free threshold (e.g. second job holders).
// No $18,200 free band, no LITO. Tax applies from $0 at 19%.
export const RESIDENT_SCALE1_TAX_BRACKETS: TaxBracket[] = [
  { from: 0, to: 45000, base: 0, rate: 0.19 },
  { from: 45001, to: 135000, base: 8550, rate: 0.325 },
  { from: 135001, to: 190000, base: 37800, rate: 0.37 },
  { from: 190001, to: null, base: 58150, rate: 0.45 },
]

export const FOREIGN_RESIDENT_TAX_BRACKETS: TaxBracket[] = [
  { from: 0, to: 135000, base: 0, rate: 0.325 },
  { from: 135001, to: 190000, base: 43875, rate: 0.37 },
  { from: 190001, to: null, base: 64225, rate: 0.45 },
]

// Working holiday makers — Subclass 417, 462
export const WHM_TAX_BRACKETS: TaxBracket[] = [
  { from: 0, to: 45000, base: 0, rate: 0.15 },
  { from: 45001, to: 135000, base: 6750, rate: 0.325 },
  { from: 135001, to: 190000, base: 36000, rate: 0.37 },
  { from: 190001, to: null, base: 56350, rate: 0.45 },
]

// ─────────────────────────────────────────────────────────────────
// Medicare levy — FY2025-26
// ─────────────────────────────────────────────────────────────────
export const MEDICARE_LEVY = {
  rate: 0.02, // 2%
  // Singles phase-in thresholds (approximate for FY26 — update from ATO)
  shadeInLower: 26000,
  shadeInUpper: 32500,
  shadeInRate: 0.10, // 10% of income in the shade-in range (not 2% flat)
}

// ─────────────────────────────────────────────────────────────────
// Low Income Tax Offset (LITO) — FY2025-26
// ─────────────────────────────────────────────────────────────────
export const LITO = {
  maxOffset: 700,
  phase1: { from: 37500, to: 45000, reductionRate: 0.05 }, // reduces by 5c per $1
  phase2: { from: 45001, to: 66667, reductionRate: 0.015 }, // reduces by 1.5c per $1
}

// ─────────────────────────────────────────────────────────────────
// Low Income Superannuation Tax Offset (LISTO)
// — paid to super funds, not relevant to PAYG withholding
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// HELP/HECS repayment thresholds — FY2025-26
// Source: ATO studyandtrainingloansthreshold
// ─────────────────────────────────────────────────────────────────
export interface HECSBracket {
  from: number
  to: number | null
  rate: number // repayment rate as decimal
}

export const HECS_REPAYMENT_BRACKETS: HECSBracket[] = [
  { from: 0, to: 54434, rate: 0 },
  { from: 54435, to: 62998, rate: 0.01 },
  { from: 62999, to: 66318, rate: 0.02 },
  { from: 66319, to: 70178, rate: 0.025 },
  { from: 70179, to: 74232, rate: 0.03 },
  { from: 74233, to: 78491, rate: 0.035 },
  { from: 78492, to: 82958, rate: 0.04 },
  { from: 82959, to: 87641, rate: 0.045 },
  { from: 87642, to: 92544, rate: 0.05 },
  { from: 92545, to: 97677, rate: 0.055 },
  { from: 97678, to: 103047, rate: 0.06 },
  { from: 103048, to: 108663, rate: 0.065 },
  { from: 108664, to: 114535, rate: 0.07 },
  { from: 114536, to: 120669, rate: 0.075 },
  { from: 120670, to: 127075, rate: 0.08 },
  { from: 127076, to: 133761, rate: 0.085 },
  { from: 133762, to: 140738, rate: 0.09 },
  { from: 140739, to: 148013, rate: 0.095 },
  { from: 148014, to: null, rate: 0.10 },
]

// ─────────────────────────────────────────────────────────────────
// Withholding when no TFN provided — 47%
// (top marginal rate + Medicare levy)
// ─────────────────────────────────────────────────────────────────
export const NO_TFN_WITHHOLDING_RATE = 0.47

// ─────────────────────────────────────────────────────────────────
// Pay frequency multipliers for annualizing earnings
// ─────────────────────────────────────────────────────────────────
export const PAY_FREQUENCY_PERIODS: Record<PayFrequency, number> = {
  WEEKLY: 52,
  FORTNIGHTLY: 26,
  MONTHLY: 12,
}

// ─────────────────────────────────────────────────────────────────
// Core tax calculation functions
// ─────────────────────────────────────────────────────────────────

export function calculateAnnualTax(
  annualIncome: number,
  residencyStatus: TaxResidencyStatus,
  claimsTaxFreeThreshold = true,
): number {
  let brackets: TaxBracket[]
  if (residencyStatus === 'FOREIGN_RESIDENT') {
    brackets = FOREIGN_RESIDENT_TAX_BRACKETS
  } else if (residencyStatus === 'WORKING_HOLIDAY_MAKER') {
    brackets = WHM_TAX_BRACKETS
  } else {
    brackets = claimsTaxFreeThreshold ? RESIDENT_TAX_BRACKETS : RESIDENT_SCALE1_TAX_BRACKETS
  }

  for (const bracket of brackets) {
    if (bracket.to === null || annualIncome <= bracket.to) {
      const taxableAboveLower = annualIncome - (bracket.from - 1)
      return bracket.base + taxableAboveLower * bracket.rate
    }
  }
  return 0
}

export function calculateLITO(annualIncome: number): number {
  if (annualIncome <= 37500) return LITO.maxOffset
  if (annualIncome <= 45000) {
    return LITO.maxOffset - (annualIncome - 37500) * LITO.phase1.reductionRate
  }
  if (annualIncome <= 66667) {
    const afterPhase1 = LITO.maxOffset - (45000 - 37500) * LITO.phase1.reductionRate
    return Math.max(0, afterPhase1 - (annualIncome - 45000) * LITO.phase2.reductionRate)
  }
  return 0
}

export function calculateMedicareLevy(
  annualIncome: number,
  residencyStatus: TaxResidencyStatus,
): number {
  if (residencyStatus === 'FOREIGN_RESIDENT') return 0
  if (annualIncome <= MEDICARE_LEVY.shadeInLower) return 0
  if (annualIncome <= MEDICARE_LEVY.shadeInUpper) {
    // Phase-in: 10% of the amount above the lower threshold
    return (annualIncome - MEDICARE_LEVY.shadeInLower) * MEDICARE_LEVY.shadeInRate
  }
  return annualIncome * MEDICARE_LEVY.rate
}

export function calculateHECSRepayment(annualIncome: number): number {
  for (const bracket of HECS_REPAYMENT_BRACKETS) {
    if (bracket.to === null || annualIncome <= bracket.to) {
      return annualIncome * bracket.rate
    }
  }
  return 0
}

/**
 * Calculate PAYG withholding for a pay period.
 * Uses the annualisation method: annualise → calculate annual tax → de-annualise.
 * Returns the withholding amount for the pay period (rounded to nearest dollar).
 */
export function calculatePAYGWithholding(params: {
  periodEarnings: number
  payFrequency: PayFrequency
  taxResidencyStatus: TaxResidencyStatus
  claimsTaxFreeThreshold: boolean
  hasHECSDebt: boolean
  hasSFSSDebt?: boolean
  hasTFN: boolean
}): {
  withholding: number
  annualTax: number
  medicareLevy: number
  litoOffset: number
  hecsRepayment: number
} {
  const {
    periodEarnings,
    payFrequency,
    taxResidencyStatus,
    claimsTaxFreeThreshold,
    hasHECSDebt,
    hasTFN,
  } = params

  // No TFN = withhold at 47%
  if (!hasTFN) {
    return {
      withholding: Math.round(periodEarnings * NO_TFN_WITHHOLDING_RATE),
      annualTax: 0,
      medicareLevy: 0,
      litoOffset: 0,
      hecsRepayment: 0,
    }
  }

  const periods = PAY_FREQUENCY_PERIODS[payFrequency]
  const annualEarnings = periodEarnings * periods

  // Scale 1 (no TFT): use different brackets — no $18,200 free band, no LITO
  // Scale 2 (claims TFT): standard brackets, then reduce by LITO
  let annualTax = calculateAnnualTax(annualEarnings, taxResidencyStatus, claimsTaxFreeThreshold)

  let litoOffset = 0
  if (taxResidencyStatus === 'RESIDENT' && claimsTaxFreeThreshold) {
    litoOffset = calculateLITO(annualEarnings)
    annualTax = Math.max(0, annualTax - litoOffset)
  }

  // Medicare levy
  const medicareLevy = calculateMedicareLevy(annualEarnings, taxResidencyStatus)

  // HECS/HELP repayment
  let hecsRepayment = 0
  if (hasHECSDebt) {
    hecsRepayment = calculateHECSRepayment(annualEarnings)
  }

  const annualWithholding = annualTax + medicareLevy + hecsRepayment
  const periodWithholding = Math.round(annualWithholding / periods)

  return {
    withholding: periodWithholding,
    annualTax,
    medicareLevy,
    litoOffset,
    hecsRepayment,
  }
}
