import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { formatCurrency, employmentTypeLabel, getInitials, awardLabel } from '@/lib/utils'

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  employmentType: string
  awardCode: string | null
  classificationLevel: string | null
  depotName: string | null
  currentPayRate: { baseRate: number; payType: string } | null
  isActive: boolean
}

const EMPLOYMENT_TYPES = ['', 'FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR']
const AWARD_CODES = ['', 'MA000038', 'MA000039']

export function EmployeesPage() {
  const { activeCompanyId } = useAuthStore()
  const [search, setSearch] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [awardCode, setAwardCode] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['employees', activeCompanyId, search, employmentType, awardCode],
    queryFn: async () => {
      const params = new URLSearchParams({ companyId: activeCompanyId!, page: '1', pageSize: '50' })
      if (search) params.set('search', search)
      if (employmentType) params.set('employmentType', employmentType)
      if (awardCode) params.set('awardCode', awardCode)
      const { data } = await api.get(`/employees?${params}`)
      return data as { data: Employee[]; total: number; page: number; pageSize: number }
    },
    enabled: !!activeCompanyId,
  })

  const employees = data?.data ?? []

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Employees"
        description={data ? `${data.total} employees` : ''}
        actions={
          <Button asChild size="sm">
            <Link to="/employees/new">
              <Plus className="h-4 w-4" />
              Add employee
            </Link>
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, number..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={employmentType}
              onChange={e => setEmploymentType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="CASUAL">Casual</option>
              <option value="CONTRACTOR">Contractor</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={awardCode}
              onChange={e => setAwardCode(e.target.value)}
            >
              <option value="">All awards</option>
              <option value="MA000038">MA000038</option>
              <option value="MA000039">MA000039</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading employees…</div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No employees found.{' '}
                <Link to="/employees/new" className="text-primary underline">
                  Add the first employee
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Award</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Depot</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Base rate</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/employees/${emp.id}`} className="flex items-center gap-3 hover:underline">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                            {getInitials(emp.firstName, emp.lastName)}
                          </div>
                          <div>
                            <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                            <div className="text-xs text-muted-foreground">{emp.employeeNumber} · {emp.email}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {employmentTypeLabel(emp.employmentType)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {emp.awardCode ? (
                          <span className="font-mono text-xs">{emp.awardCode}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                        {emp.classificationLevel && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {emp.classificationLevel.replace('GRADE_', 'Gr ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {emp.depotName ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {emp.currentPayRate ? (
                          <span>
                            {formatCurrency(emp.currentPayRate.baseRate)}
                            <span className="ml-1 text-xs text-muted-foreground">
                              /{emp.currentPayRate.payType === 'HOURLY' ? 'hr' : emp.currentPayRate.payType.toLowerCase()}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={emp.isActive ? 'default' : 'secondary'}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
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
