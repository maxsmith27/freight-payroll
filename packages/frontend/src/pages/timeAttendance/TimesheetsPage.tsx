import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

interface Timesheet {
  id: string
  employeeName: string
  employeeNumber: string
  weekStarting: string
  status: string
  totalHours: number
  regularHours: number
  overtimeHours: number
  entries: Array<{
    date: string
    startTime: string
    endTime: string
    breakMinutes: number
    totalHours: number
    notes: string | null
  }>
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  SUBMITTED: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

export function TimesheetsPage() {
  const { activeCompanyId } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('SUBMITTED')

  const { data, isLoading } = useQuery({
    queryKey: ['timesheets', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      const { data } = await api.get(`/companies/${activeCompanyId}/timesheets?${params}`)
      return data.data as { items: Timesheet[]; total: number }
    },
    enabled: !!activeCompanyId,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/timesheets/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] })
      toast({ title: 'Timesheet approved' })
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/timesheets/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] })
      toast({ title: 'Timesheet rejected' })
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const timesheets = data?.items ?? []

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Time &amp; Attendance"
        description={data ? `${data.total} timesheets` : ''}
        actions={
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading timesheets…</div>
            ) : timesheets.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No timesheets found for the selected filter.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Week starting</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Regular</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Overtime</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map(ts => (
                    <>
                      <tr
                        key={ts.id}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedId(expandedId === ts.id ? null : ts.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{ts.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{ts.employeeNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(ts.weekStarting)}</td>
                        <td className="px-4 py-3 text-right">{ts.regularHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {ts.overtimeHours > 0 ? `${ts.overtimeHours.toFixed(1)}h` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{ts.totalHours.toFixed(1)}h</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={STATUS_VARIANTS[ts.status] ?? 'secondary'}>{ts.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {ts.status === 'SUBMITTED' && (
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                onClick={e => { e.stopPropagation(); approveMutation.mutate(ts.id) }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={e => {
                                  e.stopPropagation()
                                  const reason = window.prompt('Reason for rejection (optional):') ?? ''
                                  rejectMutation.mutate({ id: ts.id, reason })
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedId === ts.id && (
                        <tr key={`${ts.id}-detail`} className="border-b bg-muted/20">
                          <td colSpan={7} className="px-6 py-4">
                            <table className="w-full text-xs">
                              <thead>
                                <tr>
                                  <th className="text-left font-medium text-muted-foreground pb-2">Date</th>
                                  <th className="text-left font-medium text-muted-foreground pb-2">Start</th>
                                  <th className="text-left font-medium text-muted-foreground pb-2">End</th>
                                  <th className="text-right font-medium text-muted-foreground pb-2">Break</th>
                                  <th className="text-right font-medium text-muted-foreground pb-2">Hours</th>
                                  <th className="text-left font-medium text-muted-foreground pb-2 pl-4">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ts.entries.map((e, i) => (
                                  <tr key={i} className="border-t">
                                    <td className="py-1.5">{formatDate(e.date)}</td>
                                    <td className="py-1.5">{e.startTime}</td>
                                    <td className="py-1.5">{e.endTime}</td>
                                    <td className="py-1.5 text-right text-muted-foreground">{e.breakMinutes}m</td>
                                    <td className="py-1.5 text-right font-medium">{e.totalHours.toFixed(2)}h</td>
                                    <td className="py-1.5 pl-4 text-muted-foreground">{e.notes ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
