import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type LeaveBalance = { id: string; leaveType: string; accrued: number; used: number }
type LeaveRequest = {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  hours: number
  status: string
  reason: string | null
}

const LEAVE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual Leave',
  PERSONAL_CARERS: "Personal / Carer's",
  LONG_SERVICE: 'Long Service Leave',
  COMPASSIONATE: 'Compassionate Leave',
  COMMUNITY_SERVICE: 'Community Service',
  PARENTAL: 'Parental Leave',
  UNPAID: 'Unpaid Leave',
  PUBLIC_HOLIDAY: 'Public Holiday',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-700',
  PROCESSED: 'bg-blue-100 text-blue-800',
}

export function EmployeeLeave() {
  const { data: balances, isLoading: loadingBalances } = useQuery<{ data: LeaveBalance[] }>({
    queryKey: ['self-service', 'leave-balances'],
    queryFn: () => api.get('/self-service/leave-balances').then(r => r.data),
  })

  const { data: requests, isLoading: loadingRequests } = useQuery<{ data: LeaveRequest[] }>({
    queryKey: ['self-service', 'leave-requests'],
    queryFn: () => api.get('/self-service/leave-requests').then(r => r.data),
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Leave</h1>
        <p className="text-sm text-muted-foreground mt-0.5">View your leave balances and request history</p>
      </div>

      {/* Balances */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Leave Balances</h2>
        {loadingBalances ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(balances?.data ?? []).map(lb => {
              const remaining = Number(lb.accrued) - Number(lb.used)
              const pct = Number(lb.accrued) > 0 ? (Number(lb.used) / Number(lb.accrued)) * 100 : 0
              return (
                <Card key={lb.id} className="border-0 shadow-sm">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">{LEAVE_LABELS[lb.leaveType] ?? lb.leaveType}</p>
                    <p className="text-2xl font-bold mt-1">{remaining.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">hrs available</p>
                    {/* simple progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Number(lb.used).toFixed(1)} of {Number(lb.accrued).toFixed(1)} hrs used
                    </p>
                  </CardContent>
                </Card>
              )
            })}
            {(balances?.data ?? []).length === 0 && (
              <p className="col-span-3 text-sm text-muted-foreground">No leave balances found.</p>
            )}
          </div>
        )}
      </div>

      {/* To request leave — info note */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
        To submit a leave request, contact your payroll manager or supervisor directly.
      </div>

      {/* Leave history */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Leave History</h2>
        {loadingRequests ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (requests?.data ?? []).length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center py-10 gap-2">
              <Calendar className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-muted-foreground">No leave requests on record.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(requests?.data ?? []).map(req => (
              <Card key={req.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">
                      {LEAVE_LABELS[req.leaveType] ?? req.leaveType}
                      {' · '}
                      {Number(req.hours).toFixed(1)} hrs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                      {req.reason ? ` · ${req.reason}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status] ?? ''}`}>
                    {req.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
