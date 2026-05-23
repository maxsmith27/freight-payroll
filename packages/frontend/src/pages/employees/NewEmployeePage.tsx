import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Wand2, Info, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { AwardWizard, type AwardRecommendation } from '@/components/employees/AwardWizard'

// ─── Form schema (matches backend field names exactly) ─────────────────────

const newEmployeeSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  // Use refine instead of .or(z.literal('')) — the latter produces a ZodUnionIssue
  // object as the error message which React cannot render as a child (Error #31).
  email: z.string().optional().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Enter a valid email',
  ),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR']),
  startDate: z.string().min(1, 'Required'),
  payFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  // Select fields: '' means "nothing chosen". Plain z.string() avoids union errors.
  awardCode: z.string().optional(),
  classificationLevel: z.string().optional(),
  // Pay rate (handled separately after employee creation)
  payType: z.enum(['HOURLY', 'SALARY', 'PER_KM', 'PER_LOAD', 'PERCENTAGE_REVENUE']),
  baseRate: z.coerce.number().min(0, 'Must be ≥ 0'),
  // Tax — exact backend field names
  taxFileNumber: z.string().optional().refine(
    (val) => !val || /^\d{9}$/.test(val),
    'TFN must be exactly 9 digits (no spaces or dashes)',
  ),
  taxResidencyStatus: z.enum(['RESIDENT', 'FOREIGN_RESIDENT', 'WORKING_HOLIDAY_MAKER']),
  claimsTaxFreeThreshold: z.boolean(),
  hasHECSDebt: z.boolean(),
  superFundName: z.string().optional(),
  superMemberNumber: z.string().optional(),
})

type NewEmployeeForm = z.infer<typeof newEmployeeSchema>

// ─── Award minimum rate lookup type ────────────────────────────────────────

interface AwardBaseRate {
  id: string
  award: string
  classificationLevel: string
  hourlyRate: string
  effectiveFrom: string
  effectiveTo: string | null
}

// ─── Employment type explanations ──────────────────────────────────────────

const EMPLOYMENT_TYPE_EXPLANATIONS: Record<string, string> = {
  FULL_TIME:  'Works regular hours each week (typically 38 hrs). Entitled to annual leave, personal leave, and other NES entitlements.',
  PART_TIME:  'Works less than 38 hrs/week with regular hours agreed in advance. Same entitlements as full-time, on a pro-rata basis.',
  CASUAL:     'No guaranteed hours. Paid a 25% casual loading instead of leave entitlements. May become eligible for casual conversion after 12 months.',
  CONTRACTOR: 'Engaged under a services agreement. Not an employee — no PAYG withholding applies unless they quote an ABN.',
}

// ─── Component ─────────────────────────────────────────────────────────────

