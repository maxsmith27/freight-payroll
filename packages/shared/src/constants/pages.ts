import type { CompanyRole } from '../types/index.js'

// ─── Page key constants ───────────────────────────────────────────────────────

export const ESS_PAGES = {
  DASHBOARD:  'ess.dashboard',
  TIMESHEETS: 'ess.timesheets',
  KM_LOG:     'ess.km_log',
  LEAVE:      'ess.leave',
  PAYSLIPS:   'ess.payslips',
} as const

export const ADMIN_PAGES = {
  DASHBOARD:         'admin.dashboard',
  EMPLOYEES:         'admin.employees',
  PAYROLL:           'admin.payroll',
  TIME_ATTENDANCE:   'admin.time_attendance',
  KM_LOG_APPROVALS:  'admin.km_log_approvals',
  LEAVE:             'admin.leave',
  ROSTER:            'admin.roster',
  COMPLIANCE:        'admin.compliance',
  REPORTS:           'admin.reports',
  SETTINGS:          'admin.settings',
} as const

export type EssPageKey   = typeof ESS_PAGES[keyof typeof ESS_PAGES]
export type AdminPageKey = typeof ADMIN_PAGES[keyof typeof ADMIN_PAGES]
export type PageKey      = EssPageKey | AdminPageKey

// ─── Role default pages (used when enabledPages is empty) ─────────────────────
// Defines the maximum a role can see. Per-user enabledPages can only restrict
// further — it cannot grant access beyond what the role permits.

const ALL_ESS   = Object.values(ESS_PAGES) as PageKey[]
const ALL_ADMIN = Object.values(ADMIN_PAGES) as PageKey[]

export const ROLE_DEFAULT_PAGES: Record<CompanyRole, PageKey[]> = {
  COMPANY_ADMIN: [...ALL_ESS, ...ALL_ADMIN],
  PAYROLL_MANAGER: [...ALL_ESS, ...ALL_ADMIN],
  DEPOT_MANAGER: [
    ...ALL_ESS,
    ADMIN_PAGES.DASHBOARD,
    ADMIN_PAGES.EMPLOYEES,
    ADMIN_PAGES.TIME_ATTENDANCE,
    ADMIN_PAGES.KM_LOG_APPROVALS,
    ADMIN_PAGES.LEAVE,
    ADMIN_PAGES.ROSTER,
    ADMIN_PAGES.COMPLIANCE,
    ADMIN_PAGES.REPORTS,
  ],
  SUPERVISOR: [
    ...ALL_ESS,
    ADMIN_PAGES.DASHBOARD,
    ADMIN_PAGES.EMPLOYEES,
    ADMIN_PAGES.TIME_ATTENDANCE,
    ADMIN_PAGES.KM_LOG_APPROVALS,
    ADMIN_PAGES.LEAVE,
    ADMIN_PAGES.ROSTER,
    ADMIN_PAGES.COMPLIANCE,
  ],
  EMPLOYEE: ALL_ESS,
}

// ─── Human-readable labels for the admin UI ──────────────────────────────────

export const PAGE_LABELS: Record<PageKey, string> = {
  'ess.dashboard':          'Dashboard',
  'ess.timesheets':         'My Timesheets',
  'ess.km_log':             'KM Log',
  'ess.leave':              'Leave',
  'ess.payslips':           'Payslips',
  'admin.dashboard':        'Dashboard',
  'admin.employees':        'Employees',
  'admin.payroll':          'Payroll',
  'admin.time_attendance':  'Time & Attendance',
  'admin.km_log_approvals': 'KM Log Approvals',
  'admin.leave':            'Leave',
  'admin.roster':           'Roster',
  'admin.compliance':       'Compliance',
  'admin.reports':          'Reports',
  'admin.settings':         'Settings',
}
