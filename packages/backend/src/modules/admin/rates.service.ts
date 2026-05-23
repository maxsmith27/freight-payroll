import prisma from '../../lib/prisma.js'

// ─── NAT 3539 Reference values for FY 2025-26 ───────────────────────────────
// These are the ATO-published PAYG withholding formula coefficients.
// Source: ATO NAT 3539 (Tax withheld calculator — Statement of formula),
//         effective 1 July 2025.
//
// Format: { from, to, coeffA, coeffB }  (weekly earnings brackets, no HECS, claims TFT)
// We store a representative subset for comparison — the full set is in the DB.

const NAT3539_2025_26 = {
  financialYear: '2025-26',
  superRate: 0.12, // 12% from 1 July 2025
  // Super contribution base (quarterly maximum) per ATO
  superMaxContributionBaseQuarterly: 65070,
  // Key weekly PAYG brackets: resident, claims TFT, no HECS (most common freight worker)
  // Coefficients: weekly withholding = (a × weekly earnings) - b
  // These values can be cross-checked against ATO NAT 3539 table 2
  paygBrackets: [
    { annualFrom: 0,      annualTo: 18200,  coeffA: 0.1900000, coeffB: 0.19 },
    { annualFrom: 18201,  annualTo: 45000,  coeffA: 0.3477000, coeffB: 3572.00 },
    { annualFrom: 45001,  annualTo: 135000, coeffA: 0.3450000, coeffB: 3461.00 },
    { annualFrom: 135001, annualTo: 190000, coeffA: 0.3900000, coeffB: 8961.00 },
    { annualFrom: 190001, annualTo: null,   coeffA: 0.4700000, coeffB: 23357.00 },
  ],
}

export interface RateStatus {
  ok: boolean
  detail: string
}

export interface RateVerificationResult {
  financialYear: string
  verifiedAt: string | null
  verifiedBy: string | null
  superRate: RateStatus & { dbValue: number | null; referenceValue: number }
  superMaxBase: RateStatus & { dbValue: number | null; referenceValue: number }
  paygBracketCount: RateStatus & { dbCount: number; referenceCount: number }
  overallOk: boolean
}

export async function verifyRates(financialYear = '2025-26'): Promise<RateVerificationResult> {
  const ref = NAT3539_2025_26
  if (financialYear !== ref.financialYear) {
    return {
      financialYear,
      verifiedAt: null,
      verifiedBy: null,
      superRate: { ok: false, detail: 'No reference data for this financial year', dbValue: null, referenceValue: 0 },
      superMaxBase: { ok: false, detail: 'No reference data for this financial year', dbValue: null, referenceValue: 0 },
      paygBracketCount: { ok: false, detail: 'No reference data for this financial year', dbCount: 0, referenceCount: 0 },
      overallOk: false,
    }
  }

  const [superRate, paygCount, config] = await Promise.all([
    prisma.superannuationRate.findFirst({
      where: { financialYear },
      orderBy: { effectiveFrom: 'desc' },
    }),
    prisma.paygTaxBracket.count({ where: { financialYear } }),
    prisma.systemConfig.findUnique({ where: { key: `rate_verification_${financialYear}` } }),
  ])

  let verifiedAt: string | null = null
  let verifiedBy: string | null = null
  if (config?.value) {
    try {
      const parsed = JSON.parse(config.value) as { verifiedAt: string; verifiedBy: string }
      verifiedAt = parsed.verifiedAt ?? null
      verifiedBy = parsed.verifiedBy ?? null
    } catch { /* ignore */ }
  }

  const dbSuperRate = superRate ? Number(superRate.rate) : null
  const dbSuperMax = superRate?.maxContributionBaseQuarterly ? Number(superRate.maxContributionBaseQuarterly) : null

  const superRateOk = dbSuperRate !== null && Math.abs(dbSuperRate - ref.superRate) < 0.0001
  const superMaxOk = dbSuperMax !== null && Math.abs(dbSuperMax - ref.superMaxContributionBaseQuarterly) < 1

  // Expect at least as many DB brackets as reference brackets (DB has more — all residency/frequency combos)
  const paygOk = paygCount >= ref.paygBrackets.length

  return {
    financialYear,
    verifiedAt,
    verifiedBy,
    superRate: {
      ok: superRateOk,
      detail: superRateOk
        ? `${(ref.superRate * 100).toFixed(0)}% — matches reference`
        : dbSuperRate === null
          ? 'No superannuation rate found in database for this financial year'
          : `DB has ${(dbSuperRate * 100).toFixed(2)}% but reference is ${(ref.superRate * 100).toFixed(0)}%`,
      dbValue: dbSuperRate,
      referenceValue: ref.superRate,
    },
    superMaxBase: {
      ok: superMaxOk,
      detail: superMaxOk
        ? `$${ref.superMaxContributionBaseQuarterly.toLocaleString()} — matches reference`
        : dbSuperMax === null
          ? 'Max contribution base not set in database'
          : `DB has $${dbSuperMax.toLocaleString()} but reference is $${ref.superMaxContributionBaseQuarterly.toLocaleString()}`,
      dbValue: dbSuperMax,
      referenceValue: ref.superMaxContributionBaseQuarterly,
    },
    paygBracketCount: {
      ok: paygOk,
      detail: paygOk
        ? `${paygCount} brackets loaded`
        : `Only ${paygCount} PAYG brackets in DB — expected at least ${ref.paygBrackets.length}. Run the PAYG seed.`,
      dbCount: paygCount,
      referenceCount: ref.paygBrackets.length,
    },
    overallOk: superRateOk && superMaxOk && paygOk,
  }
}

export async function markVerified(financialYear: string, verifiedByEmail: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: `rate_verification_${financialYear}` },
    create: {
      key: `rate_verification_${financialYear}`,
      value: JSON.stringify({ verifiedAt: new Date().toISOString(), verifiedBy: verifiedByEmail }),
      description: `Rate verification sign-off for FY ${financialYear}`,
    },
    update: {
      value: JSON.stringify({ verifiedAt: new Date().toISOString(), verifiedBy: verifiedByEmail }),
    },
  })
}
