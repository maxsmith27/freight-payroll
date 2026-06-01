// ─────────────────────────────────────────────────────────────────
// Award Engine — Orchestrator
//
// Entry point for processing a single employee's pay week.
// Responsibilities:
//   1. Load the AwardRateContext from the database via rateLoader
//   2. Route to the correct pure calculation engine (MA000038/MA000039)
//   3. Run the km pay floor check if the employee is km-paid
//   4. Calculate allowances from the pre-loaded allowance rates
//
// The underlying engines (ma000038.engine.ts, ma000039.engine.ts,
// allowance.engine.ts, kmFloorChecker.ts) are pure functions with
// no DB dependencies — they can be tested in isolation with mocked
// AwardRateContext objects.
//
// For Phase 4, payroll.service.ts will call processEmployeePayWeek()
// to replace the current naive earnings calculation.
// ─────────────────────────────────────────────────────────────────

import { loadRateContext } from './rateLoader.js'
import { processMA000038Week } from './ma000038.engine.js'
import { processMA000039Week } from './ma000039.engine.js'
import { calculateAllowances } from './allowance.engine.js'
import { checkKmFloor, buildKmFloorTopUpLine } from './kmFloorChecker.js'
import { reconcileAnnualisedSalary } from './annualisedSalary.engine.js'
import { assessCasualConversion } from './casualConversion.engine.js'
import type {
  DayInput,
  EmployeeEngineInput,
  RequestedAllowance,
  WeeklyAwardResult,
  AllowanceLine,
  KmFloorResult,
  AwardRateContext,
  EmployeePayWeekResult,
  AnnualisedSalaryInput,
  AnnualisedSalaryReconciliation,
  CasualShiftRecord,
  CasualConversionAssessment,
} from './types.js'

// Re-export engine types for consumers who only import from award.engine
export type {
  DayInput,
  EmployeeEngineInput,
  RequestedAllowance,
  WeeklyAwardResult,
  AllowanceLine,
  KmFloorResult,
  AwardRateContext,
  EmployeePayWeekResult,
  AnnualisedSalaryInput,
  AnnualisedSalaryReconciliation,
  CasualShiftRecord,
  CasualConversionAssessment,
}

// Re-export pure engine functions for consumers who want to call them directly
// (e.g., in tests, or when the context has already been loaded)
export { processMA000038Week, processMA000039Week, calculateAllowances, checkKmFloor }
export { loadRateContext }
export { reconcileAnnualisedSalary }
export { assessCasualConversion }

/**
 * Process a single employee's pay week end-to-end.
 *
 * Loads rate context from DB, routes to the correct award engine,
 * runs the km floor check (if applicable), and calculates allowances.
 *
 * @param params.days               - Timesheet day inputs for the week.
 * @param params.emp                - Employee configuration (award, grade, rate, etc.)
 * @param params.requestedAllowances - Allowances to apply this period (with quantities).
 * @param params.periodEnd          - Last date of the pay period (for rate + PH lookups).
 *
 * @throws If no award base rate is found for the employee's grade at the period date.
 */
export async function processEmployeePayWeek(params: {
  days: DayInput[]
  emp: EmployeeEngineInput
  requestedAllowances?: RequestedAllowance[]
  periodEnd: Date
}): Promise<EmployeePayWeekResult> {
  const { days, emp, requestedAllowances = [], periodEnd } = params

  // ── 1. Load rate context from DB ────────────────────────────────────────────
  const ctx = await loadRateContext(
    emp.awardCode,
    emp.classificationLevel,
    emp.hourlyRate,
    emp.state,
    emp.periodStart,
    periodEnd,
  )

  // ── 2. Calculate earnings via the correct award engine ──────────────────────
  let earnings: WeeklyAwardResult
  if (emp.awardCode === 'MA000039') {
    earnings = processMA000039Week(days, emp, ctx)
  } else {
    // MA000038 is the default / fallback
    earnings = processMA000038Week(days, emp, ctx)
  }

  // ── 3. Km pay floor check ────────────────────────────────────────────────────
  let kmFloor: KmFloorResult | null = null

  if (emp.ratePerKm != null && emp.ratePerKm > 0) {
    const totalKmDriven = days.reduce((sum, d) => sum + (d.kmDriven ?? 0), 0)
    const totalHoursWorked = earnings.totalOrdinaryHours + earnings.totalOvertimeHours

    if (totalKmDriven > 0 || totalHoursWorked > 0) {
      kmFloor = checkKmFloor(
        totalKmDriven,
        emp.ratePerKm,
        totalHoursWorked,
        ctx.awardMinimumHourlyRate,
      )

      // If a top-up is required, inject it as an earning line
      if (kmFloor.topUpAmount > 0) {
        const topUpLine = buildKmFloorTopUpLine(kmFloor, ctx.awardMinimumHourlyRate)
        if (topUpLine) {
          earnings = {
            ...earnings,
            lines: [...earnings.lines, topUpLine],
            totalGross: Math.round((earnings.totalGross + kmFloor.topUpAmount) * 100) / 100,
            // Top-up is NOT OTE — do not add to totalOTE
          }
        }
      }
    }
  }

  // ── 4. Calculate allowances ──────────────────────────────────────────────────
  const allowances = calculateAllowances(requestedAllowances, ctx.allowanceRates)

  return {
    earnings,
    allowances,
    kmFloor,
    context: ctx,
  }
}
