// ─────────────────────────────────────────────────────────────────
// Allowance Engine Tests
// Validates calculateAllowances() against seeded allowance data
// (amounts from prisma/seed.ts — verified against FWO pay guides).
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { calculateAllowances, totalAllowanceAmount, taxableAllowanceAmount } from '../../modules/payroll/engines/allowance.engine.js'
import type { LoadedAllowanceRate, RequestedAllowance } from '../../modules/payroll/engines/types.js'

// ─── Mock allowance rate catalogue ─────────────────────────────────────────

const RATES: ReadonlyMap<string, LoadedAllowanceRate> = new Map([
  ['MA38_MEAL_OVERTIME', {
    code: 'MA38_MEAL_OVERTIME', name: 'Meal Allowance (Overtime)',
    rateType: 'FIXED', amount: 20.32, isTaxable: false, stpCategory: 'AD',
    description: 'Meal allowance when required to work overtime',
  }],
  ['MA38_TRAVELLING', {
    code: 'MA38_TRAVELLING', name: 'Travelling Allowance',
    rateType: 'PER_DAY', amount: 40.08, isTaxable: false, stpCategory: 'AD',
    description: 'Minimum travelling allowance per day away from home base',
  }],
  ['MA38_DANGEROUS_BULK', {
    code: 'MA38_DANGEROUS_BULK', name: 'Dangerous Goods — Bulk',
    rateType: 'PER_DAY', amount: 23.93, isTaxable: true, stpCategory: 'AD',
    description: 'Carrying dangerous goods in bulk',
  }],
  ['MA38_DIRTY_MATERIAL', {
    code: 'MA38_DIRTY_MATERIAL', name: 'Dirty Material Allowance',
    rateType: 'PER_HOUR', amount: 0.61, isTaxable: true, stpCategory: 'AD',
    description: 'When working with dirty or offensive material',
  }],
  ['MA38_LEADING_3_10', {
    code: 'MA38_LEADING_3_10', name: 'Leading Hand (3–10 employees)',
    rateType: 'PER_WEEK', amount: 47.65, isTaxable: true, stpCategory: 'AD',
    description: 'In charge of 3 to 10 employees',
  }],
  ['MA39_TRAVELLING', {
    code: 'MA39_TRAVELLING', name: 'Travelling Allowance',
    rateType: 'FIXED', amount: 56.28, isTaxable: false, stpCategory: 'AD',
    description: 'Per occasion away from home base',
  }],
  ['MA38_FIRST_AID', {
    code: 'MA38_FIRST_AID', name: 'First Aid Allowance',
    rateType: 'PER_WEEK', amount: 16.15, isTaxable: true, stpCategory: 'AD',
    description: 'First aid qualification holder',
  }],
  ['MA38_VEHICLE_OVERSIZE', {
    code: 'MA38_VEHICLE_OVERSIZE', name: 'Vehicle Allowance — Oversize/Crane',
    rateType: 'PER_DAY', amount: 4.64, isTaxable: true, stpCategory: 'AD',
    description: 'Low loader, oversize, crane or side lifter vehicles',
  }],
])

