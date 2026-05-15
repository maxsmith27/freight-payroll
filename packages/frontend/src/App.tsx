import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { EmployeesPage } from '@/pages/employees/EmployeesPage'
import { NewEmployeePage } from '@/pages/employees/NewEmployeePage'
import { EmployeeDetailPage } from '@/pages/employees/EmployeeDetailPage'
import { PayRunsPage } from '@/pages/payroll/PayRunsPage'
import { NewPayRunPage } from '@/pages/payroll/NewPayRunPage'
import { PayRunDetailPage } from '@/pages/payroll/PayRunDetailPage'
import { TimesheetsPage } from '@/pages/timeAttendance/TimesheetsPage'
import { LeavePage } from '@/pages/leave/LeavePage'
import { RosterPage } from '@/pages/rostering/RosterPage'
import { CompliancePage } from '@/pages/compliance/CompliancePage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/new', element: <NewEmployeePage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'payroll', element: <PayRunsPage /> },
      { path: 'payroll/new', element: <NewPayRunPage /> },
      { path: 'payroll/:id', element: <PayRunDetailPage /> },
      { path: 'time-attendance', element: <TimesheetsPage /> },
      { path: 'leave', element: <LeavePage /> },
      { path: 'roster', element: <RosterPage /> },
      { path: 'compliance', element: <CompliancePage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

export function App() {
  return <RouterProvider router={router} />
}
