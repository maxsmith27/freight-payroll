import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, UserCheck, UserX, Send, RotateCcw, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { api, apiError } from '@/lib/api'
import { formatCurrency, formatDate, employmentTypeLabel, classificationLabel } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/auth.store'

// ─── Types (matching actual Prisma/API field names) ──────────────────────────

interface PayRate {
  id: string
  payType: string
  hourlyRate: string | null
  ratePerKm: string | null
  ratePerLoad: string | null
  revenuePercentage: string | null
  annualSalary: string | null
  effectiveFrom: string
  effectiveTo: string | null
  notes: string | null
}

interface LeaveBalance {
  leaveType: string
  balance: string   // Prisma Decimal → serialised as string
  accrued: string
  used: string
  pending: string
}

interface DriverLicence {
  id: string
  licenceNumber: string
  licenceState: string
  licenceClasses: string[]
  issueDate: string
  expiryDate: string
}

interface Accreditation {
  id: string
  accreditationType: string
  certificateNumber: string | null
  expiryDate: string | null
}

interface MedicalCert {
  id: string
  certType: string
  issueDate: string
  expiryDate: string | null
  restrictions: string | null
}

interface EmployeeDetail {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  dateOfBirth: string | null
  addressStreet: string | null
  addressSuburb: string | null
  addressState: string | null
  addressPostcode: string | null
  employmentType: string
  startDate: string
  endDate: string | null
  payFrequency: string
  awardCode: string | null
  classificationLevel: string | null
  taxResidencyStatus: string
  claimsTaxFreeThreshold: boolean
  hasHECSDebt: boolean
  taxFileNumber: string | null
  superFundName: string | null
  superMemberNumber: string | null
  isActive: boolean
  depot: { name: string; code: string } | null
  payRates: PayRate[]
  bankAccounts: Array<{ id: string; accountName: string; bsb: string; accountNumber: string; isPrimary: boolean }>
  leaveBalances: LeaveBalance[]
  licences: DriverLicence[]
  accreditations: Accreditation[]
  medicalCerts: MedicalCert[]
  portalUser?: { email: string; isActive: boolean } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPayRate(r: PayRate): string {
  const n = (v: string | null) => (v ? Number(v) : null)
  switch (r.payType) {
    case 'HOURLY':             return n(r.hourlyRate)         != null ? `${formatCurrency(n(r.hourlyRate)!)}/hr`   : '—'
    case 'SALARY':             return n(r.annualSalary)       != null ? `${formatCurrency(n(r.annualSalary)!)}/yr` : '—'
    case 'PER_KM':             return n(r.ratePerKm)          != null ? `${formatCurrency(n(r.ratePerKm)!)}/km`   : '—'
    case 'PER_LOAD':           return n(r.ratePerLoad)        != null ? `${formatCurrency(n(r.ratePerLoad)!)}/load`: '—'
    case 'PERCENTAGE_REVENUE': return n(r.revenuePercentage)  != null ? `${(n(r.revenuePercentage)! * 100).toFixed(1)}%` : '—'
    default:                   return '—'
  }
}

function LeaveTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    ANNUAL: 'Annual leave',
    PERSONAL_CARERS: "Personal / carer's",
    COMPASSIONATE: 'Compassionate',
    LONG_SERVICE: 'Long service leave',
    PARENTAL: 'Parental leave',
    COMMUNITY_SERVICE: 'Community service',
  }
  return <span>{map[type] ?? type}</span>
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeCompanyId } = useAuthStore()
  const [portalPassword, setPortalPassword] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const { data: emp, isLoading, isError, error } = useQuery<EmployeeDetail>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${id}?companyId=${activeCompanyId}`)
      return data.data
    },
    enabled: !!id && !!activeCompanyId,
  })

  const grantPortalMutation = useMutation({
    mutationFn: () =>
      api.post(`/employees/${id}/portal-access?companyId=${activeCompanyId}`, { password: portalPassword }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      setGeneratedPassword(res.data.data.temporaryPassword ?? null)
      setPortalPassword('')
      toast({ title: 'Portal access granted' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const revokePortalMutation = useMutation({
    mutationFn: () => api.delete(`/employees/${id}/portal-access?companyId=${activeCompanyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      setGeneratedPassword(null)
      toast({ title: 'Portal access revoked' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-0">
        <PageHeader title="Employee" />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (isError || !emp) {
    return (
      <div className="flex flex-col gap-0">
        <PageHeader
          title="Employee"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/employees"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
            </Button>
          }
        />
        <div className="p-6">
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {apiError(error) || 'Employee not found.'}
          </div>
        </div>
      </div>
    )
  }

  const fullName = `${emp.firstName} ${emp.lastName}`

  const alertsCount = [
    ...emp.licences.filter(l => {
      const diff = (new Date(l.expiryDate).getTime() - Date.now()) / 86400000
      return diff < 90
    }),
    ...emp.accreditations.filter(a => {
      if (!a.expiryDate) return false
      return (new Date(a.expiryDate).getTime() - Date.now()) / 86400000 < 90
    }),
  ].length

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title={fullName}
        description={`${emp.employeeNumber} · ${employmentTypeLabel(emp.employmentType)}`}
        actions={
          <div className="flex items-center gap-2">
            {alertsCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {alertsCount} alert{alertsCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant={emp.isActive ? 'default' : 'secondary'}>
              {emp.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link to="/employees"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="details">
          <TabsList className="mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pay">Pay rates</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="bank">Banking</TabsTrigger>
            <TabsTrigger value="portal">Portal Access</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          {/* ── Details ── */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Personal</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Email" value={emp.email} />
                  <Row label="Phone" value={emp.phone ?? emp.mobile} />
                  <Row label="Date of birth" value={emp.dateOfBirth ? formatDate(emp.dateOfBirth) : null} />
                  <Row
                    label="Address"
                    value={
                      [emp.addressStreet, emp.addressSuburb, emp.addressState, emp.addressPostcode]
                        .filter(Boolean)
                        .join(', ') || null
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Employment</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Type" value={employmentTypeLabel(emp.employmentType)} />
                  <Row label="Start date" value={formatDate(emp.startDate)} />
                  {emp.endDate && <Row label="End date" value={formatDate(emp.endDate)} />}
                  <Row label="Pay frequency" value={emp.payFrequency} />
                  <Row label="Depot" value={emp.depot?.name ?? null} />
                  {emp.awardCode && (
                    <Row
                      label="Award"
                      value={`${emp.awardCode} — ${classificationLabel(emp.classificationLevel ?? '')}`}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Tax</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="TFN" value={emp.taxFileNumber ? '••• ••• •••' : 'Not provided'} />
                  <Row label="Residency" value={emp.taxResidencyStatus} />
                  <Row label="Tax-free threshold" value={emp.claimsTaxFreeThreshold ? 'Yes' : 'No'} />
                  <Row label="HECS/HELP" value={emp.hasHECSDebt ? 'Yes' : 'No'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Superannuation</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Fund" value={emp.superFundName} />
                  <Row label="Member number" value={emp.superMemberNumber} />
                  <Row label="Rate" value="12.0% (FY2025-26)" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Pay rates ── */}
          <TabsContent value="pay">
            <Card>
              <CardHeader><CardTitle className="text-base">Pay rate history</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.payRates.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No pay rates recorded.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pay type</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Effective from</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Effective to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.payRates.map(r => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{r.payType}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatPayRate(r)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(r.effectiveFrom)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.effectiveTo ? formatDate(r.effectiveTo) : <Badge variant="secondary">Current</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Leave ── */}
          <TabsContent value="leave">
            <Card>
              <CardHeader><CardTitle className="text-base">Leave balances</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.leaveBalances.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No leave balances.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Leave type</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance (hrs)</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Accrued (hrs)</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Used (hrs)</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pending (hrs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.leaveBalances.map((lb, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-4 py-3"><LeaveTypeLabel type={lb.leaveType} /></td>
                          <td className="px-4 py-3 text-right font-medium">
                            {Number(lb.balance).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {Number(lb.accrued).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {Number(lb.used).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {Number(lb.pending).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Compliance ── */}
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Driver licences</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.licences.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No licences recorded.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class(es)</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.licences.map(l => {
                        const daysLeft = Math.ceil((new Date(l.expiryDate).getTime() - Date.now()) / 86400000)
                        return (
                          <tr key={l.id} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{l.licenceClasses.join(', ')}</td>
                            <td className="px-4 py-3 text-muted-foreground">{l.licenceNumber}</td>
                            <td className="px-4 py-3 text-muted-foreground">{l.licenceState}</td>
                            <td className="px-4 py-3">
                              <span className={daysLeft < 30 ? 'text-destructive font-medium' : daysLeft < 90 ? 'text-orange-600' : ''}>
                                {formatDate(l.expiryDate)}
                              </span>
                              {daysLeft < 90 && (
                                <Badge variant={daysLeft < 0 ? 'destructive' : 'secondary'} className="ml-2 text-xs">
                                  {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Accreditations</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.accreditations.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No accreditations recorded.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Certificate #</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.accreditations.map(a => (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{a.accreditationType}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.certificateNumber ?? '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {a.expiryDate ? formatDate(a.expiryDate) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Medical certificates</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.medicalCerts.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No medicals recorded.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issue date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Restrictions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.medicalCerts.map(m => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{m.certType}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(m.issueDate)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {m.expiryDate ? formatDate(m.expiryDate) : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{m.restrictions ?? 'None'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Banking ── */}
          <TabsContent value="bank">
            <Card>
              <CardHeader><CardTitle className="text-base">Bank accounts</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.bankAccounts.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No bank accounts on file.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account name</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">BSB</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account number</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Primary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.bankAccounts.map(b => (
                        <tr key={b.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{b.accountName}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">{b.bsb}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono">{b.accountNumber}</td>
                          <td className="px-4 py-3 text-center">
                            {b.isPrimary && <Badge>Primary</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Portal Access ── */}
          <TabsContent value="portal">
            <Card className="border-0 shadow-sm max-w-lg">
              <CardHeader>
                <CardTitle className="text-base">Employee Self-Service Portal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {emp.portalUser ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span>Portal access is <strong>active</strong></span>
                    </div>
                    <Row label="Login email" value={emp.portalUser.email} />
                    <p className="text-xs text-muted-foreground">
                      The employee logs in at <strong>/login</strong> and is redirected to the Employee Portal.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokePortalMutation.mutate()}
                      disabled={revokePortalMutation.isPending}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Revoke portal access
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Grant this employee access to the self-service portal so they can log timesheets,
                      kilometres, and view payslips.
                    </p>
                    {emp.email ? (
                      <Row label="Login email will be" value={emp.email} />
                    ) : (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                        This employee has no email on file. Add an email address in their details first.
                      </p>
                    )}
                    <div>
                      <Label>Temporary password</Label>
                      <Input
                        type="text"
                        placeholder="Set a temporary password for them"
                        value={portalPassword}
                        onChange={e => setPortalPassword(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => grantPortalMutation.mutate()}
                      disabled={grantPortalMutation.isPending || !emp.email || !portalPassword}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Grant portal access
                    </Button>
                    {generatedPassword && (
                      <div className="rounded bg-green-50 border border-green-200 p-3 text-sm space-y-1">
                        <p className="font-medium text-green-800">Access granted!</p>
                        <p className="text-green-700">Share these credentials with <strong>{emp.firstName}</strong>:</p>
                        <p className="text-green-700">Email: <strong>{emp.email}</strong></p>
                        <p className="text-green-700">Password: <strong>{generatedPassword}</strong></p>
                        <p className="text-xs text-green-600">They should change their password after first login.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Onboarding ── */}
          <TabsContent value="onboarding">
            <OnboardingPanel
              employeeId={emp.id}
              employeeEmail={emp.email}
              employeeFirstName={emp.firstName}
              employeeLastName={emp.lastName}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// ─── Row helper ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}

// ─── Onboarding panel ─────────────────────────────────────────────────────────

interface OnboardingRecord {
  id: string
  inviteEmail: string
  status: string
  expiresAt: string
  createdAt: string
  data: Record<string, unknown> | null
}

const STATUS_LABELS: Record<string, string> = {
  INVITED: 'Invited',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Ready to Review',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
}

const STATUS_COLORS: Record<string, string> = {
  INVITED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  PENDING_REVIEW: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-slate-100 text-slate-600',
}

function OnboardingPanel({
  employeeId,
  employeeEmail,
  employeeFirstName,
  employeeLastName,
}: {
  employeeId: string
  employeeEmail: string | null
  employeeFirstName: string
  employeeLastName: string
}) {
  const queryClient = useQueryClient()
  const { activeCompanyId } = useAuthStore()
  const { toast } = useToast()
  const [inviteEmail, setInviteEmail] = useState(employeeEmail ?? '')
  const [formError, setFormError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: onboardings, isLoading } = useQuery<OnboardingRecord[]>({
    queryKey: ['onboarding', 'pending', activeCompanyId],
    queryFn: () =>
      api.get(`/onboarding/pending?companyId=${activeCompanyId}`).then(r => r.data.data),
  })

  const relevantOnboardings = (onboardings ?? []).filter(
    o => o.inviteEmail === (employeeEmail ?? '').toLowerCase(),
  )

  const sendInviteMutation = useMutation({
    mutationFn: () =>
      api.post(`/onboarding/invite?companyId=${activeCompanyId}`, {
        firstName: employeeFirstName,
        lastName: employeeLastName,
        email: inviteEmail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'pending', activeCompanyId] })
      toast({ title: 'Invite sent', description: `Onboarding invite sent to ${inviteEmail}` })
      setFormError('')
    },
    onError: err => setFormError(apiError(err)),
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/onboarding/${id}/resend?companyId=${activeCompanyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'pending', activeCompanyId] })
      toast({ title: 'Invite resent' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/onboarding/${id}/activate?companyId=${activeCompanyId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'pending', activeCompanyId] })
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] })
      toast({ title: 'Employee activated', description: `Employee ${res.data.data.employeeNumber} is now active` })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/onboarding/${id}?companyId=${activeCompanyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', 'pending', activeCompanyId] })
      toast({ title: 'Invite cancelled' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const hasActiveInvite = relevantOnboardings.some(o =>
    ['INVITED', 'IN_PROGRESS', 'PENDING_REVIEW'].includes(o.status),
  )

  return (
    <div className="space-y-6 max-w-xl">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Onboarding Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send {employeeFirstName} an invite link so they can complete their own details: TFN
            declaration, super choice, bank account, and personal information.
          </p>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : relevantOnboardings.length > 0 ? (
            <div className="space-y-3">
              {relevantOnboardings.map(record => (
                <div key={record.id} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[record.status] ?? ''}`}>
                          {STATUS_LABELS[record.status] ?? record.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{record.inviteEmail}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sent {new Date(record.createdAt).toLocaleDateString('en-AU')} · Expires{' '}
                        {new Date(record.expiresAt).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {record.status === 'PENDING_REVIEW' && (
                        <Button
                          size="sm"
                          onClick={() => activateMutation.mutate(record.id)}
                          disabled={activateMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <UserCheck className="h-4 w-4 mr-1" /> Activate
                        </Button>
                      )}
                      {['INVITED', 'IN_PROGRESS', 'EXPIRED'].includes(record.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resendMutation.mutate(record.id)}
                          disabled={resendMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Resend
                        </Button>
                      )}
                      {['INVITED', 'IN_PROGRESS'].includes(record.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => cancelMutation.mutate(record.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {record.status === 'PENDING_REVIEW' && record.data && (
                    <>
                      <button
                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                        className="w-full px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 border-t text-left"
                      >
                        {expandedId === record.id ? 'Hide submitted details ▲' : 'View submitted details ▼'}
                      </button>
                      {expandedId === record.id && (
                        <div className="px-4 pb-4 pt-2 border-t bg-slate-50 space-y-2 text-xs">
                          {[
                            ['Name', `${record.data.firstName ?? ''} ${record.data.lastName ?? ''}`.trim()],
                            ['DOB', record.data.dateOfBirth as string],
                            ['Mobile', record.data.mobile as string],
                            ['Address', [record.data.addressStreet, record.data.addressSuburb, record.data.addressState, record.data.addressPostcode].filter(Boolean).join(', ')],
                            ['Tax residency', record.data.taxResidencyStatus as string],
                            ['Claims TFT', record.data.claimsTaxFreeThreshold ? 'Yes' : 'No'],
                            ['TFN provided', record.data.taxFileNumber ? 'Yes' : 'No'],
                            ['Super fund', record.data.useDefaultFund ? 'Default' : (record.data.superFundName as string)],
                            ['Bank BSB', record.data.bankBsb as string],
                          ]
                            .filter(([, v]) => v)
                            .map(([label, value]) => (
                              <div key={label as string} className="flex gap-3">
                                <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                                <span className="font-medium">{value as string}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {!hasActiveInvite && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Send onboarding invite</p>
              <div className="space-y-1.5">
                <Label>Invite email</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="employee@email.com"
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button
                size="sm"
                onClick={() => {
                  if (!inviteEmail) { setFormError('Email address is required'); return }
                  setFormError('')
                  sendInviteMutation.mutate()
                }}
                disabled={sendInviteMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sendInviteMutation.isPending ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
