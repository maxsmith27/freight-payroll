import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Plus, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'

type LeaveBalance = { id: string; leaveType: string; accrued: number; used: number }
type LeaveRequest = {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  totalHours: number
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

interface NewRequestForm {
  leaveType: string
  startDate: string
  endDate: string
  totalHours: string
  reason: string
}

const LEAVE_TYPE_OPTIONS = [
  { value: 'ANNUAL',           label: 'Annual Leave' },
  { value: 'PERSONAL_CARERS',  label: "Personal / Carer's Leave" },
  { value: 'COMPASSIONATE',    label: 'Compassionate Leave' },
  { value: 'LONG_SERVICE',     label: 'Long Service Leave' },
  { value: 'PARENTAL',         label: 'Parental Leave' },
  { value: 'COMMUNITY_SERVICE',label: 'Community Service Leave' },
  { value: 'UNPAID',           label: 'Unpaid Leave' },
]

export function EmployeeLeave() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewRequestForm>({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    totalHours: '',
    reason: '',
  })
  const [formError, setFormError] = useState('')

  const { data: balances, isLoading: loadingBalances } = useQuery<{ data: LeaveBalance[] }>({
    queryKey: ['self-service', 'leave-balances'],
    queryFn: () => api.get('/self-service/leave-balances').then(r => r.data),
  })

  const { data: requests, isLoading: loadingRequests, refetch: refetchRequests } = useQuery<{ data: LeaveRequest[] }>({
    queryKey: ['self-service', 'leave-requests'],
    queryFn: () => api.get('/self-service/leave-requests').then(r => r.data),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post('/self-service/leave-requests', {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        totalHours: parseFloat(form.totalHours),
        reason: form.reason || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['self-service', 'leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['self-service', 'leave-balances'] })
      const warning = res.data.data?.warning
      toast({
        title: 'Leave request submitted',
        description: warning ?? 'Your request has been sent to your manager for approval.',
      })
      setShowForm(false)
      setForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', totalHours: '', reason: '' })
      setFormError('')
    },
    onError: err => setFormError(apiError(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/self-service/leave-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-service', 'leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['self-service', 'leave-balances'] })
      toast({ title: 'Leave request cancelled' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  function handleSubmit() {
    setFormError('')
    if (!form.startDate || !form.endDate) { setFormError('Start and end date are required.'); return }
    if (!form.totalHours || isNaN(parseFloat(form.totalHours))) { setFormError('Enter the total hours to take.'); return }
    if (parseFloat(form.totalHours) <= 0) { setFormError('Hours must be greater than 0.'); return }
    submitMutation.mutate()
  }

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

      {/* Request leave */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Request Leave</h2>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> New request
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-0 shadow-sm mb-4">
            <CardContent className="pt-4 pb-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Leave type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.leaveType}
                    onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
                  >
                    {LEAVE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>From date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>To date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total hours</Label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={form.totalHours}
                    onChange={e => setForm(p => ({ ...p, totalHours: e.target.value }))}
                    placeholder="e.g. 7.6"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reason <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Submit request
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setFormError('') }}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
                      {Number(req.totalHours).toFixed(1)} hrs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                      {req.reason ? ` · ${req.reason}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status] ?? ''}`}>
                      {req.status}
                    </span>
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => cancelMutation.mutate(req.id)}
                        disabled={cancelMutation.isPending}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
