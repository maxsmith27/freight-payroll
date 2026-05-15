// ─────────────────────────────────────────────────────────────────
// PAYG withholding engine
// Wraps the shared tax calculation functions with DB-level concerns
// (TFN presence, employee tax settings).
// ─────────────────────────────────────────────────────────────────

import { calculatePAYGWithholding } from '@freight-payroll/shared'
import type { TaxResidencyStatus, PayFrequency } from '@freight-payroll/shared'

export interface TaxInput {
  periodGrossEarnings: number
  preTaxDeductions: number
  payFrequency: PayFrequency
  taxResidencyStatus: TaxResidencyStatus
  claimsTaxFreeThreshold: boolean
  hasHECSDebt: boolean
  hasSFSSDebt: boolean
  hasTFN: boolean
}

export interface TaxOutput {
  taxableIncome: number
  paygWithholding: number
  medicareLevy: number
  hecsRepayment: number
}

export function calculateTax(input: TaxInput): TaxOutput {
  const taxableIncome = Math.max(0, input.periodGrossEarnings - input.preTaxDeductions)

  const result = calculatePAYGWithholding({
    periodEarnings: taxableIncome,
    payFrequency: input.payFrequency,
    taxResidencyStatus: input.taxResidencyStatus,
    claimsTaxFreeThreshold: input.claimsTaxFreeThreshold,
    hasHECSDebt: input.hasHECSDebt,
    hasTFN: input.hasTFN,
  })

  return {
    taxableIncome,
    paygWithholding: result.withholding,
    medicareLevy: 0, // Medicare levy included in the withholding total (ATO handles it)
    hecsRepayment: result.hecsRepayment,
  }
}
