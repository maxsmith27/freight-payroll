import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { formatDateShort } from '@/lib/utils'

interface RosterShift {
  id: string
  employeeId: string
  employeeName: string
  date: string
  startTime: string
  endTime: string
  depotName: string | null
  vehicleRego: string | null
  shiftType: string
  isPublished: boolean
  hasConflict: boolean
  conflictReason: string | null
}

function getWeekDates(baseDate: Date): Date[] {
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function RosterPage() {
  const { activeCompanyId } = useAuthStore()
  const [weekOffset, setWeekOffset] = useState(0)

  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const weekStart = weekDates[0].toISOString().split('T')[0]
  const weekEnd = weekDates[6].toISOString().split('T')[0]

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['roster', activeCompanyId, weekStart],
    queryFn: async () => {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/roster?startDate=${weekStart}&endDate=${weekEnd}`
      )
      return data.data as RosterShift[]
    },
    enabled: !!activeCompanyId,
  })

  // Group shifts by employee
  const employees = Array.from(
    new Map((shifts ?? []).map(s => [s.employeeId, s.employeeName])).entries()
  )

  const shiftsByKey = new Map<string, RosterShift[]>()
  for (const shift of shifts ?? []) {
    const key = `${shift.employeeId}:${shift.date}`
    if (!shiftsByKey.has(key)) shiftsByKey.set(key, [])
    shiftsByKey.get(key)!.push(shift)
  }

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Roster"
        description={`Week of ${weekDates[0].toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(0)}>
              This week
            </Button>
            <Button size="sm" variant="outline" onClick={() => setWeekOffset(w => w + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading roster…</div>
            ) : (
              <table className="w-full text-xs min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Employee</th>
                    {weekDates.map((d, i) => (
                      <th key={i} className="px-2 py-3 text-center font-medium text-muted-foreground">
                        <div>{DAY_LABELS[i]}</div>
                        <div className="font-normal text-muted-foreground/70">
                          {d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No shifts rostered for this week.
                      </td>
                    </tr>
                  ) : (
                    employees.map(([empId, empName]) => (
                      <tr key={empId} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium text-sm">{empName}</td>
                        {weekDates.map((d, i) => {
                          const dateStr = d.toISOString().split('T')[0]
                          const dayShifts = shiftsByKey.get(`${empId}:${dateStr}`) ?? []
                          return (
                            <td key={i} className="px-1 py-1.5 align-top">
                              {dayShifts.map(s => (
                                <div
                                  key={s.id}
                                  className={`rounded px-2 py-1 mb-1 text-xs ${
                                    s.hasConflict
                                      ? 'bg-red-100 text-red-800'
                                      : s.isPublished
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  <div className="font-medium">{s.startTime}–{s.endTime}</div>
                                  {s.depotName && <div className="opacity-75 truncate">{s.depotName}</div>}
                                  {s.hasConflict && (
                                    <div className="text-red-600 font-medium">⚠ Conflict</div>
                                  )}
                                </div>
                              ))}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-blue-100" />
            Published
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-slate-100" />
            Draft
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-red-100" />
            Conflict
          </div>
        </div>
      </div>
    </div>
  )
}
