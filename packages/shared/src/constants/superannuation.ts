// ─────────────────────────────────────────────────────────────────
// Superannuation Guarantee rates — legislated schedule
// Superannuation Guarantee (Administration) Act 1992, s. 19
// ─────────────────────────────────────────────────────────────────

export interface SuperRate {
  financialYear: string
  effectiveFrom: string // 1 July
  effectiveTo: string // 30 June
  rate: number // as decimal, e.g. 0.12 = 12%
}

export const SUPER_GUARANTEE_SCHEDULE: SuperRate[] = [
  { financialYear: '2022-23', effectiveFrom: '2022-07-01', effectiveTo: '2023-06-30', rate: 0.105 },
  { financialYear: '2023-24', effectiveFrom: '2023-07-01', effectiveTo: '2024-06-30', rate: 0.11 },
  { financialYear: '2024-25', effectiveFrom: '2024-07-01', effectiveTo: '2025-06-30', rate: 0.115 },
  { financialYear: '2025-26', effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', rate: 0.12 },
  // 12% is the final legislated rate — no further scheduled increases
]

export const CURRENT_SUPER_RATE = 0.12 // FY2025-26

// Maximum super contribution base per quarter — FY2025-26
// Source: ATO — ato.gov.au/max-super-contribution-base
// Employer not required to pay SG on earnings above this base
export const MAX_SUPER_CONTRIBUTION_BASE_QUARTERLY = 65070
export const MAX_SUPER_CONTRIBUTION_BASE_MONTHLY = 21690

// Concessional contributions cap (pre-tax) — FY2025-26
export const CONCESSIONAL_CONTRIBUTIONS_CAP = 30000

/**
 * Get the super guarantee rate applicable for a given pay date.
 */
export function getSuperRate(payDate: Date): number {
  const dateStr = payDate.toISOString().split('T')[0]
  const applicable = SUPER_GUARANTEE_SCHEDULE
    .filter(r => r.effectiveFrom <= dateStr)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  return applicable[0]?.rate ?? CURRENT_SUPER_RATE
}

/**
 * Calculate superannuation on ordinary time earnings (OTE).
 * Note: Super is calculated on OTE, not all earnings.
 * Overtime-only earnings are excluded from the super base.
 */
export function calculateSuperGuarantee(
  ordinaryTimeEarnings: number,
  payDate: Date,
): number {
  const rate = getSuperRate(payDate)
  return Math.round(ordinaryTimeEarnings * rate * 100) / 100
}