// ─────────────────────────────────────────────────────────────────
describe('calculateAllowances — basic calculations', () => {
  it('FIXED allowance: 1 occasion = face value', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_MEAL_OVERTIME', quantity: 1 }]
    const lines = calculateAllowances(requested, RATES)

    expect(lines).toHaveLength(1)
    expect(lines[0].amount).toBe(20.32)
    expect(lines[0].quantity).toBe(1)
    expect(lines[0].unitRate).toBe(20.32)
  })

  it('FIXED allowance: 3 occasions = 3× face value', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_MEAL_OVERTIME', quantity: 3 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].amount).toBe(Math.round(20.32 * 3 * 100) / 100)  // $60.96
  })

  it('PER_DAY allowance: 5 days away from home base', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_TRAVELLING', quantity: 5 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].amount).toBe(Math.round(40.08 * 5 * 100) / 100)  // $200.40
  })

  it('PER_HOUR allowance: 38 hours with dirty material', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_DIRTY_MATERIAL', quantity: 38 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].amount).toBe(Math.round(0.61 * 38 * 100) / 100)  // $23.18
  })

  it('PER_WEEK allowance: quantity 1 = one week rate', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_LEADING_3_10', quantity: 1 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].amount).toBe(47.65)
  })

  it('MA000039 FIXED travelling allowance: correct amount', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA39_TRAVELLING', quantity: 1 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].amount).toBe(56.28)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('calculateAllowances — taxability flags', () => {
  it('meal allowance is non-taxable', () => {
    const lines = calculateAllowances([{ code: 'MA38_MEAL_OVERTIME', quantity: 1 }], RATES)
    expect(lines[0].isTaxable).toBe(false)
  })

  it('travelling allowance is non-taxable', () => {
    const lines = calculateAllowances([{ code: 'MA38_TRAVELLING', quantity: 3 }], RATES)
    expect(lines[0].isTaxable).toBe(false)
  })

  it('dangerous goods allowance is taxable', () => {
    const lines = calculateAllowances([{ code: 'MA38_DANGEROUS_BULK', quantity: 2 }], RATES)
    expect(lines[0].isTaxable).toBe(true)
  })

  it('leading hand allowance is taxable', () => {
    const lines = calculateAllowances([{ code: 'MA38_LEADING_3_10', quantity: 1 }], RATES)
    expect(lines[0].isTaxable).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('calculateAllowances — multiple allowances in one call', () => {
  it('returns one line per requested allowance', () => {
    const requested: RequestedAllowance[] = [
      { code: 'MA38_MEAL_OVERTIME',  quantity: 2 },   // $40.64
      { code: 'MA38_TRAVELLING',     quantity: 3 },   // $120.24
      { code: 'MA38_DANGEROUS_BULK', quantity: 1 },   // $23.93
    ]
    const lines = calculateAllowances(requested, RATES)
    expect(lines).toHaveLength(3)
  })

  it('total amount helper sums all lines correctly', () => {
    const requested: RequestedAllowance[] = [
      { code: 'MA38_MEAL_OVERTIME',  quantity: 2 },   // $40.64
      { code: 'MA38_TRAVELLING',     quantity: 3 },   // $120.24
      { code: 'MA38_DANGEROUS_BULK', quantity: 1 },   // $23.93
    ]
    const lines = calculateAllowances(requested, RATES)
    const expectedTotal = Math.round((20.32 * 2 + 40.08 * 3 + 23.93 * 1) * 100) / 100
    expect(totalAllowanceAmount(lines)).toBe(expectedTotal)
  })

  it('taxable allowance helper excludes non-taxable amounts', () => {
    const requested: RequestedAllowance[] = [
      { code: 'MA38_MEAL_OVERTIME',  quantity: 1 },   // non-taxable: $20.32
      { code: 'MA38_TRAVELLING',     quantity: 2 },   // non-taxable: $80.16
      { code: 'MA38_DANGEROUS_BULK', quantity: 1 },   // taxable: $23.93
      { code: 'MA38_LEADING_3_10',   quantity: 1 },   // taxable: $47.65
    ]
    const lines = calculateAllowances(requested, RATES)
    const expectedTaxable = Math.round((23.93 + 47.65) * 100) / 100   // $71.58
    expect(taxableAllowanceAmount(lines)).toBe(expectedTaxable)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('calculateAllowances — edge cases', () => {
  it('unknown allowance code is silently skipped', () => {
    const requested: RequestedAllowance[] = [
      { code: 'UNKNOWN_CODE', quantity: 1 },
      { code: 'MA38_FIRST_AID', quantity: 1 },
    ]
    const lines = calculateAllowances(requested, RATES)
    expect(lines).toHaveLength(1)   // Only the known code
    expect(lines[0].code).toBe('MA38_FIRST_AID')
  })

  it('zero quantity produces no line', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_FIRST_AID', quantity: 0 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines).toHaveLength(0)
  })

  it('negative quantity produces no line', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_FIRST_AID', quantity: -1 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines).toHaveLength(0)
  })

  it('empty request returns empty array', () => {
    const lines = calculateAllowances([], RATES)
    expect(lines).toHaveLength(0)
  })

  it('description override populates the line description', () => {
    const requested: RequestedAllowance[] = [{
      code:        'MA38_VEHICLE_OVERSIZE',
      quantity:    3,
      description: 'Oversize load: Newcastle to Sydney trip',
    }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].description).toBe('Oversize load: Newcastle to Sydney trip')
  })

  it('no description override uses rate description', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_VEHICLE_OVERSIZE', quantity: 1 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].description).toBe('Low loader, oversize, crane or side lifter vehicles')
  })

  it('STP category is preserved on each line', () => {
    const requested: RequestedAllowance[] = [{ code: 'MA38_FIRST_AID', quantity: 1 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].stpCategory).toBe('AD')
  })

  it('amounts rounded to 2 decimal places', () => {
    // $0.61 × 7h = $4.27 (not $4.2700000000000006)
    const requested: RequestedAllowance[] = [{ code: 'MA38_DIRTY_MATERIAL', quantity: 7 }]
    const lines = calculateAllowances(requested, RATES)
    expect(lines[0].amount).toBe(4.27)
    // Verify it's truly 2dp (no floating point artifacts)
    expect(lines[0].amount.toString()).not.toContain('0000000')
  })
})
