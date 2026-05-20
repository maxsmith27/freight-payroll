import { useAuthStore } from '@/store/auth.store'
import { ROLE_DEFAULT_PAGES } from '@freight-payroll/shared'
import type { CompanyRole, PageKey } from '@freight-payroll/shared'

/**
 * Returns the authenticated user's role in the currently active company.
 * SUPER_ADMIN is mapped to COMPANY_ADMIN so it passes all role checks.
 */
export function useCompanyRole(): CompanyRole | null {
  const { user, activeCompanyId } = useAuthStore()
  if (!user) return null
  if (user.globalRole === 'SUPER_ADMIN') return 'COMPANY_ADMIN'
  if (!activeCompanyId) return null
  return user.companyAccess.find(a => a.companyId === activeCompanyId)?.role ?? null
}

/**
 * Returns true if the current user has access to the given page key.
 * If the user has custom enabledPages set, only those pages are allowed.
 * Otherwise falls back to the role's default page set.
 */
export function usePageEnabled(pageKey: PageKey): boolean {
  const { user, activeCompanyId } = useAuthStore()
  if (!user) return false
  if (user.globalRole === 'SUPER_ADMIN') return true
  if (!activeCompanyId) return false

  const access = user.companyAccess.find(a => a.companyId === activeCompanyId)
  if (!access) return false

  const allowedPages: string[] =
    access.enabledPages.length > 0
      ? access.enabledPages
      : ROLE_DEFAULT_PAGES[access.role]

  return allowedPages.includes(pageKey)
}

export const ROLE_LABELS: Record<CompanyRole, string> = {
  COMPANY_ADMIN: 'Company Admin',
  PAYROLL_MANAGER: 'Payroll Manager',
  DEPOT_MANAGER: 'Depot Manager',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Employee',
}

export const isPayrollRole       = (r: CompanyRole | null) => r === 'COMPANY_ADMIN' || r === 'PAYROLL_MANAGER'
export const isManagerRole       = (r: CompanyRole | null) => r === 'COMPANY_ADMIN' || r === 'PAYROLL_MANAGER' || r === 'DEPOT_MANAGER'
export const isSupervisorOrAbove = (r: CompanyRole | null) => r !== null && r !== 'EMPLOYEE'
