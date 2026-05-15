import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface LeaveRequest {
  id: string
  employeeName: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  durationDays: number
  status: string
  notes: string | null
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual leave',
  PERSONAL_CARERS: 'Personal / carer\'s',
  COMPASSIONATE: 'Compassionate',
  LONG_SERVICE: 'Long service leave',
  PARENTAL: 'Parental leave',
  COMMUNITY_SERVICE: 'Community service',
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'destructive',
}

const requestSchema = z.object({
  employeeId: z.string().min(1, 'Required'),
  leaveType: z.enum(['ANNUAL', 'PERSONAL_CARERS', 'COMPASSIONATE', 'LONG_SERVICE', 'PARENTAL', 'COMMUNITY_SERVICE']),
  startDate: z.string().min(1, 'Required'),
  endDate: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})
type RequestForm = z.infer<typeof requestSchema>

export function LeavePage() {
  const { activeCompanyId } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showDialog, setShowDialog] = useState(false)
  const [statusFilter, setStatusFilter] = useState('PENDING')

  const { data, isLoading } = useQuery({
    queryKey: ['leave-requests', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/companies/${activeCompanyId}/leave/requests?${params}`)
      return data.data as { items: LeaveRequest[]; total: number }
    },
    enabled: !!activeCompanyId,
  })

  const { data: employees } = useQuery({
    queryKey: ['employees-simple', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}/employees?limit=200`)
      return data.data.items as Array<{ id: string; firstName: string; lastName: string }>
    },
    enabled: !!activeCompanyId,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/leave/requests/${id}/approve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); toast({ title: 'Leave approved' }) },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/leave/requests/${id}/reject`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); toast({ title: 'Leave rejected' }) },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: { leaveType: 'ANNUAL' },
  })

  const createMutation = useMutation({
    mutationFn: (values: RequestForm) => api.post(`/leave/requests`, { ...values, companyId: activeCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      toast({ title: 'Leave request created' })
      setShowDialog(false)
      reset()
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const requests = data?.items ?? []

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Leave"
        description="Leave requests and balances"
        actions={
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Button size="sm" onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" />
              New request
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No leave requests found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">To</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Days</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{req.employeeName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{LEAVE_TYPE_LABELS[req.leaveType] ?? req.leaveType}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.startDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.endDate)}</td>
                      <td className="px-4 py-3 text-center">{req.durationDays}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_VARIANTS[req.status] ?? 'secondary'}>{req.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'PENDING' && (
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-green-600"
                              onClick={() => approveMutation.mutate(req.id)}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => {
                                const reason = window.prompt('Reason (optional):') ?? ''
                                rejectMutation.mutate({ id: req.id, reason })
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New leave request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(v => createMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('employeeId')}>
                <option value="">Select employee…</option>
                {(employees ?? []).map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
              {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Leave type *</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('leaveType')}>
                {(Object.entries(LEAVE_TYPE_LABELS) as [string, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start date *</Label>
                <Input type="date" {...register('startDate')} />
              </div>
              <div className="space-y-1.5">
                <Label>End date *</Label>
                <Input type="date" {...register('endDate')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input {...register('notes')} placeholder="Optional reason or notes" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>Submit request</Button>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
