import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

type KmLog = {
  id: string
  logDate: string
  kilometres: number
  originAddress: string | null
  destinationAddress: string | null
  vehicleRego: string | null
  purpose: string | null
  status: string
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNumber: string
  }
}

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export function KmLogApprovalsPage() {
  const { activeCompanyId } = useAuthStore()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('SUBMITTED')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery<{ data: KmLog[]; total: number }>({
    queryKey: ['km-logs-manage', activeCompanyId, statusFilter],
    enabled: !!activeCompanyId,
    queryFn: () =>
      api
        .get(`/self-service/km-logs/manage?companyId=${activeCompanyId}&status=${statusFilter}&pageSize=100`)
        .then(r => r.data),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/self-service/km-logs/${id}/approve?companyId=${activeCompanyId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['km-logs-manage'] })
      toast({ title: 'KM log approved' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/self-service/km-logs/${id}/reject?companyId=${activeCompanyId}`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['km-logs-manage'] })
      setRejectId(null)
      setRejectReason('')
      toast({ title: 'KM log rejected' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="KM Log Approvals"
        description="Review and approve employee kilometre logs"
      />
      <div className="p-6 space-y-4">
        {/* Status filter */}
        <div className="flex gap-2">
          {['SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.data ?? []).length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200">
            <CardContent className="flex flex-col items-center py-12 gap-2">
              <MapPin className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-muted-foreground">No {statusFilter.toLowerCase()} KM logs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(data?.data ?? []).map(log => (
              <Card key={log.id} className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {log.employee.firstName} {log.employee.lastName}
                        <span className="text-muted-foreground font-normal ml-1">#{log.employee.employeeNumber}</span>
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[log.status] ?? ''}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5">
                      <strong>{Number(log.kilometres).toFixed(1)} km</strong>
                      {' · '}
                      {formatDate(log.logDate)}
                      {log.purpose ? ` · ${log.purpose}` : ''}
                      {log.vehicleRego ? ` · ${log.vehicleRego}` : ''}
                    </p>
                    {(log.originAddress || log.destinationAddress) && (
                      <p className="text-xs text-muted-foreground">
                        {log.originAddress}
                        {log.originAddress && log.destinationAddress ? ' → ' : ''}
                        {log.destinationAddress}
                      </p>
                    )}
                  </div>

                  {log.status === 'SUBMITTED' && (
                    <div className="flex items-center gap-1 ml-4">
                      {rejectId === log.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Rejection reason"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            className="h-8 w-40 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate({ id: log.id, reason: rejectReason })}
                            disabled={!rejectReason || rejectMutation.isPending}
                          >
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approveMutation.mutate(log.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => { setRejectId(log.id); setRejectReason('') }}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
