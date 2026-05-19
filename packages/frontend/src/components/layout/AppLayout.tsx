import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyRole } from '@/lib/roles'

export function AppLayout() {
  const { isAuthenticated } = useAuthStore()
  const role = useCompanyRole()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Pure employee accounts belong in the ESS portal, not the admin app
  if (role === 'EMPLOYEE') return <Navigate to="/employee/dashboard" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
