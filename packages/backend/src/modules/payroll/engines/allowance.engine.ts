// ─────────────────────────────────────────────────────────────────
// Allowance Engine
//
// Pure function: given pre-loaded allowance rates and a list of
// requested allowances for the pay period, produces AllowanceLine[].
//
// This function is intentionally database-free so it can be tested
// with mock rate data. The allowance rates are loaded by rateLoader
// and stored in AwardRateContext.allowanceRates.
//
// Allowance quantity conventions (mirrors AllowanceRateType):
//   FIXED     — quantity = number of occasions (1 per trip, 1 per coffin, etc.)
//   PER_DAY   — quantity = number of qualifying days
//   PER_HOUR  — quantity = hours worked with that condition
//   PER_KM    — quantity = kilometres driven
//   PER_WEEK  — quantity = 1 (always — one week's entitlement)
//   PER_NIGHT — quantity = number of nights away from home base
// ─────────────────────────────────────────────────────────────────

import type { AllowanceLine, LoadedAllowanceRate, RequestedAllowance } from './types.js'

function c(v: number): number { return Math.round(v * 100) / 100 }

/**
 * Calculate allowances for a pay period.
 *
 * @param requested  - List of allowances to apply with quantities.
 * @param rates      - Pre-loaded allowance rate map (keyed by allowance code).
 * @returns          - Allowance lines ready for inclusion in a pay run.
 *
 * Unknown codes are skipped silently — validation of allowed codes should
 * be done upstream at the timesheet/payroll data entry layer.
 */
export function calculateAllowances(
  requested: RequestedAllowance[],
  rates: ReadonlyMap<string, LoadedAllowanceRate>,
): AllowanceLine[] {
  const lines: AllowanceLine[] = []

  for (const req of requested) {
    if (req.quantity <= 0) continue

    const rate = rates.get(req.code)
    if (!rate) {
      // Code not found in loaded rates for this award/period — skip.
      // Callers should validate codes before submitting; this is a safety guard.
      continue
    }

    const amount = c(rate.amount * req.quantity)
    if (amount <= 0) continue

    lines.push({
      code:        rate.code,
      name:        rate.name,
      rateType:    rate.rateType,
      quantity:    req.quantity,
      unitRate:    rate.amount,
      amount,
      isTaxable:   rate.isTaxable,
      stpCategory: rate.stpCategory,
      description: req.description ?? rate.description,
    })
  }

  return lines
}

/**
 * Sum of all allowance amounts.
 * Convenience helper for payroll totalling.
 */
export function totalAllowanceAmount(lines: AllowanceLine[]): number {
  return Math.round(lines.reduce((sum, l) => sum + l.amount, 0) * 100) / 100
}

/**
 * Sum of all taxable allowance amounts (for PAYG withholding base).
 */
export function taxableAllowanceAmount(lines: AllowanceLine[]): number {
  return Math.round(
    lines.filter(l => l.isTaxable).reduce((sum, l) => sum + l.amount, 0) * 100,
  ) / 100
}
