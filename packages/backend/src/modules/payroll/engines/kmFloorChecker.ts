// ─────────────────────────────────────────────────────────────────
// Km Pay Floor Checker
//
// MA000038 and MA000039 permit km-based pay (rate per kilometre)
// as an alternative to time-based pay. However, the award imposes
// a floor: the km earnings for a period must not be less than
// what the employee would have earned at the ordinary hourly rate
// for the same hours.
//
// If km earnings fall below the floor, the employer must top up
// the difference so the employee receives at least the ordinary
// hourly rate for every hour worked.
//
// This function is pure and database-free.
//
// References:
//   MA000038 cl.16 (km pay rates and floor)
//   MA000039 cl.14 (km pay for long distance operations)
//
// ⚠ The floor check here is a simplified version applying the
//   ordinary hourly rate to total hours. Full compliance may
//   require per-trip analysis for MA000039 long-distance runs.
//   Verify against current award text before production use.
// ─────────────────────────────────────────────────────────────────

import type { KmFloorResult } from './types.js'

function c(v: number): number { return Math.round(v * 100) / 100 }

/**
 * Check whether km-based pay meets the award floor for the pay period.
 *
 * @param kmDriven             - Total kilometres driven this period.
 * @param ratePerKm            - Employee's km rate (dollars per km).
 * @param hoursWorked          - Total hours worked this period (ordinary + overtime).
 * @param awardMinHourlyRate   - The award minimum hourly rate for the employee's grade.
 *                               Use ctx.awardMinimumHourlyRate (not the loaded base rate)
 *                               so above-award employees are only topped to award minimum,
 *                               not to their personal rate.
 *
 * @returns KmFloorResult with topUpAmount = 0 if the floor was met.
 *
 * @example
 * // Employee drives 800km at $0.60/km = $480.00 km earnings
 * // Works 15 hours at award rate $27.04 = $405.60 floor
 * // $480 > $405.60 → floor met, no top-up
 *
 * @example
 * // Employee drives 600km at $0.55/km = $330.00 km earnings
 * // Works 15 hours at award rate $27.04 = $405.60 floor
 * // $330 < $405.60 → top-up required: $75.60
 */
export function checkKmFloor(
  kmDriven: number,
  ratePerKm: number,
  hoursWorked: number,
  awardMinHourlyRate: number,
): KmFloorResult {
  const kmEarnings   = c(kmDriven * ratePerKm)
  const floorAmount  = c(hoursWorked * awardMinHourlyRate)
  const metFloor     = kmEarnings >= floorAmount
  const topUpAmount  = metFloor ? 0 : c(floorAmount - kmEarnings)

  return {
    kmEarnings,
    floorAmount,
    metFloor,
    topUpAmount,
  }
}

/**
 * Build an AWARD_FLOOR_TOPUP earning line from a KmFloorResult.
 * Returns null if no top-up is required.
 *
 * The top-up line is not OTE for superannuation purposes
 * (it is a compensatory adjustment, not ordinary time earnings).
 */
export function buildKmFloorTopUpLine(
  result: KmFloorResult,
  awardMinHourlyRate: number,
): {
  earningType: 'AWARD_FLOOR_TOPUP'
  description: string
  hours: number
  rate: number
  amount: number
  isOTE: boolean
} | null {
  if (!result.topUpAmount || result.topUpAmount <= 0) return null

  return {
    earningType: 'AWARD_FLOOR_TOPUP',
    description: `Award floor top-up — km earnings ($${result.kmEarnings.toFixed(2)}) below floor ($${result.floorAmount.toFixed(2)})`,
    hours: 0,            // Not an hourly earning — the amount is the top-up delta
    rate: awardMinHourlyRate,
    amount: result.topUpAmount,
    isOTE: false,
  }
}
