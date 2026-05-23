import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Truck, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, apiError } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingInfo {
  id: string
  companyName: string
  inviteEmail: string
  status: string
  existingData: Record<string, unknown> | null
  expiresAt: string
}

type Step = 'welcome' | 'personal' | 'tax' | 'super' | 'bank' | 'review' | 'done'

const STEPS: Step[] = ['welcome', 'personal', 'tax', 'super', 'bank', 'review', 'done']
const STEP_LABELS: Record<Step, string> = {
  welcome: 'Welcome',
  personal: 'Your Details',
  tax: 'Tax Declaration',
  super: 'Superannuation',
  bank: 'Bank Account',
  review: 'Review & Submit',
  done: 'Done',
}

const AUS_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [error, setError] = useState('')

  const { data: info, isLoading, error: loadError } = useQuery<OnboardingInfo>({
    queryKey: ['onboarding', token],
    queryFn: () => api.get(`/onboarding/token/${token}`).then(r => r.data.data),
    retry: false,
  })

  // Restore saved progress
  useEffect(() => {
    if (info?.existingData) {
      setFormData(prev => ({ ...info.existingData, ...prev }))
    }
    // Pre-fill email
    if (info?.inviteEmail) {
      setFormData(prev => ({ email: info.inviteEmail, ...prev }))
    }
  }, [info])

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put(`/onboarding/token/${token}`, data),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      api.post(`/onboarding/token/${token}/submit`, formData),
    onSuccess: () => {
      setStep('done')
    },
    onError: (err) => {
      setError(apiError(err))
    },
  })

  function set(field: string, value: unknown) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function val(field: string, fallback = ''): string {
    return (formData[field] as string) ?? fallback
  }

  function boolVal(field: string, fallback = false): boolean {
    return (formData[field] as boolean) ?? fallback
  }

  function goToStep(next: Step) {
    // Auto-save progress when moving forward
    saveMutation.mutate(formData)
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <OnboardingShell companyName="">
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading your invitation…
        </div>
      </OnboardingShell>
    )
  }

  if (loadError || !info) {
    const msg = apiError(loadError as Error)
    return (
      <OnboardingShell companyName="">
        <div className="text-center py-12 space-y-3">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">This link is no longer valid</h2>
          <p className="text-sm text-muted-foreground">{msg || 'The invite link has expired or has already been used.'}</p>
          <p className="text-sm text-muted-foreground">Please contact your employer for a new invite link.</p>
        </div>
      </OnboardingShell>
    )
  }

  const stepIndex = STEPS.indexOf(step)

  // ─── Step: Welcome ─────────────────────────────────────────────────────────

  if (step === 'welcome') {
    return (
      <OnboardingShell companyName={info.companyName}>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Welcome to {info.companyName}</h2>
            <p className="text-muted-foreground mt-2">
              You've been invited to complete your employee onboarding. This should take about 5 minutes.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { step: 'Your Details',    desc: 'Personal information, address, and emergency contact' },
              { step: 'Tax Declaration', desc: 'TFN and tax settings — used by payroll to calculate the right withholding' },
              { step: 'Superannuation',  desc: 'Your super fund details — choose your own or use the default fund' },
              { step: 'Bank Account',    desc: 'Where your wages get paid' },
            ].map(({ step: s, desc }) => (
              <div key={s} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Your information is encrypted and only accessible to your employer's payroll team.
          </div>

          <Button onClick={() => goToStep('personal')} className="w-full">
            Get started <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </OnboardingShell>
    )
  }

  // ─── Step: Personal details ────────────────────────────────────────────────

  if (step === 'personal') {
    return (
      <OnboardingShell companyName={info.companyName} step={stepIndex} total={STEPS.length - 2}>
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Your details</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First name *">
              <Input value={val('firstName')} onChange={e => set('firstName', e.target.value)} placeholder="John" />
            </Field>
            <Field label="Last name *">
              <Input value={val('lastName')} onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
            </Field>
            <Field label="Preferred name" hint="What you like to be called">
              <Input value={val('preferredName')} onChange={e => set('preferredName', e.target.value)} placeholder="Optional" />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={val('dateOfBirth')} onChange={e => set('dateOfBirth', e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input value={val('mobile')} onChange={e => set('mobile', e.target.value)} placeholder="04xx xxx xxx" />
            </Field>
            <Field label="Phone">
              <Input value={val('phone')} onChange={e => set('phone', e.target.value)} placeholder="Optional" />
            </Field>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Residential address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Street">
                  <Input value={val('addressStreet')} onChange={e => set('addressStreet', e.target.value)} />
                </Field>
              </div>
              <Field label="Suburb">
                <Input value={val('addressSuburb')} onChange={e => set('addressSuburb', e.target.value)} />
              </Field>
              <Field label="State">
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={val('addressState')} onChange={e => set('addressState', e.target.value)}>
                  <option value="">Select…</option>
                  {AUS_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Postcode">
                <Input value={val('addressPostcode')} onChange={e => set('addressPostcode', e.target.value)} maxLength={4} />
              </Field>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-3">Emergency contact <span className="text-muted-foreground font-normal">(optional)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name">
                <Input value={val('emergencyName')} onChange={e => set('emergencyName', e.target.value)} />
              </Field>
              <Field label="Relationship">
                <Input value={val('emergencyRelationship')} onChange={e => set('emergencyRelationship', e.target.value)} placeholder="e.g. Partner, Parent" />
              </Field>
              <Field label="Phone">
                <Input value={val('emergencyPhone')} onChange={e => set('emergencyPhone', e.target.value)} />
              </Field>
            </div>
          </div>

          <NavButtons
            onBack={() => goToStep('welcome')}
            onNext={() => {
              if (!val('firstName') || !val('lastName')) {
                setError('First name and last name are required.')
                return
              }
              setError('')
              goToStep('tax')
            }}
            error={error}
          />
        </div>
      </OnboardingShell>
    )
  }

  // ─── Step: Tax declaration ─────────────────────────────────────────────────

  if (step === 'tax') {
    return (
      <OnboardingShell companyName={info.companyName} step={stepIndex} total={STEPS.length - 2}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Tax declaration</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This replaces the paper ATO Tax File Number Declaration (NAT 3092). Your TFN is stored encrypted and is only used for PAYG withholding.
            </p>
          </div>

          <Field label="Tax File Number (TFN)" hint="9 digits — found on your ATO correspondence or myGov">
            <Input
              value={val('taxFileNumber')}
              onChange={e => set('taxFileNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="123 456 789"
              maxLength={11}
            />
          </Field>

          <div className="space-y-3">
            <p className="text-sm font-medium">Tax residency</p>
            {[
              { value: 'RESIDENT',               label: 'Australian resident for tax purposes' },
              { value: 'FOREIGN_RESIDENT',        label: 'Foreign resident (flat 32.5% rate applies)' },
              { value: 'WORKING_HOLIDAY_MAKER',   label: 'Working holiday maker (visa subclass 417 or 462)' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="taxResidency"
                  value={opt.value}
                  checked={val('taxResidencyStatus', 'RESIDENT') === opt.value}
                  onChange={() => set('taxResidencyStatus', opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {val('taxResidencyStatus', 'RESIDENT') === 'RESIDENT' && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={boolVal('claimsTaxFreeThreshold', true)}
                  onChange={e => set('claimsTaxFreeThreshold', e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Claim the tax-free threshold</p>
                  <p className="text-xs text-muted-foreground">Select this if this is your main job. The first $18,200 of your income each year is tax-free.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={boolVal('hasHECSDebt')}
                  onChange={e => set('hasHECSDebt', e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">I have a HECS-HELP or study debt</p>
                  <p className="text-xs text-muted-foreground">Additional withholding will apply to repay your student loan.</p>
                </div>
              </label>
            </div>
          )}

          <div className="rounded-lg border-2 border-slate-200 px-4 py-4 space-y-3">
            <p className="text-sm font-medium">Declaration</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              I declare that the information I have given is true and correct. I understand that a penalty may be imposed if I give false or misleading information. I authorise my employer to withhold PAYG tax at the rate determined by my declaration above.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={boolVal('taxDeclarationAgreed')}
                onChange={e => set('taxDeclarationAgreed', e.target.checked)}
                className="mt-0.5"
              />
              <p className="text-sm">I agree to the above declaration</p>
            </label>
            {boolVal('taxDeclarationAgreed') && (
              <Field label="Full legal name (as declaration signature)">
                <Input
                  value={val('taxDeclarationSignedName')}
                  onChange={e => set('taxDeclarationSignedName', e.target.value)}
                  placeholder={`${val('firstName')} ${val('lastName')}`.trim() || 'Your full name'}
                />
              </Field>
            )}
          </div>

          <NavButtons
            onBack={() => goToStep('personal')}
            onNext={() => {
              if (!boolVal('taxDeclarationAgreed')) {
                setError('You must agree to the tax declaration to continue.')
                return
              }
              setError('')
              goToStep('super')
            }}
            error={error}
          />
        </div>
      </OnboardingShell>
    )
  }

  // ─── Step: Superannuation ──────────────────────────────────────────────────

  if (step === 'super') {
    const useDefaultFund = boolVal('useDefaultFund')
    return (
      <OnboardingShell companyName={info.companyName} step={stepIndex} total={STEPS.length - 2}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Superannuation</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your employer must pay 12% of your ordinary earnings into a super fund. You can choose your own or use the employer's default fund.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors hover:bg-slate-50 border-slate-200">
              <input
                type="radio"
                name="superChoice"
                checked={useDefaultFund}
                onChange={() => { set('useDefaultFund', true) }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">Use the employer's default fund</p>
                <p className="text-xs text-muted-foreground">Your employer will staple your super to the default fund or your existing fund (per ATO stapled fund rules).</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border-2 px-4 py-3 transition-colors hover:bg-slate-50 border-slate-200">
              <input
                type="radio"
                name="superChoice"
                checked={!useDefaultFund}
                onChange={() => { set('useDefaultFund', false) }}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">I want to choose my own fund</p>
                <p className="text-xs text-muted-foreground">Enter your fund details below.</p>
              </div>
            </label>
          </div>

          {!useDefaultFund && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="col-span-2">
                <Field label="Fund name *" hint="e.g. AustralianSuper, Hostplus, REST">
                  <Input value={val('superFundName')} onChange={e => set('superFundName', e.target.value)} />
                </Field>
              </div>
              <Field label="ABN">
                <Input value={val('superFundAbn')} onChange={e => set('superFundAbn', e.target.value)} placeholder="11 digits" />
              </Field>
              <Field label="USI (Unique Superannuation Identifier)">
                <Input value={val('superFundUsi')} onChange={e => set('superFundUsi', e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Member number *">
                  <Input value={val('superMemberNumber')} onChange={e => set('superMemberNumber', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={boolVal('superChoiceAgreed')}
              onChange={e => set('superChoiceAgreed', e.target.checked)}
              className="mt-0.5"
            />
            <p className="text-sm">I confirm my super fund selection and authorise contributions to this fund</p>
          </label>

          <NavButtons
            onBack={() => goToStep('tax')}
            onNext={() => {
              if (!boolVal('superChoiceAgreed')) {
                setError('Please confirm your super fund selection.')
                return
              }
              if (!useDefaultFund && !val('superFundName')) {
                setError('Please enter your fund name or choose the default fund.')
                return
              }
              setError('')
              goToStep('bank')
            }}
            error={error}
          />
        </div>
      </OnboardingShell>
    )
  }

  // ─── Step: Bank account ────────────────────────────────────────────────────

  if (step === 'bank') {
    return (
      <OnboardingShell companyName={info.companyName} step={stepIndex} total={STEPS.length - 2}>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">Bank account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your wages will be deposited into this account. BSB and account number are stored encrypted.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="BSB *" hint="6 digits, no dash">
              <Input
                value={val('bankBsb')}
                onChange={e => set('bankBsb', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="012345"
                maxLength={6}
              />
            </Field>
            <Field label="Account number *">
              <Input
                value={val('bankAccountNumber')}
                onChange={e => set('bankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="123456789"
                maxLength={10}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Account name *" hint="Must match the name on your bank account exactly">
                <Input value={val('bankAccountName')} onChange={e => set('bankAccountName', e.target.value)} />
              </Field>
            </div>
          </div>

          <NavButtons
            onBack={() => goToStep('super')}
            onNext={() => {
              const bsb = val('bankBsb')
              const acc = val('bankAccountNumber')
              const name = val('bankAccountName')
              if (!bsb || !acc || !name) {
                setError('Please enter your BSB, account number and account name.')
                return
              }
              if (bsb.length !== 6) {
                setError('BSB must be exactly 6 digits.')
                return
              }
              setError('')
              goToStep('review')
            }}
            error={error}
          />
        </div>
      </OnboardingShell>
    )
  }

  // ─── Step: Review ──────────────────────────────────────────────────────────

  if (step === 'review') {
    return (
      <OnboardingShell companyName={info.companyName} step={stepIndex} total={STEPS.length - 2}>
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Review and submit</h2>
          <p className="text-sm text-muted-foreground">Please check your details before submitting. Your employer will review and activate your account.</p>

          <div className="space-y-4">
            <ReviewSection title="Personal details">
              <ReviewRow label="Name" value={`${val('firstName')} ${val('lastName')}`} />
              <ReviewRow label="Mobile" value={val('mobile')} />
              <ReviewRow label="Address" value={[val('addressStreet'), val('addressSuburb'), val('addressState'), val('addressPostcode')].filter(Boolean).join(', ')} />
            </ReviewSection>

            <ReviewSection title="Tax">
              <ReviewRow label="TFN" value={val('taxFileNumber') ? '•••  •••  •••' : 'Not provided'} />
              <ReviewRow label="Residency" value={val('taxResidencyStatus', 'RESIDENT')} />
              <ReviewRow label="Tax-free threshold" value={boolVal('claimsTaxFreeThreshold', true) ? 'Yes' : 'No'} />
              <ReviewRow label="Declaration agreed" value={boolVal('taxDeclarationAgreed') ? 'Yes' : 'No'} />
            </ReviewSection>

            <ReviewSection title="Superannuation">
              <ReviewRow label="Fund" value={boolVal('useDefaultFund') ? 'Employer default fund' : (val('superFundName') || '—')} />
              {!boolVal('useDefaultFund') && <ReviewRow label="Member number" value={val('superMemberNumber')} />}
            </ReviewSection>

            <ReviewSection title="Bank account">
              <ReviewRow label="BSB" value={val('bankBsb')} />
              <ReviewRow label="Account" value={val('bankAccountNumber') ? '•'.repeat(val('bankAccountNumber').length - 3) + val('bankAccountNumber').slice(-3) : '—'} />
              <ReviewRow label="Account name" value={val('bankAccountName')} />
            </ReviewSection>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</div>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => goToStep('bank')}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit my details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </OnboardingShell>
    )
  }

  // ─── Step: Done ────────────────────────────────────────────────────────────

  return (
    <OnboardingShell companyName={info?.companyName ?? ''}>
      <div className="text-center space-y-5 py-6">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold">All done!</h2>
        <p className="text-muted-foreground">
          Your details have been submitted to <strong>{info?.companyName}</strong>. They'll review your onboarding and activate your account shortly.
        </p>
        <p className="text-sm text-muted-foreground">
          Once activated you'll receive an email with your login details for the Employee Portal, where you can view payslips, submit leave, and more.
        </p>
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
          If you have any questions, contact your employer directly.
        </div>
      </div>
    </OnboardingShell>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function OnboardingShell({
  children,
  companyName,
  step,
  total,
}: {
  children: React.ReactNode
  companyName: string
  step?: number
  total?: number
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <span className="font-bold text-sm">FreightPayroll</span>
        </div>
        {companyName && <p className="text-sm text-muted-foreground">{companyName}</p>}
      </header>

      {/* Progress bar */}
      {typeof step === 'number' && total && (
        <div className="h-1 bg-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${Math.min(100, ((step - 1) / total) * 100)}%` }}
          />
        </div>
      )}

      <main className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-lg">
          <Card className="shadow-sm border-0">
            <CardContent className="pt-6 pb-6">{children}</CardContent>
          </Card>
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-6">
        FreightPayroll — your information is encrypted and secure
      </footer>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  )
}

function NavButtons({
  onBack,
  onNext,
  error,
}: {
  onBack: () => void
  onNext: () => void
  error?: string
}) {
  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">{error}</div>
      )}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={onNext}>
          Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b">
        <p className="text-sm font-medium">{title}</p>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || '—'}</span>
    </div>
  )
}
