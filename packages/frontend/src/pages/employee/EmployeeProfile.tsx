import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Save, Edit2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'
import { formatDate } from '@/lib/utils'

const AUS_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

interface Profile {
  id: string
  firstName: string
  lastName: string
  preferredName: string | null
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
  awardCode: string | null
  payFrequency: string
  taxResidencyStatus: string
  claimsTaxFreeThreshold: boolean
  hasHECSDebt: boolean
  superFundName: string | null
  superFundAbn: string | null
  superMemberNumber: string | null
  depot: { name: string } | null
  company: { name: string } | null
  emergencyContacts: Array<{
    id: string
    name: string
    relationship: string
    phone: string
    mobile: string | null
    isPrimary: boolean
  }>
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME:  'Full-time',
  PART_TIME:  'Part-time',
  CASUAL:     'Casual',
  CONTRACTOR: 'Contractor',
}

const PAY_FREQ_LABELS: Record<string, string> = {
  WEEKLY:      'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY:     'Monthly',
}

export function EmployeeProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ['self-service', 'me'],
    queryFn: () => api.get('/self-service/me').then(r => r.data.data),
  })

  function startEdit() {
    if (!profile) return
    setForm({
      preferredName: profile.preferredName ?? '',
      phone: profile.phone ?? '',
      mobile: profile.mobile ?? '',
      addressStreet: profile.addressStreet ?? '',
      addressSuburb: profile.addressSuburb ?? '',
      addressState: profile.addressState ?? '',
      addressPostcode: profile.addressPostcode ?? '',
    })
    setEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: () => api.put('/self-service/profile', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-service', 'me'] })
      toast({ title: 'Details updated' })
      setEditing(false)
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  if (isLoading || !profile) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
          {profile.company && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {EMPLOYMENT_LABELS[profile.employmentType] ?? profile.employmentType} · {profile.company.name}
            </p>
          )}
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Edit2 className="h-4 w-4 mr-1.5" /> Edit details
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Preferred name</Label>
                  <Input
                    value={form.preferredName ?? ''}
                    onChange={e => setForm(p => ({ ...p, preferredName: e.target.value }))}
                    className="mt-1"
                    placeholder="What do you like to be called?"
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input
                    value={form.mobile ?? ''}
                    onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone ?? ''}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <InfoRow label="Full name" value={`${profile.firstName} ${profile.lastName}`} />
                {profile.preferredName && <InfoRow label="Preferred name" value={profile.preferredName} />}
                <InfoRow label="Email" value={profile.email} />
                <InfoRow label="Mobile" value={profile.mobile} />
                <InfoRow label="Phone" value={profile.phone} />
                {profile.dateOfBirth && <InfoRow label="Date of birth" value={formatDate(profile.dateOfBirth)} />}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Street</Label>
                  <Input
                    value={form.addressStreet ?? ''}
                    onChange={e => setForm(p => ({ ...p, addressStreet: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Suburb</Label>
                  <Input
                    value={form.addressSuburb ?? ''}
                    onChange={e => setForm(p => ({ ...p, addressSuburb: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>State</Label>
                    <select
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.addressState ?? ''}
                      onChange={e => setForm(p => ({ ...p, addressState: e.target.value }))}
                    >
                      <option value="">—</option>
                      {AUS_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Postcode</Label>
                    <Input
                      value={form.addressPostcode ?? ''}
                      onChange={e => setForm(p => ({ ...p, addressPostcode: e.target.value }))}
                      className="mt-1"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm space-y-2">
                {profile.addressStreet || profile.addressSuburb ? (
                  <>
                    {profile.addressStreet && <p>{profile.addressStreet}</p>}
                    <p>
                      {[profile.addressSuburb, profile.addressState, profile.addressPostcode]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">No address on file</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment (read-only) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Employment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Type" value={EMPLOYMENT_LABELS[profile.employmentType] ?? profile.employmentType} />
            <InfoRow label="Start date" value={formatDate(profile.startDate)} />
            <InfoRow label="Pay frequency" value={PAY_FREQ_LABELS[profile.payFrequency] ?? profile.payFrequency} />
            {profile.depot && <InfoRow label="Depot" value={profile.depot.name} />}
            {profile.awardCode && <InfoRow label="Award" value={profile.awardCode} />}
          </CardContent>
        </Card>

        {/* Tax (read-only) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Tax & super</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Tax residency" value={profile.taxResidencyStatus.replace('_', ' ')} />
            <InfoRow label="Tax-free threshold" value={profile.claimsTaxFreeThreshold ? 'Yes' : 'No'} />
            <InfoRow label="HECS/HELP debt" value={profile.hasHECSDebt ? 'Yes' : 'No'} />
            {profile.superFundName && <InfoRow label="Super fund" value={profile.superFundName} />}
            {profile.superMemberNumber && <InfoRow label="Member number" value={profile.superMemberNumber} />}
            <p className="text-xs text-muted-foreground pt-1">To update your tax or super details, contact your payroll manager.</p>
          </CardContent>
        </Card>

        {/* Emergency contacts */}
        {profile.emergencyContacts && profile.emergencyContacts.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Emergency contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {profile.emergencyContacts.map(ec => (
                  <div key={ec.id} className="py-2 text-sm grid grid-cols-3 gap-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium">{ec.name}</p>
                      <p className="text-muted-foreground">{ec.relationship}</p>
                    </div>
                    <p className="text-muted-foreground">{ec.phone}</p>
                    {ec.isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full h-fit w-fit">Primary</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}
