// ─────────────────────────────────────────────────────────────────
// MA000039 Engine Tests
// Road Transport (Long Distance Operations) Award 2020
//
// KEY DIFFERENCES FROM MA000038:
//   - Ordinary hours per week: 25.65 (not 38)
//   - Ordinary hours per day: 5.13 (25.65 / 5)
//   - Hourly rate is higher (e.g., Grade 4: $40.07 vs $27.04)
//   - Grades start at Grade 3 (no Grades 1 or 2)
//
// Base: Grade 4, $40.07/hr
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { processMA000039Week } from '../../modules/payroll/engines/ma000039.engine.js'
import { makeMa000039Context, makeDay, makeExactDay, makeEmployee, round2, round4 } from './helpers.js'

const ctx = makeMa000039Context()
const emp = makeEmployee({
  awardCode:           'MA000039',
  classificationLevel: 'GRADE_4',
  hourlyRate:          40.07,
})

// MA000039 ordinary hours: 25.65/week, 5.13/day
const ORD_PER_WEEK = 25.65
const ORD_PER_DAY  = 25.65 / 5  // 5.13

// Week dates
const MON = '2025-10-13'
const TUE = '2025-10-14'
const WED = '2025-10-15'
const THU = '2025-10-16'
const FRI = '2025-10-17'
const SAT = '2025-10-18'
const SUN = '2025-10-19'

