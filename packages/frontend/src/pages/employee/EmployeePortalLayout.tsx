import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { Truck, LayoutDashboard, Clock, MapPin, Calendar, FileText, LogOut, User, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { usePageEnabled } from '@/lib/roles'
import { ESS_PAGES } from '@freight-payroll/shared'
import type { EssPageKey } from '@freight-payroll/shared'
import { api } from '@/lib/api'
import { Toaster } from '@/components/ui/toaster'

const allNavItems = [
  { to: '/employee/dashboard',     label: 'Dashboard',     icon: LayoutDashboard, pageKey: ESS_PAGES.DASHBOARD  as EssPageKey },
  { to: '/employee/profile',       label: 'My Profile',    icon: User,            pageKey: ESS_PAGES.DASHBOARD  as EssPageKey },
  { to: '/employee/bank-accounts', label: 'My Bank',       icon: CreditCard,      pageKey: ESS_PAGES.DASHBOARD  as EssPageKey },
  { to: '/employee/timesheets',    label: 'My Timesheets', icon: Clock,           pageKey: ESS_PAGES.TIMESHEETS as EssPageKey },
  { to: '/employee/km-log',        label: 'KM Log',        icon: MapPin,          pageKey: ESS_PAGES.KM_LOG     as EssPageKey },
  { to: '/employee/leave',         label: 'Leave',         icon: Calendar,        pageKey: ESS_PAGES.LEAVE      as EssPageKey },
  { to: '/employee/payslips',      label: 'Payslips',      icon: FileText,        pageKey: ESS_PAGES.PAYSLIPS   as EssPageKey },
]

export function EmployeePortalLayout() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const pageEnabled = usePageEnabled
  const navItems = allNavItems.filter(item => pageEnabled(item.pageKey))

  if (!isAuthenticated) return <Navigate to="/login" replace />

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch {}
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex h-screen w-60 flex-col border-r bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-700">
          <Truck className="h-5 w-5 text-blue-400" />
          <div>
            <p className="font-bold text-sm tracking-tight leading-none">FreightPayroll</p>
            <p className="text-xs text-slate-400 mt-0.5">Employee Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
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
        </nav>

        <div className="border-t border-slate-700 px-3 py-3">
          <div className="flex items-center gap-2 px-3 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <Toaster />
    </div>
  )
}
