import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit, AlertTriangle, UserCheck, UserX, Copy } from 'lucide-react'
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

interface EmployeeDetail {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  address: string | null
  suburb: string | null
  state: string | null
  postcode: string | null
  employmentType: string
  startDate: string
  endDate: string | null
  payFrequency: string
  awardCode: string | null
  classificationLevel: string | null
  taxResidencyStatus: string
  claimsTaxFreeThreshold: boolean
  hasHECS: boolean
  tfn: string | null
  superFundName: string | null
  superMemberNumber: string | null
  isActive: boolean
  depotName: string | null
  payRates: Array<{ id: string; payType: string; baseRate: number; effectiveFrom: string; effectiveTo: string | null }>
  bankAccounts: Array<{ id: string; accountName: string; bsb: string; accountNumber: string; isPrimary: boolean }>
  leaveBalances: Array<{ leaveType: string; balanceHours: number; accrualRate: number }>
  licences: Array<{ licenceClass: string; licenceNumber: string; expiryDate: string; state: string }>
  accreditations: Array<{ type: string; number: string; expiryDate: string | null }>
  medicals: Array<{ examDate: string; expiryDate: string | null; restrictions: string | null }>
}

function LeaveTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    ANNUAL: 'Annual leave',
    PERSONAL_CARERS: 'Personal / carer\'s',
    COMPASSIONATE: 'Compassionate',
    LONG_SERVICE: 'Long service leave',
    PARENTAL: 'Parental leave',
    COMMUNITY_SERVICE: 'Community service',
  }
  return <span>{map[type] ?? type}</span>
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeCompanyId } = useAuthStore()
  const [portalPassword, setPortalPassword] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const { data: emp, isLoading } = useQuery<EmployeeDetail & { portalUser?: { email: string; isActive: boolean } | null }>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data } = await api.get(`/employees/${id}`)
      return data.data
    },
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
    mutationFn: () =>
      api.delete(`/employees/${id}/portal-access?companyId=${activeCompanyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] })
      setGeneratedPassword(null)
      toast({ title: 'Portal access revoked' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  if (isLoading || !emp) {
    return (
      <div className="flex flex-col gap-0">
        <PageHeader title="Employee" />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  const fullName = `${emp.firstName} ${emp.lastName}`
  const alertsCount = [
    ...emp.licences.filter(l => {
      const d = new Date(l.expiryDate)
      const diff = (d.getTime() - Date.now()) / 86400000
      return diff < 90
    }),
    ...emp.accreditations.filter(a => {
      if (!a.expiryDate) return false
      const diff = (new Date(a.expiryDate).getTime() - Date.now()) / 86400000
      return diff < 90
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
              <Link to="/employees">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
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
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Personal</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Email" value={emp.email} />
                  <Row label="Phone" value={emp.phone} />
                  <Row label="Date of birth" value={emp.dateOfBirth ? formatDate(emp.dateOfBirth) : null} />
                  <Row label="Address" value={[emp.address, emp.suburb, emp.state, emp.postcode].filter(Boolean).join(', ') || null} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Employment</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Type" value={employmentTypeLabel(emp.employmentType)} />
                  <Row label="Start date" value={formatDate(emp.startDate)} />
                  {emp.endDate && <Row label="End date" value={formatDate(emp.endDate)} />}
                  <Row label="Pay frequency" value={emp.payFrequency} />
                  <Row label="Depot" value={emp.depotName} />
                  {emp.awardCode && <Row label="Award" value={`${emp.awardCode} — ${classificationLabel(emp.classificationLevel ?? '')}`} />}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Tax</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="TFN" value={emp.tfn ? '••• ••• •••' : 'Not provided'} />
                  <Row label="Residency" value={emp.taxResidencyStatus} />
                  <Row label="Tax-free threshold" value={emp.claimsTaxFreeThreshold ? 'Yes' : 'No'} />
                  <Row label="HECS/HELP" value={emp.hasHECS ? 'Yes' : 'No'} />
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

          {/* Pay rates tab */}
          <TabsContent value="pay">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pay rate history</CardTitle>
              </CardHeader>
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
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.baseRate)}</td>
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

          {/* Leave tab */}
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
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance (hours)</th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Accrual rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.leaveBalances.map((lb, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-4 py-3"><LeaveTypeLabel type={lb.leaveType} /></td>
                          <td className="px-4 py-3 text-right font-medium">{lb.balanceHours.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{lb.accrualRate.toFixed(4)} hrs/hr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance tab */}
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
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.licences.map((l, i) => {
                        const daysLeft = Math.ceil((new Date(l.expiryDate).getTime() - Date.now()) / 86400000)
                        return (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{l.licenceClass}</td>
                            <td className="px-4 py-3 text-muted-foreground">{l.licenceNumber}</td>
                            <td className="px-4 py-3 text-muted-foreground">{l.state}</td>
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
              <CardHeader><CardTitle className="text-base">Medical certificates</CardTitle></CardHeader>
              <CardContent className="p-0">
                {emp.medicals.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">No medicals recorded.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exam date</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Restrictions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.medicals.map((m, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-4 py-3">{formatDate(m.examDate)}</td>
                          <td className="px-4 py-3">{m.expiryDate ? formatDate(m.expiryDate) : '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.restrictions ?? 'None'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Banking tab */}
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
                      The employee logs in at <strong>/login</strong> and is redirected to the Employee Portal. Share their login email and temporary password directly.
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
                      Grant this employee access to the self-service portal so they can log timesheets, kilometres, and view payslips.
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
                        <p className="text-green-700">
                          Share these credentials with <strong>{emp.firstName}</strong>:
                        </p>
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
        </Tabs>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}
