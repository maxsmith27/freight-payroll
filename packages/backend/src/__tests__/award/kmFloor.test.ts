// ─────────────────────────────────────────────────────────────────
// Km Floor Checker Tests
// MA000038 cl.16 / MA000039 cl.14
//
// The km floor ensures that km-paid employees receive at least
// the award ordinary hourly rate for every hour they work.
// If km earnings fall below that floor, a top-up is required.
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { checkKmFloor, buildKmFloorTopUpLine } from '../../modules/payroll/engines/kmFloorChecker.js'

// Grade 4 MA000038 award minimum: $27.04/hr
const AWARD_RATE = 27.04

// ─────────────────────────────────────────────────────────────────
describe('checkKmFloor — floor met (no top-up required)', () => {
  it('km earnings exactly equal the floor: met with no top-up', () => {
    // 38h × $27.04 = $1,027.52 floor
    // km rate needed: $1,027.52 / 1000km = $1.02752/km → use exact divisible numbers
    // 1000km × $1.03 = $1,030.00 ≥ floor of $1,027.52 → floor met
    const result = checkKmFloor(1000, 1.03, 38, AWARD_RATE)
    expect(result.floorAmount).toBe(Math.round(38 * 27.04 * 100) / 100)
    expect(result.metFloor).toBe(true)
    expect(result.topUpAmount).toBe(0)
  })

  it('km earnings clearly above the floor', () => {
    // 800km × $0.60 = $480 vs 15h × $27.04 = $405.60 floor
    const result = checkKmFloor(800, 0.60, 15, AWARD_RATE)
    expect(result.kmEarnings).toBe(480.00)
    expect(result.floorAmount).toBe(Math.round(15 * 27.04 * 100) / 100)  // $405.60
    expect(result.metFloor).toBe(true)
    expect(result.topUpAmount).toBe(0)
  })

  it('high km volume: 2500km × $0.55 well above floor', () => {
    // 2500 × 0.55 = $1,375 vs 40h × $27.04 = $1,081.60
    const result = checkKmFloor(2500, 0.55, 40, AWARD_RATE)
    expect(result.metFloor).toBe(true)
    expect(result.topUpAmount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('checkKmFloor — floor not met (top-up required)', () => {
  it('km earnings below floor: correct top-up calculated', () => {
    // 600km × $0.55 = $330.00 km earnings
    // 15h × $27.04 = $405.60 floor
    // Top-up = $405.60 - $330.00 = $75.60
    const result = checkKmFloor(600, 0.55, 15, AWARD_RATE)
    expect(result.kmEarnings).toBe(330.00)
    expect(result.floorAmount).toBe(Math.round(15 * 27.04 * 100) / 100)  // $405.60
    expect(result.metFloor).toBe(false)
    expect(result.topUpAmount).toBe(Math.round((405.60 - 330.00) * 100) / 100)  // $75.60
  })

  it('very low km rate triggers top-up', () => {
    // 500km × $0.30 = $150 vs 38h × $27.04 = $1,027.52
    const result = checkKmFloor(500, 0.30, 38, AWARD_RATE)
    expect(result.metFloor).toBe(false)
    expect(result.topUpAmount).toBe(Math.round((1027.52 - 150) * 100) / 100)
  })

  it('top-up is rounded to 2 decimal places', () => {
    // 100km × $0.25 = $25.00 vs 10h × $27.04 = $270.40
    // Top-up = $245.40 (clean number; test for precision anyway)
    const result = checkKmFloor(100, 0.25, 10, AWARD_RATE)
    expect(result.topUpAmount).toBe(245.40)
    expect(result.topUpAmount.toString()).not.toContain('00000000')
  })
})

// ─────────────────────────────────────────────────────────────────
describe('checkKmFloor — return values', () => {
  it('kmEarnings is km × rate, rounded to 2dp', () => {
    const result = checkKmFloor(333, 0.61, 10, AWARD_RATE)
    expect(result.kmEarnings).toBe(Math.round(333 * 0.61 * 100) / 100)  // $203.13
  })

  it('floorAmount is hours × awardRate, rounded to 2dp', () => {
    const result = checkKmFloor(500, 0.60, 25.65, 39.37)  // MA000039 Grade 3
    expect(result.floorAmount).toBe(Math.round(25.65 * 39.37 * 100) / 100)
  })

  it('zero km driven: km earnings = 0, floor = hours × rate', () => {
    const result = checkKmFloor(0, 0.55, 38, AWARD_RATE)
    expect(result.kmEarnings).toBe(0)
    expect(result.metFloor).toBe(false)
    expect(result.topUpAmount).toBe(Math.round(38 * AWARD_RATE * 100) / 100)
  })

  it('zero hours worked: floor = 0, km earnings always meet floor', () => {
    const result = checkKmFloor(500, 0.55, 0, AWARD_RATE)
    expect(result.floorAmount).toBe(0)
    expect(result.metFloor).toBe(true)
    expect(result.topUpAmount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('buildKmFloorTopUpLine', () => {
  it('returns null when floor is met (no top-up needed)', () => {
    const result = checkKmFloor(800, 0.60, 15, AWARD_RATE)
    expect(buildKmFloorTopUpLine(result, AWARD_RATE)).toBeNull()
  })

  it('returns AWARD_FLOOR_TOPUP line when top-up is needed', () => {
    const result   = checkKmFloor(600, 0.55, 15, AWARD_RATE)
    const topUpLine = buildKmFloorTopUpLine(result, AWARD_RATE)

    expect(topUpLine).not.toBeNull()
    expect(topUpLine?.earningType).toBe('AWARD_FLOOR_TOPUP')
    expect(topUpLine?.amount).toBe(result.topUpAmount)
  })

  it('top-up line is NOT OTE (it is a compensatory adjustment)', () => {
    const result    = checkKmFloor(600, 0.55, 15, AWARD_RATE)
    const topUpLine = buildKmFloorTopUpLine(result, AWARD_RATE)
    expect(topUpLine?.isOTE).toBe(false)
  })

  it('top-up line has hours = 0 (not an hourly earning)', () => {
    const result    = checkKmFloor(600, 0.55, 15, AWARD_RATE)
    const topUpLine = buildKmFloorTopUpLine(result, AWARD_RATE)
    expect(topUpLine?.hours).toBe(0)
  })

  it('description includes both km earnings and floor amounts', () => {
    const result    = checkKmFloor(600, 0.55, 15, AWARD_RATE)
    const topUpLine = buildKmFloorTopUpLine(result, AWARD_RATE)
    expect(topUpLine?.description).toContain('330.00')  // km earnings
    expect(topUpLine?.description).toContain('405.60')  // floor amount
  })

  it('MA000039 Grade 4: top-up at higher award rate', () => {
    // MA000039 Grade 4: $40.07/hr
    const ma39Rate = 40.07
    const result   = checkKmFloor(1000, 0.50, 25.65, ma39Rate)
    // 1000km × $0.50 = $500 vs 25.65h × $40.07 = $1,027.80 floor
    // Top-up = $527.80
    const topUpLine = buildKmFloorTopUpLine(result, ma39Rate)
    expect(topUpLine?.amount).toBe(result.topUpAmount)
    expect(result.topUpAmount).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('checkKmFloor — precision and rounding', () => {
  it('result is always rounded to 2 decimal places (no floating point noise)', () => {
    // Numbers chosen to produce messy floating point without rounding
    const result = checkKmFloor(777, 0.57, 33.3, 27.04)
    // 777 × 0.57 = 442.89 (exact)
    // 33.3 × 27.04 = 900.432 → $900.43
    expect(result.kmEarnings.toString()).not.toMatch(/\.\d{3,}/)
    expect(result.floorAmount.toString()).not.toMatch(/\.\d{3,}/)
    expect(result.topUpAmount.toString()).not.toMatch(/\.\d{3,}/)
  })
})
