import { NavLink, useNavigate } from 'react-router-dom'
import {
  Users, DollarSign, Clock, Calendar, Shield, BarChart3,
  Building2, LogOut, Truck, ChevronDown, Settings, MapPin, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { useCompanyRole, ROLE_LABELS, isPayrollRole, isManagerRole, isSupervisorOrAbove } from '@/lib/roles'
import type { CompanyRole } from '@freight-payroll/shared'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  show?: (role: CompanyRole | null) => boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard',         label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/employees',         label: 'Employees',           icon: Users },
  { to: '/payroll',           label: 'Payroll',             icon: DollarSign,  show: isPayrollRole },
  { to: '/time-attendance',   label: 'Time & Attendance',   icon: Clock },
  { to: '/km-log-approvals',  label: 'KM Log Approvals',    icon: MapPin },
  { to: '/leave',             label: 'Leave',               icon: Calendar },
  { to: '/roster',            label: 'Roster',              icon: Calendar },
  { to: '/compliance',        label: 'Compliance',          icon: Shield },
  { to: '/reports',           label: 'Reports',             icon: BarChart3,   show: isManagerRole },
]

export function Sidebar() {
  const { user, activeCompanyId, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = useCompanyRole()

  const activeCompany = user?.companyAccess.find(c => c.companyId === activeCompanyId)
  const visibleItems = navItems.filter(item => !item.show || item.show(role))

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <Truck className="h-6 w-6 text-blue-400" />
        <span className="font-bold text-lg tracking-tight">FreightPayroll</span>
      </div>

      {/* Company + role */}
      <div className="px-4 py-3 border-b border-slate-700">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-800 transition-colors">
          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex-1 text-left min-w-0">
            <p className="truncate text-slate-200 text-sm leading-none">
              {activeCompany?.companyName ?? 'Select company'}
            </p>
            {role && (
              <p className="text-xs text-slate-400 mt-0.5">{ROLE_LABELS[role]}</p>
            )}
          </div>
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* ESS link — managers/supervisors can jump to their own employee portal */}
        {isSupervisorOrAbove(role) && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">My Portal</p>
            </div>
            <NavLink
              to="/employee/dashboard"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <Users className="h-4 w-4 shrink-0" />
              Employee Self Service
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 px-3 py-3 space-y-0.5">
        {isPayrollRole(role) && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      {/* User info */}
      <div className="border-t border-slate-700 px-4 py-3">
        <p className="text-xs font-medium text-slate-200">{user?.firstName} {user?.lastName}</p>
        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
      </div>
    </aside>
  )
}
