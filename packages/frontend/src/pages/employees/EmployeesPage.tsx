import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { formatCurrency, employmentTypeLabel, getInitials } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

// ── Helper: pick the right rate field and suffix for the list view ───────────
function formatListPayRate(r: {
  payType: string
  hourlyRate: string | null
  annualSalary: string | null
  ratePerKm: string | null
  ratePerLoad: string | null
  revenuePercentage: string | null
}): string {
  const n = (v: string | null) => (v != null ? Number(v) : null)
  switch (r.payType) {
    case 'HOURLY':             return n(r.hourlyRate)   != null ? `${formatCurrency(n(r.hourlyRate)!)}/hr`   : '—'
    case 'SALARY':             return n(r.annualSalary) != null ? `${formatCurrency(n(r.annualSalary)!)}/yr` : '—'
    case 'PER_KM':             return n(r.ratePerKm)    != null ? `${formatCurrency(n(r.ratePerKm)!)}/km`   : '—'
    case 'PER_LOAD':           return n(r.ratePerLoad)  != null ? `${formatCurrency(n(r.ratePerLoad)!)}/load`: '—'
    case 'PERCENTAGE_REVENUE': return n(r.revenuePercentage) != null ? `${(n(r.revenuePercentage)! * 100).toFixed(1)}%` : '—'
    default:                   return '—'
  }
}

interface Employee {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  employmentType: string
  awardCode: string | null
  classificationLevel: string | null
  // Prisma relation — listEmployees includes `depot: { select: { name, code } }`
  depot: { name: string; code: string } | null
  // listEmployees includes payRates (current only, take:1). Decimal fields serialised as strings.
  payRates: Array<{
    payType: string
    hourlyRate: string | null
    annualSalary: string | null
    ratePerKm: string | null
    ratePerLoad: string | null
    revenuePercentage: string | null
  }>
  isActive: boolean
}

const EMPLOYMENT_TYPES = ['', 'FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR']
const AWARD_CODES = ['', 'MA000038', 'MA000039']

// ── CSV header → field mapping ───────────────────────────────────────────────
// Accepts common variations of header names (case-insensitive, no spaces/underscores)
const FIELD_MAP: Record<string, string> = {
  employeenumber: 'employeeNumber', empno: 'employeeNumber', number: 'employeeNumber',
  firstname: 'firstName', first: 'firstName',
  lastname: 'lastName', last: 'lastName', surname: 'lastName',
  email: 'email',
  mobile: 'mobile', phone: 'mobile',
  employmenttype: 'employmentType', type: 'employmentType',
  startdate: 'startDate', start: 'startDate',
  payfrequency: 'payFrequency', frequency: 'payFrequency', freq: 'payFrequency',
  hourlyrate: 'hourlyRate', rate: 'hourlyRate',
  awardcode: 'awardCode', award: 'awardCode',
  classificationlevel: 'classificationLevel', grade: 'classificationLevel', classification: 'classificationLevel',
  depotcode: 'depotCode', depot: 'depotCode',
}

const REQUIRED = ['employeeNumber', 'firstName', 'lastName', 'employmentType', 'startDate', 'payFrequency']
const VALID_EMP_TYPES = new Set(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR'])
const VALID_FREQ = new Set(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'])

interface ParsedRow {
  rowIndex: number
  raw: Record<string, string>
  mapped: Record<string, string>
  errors: string[]
  valid: boolean
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  const parse = (line: string): string[] => {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ } else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' } else { cur += c }
    }
    result.push(cur.trim())
    return result
  }
  const [headerLine, ...dataLines] = lines
  return { headers: parse(headerLine), rows: dataLines.map(parse) }
}

function validateRows(headers: string[], rows: string[][]): ParsedRow[] {
  const mappedHeaders = headers.map(h => FIELD_MAP[h.toLowerCase().replace(/[\s_-]/g, '')] ?? h)

  return rows.map((cols, i) => {
    const raw: Record<string, string> = {}
    const mapped: Record<string, string> = {}
    headers.forEach((h, j) => {
      raw[h] = cols[j] ?? ''
      const field = mappedHeaders[j]
      if (field) mapped[field] = cols[j]?.trim() ?? ''
    })

    const errors: string[] = []
    for (const req of REQUIRED) {
      if (!mapped[req]) errors.push(`Missing: ${req}`)
    }
    if (mapped.employmentType && !VALID_EMP_TYPES.has(mapped.employmentType.toUpperCase())) {
      errors.push(`Invalid employmentType "${mapped.employmentType}" — use FULL_TIME, PART_TIME, CASUAL, or CONTRACTOR`)
      mapped.employmentType = mapped.employmentType.toUpperCase()
    } else if (mapped.employmentType) {
      mapped.employmentType = mapped.employmentType.toUpperCase()
    }
    if (mapped.payFrequency && !VALID_FREQ.has(mapped.payFrequency.toUpperCase())) {
      errors.push(`Invalid payFrequency "${mapped.payFrequency}" — use WEEKLY, FORTNIGHTLY, or MONTHLY`)
      mapped.payFrequency = mapped.payFrequency.toUpperCase()
    } else if (mapped.payFrequency) {
      mapped.payFrequency = mapped.payFrequency.toUpperCase()
    }
    if (mapped.startDate && isNaN(Date.parse(mapped.startDate))) {
      errors.push(`Invalid startDate "${mapped.startDate}" — use YYYY-MM-DD`)
    }
    if (mapped.hourlyRate && isNaN(Number(mapped.hourlyRate))) {
      errors.push(`Invalid hourlyRate "${mapped.hourlyRate}" — must be a number`)
    }

    return { rowIndex: i + 2, raw, mapped, errors, valid: errors.length === 0 }
  })
}

