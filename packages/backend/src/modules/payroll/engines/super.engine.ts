// ─────────────────────────────────────────────────────────────────
// Superannuation guarantee engine
// ─────────────────────────────────────────────────────────────────

import { getSuperRate } from '@freight-payroll/shared'

export interface SuperInput {
  ordinaryTimeEarnings: number // OTE — excludes overtime-only earnings
  overtimeEarnings: number
  leavePaid: number
  payDate: Date
}

export interface SuperOutput {
  superGuarantee: number
  superRate: number
  oteBase: number
}

/**
 * Calculate superannuation guarantee.
 *
 * Ordinary Time Earnings (OTE) for super purposes includes:
 * - Ordinary time hourly earnings
 * - Over-award payments
 * - Penalty rates for ordinary hours (night shift, weekend ordinary)
 * - Leave payments (annual, personal/carer's)
 * - Allowances (most allowances)
 *
 * OTE EXCLUDES:
 * - Overtime earnings (hours beyond contracted/ordinary hours)
 * - Unused leave payouts on termination (in most cases)
 *
 * Reference: ATO — ato.gov.au/ote
 */
export function calculateSuper(input: SuperInput): SuperOutput {
  const superRate = getSuperRate(input.payDate)

  // OTE base: ordinary + leave + allowances already included in ordinaryTimeEarnings
  const oteBase = input.ordinaryTimeEarnings + input.leavePaid

  const superGuarantee = Math.round(oteBase * superRate * 100) / 100

  return { superGuarantee, superRate, oteBase }
}
