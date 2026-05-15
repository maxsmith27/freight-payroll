import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Building2, Users, Lock } from 'lucide-react'
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

export function SettingsPage() {
  const { activeCompanyId, user } = useAuthStore()
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

  const { data: users } = useQuery({
    queryKey: ['company-users', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}/users`)
      return data.data as Array<{
        id: string; firstName: string; lastName: string; email: string; role: string; lastLoginAt: string | null
      }>
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
            <Card>
              <CardContent className="p-0">
                {!users ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Loading users…</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Role</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">
                            {u.firstName} {u.lastName}
                            {u.id === user?.id && <Badge variant="secondary" className="ml-2 text-xs">You</Badge>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline">{u.role.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
            <p className="mt-4 text-xs text-muted-foreground">
              User invitation and role management will be available in a future release.
            </p>
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
        </Tabs>
      </div>
    </div>
  )
}
