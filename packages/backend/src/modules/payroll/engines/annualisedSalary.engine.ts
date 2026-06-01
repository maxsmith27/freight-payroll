// ─────────────────────────────────────────────────────────────────
// Annualised Salary Reconciliation Engine
//
// Implements the annual reconciliation required under MA000038 cl.17
// (and equivalent MA000039 provisions) when an employee is on a
// formal Annualised Salary Agreement (ASA).
//
// Under an ASA, an employer must:
//   1. Agree in writing on an annualised salary that will compensate
//      for expected ordinary and overtime hours, penalty rates, and
//      allowances.
//   2. Track actual hours worked throughout the year.
//   3. Reconcile at the end of each 12-month period: if the annualised
//      salary paid is LESS than what the award would have paid for
//      actual hours worked, the employer must pay the shortfall.
//
// This engine performs the reconciliation calculation. It does NOT
// validate the ASA agreement itself — that is a compliance concern
// handled elsewhere.
//
// Usage:
//   const result = reconcileAnnualisedSalary({
//     annualisedSalaryPerAnnum: 85000,
//     weeklyResults: [...],    // from processMA000038Week per week
//     periodDays: 365,         // days in the reconciliation period
//   })
// ─────────────────────────────────────────────────────────────────

import type {
  AnnualisedSalaryInput,
  AnnualisedSalaryReconciliation,
} from './types.js'

/** Round to 2 decimal places. */
function c(v: number): number { return Math.round(v * 100) / 100 }

/**
 * Reconcile an annualised salary against actual award entitlements.
 *
 * @param input.annualisedSalaryPerAnnum - The agreed annual salary
 * @param input.weeklyResults            - Award-calculated earnings for each week
 * @param input.periodDays               - Calendar days in this reconciliation period
 *                                         (defaults to 365 for a full year)
 *
 * @returns Reconciliation result with shortfall amount and per-week breakdown.
 */
export function reconcileAnnualisedSalary(
  input: AnnualisedSalaryInput,
): AnnualisedSalaryReconciliation {
  const { annualisedSalaryPerAnnum, weeklyResults, periodDays = 365 } = input

  const weekCount = weeklyResults.length

  // Prorated salary for this period: salary × (days in period / 365)
  // Rounded to cents.
  const totalSalaryPaid = c(annualisedSalaryPerAnnum * (periodDays / 365))

  // Total of what the award would have paid across all weeks
  const totalAwardEarnings = c(
    weeklyResults.reduce((sum, w) => sum + w.totalGross, 0),
  )

  // Surplus = salary paid minus award earnings (positive = employer is paying more)
  const surplus = c(totalSalaryPaid - totalAwardEarnings)

  // Shortfall = what the employer owes on top (zero if compliant)
  const shortfall = c(Math.max(0, -surplus))

  const isCompliant = surplus >= 0

  // ── Per-week breakdown for audit trail ───────────────────────────────────────
  // Each week is allocated an equal share of the prorated salary.
  // This is a simplification — in practice, some ASAs allocate salary
  // differently (e.g., daily proration). Equal weekly allocation is the
  // most common approach and is suitable for payroll audit purposes.
  const salaryPerWeek = weekCount > 0 ? c(totalSalaryPaid / weekCount) : 0

  const weeklyBreakdown = weeklyResults.map((w, i) => ({
    weekIndex:        i,
    awardEarnings:    w.totalGross,
    salaryEquivalent: salaryPerWeek,
    weekSurplus:      c(salaryPerWeek - w.totalGross),
  }))

  return {
    periodDays,
    totalAwardEarnings,
    totalSalaryPaid,
    surplus,
    shortfall,
    isCompliant,
    weeklyBreakdown,
  }
}