export function NewEmployeePage() {
  const navigate = useNavigate()
  const { activeCompanyId } = useAuthStore()
  const [submitError, setSubmitError] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [awardSuggestion, setAwardSuggestion] = useState<string | null>(null)
  const [minimumRate, setMinimumRate] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<NewEmployeeForm>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: {
      employmentType: 'FULL_TIME',
      payFrequency: 'WEEKLY',
      payType: 'HOURLY',
      taxResidencyStatus: 'RESIDENT',
      claimsTaxFreeThreshold: true,
      hasHECSDebt: false,
      baseRate: 0,
    },
  })

  // ── Load award minimum rates ────────────────────────────────────────────

  const { data: awardMinimumsData } = useQuery({
    queryKey: ['award-minimums', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/employees/award-minimums?companyId=${activeCompanyId}`)
      return data.data as AwardBaseRate[]
    },
    enabled: !!activeCompanyId,
    staleTime: 1000 * 60 * 60, // 1 hour — award rates rarely change
  })

  // ── Auto-fill minimum rate when award + grade + payType changes ─────────

  const watchedAward = watch('awardCode')
  const watchedGrade = watch('classificationLevel')
  const watchedPayType = watch('payType')
  const watchedEmploymentType = watch('employmentType')
  const watchedBaseRate = watch('baseRate')

  useEffect(() => {
    if (!awardMinimumsData || !watchedAward || !watchedGrade) {
      setAwardSuggestion(null)
      setMinimumRate(null)
      return
    }

    const match = awardMinimumsData.find(
      r => r.award === watchedAward && r.classificationLevel === watchedGrade,
    )
    if (!match) {
      setAwardSuggestion(null)
      setMinimumRate(null)
      return
    }

    const hourlyMin = parseFloat(match.hourlyRate)

    if (watchedPayType === 'HOURLY') {
      setValue('baseRate', hourlyMin)
      setMinimumRate(hourlyMin)
      setAwardSuggestion(`Award minimum: $${hourlyMin.toFixed(2)}/hr for ${watchedGrade.replace('GRADE_', 'Grade ')} under ${watchedAward}`)
    } else if (watchedPayType === 'SALARY') {
      const annualMin = Math.ceil(hourlyMin * 38 * 52)
      setValue('baseRate', annualMin)
      setMinimumRate(annualMin)
      setAwardSuggestion(`Award minimum: $${annualMin.toLocaleString()}/yr (based on $${hourlyMin.toFixed(2)}/hr × 38 × 52)`)
    } else {
      // PER_KM, PER_LOAD, PERCENTAGE_REVENUE — no award floor for these
      setAwardSuggestion(null)
      setMinimumRate(null)
    }
  }, [watchedAward, watchedGrade, watchedPayType, awardMinimumsData, setValue])

  // ── Enforce award minimum — flag if rate is manually lowered below it ───

  useEffect(() => {
    if (minimumRate == null) {
      clearErrors('baseRate')
      return
    }
    if (watchedBaseRate !== undefined && Number(watchedBaseRate) < minimumRate) {
      setError('baseRate', { type: 'manual', message: 'Below award minimum — see rate suggestion above' })
    } else {
      clearErrors('baseRate')
    }
  }, [watchedBaseRate, minimumRate, setError, clearErrors])

  // ── Wizard ──────────────────────────────────────────────────────────────

  function applyWizardRecommendation(rec: AwardRecommendation) {
    setValue('awardCode', rec.awardCode)
    if (rec.classificationLevel) setValue('classificationLevel', rec.classificationLevel)
  }

  // ── Submit — 3-step: create employee → classification → pay rate ────────

  async function onSubmit(values: NewEmployeeForm) {
    setSubmitError('')
    // Belt-and-suspenders: block if below minimum even if the UI error was dismissed
    if (minimumRate !== null && values.baseRate < minimumRate) {
      setError('baseRate', { type: 'manual', message: 'Below award minimum — see rate suggestion above' })
      return
    }
    try {
      const cq = `companyId=${activeCompanyId}`
      const startDateISO = new Date(values.startDate).toISOString()

      // ── Step 1: Create employee record ──────────────────────────────────
      const employeePayload: Record<string, unknown> = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email || undefined,
        phone: values.phone || undefined,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
        employmentType: values.employmentType,
        startDate: startDateISO,
        payFrequency: values.payFrequency,
        awardCode: values.awardCode || undefined,
        taxResidencyStatus: values.taxResidencyStatus,
        claimsTaxFreeThreshold: values.claimsTaxFreeThreshold,
        hasHECSDebt: values.hasHECSDebt,
        taxFileNumber: values.taxFileNumber || undefined,
        superFundName: values.superFundName || undefined,
        superMemberNumber: values.superMemberNumber || undefined,
      }

      const { data: createData } = await api.post(`/employees?${cq}`, employeePayload)
      const employeeId = createData.data.id

      // ── Step 2: Add award classification (if both award + grade selected) ─
      if (values.awardCode && values.classificationLevel) {
        await api.post(`/employees/${employeeId}/classifications?${cq}`, {
          effectiveFrom: startDateISO,
          awardCode: values.awardCode,
          classificationLevel: values.classificationLevel,
        })
      }

      // ── Step 3: Add pay rate ────────────────────────────────────────────
      if (values.baseRate > 0) {
        const payRatePayload = buildPayRatePayload(values.payType, values.baseRate, startDateISO)
        await api.post(`/employees/${employeeId}/pay-rates?${cq}`, payRatePayload)
      }

      navigate(`/employees/${employeeId}`)
    } catch (err) {
      setSubmitError(apiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <PageHeader title="Add employee" description="Create a new employee record" />

      <AwardWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onAccept={applyWizardRecommendation}
      />

      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">

          {/* Personal */}
          <Card>
            <CardHeader><CardTitle className="text-base">Personal details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First name *</Label>
                <Input {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last name *</Label>
                <Input {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register('phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>Date of birth</Label>
                <Input type="date" {...register('dateOfBirth')} />
              </div>
            </CardContent>
          </Card>

          {/* Employment */}
          <Card>
            <CardHeader><CardTitle className="text-base">Employment</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Employment type *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('employmentType')}
                >
                  <option value="FULL_TIME">Full-time — 38 hrs/week, full entitlements</option>
                  <option value="PART_TIME">Part-time — fewer hours, pro-rata entitlements</option>
                  <option value="CASUAL">Casual — no guaranteed hours, +25% loading</option>
                  <option value="CONTRACTOR">Contractor — services agreement, no PAYG</option>
                </select>
                {watchedEmploymentType && (
                  <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    {EMPLOYMENT_TYPE_EXPLANATIONS[watchedEmploymentType]}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Start date *</Label>
                <Input type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Pay frequency *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('payFrequency')}
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Award</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
                    onClick={() => setShowWizard(true)}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1" /> Use wizard
                  </Button>
                </div>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('awardCode')}
                >
                  <option value="">No award / above-award arrangement</option>
                  <option value="MA000038">MA000038 — Road Transport &amp; Distribution</option>
                  <option value="MA000039">MA000039 — Road Transport (Long Distance Operations)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Classification grade</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('classificationLevel')}
                >
                  <option value="">—</option>
                  <option value="GRADE_1">Grade 1 — Car licence / light vehicle / store person</option>
                  <option value="GRADE_2">Grade 2 — Light rigid (under 8t) / forklift</option>
                  <option value="GRADE_3">Grade 3 — Medium rigid (8–15t)</option>
                  <option value="GRADE_4">Grade 4 — Heavy rigid (15t+) / articulated</option>
                  <option value="GRADE_5">Grade 5 — B-double / road train / multi-combination</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Pay rate */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pay rate</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pay type *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('payType')}
                >
                  <option value="HOURLY">Hourly</option>
                  <option value="SALARY">Annual salary</option>
                  <option value="PER_KM">Per kilometre</option>
                  <option value="PER_LOAD">Per load</option>
                  <option value="PERCENTAGE_REVENUE">Revenue share (%)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  {watchedPayType === 'SALARY' ? 'Annual salary ($)' :
                   watchedPayType === 'PERCENTAGE_REVENUE' ? 'Revenue share (%)' :
                   watchedPayType === 'PER_KM' ? 'Rate per km ($)' :
                   watchedPayType === 'PER_LOAD' ? 'Rate per load ($)' :
                   'Hourly rate ($)'} *
                </Label>
                <Input type="number" step="0.01" min="0" {...register('baseRate')} />
                {errors.baseRate && (
                  <p className="text-xs text-destructive">{errors.baseRate.message}</p>
                )}
                {awardSuggestion && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                    {awardSuggestion} — pre-filled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tax & super */}
          <Card>
            <CardHeader><CardTitle className="text-base">Tax &amp; super</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tax residency *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...register('taxResidencyStatus')}
                >
                  <option value="RESIDENT">Australian resident</option>
                  <option value="FOREIGN_RESIDENT">Foreign resident</option>
                  <option value="WORKING_HOLIDAY_MAKER">Working holiday maker</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>TFN (stored encrypted)</Label>
                <Input {...register('taxFileNumber')} placeholder="e.g. 123456789" maxLength={9} />
                {errors.taxFileNumber && (
                  <p className="text-xs text-destructive">{errors.taxFileNumber.message}</p>
                )}
              </div>
              <div className="col-span-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('claimsTaxFreeThreshold')} className="rounded" />
                  Claims tax-free threshold
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('hasHECSDebt')} className="rounded" />
                  Has HECS/HELP debt
                </label>
              </div>
              <div className="space-y-1.5">
                <Label>Super fund name</Label>
                <Input {...register('superFundName')} placeholder="e.g. AustralianSuper" />
              </div>
              <div className="space-y-1.5">
                <Label>Member number</Label>
                <Input {...register('superMemberNumber')} />
              </div>
            </CardContent>
          </Card>

          {submitError && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create employee
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Helper: map frontend payType + baseRate → backend pay rate payload ─────

function buildPayRatePayload(
  payType: string,
  baseRate: number,
  effectiveFrom: string,
): Record<string, unknown> {
  const base = { effectiveFrom, payType }
  switch (payType) {
    case 'HOURLY':             return { ...base, hourlyRate: baseRate }
    case 'SALARY':             return { ...base, annualSalary: baseRate }
    case 'PER_KM':             return { ...base, ratePerKm: baseRate }
    case 'PER_LOAD':           return { ...base, ratePerLoad: baseRate }
    case 'PERCENTAGE_REVENUE': return { ...base, revenuePercentage: baseRate / 100 }
    default:                   return { ...base, hourlyRate: baseRate }
  }
}
