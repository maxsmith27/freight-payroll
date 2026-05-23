import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Building2, Users, Lock, ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, XCircle, AlertCircle, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'
import { ROLE_DEFAULT_PAGES, ESS_PAGES, ADMIN_PAGES, PAGE_LABELS } from '@freight-payroll/shared'
import type { CompanyRole, PageKey } from '@freight-payroll/shared'

interface CompanyUser {
  accessId: string
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  lastLoginAt: string | null
  role: CompanyRole
  depotId: string | null
  depotName: string | null
  enabledPages: string[]
}

const ESS_PAGE_KEYS  = Object.values(ESS_PAGES)   as PageKey[]
const ADMIN_PAGE_KEYS = Object.values(ADMIN_PAGES) as PageKey[]

const ROLE_LABELS: Record<CompanyRole, string> = {
  COMPANY_ADMIN: 'Company Admin',
  PAYROLL_MANAGER: 'Payroll Manager',
  DEPOT_MANAGER: 'Depot Manager',
  SUPERVISOR: 'Supervisor',
  EMPLOYEE: 'Employee',
}

function UserAccessRow({
  u,
  currentUserId,
  companyId,
}: {
  u: CompanyUser
  currentUserId: string
  companyId: string
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const roleDefaults = ROLE_DEFAULT_PAGES[u.role]
  const effective: string[] = u.enabledPages.length > 0 ? u.enabledPages : roleDefaults

  const mutation = useMutation({
    mutationFn: (enabledPages: string[]) =>
      api.patch(`/companies/${companyId}/users/${u.id}/access`, { enabledPages }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users', companyId] })
      toast({ title: 'Access updated' })
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  function toggle(key: PageKey) {
    const current = u.enabledPages.length > 0 ? u.enabledPages : [...roleDefaults]
    const next = current.includes(key)
      ? current.filter(k => k !== key)
      : [...current, key]
    mutation.mutate(next)
  }

  function resetToDefaults() {
    mutation.mutate([])
  }

  const essPages  = ESS_PAGE_KEYS.filter(k => roleDefaults.includes(k))
  const adminPages = ADMIN_PAGE_KEYS.filter(k => roleDefaults.includes(k))
  const hasCustom = u.enabledPages.length > 0

  return (
    <div className="border-b last:border-0">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm">
            {u.firstName} {u.lastName}
            {u.id === currentUserId && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
        </div>
        <Badge variant="outline" className="shrink-0">{ROLE_LABELS[u.role]}</Badge>
        {hasCustom && <Badge variant="secondary" className="shrink-0 text-xs">Custom</Badge>}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 bg-muted/20">
          {essPages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 pt-3">Employee Portal (ESS)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {essPages.map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={effective.includes(key)}
                      onChange={() => toggle(key)}
                      disabled={mutation.isPending || u.id === currentUserId}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{PAGE_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {adminPages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin App</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {adminPages.map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={effective.includes(key)}
                      onChange={() => toggle(key)}
                      disabled={mutation.isPending || u.id === currentUserId}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{PAGE_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            {hasCustom && (
              <Button
                size="sm"
                variant="outline"
                onClick={resetToDefaults}
                disabled={mutation.isPending || u.id === currentUserId}
              >
                Reset to role defaults
              </Button>
            )}
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {u.id === currentUserId && (
              <p className="text-xs text-muted-foreground">You cannot edit your own access.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface CompanySettings {
  id: string
  name: string
  abn: string
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  phone: string | null
  email: string | null
  paymentBSB: string | null
  paymentAccountNumber: string | null
  paymentAccountName: string | null
  defaultPayFrequency: string
  fatigueScheme: string
}

const companySchema = z.object({
  name: z.string().min(2, 'Required'),
  abn: z.string().regex(/^\d{11}$/, '11 digits'),
  address: z.string().optional(),
  suburb: z.string().optional(),
  postcode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  paymentBSB: z.string().optional(),
  paymentAccountNumber: z.string().optional(),
  paymentAccountName: z.string().optional(),
  defaultPayFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  fatigueScheme: z.enum(['STANDARD', 'BFM', 'AFM']),
})

type CompanyForm = z.infer<typeof companySchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8, 'Min 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PasswordForm = z.infer<typeof passwordSchema>

// ─── Rate Verification Panel ────────────────────────────────────────────────

interface RateStatus {
  ok: boolean
  detail: string
}

interface RateVerificationResult {
  financialYear: string
  verifiedAt: string | null
  verifiedBy: string | null
  superRate: RateStatus & { dbValue: number | null; referenceValue: number }
  superMaxBase: RateStatus & { dbValue: number | null; referenceValue: number }
  paygBracketCount: RateStatus & { dbCount: number; referenceCount: number }
  overallOk: boolean
}

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
  if (warn) return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
  return <XCircle className="h-4 w-4 text-destructive shrink-0" />
}

function RateVerificationPanel() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const FY = '2025-26'

  const { data, isLoading } = useQuery<RateVerificationResult>({
    queryKey: ['rate-verification', FY],
    queryFn: async () => {
      const r = await api.get(`/admin/rates/verify?fy=${FY}`)
      return r.data.data
    },
  })

  const markVerified = useMutation({
    mutationFn: async () => {
      await api.post('/admin/rates/verify', { financialYear: FY })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rate-verification'] })
      toast({ title: 'Rates marked as verified' })
    },
    onError: (err: unknown) => {
      toast({ title: 'Error', description: apiError(err), variant: 'destructive' })
    },
  })

  const checks = data ? [
    { label: 'Superannuation rate', ...data.superRate },
    { label: 'Super max contribution base', ...data.superMaxBase },
    { label: 'PAYG withholding brackets', ...data.paygBracketCount,
      ok: data.paygBracketCount.ok, detail: data.paygBracketCount.detail },
  ] : []

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold">ATO rate verification — FY {FY}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compares superannuation rates and PAYG withholding coefficients in the database against
          the published ATO NAT 3539 and SG rate schedule for this financial year.
          Once verified, sign off with your name so there's an audit trail.
        </p>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <>
              {checks.map(c => (
                <div key={c.label} className="flex items-start gap-3 px-4 py-3">
                  <StatusIcon ok={c.ok} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                  <Badge variant={c.ok ? 'default' : 'destructive'} className="text-xs shrink-0">
                    {c.ok ? 'OK' : 'Issue'}
                  </Badge>
                </div>
              ))}

              <div className="px-4 py-3 bg-muted/30">
                {data.verifiedAt ? (
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Verified {formatDate(data.verifiedAt)} by {data.verifiedBy}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not yet verified for FY {FY}.</p>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Unable to load rate data.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => markVerified.mutate()}
          disabled={markVerified.isPending || !data?.overallOk}
        >
          {markVerified.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <ShieldCheck className="h-4 w-4" />
          Mark as verified
        </Button>
        {data && !data.overallOk && (
          <p className="text-xs text-muted-foreground">
            Resolve all issues before marking as verified.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  CREATE:                 'Created',
  UPDATE:                 'Updated',
  DELETE:                 'Deleted',
  LOGIN:                  'Logged in',
  LOGOUT:                 'Logged out',
  PAY_RUN_CREATED:        'Pay run created',
  PAY_RUN_FINALISED:      'Pay run finalised',
  PAY_RUN_CANCELLED:      'Pay run cancelled',
  LEAVE_APPROVED:         'Leave approved',
  LEAVE_DECLINED:         'Leave declined',
  TIMESHEET_APPROVED:     'Timesheet approved',
  ROSTER_PUBLISHED:       'Roster published',
  EXPORT_GENERATED:       'Export generated',
  PORTAL_ACCESS_GRANTED:  'Portal access granted',
  PORTAL_ACCESS_REVOKED:  'Portal access revoked',
}

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CREATE:                'default',
  UPDATE:                'secondary',
  DELETE:                'destructive',
  PAY_RUN_CREATED:       'default',
  PAY_RUN_FINALISED:     'default',
  PAY_RUN_CANCELLED:     'destructive',
  LEAVE_APPROVED:        'default',
  LEAVE_DECLINED:        'destructive',
  TIMESHEET_APPROVED:    'default',
  PORTAL_ACCESS_GRANTED: 'default',
  PORTAL_ACCESS_REVOKED: 'destructive',
}

interface AuditEntry {
  id: string
  createdAt: string
  action: string
  entityType: string
  entityId: string
  newValues: unknown
  previousValues: unknown
  userId: string | null
  userName: string | null
  userEmail: string | null
  employeeId: string | null
  employeeName: string | null
}

interface AuditPage {
  data: AuditEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function AuditLogPanel({ companyId }: { companyId: string }) {
  const [page, setPage]             = useState(1)
  const [action, setAction]         = useState('')
  const [from, setFrom]             = useState('')
  const [to, setTo]                 = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const params = new URLSearchParams({
    companyId,
    page: String(page),
    pageSize: '50',
    ...(action ? { action } : {}),
    ...(from   ? { from }   : {}),
    ...(to     ? { to }     : {}),
  })

  const { data, isLoading } = useQuery<AuditPage>({
    queryKey: ['audit-logs', companyId, page, action, from, to],
    queryFn: async () => {
      const r = await api.get(`/admin/audit-logs?${params}`)
      return r.data
    },
    placeholderData: prev => prev,
  })

  function applyFilters() {
    setPage(1)
  }

  function clearFilters() {
    setAction('')
    setFrom('')
    setTo('')
    setPage(1)
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h2 className="text-sm font-semibold">Audit log</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          A full record of every action taken in the system — who did it, when, and what changed.
          Visible to Company Admins and Payroll Managers only.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Action type</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm w-52"
                value={action}
                onChange={e => setAction(e.target.value)}
              >
                <option value="">All actions</option>
                {Object.entries(ACTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" className="h-9 w-40 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" className="h-9 w-40 text-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <Button size="sm" onClick={applyFilters}>Apply</Button>
            {(action || from || to) && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No audit log entries found.
            </div>
          ) : (
            <div className="divide-y">
              {/* Header */}
              <div className="grid grid-cols-[160px_1fr_140px_140px_32px] gap-3 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <span>Date / Time</span>
                <span>Action</span>
                <span>User</span>
                <span>Employee</span>
                <span />
              </div>

              {data.data.map(entry => (
                <div key={entry.id}>
                  <button
                    className="grid grid-cols-[160px_1fr_140px_140px_32px] gap-3 px-4 py-3 w-full text-left hover:bg-muted/30 transition-colors items-center"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {new Date(entry.createdAt).toLocaleString('en-AU', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>

                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant={ACTION_VARIANTS[entry.action] ?? 'outline'}
                        className="text-xs shrink-0"
                      >
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.entityType}
                      </span>
                    </div>

                    <span className="text-xs truncate">
                      {entry.userName ?? <span className="text-muted-foreground">System</span>}
                    </span>

                    <span className="text-xs truncate text-muted-foreground">
                      {entry.employeeName ?? '—'}
                    </span>

                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedId === entry.id && (
                    <div className="px-4 pb-4 bg-muted/20 space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                        {entry.userEmail && (
                          <div>
                            <span className="text-muted-foreground">User email: </span>
                            <span>{entry.userEmail}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Entity ID: </span>
                          <span className="font-mono">{entry.entityId}</span>
                        </div>
                      </div>
                      {entry.newValues && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Details</p>
                          <pre className="text-xs bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(entry.newValues, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.previousValues && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Previous values</p>
                          <pre className="text-xs bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(entry.previousValues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total.toLocaleString()} entries
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs">Page {page} of {data.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { activeCompanyId, user } = useAuthStore()
  const activeRole = user?.companyAccess.find(a => a.companyId === activeCompanyId)?.role ?? null
  const isAdmin = activeRole === 'COMPANY_ADMIN' || activeRole === 'PAYROLL_MANAGER'
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: company } = useQuery<CompanySettings>({
    queryKey: ['company-settings', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}`)
      return data.data
    },
    enabled: !!activeCompanyId,
  })

  const { data: users } = useQuery<CompanyUser[]>({
    queryKey: ['company-users', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}/users`)
      return data.data
    },
    enabled: !!activeCompanyId,
  })

  const {
    register: regCompany,
    handleSubmit: handleCompany,
    formState: { errors: companyErrors, isSubmitting: savingCompany },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    values: company ? {
      name: company.name,
      abn: company.abn,
      address: company.address ?? '',
      suburb: company.suburb ?? '',
      postcode: company.postcode ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      paymentBSB: company.paymentBSB ?? '',
      paymentAccountNumber: company.paymentAccountNumber ?? '',
      paymentAccountName: company.paymentAccountName ?? '',
      defaultPayFrequency: company.defaultPayFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY',
      fatigueScheme: company.fatigueScheme as 'STANDARD' | 'BFM' | 'AFM',
    } : undefined,
  })

  const saveCompanyMutation = useMutation({
    mutationFn: (values: CompanyForm) => api.patch(`/companies/${activeCompanyId}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
      toast({ title: 'Settings saved' })
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: savingPwd },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const changePasswordMutation = useMutation({
    mutationFn: (values: PasswordForm) => api.post('/auth/change-password', values),
    onSuccess: () => {
      toast({ title: 'Password changed' })
      resetPwd()
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  return (
    <div className="flex flex-col gap-0">
      <PageHeader title="Settings" description="Company configuration and account settings" />

      <div className="p-6">
        <Tabs defaultValue="company">
          <TabsList className="mb-6">
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="account">
              <Lock className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="rates">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Rate Verification
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="audit">
                <ClipboardList className="h-4 w-4 mr-2" />
                Audit Log
              </TabsTrigger>
            )}
          </TabsList>

          {/* Company settings */}
          <TabsContent value="company">
            <form onSubmit={handleCompany(v => saveCompanyMutation.mutate(v))} className="max-w-2xl space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Company details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Trading name *</Label>
                    <Input {...regCompany('name')} />
                    {companyErrors.name && <p className="text-xs text-destructive">{companyErrors.name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>ABN *</Label>
                    <Input {...regCompany('abn')} />
                    {companyErrors.abn && <p className="text-xs text-destructive">{companyErrors.abn.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input {...regCompany('phone')} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" {...regCompany('email')} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Street address</Label>
                    <Input {...regCompany('address')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Suburb</Label>
                    <Input {...regCompany('suburb')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Postcode</Label>
                    <Input {...regCompany('postcode')} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Payroll defaults</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Default pay frequency</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...regCompany('defaultPayFrequency')}>
                      <option value="WEEKLY">Weekly</option>
                      <option value="FORTNIGHTLY">Fortnightly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fatigue scheme</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...regCompany('fatigueScheme')}>
                      <option value="STANDARD">Standard hours</option>
                      <option value="BFM">Basic Fatigue Management (BFM)</option>
                      <option value="AFM">Advanced Fatigue Management (AFM)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Payment account (for ABA files)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Account name</Label>
                    <Input {...regCompany('paymentAccountName')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>BSB</Label>
                    <Input placeholder="000-000" {...regCompany('paymentBSB')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account number</Label>
                    <Input {...regCompany('paymentAccountNumber')} />
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" disabled={saveCompanyMutation.isPending || savingCompany}>
                {(saveCompanyMutation.isPending || savingCompany) && <Loader2 className="h-4 w-4 animate-spin" />}
                Save settings
              </Button>
            </form>
          </TabsContent>

          {/* Users tab */}
          <TabsContent value="users">
            <div className="max-w-3xl space-y-4">
              <div>
                <h2 className="text-sm font-semibold">User page access</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click any user to expand and toggle which pages they can see. Unchecking a page hides it from their sidebar.
                  Changes take effect on their next login.
                </p>
              </div>
              <Card>
                <CardContent className="p-0">
                  {!users ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading users…
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
                  ) : (
                    users.map(u => (
                      <UserAccessRow
                        key={u.id}
                        u={u}
                        currentUserId={user?.id ?? ''}
                        companyId={activeCompanyId ?? ''}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">
                Role assignments and depot scoping can be updated by contacting support. User invitation coming soon.
              </p>
            </div>
          </TabsContent>

          {/* Account / password tab */}
          <TabsContent value="account">
            <form
              onSubmit={handlePwd(v => changePasswordMutation.mutate(v))}
              className="max-w-sm space-y-4"
            >
              <Card>
                <CardHeader><CardTitle className="text-base">Change password</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Current password</Label>
                    <Input type="password" autoComplete="current-password" {...regPwd('currentPassword')} />
                    {pwdErrors.currentPassword && <p className="text-xs text-destructive">{pwdErrors.currentPassword.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>New password</Label>
                    <Input type="password" autoComplete="new-password" {...regPwd('newPassword')} />
                    {pwdErrors.newPassword && <p className="text-xs text-destructive">{pwdErrors.newPassword.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm new password</Label>
                    <Input type="password" autoComplete="new-password" {...regPwd('confirmPassword')} />
                    {pwdErrors.confirmPassword && <p className="text-xs text-destructive">{pwdErrors.confirmPassword.message}</p>}
                  </div>
                  <Button type="submit" disabled={changePasswordMutation.isPending || savingPwd}>
                    {(changePasswordMutation.isPending || savingPwd) && <Loader2 className="h-4 w-4 animate-spin" />}
                    Update password
                  </Button>
                </CardContent>
              </Card>
            </form>
          </TabsContent>

          {/* Rate Verification tab */}
          <TabsContent value="rates">
            <RateVerificationPanel />
          </TabsContent>

          {/* Audit Log tab — admin only */}
          {isAdmin && (
            <TabsContent value="audit">
              <AuditLogPanel companyId={activeCompanyId ?? ''} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
