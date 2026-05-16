import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MapPin, ExternalLink, Trash2, Send, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type KmLog = {
  id: string
  logDate: string
  kilometres: number
  originAddress: string | null
  destinationAddress: string | null
  vehicleRego: string | null
  purpose: string | null
  notes: string | null
  status: string
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROCESSED: 'bg-blue-100 text-blue-800',
}

const BLANK_FORM = {
  logDate: new Date().toISOString().slice(0, 10),
  kilometres: '',
  originAddress: '',
  destinationAddress: '',
  vehicleRego: '',
  purpose: '',
  notes: '',
}

export function EmployeeKmLog() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(BLANK_FORM)

  const { data, isLoading } = useQuery<{ data: KmLog[]; total: number }>({
    queryKey: ['self-service', 'km-logs'],
    queryFn: () => api.get('/self-service/km-logs?pageSize=100').then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload: typeof form) => {
      const body = {
        logDate: payload.logDate,
        kilometres: parseFloat(payload.kilometres as string),
        originAddress: payload.originAddress || undefined,
        destinationAddress: payload.destinationAddress || undefined,
        vehicleRego: payload.vehicleRego || undefined,
        purpose: payload.purpose || undefined,
        notes: payload.notes || undefined,
      }
      return editingId
        ? api.put(`/self-service/km-logs/${editingId}`, body)
        : api.post('/self-service/km-logs', body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'km-logs'] })
      qc.invalidateQueries({ queryKey: ['self-service', 'me'] })
      toast({ title: editingId ? 'KM log updated' : 'KM log saved as draft' })
      setShowForm(false)
      setEditingId(null)
      setForm(BLANK_FORM)
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/self-service/km-logs/${id}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'km-logs'] })
      toast({ title: 'KM log submitted for approval' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/self-service/km-logs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'km-logs'] })
      toast({ title: 'KM log deleted' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  function openNew() {
    setEditingId(null)
    setForm({ ...BLANK_FORM, logDate: new Date().toISOString().slice(0, 10) })
    setShowForm(true)
  }

  function openEdit(log: KmLog) {
    setEditingId(log.id)
    setForm({
      logDate: log.logDate.slice(0, 10),
      kilometres: String(log.kilometres),
      originAddress: log.originAddress ?? '',
      destinationAddress: log.destinationAddress ?? '',
      vehicleRego: log.vehicleRego ?? '',
      purpose: log.purpose ?? '',
      notes: log.notes ?? '',
    })
    setShowForm(true)
  }

  function getMapsUrl() {
    if (!form.originAddress && !form.destinationAddress) return null
    const origin = encodeURIComponent(form.originAddress || '')
    const dest = encodeURIComponent(form.destinationAddress || '')
    return `https://www.google.com/maps/dir/${origin}/${dest}/`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KM Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Record kilometres driven for payroll reimbursement</p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Log KMs
        </Button>
      </div>

      {/* Logs list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (data?.data ?? []).length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <MapPin className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">No KM logs yet. Click "Log KMs" to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map(log => (
            <Card key={log.id} className="border-0 shadow-sm">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">{Number(log.kilometres).toFixed(1)} km</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[log.status] ?? ''}`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(log.logDate)}
                    {log.originAddress && log.destinationAddress
                      ? ` · ${log.originAddress} → ${log.destinationAddress}`
                      : log.originAddress
                      ? ` · From: ${log.originAddress}`
                      : ''}
                    {log.purpose ? ` · ${log.purpose}` : ''}
                    {log.vehicleRego ? ` · ${log.vehicleRego}` : ''}
                  </p>
                </div>
                {log.status === 'DRAFT' && (
                  <div className="flex items-center gap-1 ml-4">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(log)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => submitMutation.mutate(log.id)}>
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(log.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={open => { setShowForm(open); if (!open) setEditingId(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit KM Log' : 'Log KMs'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.logDate}
                  onChange={e => setForm(f => ({ ...f, logDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Kilometres *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                  value={form.kilometres}
                  onChange={e => setForm(f => ({ ...f, kilometres: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Origin (start address)</Label>
              <Input
                placeholder="e.g. Sydney Depot, 123 Parramatta Rd"
                value={form.originAddress}
                onChange={e => setForm(f => ({ ...f, originAddress: e.target.value }))}
              />
            </div>

            <div>
              <Label>Destination</Label>
              <Input
                placeholder="e.g. Customer – 456 George St Melbourne"
                value={form.destinationAddress}
                onChange={e => setForm(f => ({ ...f, destinationAddress: e.target.value }))}
              />
              {getMapsUrl() && (
                <a
                  href={getMapsUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Check route on Google Maps
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle rego</Label>
                <Input
                  placeholder="e.g. ABC123"
                  value={form.vehicleRego}
                  onChange={e => setForm(f => ({ ...f, vehicleRego: e.target.value }))}
                />
              </div>
              <div>
                <Label>Purpose</Label>
                <Input
                  placeholder="e.g. Delivery run"
                  value={form.purpose}
                  onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.logDate || !form.kilometres}
              >
                Save as draft
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
