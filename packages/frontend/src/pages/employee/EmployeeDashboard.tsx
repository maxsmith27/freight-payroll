import { useQuery } from '@tanstack/react-query'
import { Clock, MapPin, Calendar, FileText, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { formatDate } from '@/lib/utils'

type LeaveBalance = { leaveType: string; accrued: number; used: number }
type TimesheetRow = { id: string; weekStartDate: string; totalHours: number; status: string }
type KmLogRow = { id: string; logDate: string; kilometres: number; purpose: string | null; status: string }

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROCESSED: 'bg-blue-100 text-blue-800',
}

const LEAVE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual Leave',
  PERSONAL_CARERS: "Personal / Carer's",
  LONG_SERVICE: 'Long Service',
  COMPASSIONATE: 'Compassionate',
  COMMUNITY_SERVICE: 'Community Service',
}

export function EmployeeDashboard() {
  const { user } = useAuthStore()

  const { data: profile } = useQuery({
    queryKey: ['self-service', 'me'],
    queryFn: () => api.get('/self-service/me').then(r => r.data.data),
  })

  const { data: leaveData } = useQuery<{ data: LeaveBalance[] }>({
    queryKey: ['self-service', 'leave-balances'],
    queryFn: () => api.get('/self-service/leave-balances').then(r => r.data),
  })

  const { data: timesheetData } = useQuery<{ data: TimesheetRow[] }>({
    queryKey: ['self-service', 'timesheets', 1],
    queryFn: () => api.get('/self-service/timesheets?page=1&pageSize=3').then(r => r.data),
  })

  const { data: kmData } = useQuery<{ data: KmLogRow[] }>({
    queryKey: ['self-service', 'km-logs', 1],
    queryFn: () => api.get('/self-service/km-logs?page=1&pageSize=5').then(r => r.data),
  })

  const pendingTimesheets = timesheetData?.data?.filter(t => t.status === 'DRAFT') ?? []
  const pendingKmLogs = kmData?.data?.filter(k => k.status === 'DRAFT') ?? []

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">Good day, {user?.firstName} 👋</h1>
        {profile && (
          <p className="text-muted-foreground text-sm mt-1">
            {profile.position ?? profile.employmentType} · {profile.company?.name}
          </p>
        )}
      </div>

      {/* Action needed alerts */}
      {(pendingTimesheets.length > 0 || pendingKmLogs.length > 0) && (
        <div className="space-y-2">
          {pendingTimesheets.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              You have {pendingTimesheets.length} draft timesheet{pendingTimesheets.length > 1 ? 's' : ''} waiting to be submitted.
            </div>
          )}
          {pendingKmLogs.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              You have {pendingKmLogs.length} draft KM log{pendingKmLogs.length > 1 ? 's' : ''} waiting to be submitted.
            </div>
          )}
        </div>
      )}

      {/* Leave balances */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Leave Balances</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(leaveData?.data ?? []).map(lb => {
            const remaining = Number(lb.accrued) - Number(lb.used)
            return (
              <Card key={lb.leaveType} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">{LEAVE_LABELS[lb.leaveType] ?? lb.leaveType}</p>
                  <p className="text-2xl font-bold mt-1">{remaining.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">hours available</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent timesheets */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Recent Timesheets</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {(timesheetData?.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-6 text-center">No timesheets yet</p>
              )}
              {(timesheetData?.data ?? []).map((ts, i) => (
                <div key={ts.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t' : ''}`}>
                  <div>
                    <p className="text-sm font-medium">Week of {formatDate(ts.weekStartDate)}</p>
                    <p className="text-xs text-muted-foreground">{Number(ts.totalHours).toFixed(1)} hrs</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ts.status] ?? ''}`}>
                    {ts.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent KM logs */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Recent KM Logs</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {(kmData?.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground px-4 py-6 text-center">No KM logs yet</p>
              )}
              {(kmData?.data ?? []).map((km, i) => (
                <div key={km.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t' : ''}`}>
                  <div>
                    <p className="text-sm font-medium">{Number(km.kilometres).toFixed(1)} km</p>
                    <p className="text-xs text-muted-foreground">{formatDate(km.logDate)}{km.purpose ? ` · ${km.purpose}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[km.status] ?? ''}`}>
                    {km.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
