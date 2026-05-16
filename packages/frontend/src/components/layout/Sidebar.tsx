import { NavLink, useNavigate } from 'react-router-dom'
import {
  Users, DollarSign, Clock, Calendar, Shield, BarChart3,
  Building2, LogOut, Truck, ChevronDown, Settings, MapPin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/payroll', label: 'Payroll', icon: DollarSign },
  { to: '/time-attendance', label: 'Time & Attendance', icon: Clock },
  { to: '/km-log-approvals', label: 'KM Log Approvals', icon: MapPin },
  { to: '/leave', label: 'Leave', icon: Calendar },
  { to: '/roster', label: 'Roster', icon: Calendar },
  { to: '/compliance', label: 'Compliance', icon: Shield },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

export function Sidebar() {
  const { user, activeCompanyId, logout } = useAuthStore()
  const navigate = useNavigate()

  const activeCompany = user?.companyAccess.find(c => c.companyId === activeCompanyId)

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch {}
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

      {/* Company selector */}
      <div className="px-4 py-3 border-b border-slate-700">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-slate-800 transition-colors">
          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="flex-1 text-left truncate text-slate-200">
            {activeCompany?.companyName ?? 'Select company'}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
      </div>

      {/* Navigation */}
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

      {/* Footer */}
      <div className="border-t border-slate-700 px-3 py-3 space-y-0.5">
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