export function EmployeesPage() {
  const { activeCompanyId } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [awardCode, setAwardCode] = useState('')

  // ── Import state ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStep, setImportStep] = useState<'idle' | 'preview' | 'done'>('idle')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importResult, setImportResult] = useState<{ created: number; errors: Array<{ row: number; error: string }> } | null>(null)

  const importMutation = useMutation({
    mutationFn: (rows: ParsedRow[]) => {
      const payload = rows.filter(r => r.valid).map(r => ({
        employeeNumber: r.mapped.employeeNumber,
        firstName: r.mapped.firstName,
        lastName: r.mapped.lastName,
        email: r.mapped.email || undefined,
        mobile: r.mapped.mobile || undefined,
        employmentType: r.mapped.employmentType,
        startDate: r.mapped.startDate,
        payFrequency: r.mapped.payFrequency,
        hourlyRate: r.mapped.hourlyRate ? Number(r.mapped.hourlyRate) : undefined,
        awardCode: r.mapped.awardCode || undefined,
        classificationLevel: r.mapped.classificationLevel || undefined,
        depotCode: r.mapped.depotCode || undefined,
      }))
      return api.post(`/employees/import?companyId=${activeCompanyId}`, { rows: payload })
    },
    onSuccess: (res) => {
      setImportResult(res.data.data)
      setImportStep('done')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
    onError: err => toast({ title: 'Import failed', description: apiError(err), variant: 'destructive' }),
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSV(text)
      const validated = validateRows(headers, rows)
      setParsedRows(validated)
      setImportStep('preview')
    }
    reader.readAsText(file)
    e.target.value = ''  // allow re-selecting same file
  }

  function resetImport() {
    setParsedRows([])
    setImportResult(null)
    setImportStep('idle')
  }

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
  const validCount = parsedRows.filter(r => r.valid).length
  const invalidCount = parsedRows.filter(r => !r.valid).length

  // ── Import preview modal ──────────────────────────────────────────────────
  if (importStep !== 'idle') {
    return (
      <div className="flex flex-col gap-0">
        <PageHeader
          title={importStep === 'done' ? 'Import complete' : 'Review import'}
          description={
            importStep === 'done'
              ? `${importResult?.created ?? 0} employee${importResult?.created !== 1 ? 's' : ''} created`
              : `${parsedRows.length} rows · ${validCount} valid · ${invalidCount} with errors`
          }
          actions={
            importStep === 'preview' ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetImport}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={validCount === 0 || importMutation.isPending}
                  onClick={() => importMutation.mutate(parsedRows)}
                >
                  {importMutation.isPending
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing…</>
                    : `Import ${validCount} valid row${validCount !== 1 ? 's' : ''}`}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={resetImport}>Done</Button>
            )
          }
        />

        <div className="p-6 space-y-4">
          {/* Download template link */}
          {importStep === 'preview' && (
            <p className="text-sm text-muted-foreground">
              Required columns: <code className="text-xs bg-muted px-1 rounded">employeeNumber, firstName, lastName, employmentType, startDate, payFrequency</code>
              {' '}— Optional: email, mobile, hourlyRate, awardCode, classificationLevel, depotCode
            </p>
          )}

          {/* Done summary */}
          {importStep === 'done' && importResult && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">{importResult.created} employee{importResult.created !== 1 ? 's' : ''} created successfully</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <p className="text-sm font-medium text-destructive">Rows that failed ({importResult.errors.length}):</p>
                    {importResult.errors.map(e => (
                      <p key={e.row} className="text-xs text-destructive">Row {e.row}: {e.error}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview table */}
          {importStep === 'preview' && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 text-left text-muted-foreground w-10">#</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Emp #</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">First name</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Last name</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Start date</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Frequency</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Rate</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Award</th>
                      <th className="px-3 py-2 text-left text-muted-foreground">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map(row => (
                      <tr
                        key={row.rowIndex}
                        className={`border-b last:border-0 ${row.valid ? '' : 'bg-red-50'}`}
                      >
                        <td className="px-3 py-2 text-muted-foreground">{row.rowIndex}</td>
                        <td className="px-3 py-2">
                          {row.valid
                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                            : <AlertCircle className="h-4 w-4 text-destructive" />}
                        </td>
                        <td className="px-3 py-2 font-mono">{row.mapped.employeeNumber ?? '—'}</td>
                        <td className="px-3 py-2">{row.mapped.firstName ?? '—'}</td>
                        <td className="px-3 py-2">{row.mapped.lastName ?? '—'}</td>
                        <td className="px-3 py-2">{row.mapped.employmentType ?? '—'}</td>
                        <td className="px-3 py-2">{row.mapped.startDate ?? '—'}</td>
                        <td className="px-3 py-2">{row.mapped.payFrequency ?? '—'}</td>
                        <td className="px-3 py-2">{row.mapped.hourlyRate ? `$${row.mapped.hourlyRate}/hr` : '—'}</td>
                        <td className="px-3 py-2">{row.mapped.awardCode ?? '—'}</td>
                        <td className="px-3 py-2 text-destructive">{row.errors.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Employees"
        description={data ? `${data.total} employees` : ''}
        actions={
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
            <Button asChild size="sm">
              <Link to="/employees/new">
                <Plus className="h-4 w-4" />
                Add employee
              </Link>
            </Button>
          </div>
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
                        {emp.depot?.name ?? <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {emp.payRates[0] ? (
                          <span>
                            {formatListPayRate(emp.payRates[0])}
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
