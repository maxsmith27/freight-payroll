import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { SSOCallbackPage } from '@/pages/auth/SSOCallbackPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EmployeesPage } from '@/pages/employees/EmployeesPage'
import { NewEmployeePage } from '@/pages/employees/NewEmployeePage'
import { EmployeeDetailPage } from '@/pages/employees/EmployeeDetailPage'
import { PayRunsPage } from '@/pages/payroll/PayRunsPage'
import { NewPayRunPage } from '@/pages/payroll/NewPayRunPage'
import { PayRunDetailPage } from '@/pages/payroll/PayRunDetailPage'
import { TimesheetsPage } from '@/pages/timeAttendance/TimesheetsPage'
import { KmLogApprovalsPage } from '@/pages/timeAttendance/KmLogApprovalsPage'
import { LeavePage } from '@/pages/leave/LeavePage'
import { RosterPage } from '@/pages/rostering/RosterPage'
import { CompliancePage } from '@/pages/compliance/CompliancePage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { EmployeePortalLayout } from '@/pages/employee/EmployeePortalLayout'
import { EmployeeDashboard } from '@/pages/employee/EmployeeDashboard'
import { EmployeeTimesheets } from '@/pages/employee/EmployeeTimesheets'
import { EmployeeKmLog } from '@/pages/employee/EmployeeKmLog'
import { EmployeeLeave } from '@/pages/employee/EmployeeLeave'
import { EmployeePayslips } from '@/pages/employee/EmployeePayslips'
import { useCompanyRole, isPayrollRole, isManagerRole } from '@/lib/roles'
import type { CompanyRole } from '@freight-payroll/shared'

// ─── Role guard ────────────────────────────────────────────────────────────────
// Redirects to /dashboard if the user's role isn't in the allowed list.
// Must be rendered inside AppLayout (so the user is already authenticated).
function RoleGuard({ roles, children }: { roles: CompanyRole[]; children: ReactNode }) {
  const role = useCompanyRole()
  if (!role || !roles.includes(role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const PAYROLL_ROLES: CompanyRole[] = ['COMPANY_ADMIN', 'PAYROLL_MANAGER']
const MANAGER_ROLES: CompanyRole[] = ['COMPANY_ADMIN', 'PAYROLL_MANAGER', 'DEPOT_MANAGER']

const router = createBrowserRouter([
  { path: '/login',         element: <LoginPage /> },
  { path: '/register',      element: <RegisterPage /> },
  { path: '/auth/callback', element: <SSOCallbackPage /> },

  // ── Employee self-service portal ─────────────────────────────────────────
  // Accessible by all authenticated users (employees land here automatically;
  // managers/supervisors can reach it via the "My Portal" sidebar link)
  {
    path: '/employee',
    element: <EmployeePortalLayout />,
    children: [
      { index: true,              element: <Navigate to="/employee/dashboard" replace /> },
      { path: 'dashboard',        element: <EmployeeDashboard /> },
      { path: 'timesheets',       element: <EmployeeTimesheets /> },
      { path: 'km-log',           element: <EmployeeKmLog /> },
      { path: 'leave',            element: <EmployeeLeave /> },
      { path: 'payslips',         element: <EmployeePayslips /> },
    ],
  },

  // ── Admin / management app ────────────────────────────────────────────────
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // Available to all non-employee roles
      { path: 'dashboard',        element: <DashboardPage /> },
      { path: 'employees',        element: <EmployeesPage /> },
      { path: 'employees/new',    element: <EmployeesPage /> },
      { path: 'employees/:id',    element: <EmployeeDetailPage /> },
      { path: 'time-attendance',  element: <TimesheetsPage /> },
      { path: 'km-log-approvals', element: <KmLogApprovalsPage /> },
      { path: 'leave',            element: <LeavePage /> },
      { path: 'roster',           element: <RosterPage /> },
      { path: 'compliance',       element: <CompliancePage /> },

      // Reports — COMPANY_ADMIN, PAYROLL_MANAGER, DEPOT_MANAGER
      {
        path: 'reports',
        element: <RoleGuard roles={MANAGER_ROLES}><ReportsPage /></RoleGuard>,
      },

      // Payroll — COMPANY_ADMIN and PAYROLL_MANAGER only
      {
        path: 'payroll',
        element: <RoleGuard roles={PAYROLL_ROLES}><PayRunsPage /></RoleGuard>,
      },
      {
        path: 'payroll/new',
        element: <RoleGuard roles={PAYROLL_ROLES}><NewPayRunPage /></RoleGuard>,
      },
      {
        path: 'payroll/:id',
        element: <RoleGuard roles={PAYROLL_ROLES}><PayRunDetailPage /></RoleGuard>,
      },

      // Settings — COMPANY_ADMIN and PAYROLL_MANAGER only
      {
        path: 'settings',
        element: <RoleGuard roles={PAYROLL_ROLES}><SettingsPage /></RoleGuard>,
      },
    ],
  },

  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export function App() {
  return <RouterProvider router={router} />
}
