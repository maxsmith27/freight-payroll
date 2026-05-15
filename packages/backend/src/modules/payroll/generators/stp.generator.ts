// ─────────────────────────────────────────────────────────────────
// STP Phase 2 payload generator
// Produces ATO-compliant JSON payloads for Single Touch Payroll
// Phase 2 reporting (disaggregated earnings).
//
// Reference: ATO STP Phase 2 employer guide (NAT 75084)
// Submission to ATO via payroll intermediary — NOT implemented here.
// ─────────────────────────────────────────────────────────────────

export interface STPEmployee {
  // Tax file number (must not be null in production unless ATO exemption applies)
  tfn?: string
  firstName: string
  familyName: string
  dateOfBirth?: string // YYYY-MM-DD
  // Employment
  employeeId: string // your internal ID
  startDate: string // YYYY-MM-DD
  // Tax settings
  taxScale: STPTaxScale
  claimsTaxFreeThreshold: boolean
  // Super fund
  superFundAbn?: string
  superFundUsi?: string
  superMemberNumber?: string
}

export interface STPPayEvent {
  employeeId: string
  paymentDate: string // YYYY-MM-DD
  payPeriodFrom: string
  payPeriodTo: string

  // Disaggregated gross components (STP Phase 2)
  grossEarnings: number
  allowances: STPAllowance[]
  deductions: STPDeduction[]

  // Tax
  paygWithholding: number

  // Super
  superGuarantee: number
  voluntarySuper?: number

  // YTD at end of this pay period
  ytdGross: number
  ytdPAYG: number
  ytdSuper: number

  // Leave loading
  leaveLoading?: number
}

export interface STPAllowance {
  type: string // ATO allowance type code
  description: string
  amount: number
  ytdAmount: number
}

export interface STPDeduction {
  type: string // ATO deduction type code
  description: string
  amount: number
  ytdAmount: number
}

export type STPTaxScale =
  | 'SCALE_1' // Resident, claiming TFT
  | 'SCALE_2' // Resident, not claiming TFT
  | 'SCALE_3' // Foreign resident
  | 'SCALE_4' // No TFN
  | 'SCALE_6' // Working holiday maker

export interface STPPayEventPayload {
  submitterAbn: string
  submitterBranchNumber: number
  softwareId: string
  declarationTimestamp: string
  payEvents: STPEmployeePayEvent[]
}

export interface STPEmployeePayEvent {
  employee: STPEmployee
  payEvent: STPPayEvent
}

/**
 * Generate a STP Phase 2 pay event payload.
 * This payload should be submitted to the ATO via your payroll intermediary
 * or directly via ATO's STP channel.
 *
 * Note: This generates the data structure. Actual submission
 * (signing, encryption, XBRL wrapping) requires your payroll intermediary.
 */
export function generateSTPPayEventPayload(
  companyAbn: string,
  branchNumber: number,
  softwareId: string,
  events: STPEmployeePayEvent[],
): STPPayEventPayload {
  return {
    submitterAbn: companyAbn.replace(/\s/g, ''),
    submitterBranchNumber: branchNumber,
    softwareId,
    declarationTimestamp: new Date().toISOString(),
    payEvents: events,
  }
}

/**
 * Generate a STP update event (to correct a previously submitted pay event).
 */
export function generateSTPUpdateEventPayload(
  companyAbn: string,
  branchNumber: number,
  softwareId: string,
  originalEventId: string,
  events: STPEmployeePayEvent[],
): STPPayEventPayload & { updateEventId: string } {
  return {
    ...generateSTPPayEventPayload(companyAbn, branchNumber, softwareId, events),
    updateEventId: originalEventId,
  }
}

/**
 * Generate a STP finalisation event (EOFY — required by 14 July).
 * Sets isFinalisationIndicator = true for each employee.
 */
export interface STPFinalisationEvent {
  employeeId: string
  tfn?: string
  firstName: string
  familyName: string
  ytdGross: number
  ytdPAYG: number
  ytdSuper: number
  isAmendment: boolean
}

export function generateSTPFinalisationPayload(
  companyAbn: string,
  branchNumber: number,
  softwareId: string,
  financialYear: string, // e.g. "2025-26"
  employees: STPFinalisationEvent[],
) {
  return {
    submitterAbn: companyAbn.replace(/\s/g, ''),
    submitterBranchNumber: branchNumber,
    softwareId,
    financialYear,
    isFinalisationEvent: true,
    declarationTimestamp: new Date().toISOString(),
    employees: employees.map(e => ({
      ...e,
      isFinalisationIndicator: true,
    })),
  }
}
