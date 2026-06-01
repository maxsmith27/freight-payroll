// ─────────────────────────────────────────────────────────────────
// Rate loader — queries the database to build an AwardRateContext
// for a given employee + pay period.
//
// The resulting context is passed into the pure calculation functions
// so they remain database-free and fully testable.
// ─────────────────────────────────────────────────────────────────

import prisma from '../../../lib/prisma.js'
import {
  MA000038_PENALTY_RATES,
  MA000039_PENALTY_RATES,
  ORDINARY_HOURS_PER_WEEK,
  ORDINARY_HOURS_PER_DAY,
  MA000039_ORDINARY_HOURS_PER_WEEK,
} from '@freight-payroll/shared'
import type { AwardCode, AwardClassificationLevel, AustralianState } from '@freight-payroll/shared'
import type { AwardRateContext, LoadedAllowanceRate } from './types.js'

type AwardClassificationLevelStr = AwardClassificationLevel

/**
 * Load all rates needed to process a pay week for an employee.
 *
 * @param awardCode       - The award being applied (MA000038 or MA000039)
 * @param classificationLevel - Employee's current grade
 * @param employeeHourlyRate  - Employee's actual pay rate (may be above award)
 * @param state           - Employee's state of employment (for public holidays)
 * @param periodStart     - First date of the pay period (for rate effective-date selection)
 * @param periodEnd       - Last date of the pay period (for public holiday range)
 */
export async function loadRateContext(
  awardCode: AwardCode,
  classificationLevel: AwardClassificationLevel,
  employeeHourlyRate: number,
  state: AustralianState,
  periodStart: Date,
  periodEnd: Date,
): Promise<AwardRateContext> {
  // ── Base rate (award minimum for this grade at this date) ──────────────────
  const baseRate = await prisma.awardBaseRate.findFirst({
    where: {
      award: awardCode,
      classificationLevel,
      vehicleGrade: null,
      effectiveFrom: { lte: periodStart },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })

  if (!baseRate) {
    throw new Error(
      `No award base rate found for ${awardCode} ${classificationLevel} effective at ${periodStart.toISOString().split('T')[0]}. ` +
      `Run the seed script to populate award rates.`,
    )
  }

  const awardMinimumHourlyRate = Number(baseRate.hourlyRate)

  // Employee's actual pay rate must be at or above the award minimum.
  // This is enforced at data entry time, but we double-check here.
  const effectiveHourlyRate = Math.max(employeeHourlyRate, awardMinimumHourlyRate)

  // ── Penalty rates ─────────────────────────────────────────────────────────
  // Fetch from DB so they respect the effective date. Fall back to shared
  // constants if the DB doesn't have a specific override (which is normal —
  // penalty multipliers rarely change).
  const dbPenalties = await prisma.awardPenaltyRate.findMany({
    where: {
      award: awardCode,
      effectiveFrom: { lte: periodStart },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })

  // Build a map of penaltyType → multiplier from DB records
  const penaltyMap = new Map<string, number>()
  for (const p of dbPenalties) {
    if (!penaltyMap.has(p.penaltyType)) {
      penaltyMap.set(p.penaltyType, Number(p.multiplier))
    }
  }

  const defaultRates = awardCode === 'MA000039' ? MA000039_PENALTY_RATES : MA000038_PENALTY_RATES

  const penaltyRates = {
    overtimeFirst2Hours: penaltyMap.get('OVERTIME_1_5X') ?? defaultRates.overtimeFirst2Hours,
    overtimeAfter2Hours: penaltyMap.get('OVERTIME_2X')   ?? defaultRates.overtimeAfter2Hours,
    saturdayOrdinary:    penaltyMap.get('SATURDAY')      ?? defaultRates.saturdayOrdinary,
    saturdayOvertime:    defaultRates.saturdayOvertime,   // Not stored separately in DB — always 2x
    sundayAll:           penaltyMap.get('SUNDAY')        ?? defaultRates.sundayAll,
    publicHoliday:       penaltyMap.get('PUBLIC_HOLIDAY') ?? defaultRates.publicHoliday,
    afternoonShift:      defaultRates.afternoonShift,    // Loaded from constants (rarely changes)
    nightShift:          defaultRates.nightShift,
    annualLeaveLoading:  defaultRates.annualLeaveLoading,
  }

  // ── Public holidays ───────────────────────────────────────────────────────
  // National holidays are stored with state = null; state-specific holidays
  // with the relevant AustralianState value. We fetch both.
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: { gte: periodStart, lte: periodEnd },
      OR: [
        { state: state },
        { state: null },
      ],
    },
    select: { date: true },
  })

  // Build a Set of 'YYYY-MM-DD' strings for fast O(1) lookup
  const publicHolidaySet = new Set<string>(
    holidays.map(h => h.date.toISOString().split('T')[0]),
  )

  // ── Allowance rates ───────────────────────────────────────────────────────
  // Load allowances for this award (and award-neutral allowances where award = null).
  // The most-recently-effective record wins for each code.
  const dbAllowances = await prisma.awardAllowanceRate.findMany({
    where: {
      AND: [
        { OR: [{ award: awardCode }, { award: null }] },
        { effectiveFrom: { lte: periodStart } },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }] },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
  })

  const allowanceMap = new Map<string, LoadedAllowanceRate>()
  for (const a of dbAllowances) {
    if (!allowanceMap.has(a.code)) {
      allowanceMap.set(a.code, {
        code:        a.code,
        name:        a.name,
        rateType:    a.rateType as LoadedAllowanceRate['rateType'],
        amount:      Number(a.amount),
        isTaxable:   a.isTaxable,
        stpCategory: a.stpCategory,
        description: a.description ?? '',
      })
    }
  }

  // ── All classification rates for this award ───────────────────────────────
  // Loaded so the higher duties handler can look up the elevated grade's rate
  // without an additional DB query per-day.
  const allClassRates = await prisma.awardBaseRate.findMany({
    where: {
      award: awardCode,
      vehicleGrade: null,
      effectiveFrom: { lte: periodStart },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })

  const classificationRates = new Map<AwardClassificationLevelStr, number>()
  for (const rate of allClassRates) {
    const level = rate.classificationLevel as AwardClassificationLevelStr
    if (!classificationRates.has(level)) {
      classificationRates.set(level, Number(rate.hourlyRate))
    }
  }

  return {
    baseHourlyRate: effectiveHourlyRate,
    awardMinimumHourlyRate,
    penaltyRates,
    publicHolidays: publicHolidaySet,
    ordinaryHoursPerWeek: awardCode === 'MA000039' ? MA000039_ORDINARY_HOURS_PER_WEEK : ORDINARY_HOURS_PER_WEEK,
    ordinaryHoursPerDay:  awardCode === 'MA000039' ? MA000039_ORDINARY_HOURS_PER_WEEK / 5 : ORDINARY_HOURS_PER_DAY,
    allowanceRates: allowanceMap,
    classificationRates,
  }
}
