// ─────────────────────────────────────────────────────────────────
// Long Service Leave — All Australian States and Territories
//
// Each state has its own LSL legislation with different accrual rates,
// qualifying periods, and portability rules.
//
// IMPORTANT: LSL legislation changes periodically. Verify rules against
// current state legislation before relying on this for entitlement calculations.
// ─────────────────────────────────────────────────────────────────

import type { AustralianState } from '../types/index.js'

export interface LSLRules {
  state: AustralianState
  legislationName: string
  accrualRate: number // weeks of leave per year of service
  qualifyingYears: number // minimum years of service to access LSL
  prorataOnTerminationAfterYears: number // years after which pro-rata applies on termination
  leaveUnit: 'weeks' // always weeks
  notes: string[]
}

// ─────────────────────────────────────────────────────────────────
// State-by-state rules
// ─────────────────────────────────────────────────────────────────

export const LSL_RULES: Record<AustralianState, LSLRules> = {
  NSW: {
    state: 'NSW',
    legislationName: 'Long Service Leave Act 1955 (NSW)',
    accrualRate: 10 / 52, // 1 month (4.333 weeks) per 5 years → simplified: ~0.867 weeks/year
    // More precisely: 2 months after 10 years, 1 month per 5 years thereafter
    // Accrual = weeks of service * (10/5) / 52 per week
    qualifyingYears: 10,
    prorataOnTerminationAfterYears: 5,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 2 months (8.67 weeks) after 10 years service',
      'Pro-rata payable on termination after 5 years (if employer-initiated or genuine redundancy)',
      'Pro-rata payable after 5 years if employee resigns due to illness/domestic pressing necessity',
      'Accrual continues during paid leave, and most forms of unpaid leave up to 3 months',
    ],
  },

  VIC: {
    state: 'VIC',
    legislationName: 'Long Service Leave Act 2018 (VIC)',
    accrualRate: 1 / 60, // 1/60th of service period (in weeks)
    qualifyingYears: 7,
    prorataOnTerminationAfterYears: 7,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 1/60th of continuous employment (approximately 8.67 weeks per 10 years)',
      'Pro-rata payable on any termination after 7 years (most employee-friendly rule in Australia)',
      'Leave can be taken in shorter periods by agreement',
      'Unpaid leave periods generally count as service for accrual',
    ],
  },

  QLD: {
    state: 'QLD',
    legislationName: 'Industrial Relations Act 2016 (QLD) — Long Service Leave',
    accrualRate: 8.6667 / 10 / 52, // 8.6667 weeks per 10 years
    qualifyingYears: 10,
    prorataOnTerminationAfterYears: 7,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 8.6667 weeks (2 months) after 10 years continuous service',
      'Pro-rata payable on termination after 7 years (all grounds)',
      'After initial 10 years: further leave accrues at 4.333 weeks per 5 years',
    ],
  },

  WA: {
    state: 'WA',
    legislationName: 'Long Service Leave Act 1958 (WA)',
    accrualRate: 13 / 15 / 52, // 13 weeks after 15 years
    qualifyingYears: 15,
    prorataOnTerminationAfterYears: 10,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 13 weeks after 15 years continuous service',
      'Pro-rata payable on termination (employer-initiated) after 10 years',
      'After initial 15 years: 13 weeks for each subsequent 15 years (different from most states)',
      'WA still uses the older 15-year qualifying period',
    ],
  },

  SA: {
    state: 'SA',
    legislationName: 'Long Service Leave Act 1987 (SA)',
    accrualRate: 13 / 10 / 52, // 13 weeks per 10 years
    qualifyingYears: 10,
    prorataOnTerminationAfterYears: 1, // pro-rata accrues from day 1, payable after qualifying
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 13 weeks after 10 years continuous service (more generous than most)',
      'Pro-rata payable after 1 year on termination by employer or genuine redundancy',
      'Accrual rate: 1.3 weeks per year',
    ],
  },

  TAS: {
    state: 'TAS',
    legislationName: 'Long Service Leave Act 1976 (TAS)',
    accrualRate: 13 / 10 / 52, // 13 weeks per 10 years (similar to SA)
    qualifyingYears: 10,
    prorataOnTerminationAfterYears: 7,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 13 weeks after 10 years continuous service',
      'Pro-rata payable after 7 years on employer-initiated termination',
      'Further leave: 6.5 weeks per 5 years after the initial 10',
    ],
  },

  ACT: {
    state: 'ACT',
    legislationName: 'Long Service Leave Act 1976 (ACT)',
    accrualRate: 6.0667 / 7 / 52, // 6.0667 weeks after 7 years (ACT reformed to 7 years)
    qualifyingYears: 7,
    prorataOnTerminationAfterYears: 1,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 6.0667 weeks after 7 years (ACT reduced qualifying period to 7 years)',
      'Pro-rata from 1 year of service — very employee-friendly',
      'Portability provisions exist in some industries',
    ],
  },

  NT: {
    state: 'NT',
    legislationName: 'Long Service Leave Act 1981 (NT)',
    accrualRate: 13 / 10 / 52, // 13 weeks per 10 years
    qualifyingYears: 10,
    prorataOnTerminationAfterYears: 7,
    leaveUnit: 'weeks',
    notes: [
      'Entitlement: 13 weeks after 10 years continuous service',
      'Pro-rata on termination by employer after 7 years',
      'After initial 10 years: further accrual at 6.5 weeks per 5 years',
    ],
  },
}

// ─────────────────────────────────────────────────────────────────
// Calculation helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate accrued LSL in weeks for a given state and years of service.
 * Returns 0 if the employee hasn't reached the qualifying period
 * (unless they've passed the pro-rata threshold and termination = employer-initiated).
 */
export function calculateLSLAccrual(
  state: AustralianState,
  yearsOfService: number,
): {
  accruedWeeks: number
  hasQualified: boolean
  hasProRataThreshold: boolean
} {
  const rules = LSL_RULES[state]

  const hasQualified = yearsOfService >= rules.qualifyingYears
  const hasProRataThreshold = yearsOfService >= rules.prorataOnTerminationAfterYears

  // Special NSW calculation: 2 months after 10 years, 1 month per 5 years after
  if (state === 'NSW') {
    if (yearsOfService < 10) {
      return { accruedWeeks: 0, hasQualified, hasProRataThreshold }
    }
    const additionalYears = yearsOfService - 10
    const initialEntitlement = 8.6667 // 2 months
    const additionalEntitlement = Math.floor(additionalYears / 5) * 4.3333
    return {
      accruedWeeks: initialEntitlement + additionalEntitlement,
      hasQualified,
      hasProRataThreshold,
    }
  }

  // VIC: 1/60th of service period
  if (state === 'VIC') {
    const weeksOfService = yearsOfService * 52
    return {
      accruedWeeks: weeksOfService / 60,
      hasQualified,
      hasProRataThreshold,
    }
  }

  // General formula for other states
  const accruedWeeks = yearsOfService * 52 * rules.accrualRate
  return { accruedWeeks, hasQualified, hasProRataThreshold }
}

/**
 * Calculate the dollar value of LSL entitlement.
 */
export function calculateLSLValue(
  accruedWeeks: number,
  weeklyOrdinaryRate: number,
): number {
  return accruedWeeks * weeklyOrdinaryRate
}
