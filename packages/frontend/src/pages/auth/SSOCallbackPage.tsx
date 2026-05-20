import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Truck } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

export function SSOCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore(s => s.setAuth)
  const [error, setError] = useState('')

  useEffect(() => {
    const accessToken = searchParams.get('accessToken')
    const refreshToken = searchParams.get('refreshToken')

    if (!accessToken || !refreshToken) {
      setError('SSO sign-in failed — missing tokens. Please try again.')
      return
    }

    // Store tokens then fetch the session
    const tokens = { accessToken, refreshToken }

    api.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => {
        const user = r.data.data
        setAuth(user, tokens)
        const roles = user.companyAccess.map((a: any) => a.role)
        const isEmployeeOnly = roles.length > 0 && roles.every((r: string) => r === 'EMPLOYEE')
        navigate(isEmployeeOnly ? '/employee/dashboard' : '/dashboard', { replace: true })
      })
      .catch(() => {
        setError('SSO sign-in failed — could not load your profile. Please try again.')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-blue-700">
            <Truck className="h-8 w-8" />
            <span className="text-2xl font-bold">FreightPayroll</span>
          </div>
          <p className="text-sm text-destructive">{error}</p>
          <a href="/login" className="text-sm text-blue-600 hover:underline">
            Back to sign in
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
