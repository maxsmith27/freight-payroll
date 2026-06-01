// ─────────────────────────────────────────────────────────────────
// Annualised Salary Reconciliation Tests
// MA000038 cl.17 — formal annualised salary agreement reconciliation
//
// The engine compares:
//   • totalSalaryPaid  = annualisedSalaryPerAnnum × (periodDays / 365)
//   • totalAwardEarnings = sum of all weekly award calculations
//
// Surplus ≥ 0 → compliant. Surplus < 0 → shortfall must be paid.
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { reconcileAnnualisedSalary } from '../../modules/payroll/engines/annualisedSalary.engine.js'
import type { AnnualisedSalaryInput, WeeklyAwardResult } from '../../modules/payroll/engines/types.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeWeekResult(totalGross: number): WeeklyAwardResult {
  return {
    lines:              [],
    totalOrdinaryHours: 38,
    totalOvertimeHours: 0,
    totalGross,
    totalOTE:           totalGross,
  }
}

// ─────────────────────────────────────────────────────────────────
describe('Annualised salary reconciliation — full year', () => {
  it('salary exactly equals award earnings → isCompliant, surplus = 0', () => {
    // 52 weeks × $1,027.52 (38h × $27.04) = $53,430.40
    const weeklyAward  = 38 * 27.04   // $1,027.52
    const annualAward  = Math.round(weeklyAward * 52 * 100) / 100
    const weeklyResults = Array.from({ length: 52 }, () => makeWeekResult(weeklyAward))

    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: annualAward,
      weeklyResults,
      periodDays: 365,
    })

    expect(result.isCompliant).toBe(true)
    expect(result.shortfall).toBe(0)
    expect(result.surplus).toBeGreaterThanOrEqual(0)
  })

  it('salary above award → positive surplus, isCompliant, no shortfall', () => {
    // $80,000 salary vs $53,430 award → clear surplus
    const weeklyAward   = 38 * 27.04
    const weeklyResults = Array.from({ length: 52 }, () => makeWeekResult(weeklyAward))

    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 80_000,
      weeklyResults,
      periodDays: 365,
    })

    expect(result.isCompliant).toBe(true)
    expect(result.shortfall).toBe(0)
    expect(result.surplus).toBeGreaterThan(0)
    expect(result.totalSalaryPaid).toBe(80_000)
  })

  it('salary below award → negative surplus, shortfall = difference', () => {
    // Employee works lots of OT — award entitlement is $60,000 but salary is $55,000
    const highAwardWeek = 60_000 / 52   // ~$1,153.85/week (includes OT)
    const weeklyResults  = Array.from({ length: 52 }, () => makeWeekResult(highAwardWeek))

    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 55_000,
      weeklyResults,
      periodDays: 365,
    })

    expect(result.isCompliant).toBe(false)
    expect(result.shortfall).toBeGreaterThan(0)
    expect(result.surplus).toBeLessThan(0)
    // shortfall should ≈ $5,000 (±rounding)
    expect(Math.abs(result.shortfall - 5_000)).toBeLessThanOrEqual(1)
  })

  it('totalSalaryPaid = annualisedSalaryPerAnnum when periodDays = 365', () => {
    const weekly   = Array.from({ length: 52 }, () => makeWeekResult(1000))
    const result   = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 70_000,
      weeklyResults: weekly,
      periodDays: 365,
    })
    expect(result.totalSalaryPaid).toBe(70_000)
  })

  it('totalAwardEarnings = sum of all weekly totals', () => {
    const amounts = [1000, 1200, 950, 1100]
    const weekly  = amounts.map(a => makeWeekResult(a))
    const result  = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 100_000,
      weeklyResults: weekly,
      periodDays: 365,
    })
    const expectedTotal = Math.round(amounts.reduce((s, a) => s + a, 0) * 100) / 100
    expect(result.totalAwardEarnings).toBe(expectedTotal)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('Annualised salary reconciliation — partial year', () => {
  it('prorates salary for partial period (6 months = 182 days)', () => {
    const weekly  = Array.from({ length: 26 }, () => makeWeekResult(1000))
    const result  = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 60_000,
      weeklyResults: weekly,
      periodDays: 182,
    })
    // Expected salary: $60,000 × (182 / 365) = $29,917.81
    const expected = Math.round(60_000 * (182 / 365) * 100) / 100
    expect(result.totalSalaryPaid).toBe(expected)
    expect(result.periodDays).toBe(182)
  })

  it('defaults to 365 days when periodDays is omitted', () => {
    const weekly = Array.from({ length: 52 }, () => makeWeekResult(1000))
    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 60_000,
      weeklyResults: weekly,
    })
    expect(result.periodDays).toBe(365)
    expect(result.totalSalaryPaid).toBe(60_000)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('Annualised salary reconciliation — weekly breakdown', () => {
  it('weeklyBreakdown has one entry per week', () => {
    const weekly = Array.from({ length: 4 }, () => makeWeekResult(1000))
    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 60_000,
      weeklyResults: weekly,
      periodDays: 28,
    })
    expect(result.weeklyBreakdown).toHaveLength(4)
  })

  it('each weekly entry has correct weekIndex', () => {
    const weekly = [makeWeekResult(900), makeWeekResult(1100)]
    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 50_000,
      weeklyResults: weekly,
      periodDays: 14,
    })
    expect(result.weeklyBreakdown[0].weekIndex).toBe(0)
    expect(result.weeklyBreakdown[1].weekIndex).toBe(1)
  })

  it('weekly awardEarnings matches the input weekly gross', () => {
    const weekly = [makeWeekResult(800), makeWeekResult(1200)]
    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 50_000,
      weeklyResults: weekly,
      periodDays: 14,
    })
    expect(result.weeklyBreakdown[0].awardEarnings).toBe(800)
    expect(result.weeklyBreakdown[1].awardEarnings).toBe(1200)
  })

  it('weekSurplus is salaryEquivalent minus awardEarnings', () => {
    const weekly  = [makeWeekResult(1000)]
    const result  = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 60_000,
      weeklyResults: weekly,
      periodDays: 7,
    })
    const entry = result.weeklyBreakdown[0]
    const expectedSurplus = Math.round((entry.salaryEquivalent - entry.awardEarnings) * 100) / 100
    expect(entry.weekSurplus).toBe(expectedSurplus)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('Annualised salary reconciliation — edge cases', () => {
  it('zero weeks → isCompliant, totalAwardEarnings = 0', () => {
    const result = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 80_000,
      weeklyResults: [],
      periodDays: 365,
    })
    expect(result.totalAwardEarnings).toBe(0)
    expect(result.isCompliant).toBe(true)
    expect(result.shortfall).toBe(0)
  })

  it('zero salary with non-zero award → shortfall equals award earnings', () => {
    const weeklyAward = 1027.52
    const weekly      = Array.from({ length: 52 }, () => makeWeekResult(weeklyAward))
    const result      = reconcileAnnualisedSalary({
      annualisedSalaryPerAnnum: 0,
      weeklyResults: weekly,
      periodDays: 365,
    })
    expect(result.isCompliant).toBe(false)
    expect(result.shortfall).toBeCloseTo(result.totalAwardEarnings, 1)
  })
})
