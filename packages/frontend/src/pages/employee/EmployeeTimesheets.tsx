import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight, Send, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'

type TimesheetEntry = {
  id: string
  entryDate: string
  clockIn: string | null
  clockOut: string | null
  totalHours: number
  ordinaryHours: number
  overtimeHours: number
  notes: string | null
}

type Timesheet = {
  id: string
  weekStartDate: string
  weekEndDate: string
  status: string
  totalHours: number
  totalOrdinaryHours: number
  totalOvertimeHours: number
  entries: TimesheetEntry[]
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PROCESSED: 'bg-blue-100 text-blue-800',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMondayOf(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateStr(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toTimeStr(dt: string | null) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toDateTimeLocal(dateStr: string, timeStr: string) {
  if (!timeStr) return null
  return `${dateStr}T${timeStr}:00`
}

type DayEntry = { clockIn: string; clockOut: string; breakMinutes: string; notes: string }

function buildBlankWeek(weekStart: Date): Record<string, DayEntry> {
  const entries: Record<string, DayEntry> = {}
  for (let i = 0; i < 7; i++) {
    entries[toDateStr(addDays(weekStart, i))] = { clockIn: '', clockOut: '', breakMinutes: '0', notes: '' }
  }
  return entries
}

export function EmployeeTimesheets() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()))
  const [editing, setEditing] = useState(false)
  const [dayEntries, setDayEntries] = useState<Record<string, DayEntry>>(() => buildBlankWeek(getMondayOf(new Date())))

  const { data: timesheetData, isLoading } = useQuery<{ data: Timesheet[] }>({
    queryKey: ['self-service', 'timesheets'],
    queryFn: () => api.get('/self-service/timesheets?pageSize=52').then(r => r.data),
  })

  const weekKey = toDateStr(weekStart)
  const currentSheet = timesheetData?.data?.find(t => toDateStr(new Date(t.weekStartDate)) === weekKey)

  function startEditing() {
    const entries = buildBlankWeek(weekStart)
    if (currentSheet) {
      for (const e of currentSheet.entries) {
        const key = toDateStr(new Date(e.entryDate))
        entries[key] = {
          clockIn: toTimeStr(e.clockIn),
          clockOut: toTimeStr(e.clockOut),
          breakMinutes: '0',
          notes: e.notes ?? '',
        }
      }
    }
    setDayEntries(entries)
    setEditing(true)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(dayEntries)
        .filter(([, e]) => e.clockIn && e.clockOut)
        .map(([date, e]) => ({
          entryDate: date,
          clockIn: toDateTimeLocal(date, e.clockIn)!,
          clockOut: toDateTimeLocal(date, e.clockOut)!,
          breakMinutes: parseInt(e.breakMinutes) || 0,
          notes: e.notes || undefined,
        }))

      return api.post('/self-service/timesheets', {
        weekStartDate: weekKey,
        entries,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'timesheets'] })
      toast({ title: 'Timesheet saved' })
      setEditing(false)
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/self-service/timesheets/${id}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['self-service', 'timesheets'] })
      toast({ title: 'Timesheet submitted for approval' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  function prevWeek() {
    setWeekStart(w => addDays(w, -7))
    setEditing(false)
  }

  function nextWeek() {
    setWeekStart(w => addDays(w, 7))
    setEditing(false)
  }

  const weekEnd = addDays(weekStart, 6)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Timesheets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Log your hours each week and submit for approval</p>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          Week of {formatDate(toDateStr(weekStart))} – {formatDate(toDateStr(weekEnd))}
        </span>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {currentSheet && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[currentSheet.status] ?? ''}`}>
            {currentSheet.status}
          </span>
        )}
      </div>

      {/* Weekly totals summary (read mode) */}
      {currentSheet && !editing && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{Number(currentSheet.totalHours).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Total hours</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{Number(currentSheet.totalOrdinaryHours).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Ordinary</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{Number(currentSheet.totalOvertimeHours).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Overtime</p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-1 font-medium">Day</th>
                  <th className="text-left py-1 font-medium">Start</th>
                  <th className="text-left py-1 font-medium">Finish</th>
                  <th className="text-right py-1 font-medium">Hours</th>
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, i) => {
                  const date = toDateStr(addDays(weekStart, i))
                  const entry = currentSheet.entries.find(e => toDateStr(new Date(e.entryDate)) === date)
                  return (
                    <tr key={day} className="border-b last:border-0">
                      <td className="py-1.5 text-muted-foreground">{day}</td>
                      <td className="py-1.5">{entry?.clockIn ? toTimeStr(entry.clockIn) : '–'}</td>
                      <td className="py-1.5">{entry?.clockOut ? toTimeStr(entry.clockOut) : '–'}</td>
                      <td className="py-1.5 text-right">{entry ? Number(entry.totalHours).toFixed(1) : '–'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex gap-2 mt-4">
              {currentSheet.status === 'DRAFT' && (
                <>
                  <Button size="sm" variant="outline" onClick={startEditing}>Edit hours</Button>
                  <Button size="sm" onClick={() => submitMutation.mutate(currentSheet.id)} disabled={submitMutation.isPending}>
                    <Send className="h-4 w-4 mr-1" /> Submit for approval
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit / Create form */}
      {(!currentSheet || editing) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {!editing && !currentSheet && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Clock className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">No timesheet for this week yet.</p>
                <Button size="sm" onClick={startEditing}>
                  <Plus className="h-4 w-4 mr-1" /> Enter hours
                </Button>
              </div>
            )}

            {editing && (
              <div className="space-y-4">
                <p className="text-sm font-medium">Enter your hours for the week</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b">
                      <th className="text-left py-1 font-medium w-12">Day</th>
                      <th className="text-left py-1 font-medium">Start</th>
                      <th className="text-left py-1 font-medium">Finish</th>
                      <th className="text-left py-1 font-medium w-20">Break (min)</th>
                      <th className="text-left py-1 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day, i) => {
                      const date = toDateStr(addDays(weekStart, i))
                      const entry = dayEntries[date]
                      return (
                        <tr key={day} className="border-b last:border-0">
                          <td className="py-2 text-muted-foreground font-medium">{day}</td>
                          <td className="py-2 pr-2">
                            <Input
                              type="time"
                              value={entry.clockIn}
                              onChange={e => setDayEntries(d => ({ ...d, [date]: { ...d[date], clockIn: e.target.value } }))}
                              className="h-8 w-28"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="time"
                              value={entry.clockOut}
                              onChange={e => setDayEntries(d => ({ ...d, [date]: { ...d[date], clockOut: e.target.value } }))}
                              className="h-8 w-28"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              min="0"
                              value={entry.breakMinutes}
                              onChange={e => setDayEntries(d => ({ ...d, [date]: { ...d[date], breakMinutes: e.target.value } }))}
                              className="h-8 w-16"
                            />
                          </td>
                          <td className="py-2">
                            <Input
                              placeholder="Optional"
                              value={entry.notes}
                              onChange={e => setDayEntries(d => ({ ...d, [date]: { ...d[date], notes: e.target.value } }))}
                              className="h-8"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    Save timesheet
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past timesheets list */}
      {(timesheetData?.data ?? []).length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">All Timesheets</h2>
          <div className="space-y-1">
            {(timesheetData?.data ?? []).map(ts => (
              <button
                key={ts.id}
                onClick={() => {
                  setWeekStart(getMondayOf(new Date(ts.weekStartDate)))
                  setEditing(false)
                }}
                className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <span>Week of {formatDate(ts.weekStartDate)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{Number(ts.totalHours).toFixed(1)} hrs</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[ts.status] ?? ''}`}>
                    {ts.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