// ─────────────────────────────────────────────────────────────────
describe('MA000039 — Ordinary hours (25.65h/week, 5.13h/day)', () => {
  it('one day at 5.13h: all ordinary, no overtime', () => {
    // 5h 7.8min = 5.13h → 5h 8min ≈ 5h7.8min exactly
    // Practically: 5h = 300min worked → 300/60 = 5h. Less than 5.13, so no OT.
    const date      = new Date(`${MON}T00:00:00`)
    const startTime = new Date(`${MON}T06:00:00`)
    const endTime   = new Date(`${MON}T11:07:48`)  // 5.13h = 307.8min
    const days      = [{ date, startTime, endTime, breakMinutes: 0, state: 'NSW' as const }]
    const result    = processMA000039Week(days, emp, ctx)

    const ordLine = result.lines.find(l => l.earningType === 'ORDINARY')
    expect(ordLine).toBeDefined()
    // No OT
    expect(result.lines.find(l => l.earningType?.startsWith('OVERTIME'))).toBeUndefined()
    expect(result.totalOvertimeHours).toBe(0)
  })

  it('day with hours > 5.13: excess goes to overtime', () => {
    // 8h day (no break) → 5.13h ordinary + 2.87h OT
    const days   = [makeDay(MON, 6, 14, 0)]   // 8h, no break
    const result = processMA000039Week(days, emp, ctx)

    const ordLine = result.lines.find(l => l.earningType === 'ORDINARY')
    expect(ordLine?.hours).toBeCloseTo(ORD_PER_DAY, 2)

    const otHours = result.totalOvertimeHours
    expect(otHours).toBeCloseTo(8 - ORD_PER_DAY, 2)
  })

  it('5 × 5.13h days = 25.65h ordinary, no weekly OT', () => {
    // Build 5 days of exactly 5.13h each (no breaks)
    // 5.13h = 5h 7.8min ≈ 5h 8min
    const days = Array.from({ length: 5 }, (_, i) => {
      const dateStr = ['2025-10-13', '2025-10-14', '2025-10-15', '2025-10-16', '2025-10-17'][i]
      const date      = new Date(`${dateStr}T00:00:00`)
      const startTime = new Date(`${dateStr}T06:00:00`)
      // 5.13h = 307.8 minutes → use 307 minutes (5.1167h) for integer minutes
      const endTime   = new Date(`${dateStr}T11:07:00`)   // ≈5.117h
      return { date, startTime, endTime, breakMinutes: 0, state: 'NSW' as const }
    })
    const result = processMA000039Week(days, emp, ctx)
    // Each day ~5.117h × 5 = ~25.58h — just under the 25.65 limit → no OT
    expect(result.totalOvertimeHours).toBe(0)
  })

  it('weekly ordinary cap: hours above 25.65 total trigger weekly OT', () => {
    // 5 days × 6h (no break) = 30h total
    // Each day: 5.13h ordinary + 0.87h OT
    // Weekly ordinary accumulates: 5 × 5.13 = 25.65 → fills exactly
    const days = [
      makeDay(MON, 6, 12, 0),   // 6h
      makeDay(TUE, 6, 12, 0),
      makeDay(WED, 6, 12, 0),
      makeDay(THU, 6, 12, 0),
      makeDay(FRI, 6, 12, 0),
    ]
    const result = processMA000039Week(days, emp, ctx)

    expect(result.totalOrdinaryHours).toBeCloseTo(ORD_PER_WEEK, 1)
    expect(result.totalOvertimeHours).toBeCloseTo(30 - ORD_PER_WEEK, 1)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('MA000039 — Penalty rates (same structure as MA000038)', () => {
  it('Saturday ordinary at 1.5× on MA000039 rate', () => {
    const days   = [makeDay(SAT, 6, 11, 0)]   // 5h, no break, within daily ordinary cap
    const result = processMA000039Week(days, emp, ctx)

    const satLine = result.lines.find(l => l.earningType === 'WEEKEND_PENALTY')
    expect(satLine).toBeDefined()
    expect(satLine?.rate).toBe(round4(40.07 * 1.5))
  })

  it('Sunday at 2× on MA000039 rate', () => {
    const days   = [makeDay(SUN, 6, 11, 0)]   // 5h
    const result = processMA000039Week(days, emp, ctx)

    const sunLine = result.lines.find(l => l.earningType === 'WEEKEND_PENALTY')
    expect(sunLine).toBeDefined()
    expect(sunLine?.rate).toBe(round4(40.07 * 2.0))
  })

  it('public holiday at 2.5×', () => {
    const ctxWithPH = makeMa000039Context({ publicHolidays: new Set(['2025-10-13']) })
    const days      = [makeDay(MON, 6, 11, 0)]
    const result    = processMA000039Week(days, emp, ctxWithPH)

    const phLine = result.lines.find(l => l.earningType === 'PUBLIC_HOLIDAY')
    expect(phLine?.rate).toBe(round4(40.07 * 2.5))
  })
})

// ─────────────────────────────────────────────────────────────────
describe('MA000039 — Weekly rate cross-check', () => {
  it('Grade 4: 25.65h ordinary → gross ≈ award weekly rate $1,027.40', () => {
    // Use makeExactDay for precision: each day exactly 5.13h (25.65/5).
    // 5 × 5.13h = 25.65h exactly → no OT triggered.
    // 25.65h × $40.07 = $1,027.7955 → rounded line-by-line ≈ $1,027.80
    // FWO published weekly rate is $1,027.40; small diff is the hourly rate rounding
    // ($1,027.40 / 25.65 = 40.0545...; published as $40.07 → slight overshoot).
    const DATES = ['2025-10-13', '2025-10-14', '2025-10-15', '2025-10-16', '2025-10-17']
    const days  = DATES.map(d => makeExactDay(d, 6, 5.13))
    const result = processMA000039Week(days, emp, ctx)
    // Allow $0.50 tolerance for rounding in the hourly rate derivation
    expect(Math.abs(result.totalGross - 1027.40)).toBeLessThanOrEqual(0.50)
  })

  it('Grade 3: $39.37/hr × 25.65h ≈ $1,009.84 (award weekly $1,009.60)', () => {
    const g3Ctx = makeMa000039Context({ baseHourlyRate: 39.37, awardMinimumHourlyRate: 39.37 })
    const g3Emp = makeEmployee({ awardCode: 'MA000039', classificationLevel: 'GRADE_3', hourlyRate: 39.37 })
    const DATES = ['2025-10-13', '2025-10-14', '2025-10-15', '2025-10-16', '2025-10-17']
    const days  = DATES.map(d => makeExactDay(d, 6, 5.13))
    const result = processMA000039Week(days, g3Emp, g3Ctx)
    expect(Math.abs(result.totalGross - 1009.60)).toBeLessThanOrEqual(0.50)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('MA000039 — Context uses MA000039 ordinary hours', () => {
  it('context ordinaryHoursPerWeek is 25.65 not 38', () => {
    expect(ctx.ordinaryHoursPerWeek).toBe(25.65)
  })

  it('context ordinaryHoursPerDay is 25.65/5 = 5.13', () => {
    expect(ctx.ordinaryHoursPerDay).toBe(25.65 / 5)
  })
})

// ─────────────────────────────────────────────────────────────────
describe('MA000039 — Casual loading applies correctly', () => {
  it('casual MA000039 employee: 25% loading on $40.07', () => {
    const casualEmp = makeEmployee({
      awardCode:      'MA000039',
      classificationLevel: 'GRADE_4',
      hourlyRate:     40.07,
      employmentType: 'CASUAL',
    })
    const days   = [makeDay(MON, 6, 11, 0)]   // 5h, no break
    const result = processMA000039Week(days, casualEmp, ctx)

    const ordLine = result.lines.find(l => l.earningType === 'ORDINARY')
    expect(ordLine?.rate).toBe(round4(40.07 * 1.25))
  })

  it('casual minimum engagement 4h applies', () => {
    const casualEmp = makeEmployee({
      awardCode:      'MA000039',
      classificationLevel: 'GRADE_4',
      hourlyRate:     40.07,
      employmentType: 'CASUAL',
    })
    const days   = [makeDay(MON, 6, 8, 0)]   // 2h worked
    const result = processMA000039Week(days, casualEmp, ctx)

    // Minimum engagement: 4h
    const totalHours = result.lines.reduce((s, l) => s + l.hours, 0)
    expect(totalHours).toBe(4)
  })
})
