// ─────────────────────────────────────────────────────────────────
// Shared types used by both backend and frontend
// ─────────────────────────────────────────────────────────────────

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT'

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CASUAL' | 'CONTRACTOR'

export type PayFrequency = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'

export type PayType =
  | 'HOURLY'
  | 'SALARY'
  | 'PER_KM'
  | 'PER_LOAD'
  | 'PERCENTAGE_REVENUE'
  | 'MIXED'

export type AwardCode = 'MA000038' | 'MA000039'

export type AwardClassificationLevel =
  | 'GRADE_1'
  | 'GRADE_2'
  | 'GRADE_3'
  | 'GRADE_4'
  | 'GRADE_5'
  | 'GRADE_6'
  | 'GRADE_7'
  | 'GRADE_8'
  | 'GRADE_9'
  | 'GRADE_10'

export type VehicleGrade =
  | 'LIGHT_RIGID'
  | 'MEDIUM_RIGID'
  | 'HEAVY_RIGID'
  | 'ARTICULATED'
  | 'COMBINATION'

export type TaxResidencyStatus = 'RESIDENT' | 'FOREIGN_RESIDENT' | 'WORKING_HOLIDAY_MAKER'

export type PayRunStatus = 'DRAFT' | 'PREVIEW' | 'APPROVED' | 'FINALISED' | 'CANCELLED'

export type PayRunItemStatus = 'PENDING' | 'ADJUSTED' | 'FINALISED'

export type STPStatus = 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'

export type EarningType =
  | 'ORDINARY'
  | 'OVERTIME_1_5X'
  | 'OVERTIME_2X'
  | 'PUBLIC_HOLIDAY'
  | 'NIGHT_PENALTY'
  | 'WEEKEND_PENALTY'
  | 'AFTERNOON_PENALTY'
  | 'EARLY_MORNING_PENALTY'
  | 'PER_KM'
  | 'PER_LOAD'
  | 'AWARD_FLOOR_TOPUP'
  | 'ANNUAL_LEAVE'
  | 'ANNUAL_LEAVE_LOADING'
  | 'PERSONAL_LEAVE'
  | 'LONG_SERVICE_LEAVE'
  | 'TERMINATION_LEAVE'
  | 'OTHER'

export type LeaveType =
  | 'ANNUAL'
  | 'PERSONAL_CARERS'
  | 'COMPASSIONATE'
  | 'COMMUNITY_SERVICE'
  | 'LONG_SERVICE'
  | 'PARENTAL'
  | 'UNPAID'
  | 'PUBLIC_HOLIDAY'

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'PROCESSED'

export type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PROCESSED'

export type RosterStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type LicenceClass = 'C' | 'LR' | 'MR' | 'HR' | 'HC' | 'MC'

export type AccreditationType =
  | 'DANGEROUS_GOODS'
  | 'HEAVY_VEHICLE_MASS_MANAGEMENT'
  | 'HEAVY_VEHICLE_MAINTENANCE'
  | 'BASIC_FATIGUE_MANAGEMENT'
  | 'ADVANCED_FATIGUE_MANAGEMENT'
  | 'FORKLIFT'
  | 'FIRST_AID'
  | 'WHITE_CARD'
  | 'OTHER'

export type FatigueScheme =
  | 'STANDARD_HOURS'
  | 'BASIC_FATIGUE_MANAGEMENT'
  | 'ADVANCED_FATIGUE_MANAGEMENT'

export type GlobalRole = 'SUPER_ADMIN' | 'ORG_USER'

export type CompanyRole =
  | 'COMPANY_ADMIN'
  | 'PAYROLL_MANAGER'
  | 'DEPOT_MANAGER'
  | 'SUPERVISOR'
  | 'EMPLOYEE'

// ─────────────────────────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  success: false
  error: string
  details?: Record<string, string[]>
}

// ─────────────────────────────────────────────────────────────────
// Auth types
// ─────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JwtPayload {
  sub: string
  email: string
  globalRole: GlobalRole
  organizationId: string
  iat?: number
  exp?: number
}

export interface UserSession {
  id: string
  email: string
  firstName: string
  lastName: string
  globalRole: GlobalRole
  organizationId: string
  companyAccess: CompanyAccess[]
}

export interface CompanyAccess {
  companyId: string
  companyName: string
  role: CompanyRole
  depotId?: string
  enabledPages: string[] // empty = role defaults; non-empty = only these pages visible
}

// ─────────────────────────────────────────────────────────────────
// Employee DTOs
// ─────────────────────────────────────────────────────────────────

export interface EmployeeSummary {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  preferredName?: string
  employmentType: EmploymentType
  payFrequency: PayFrequency
  depotName?: string
  isActive: boolean
  startDate: string
  awardCode?: AwardCode
  currentClassification?: AwardClassificationLevel
  currentPayRate?: CurrentPayRate
}

export interface CurrentPayRate {
  payType: PayType
  hourlyRate?: number
  ratePerKm?: number
  ratePerLoad?: number
  revenuePercentage?: number
  annualSalary?: number
  effectiveFrom: string
}

// ─────────────────────────────────────────────────────────────────
// Payroll DTOs
// ─────────────────────────────────────────────────────────────────

export interface PayRunSummary {
  id: string
  payFrequency: PayFrequency
  periodStartDate: string
  periodEndDate: string
  payDate: string
  status: PayRunStatus
  totalGross: number
  totalTax: number
  totalSuper: number
  totalNet: number
  totalEmployeeCount: number
  createdAt: string
}

export interface PayslipData {
  employee: {
    name: string
    employeeNumber: string
    position: string
    payFrequency: PayFrequency
    taxFileNumber?: string
    superFund?: string
    superMemberNumber?: string
  }
  company: {
    name: string
    abn: string
    address: string
  }
  period: {
    startDate: string
    endDate: string
    payDate: string
  }
  earnings: PayslipLine[]
  allowances: PayslipLine[]
  deductions: PayslipLine[]
  leaveItems: PayslipLine[]
  summary: {
    grossEarnings: number
    preTaxDeductions: number
    taxableIncome: number
    paygWithholding: number
    postTaxDeductions: number
    netPay: number
    superGuarantee: number
  }
  ytd: {
    grossEarnings: number
    tax: number
    super: number
  }
  leaveBalances: LeaveBalanceLine[]
}

export interface PayslipLine {
  description: string
  hours?: number
  rate?: number
  units?: number
  amount: number
  isTaxable?: boolean
}

export interface LeaveBalanceLine {
  leaveType: LeaveType
  balance: number
  unit: 'hours' | 'days'
}

// ─────────────────────────────────────────────────────────────────
// Tax calculation inputs/outputs
// ─────────────────────────────────────────────────────────────────

export interface TaxCalculationInput {
  annualEarnings: number
  taxResidencyStatus: TaxResidencyStatus
  claimsTaxFreeThreshold: boolean
  hasHECSDebt: boolean
  hasSFSSDebt?: boolean
  payFrequency: PayFrequency
}

export interface TaxCalculationResult {
  weeklyWithholding: number
  annualTax: number
  medicareLevy: number
  litoOffset: number
  hecsRepayment: number
  totalWithholding: number
}
