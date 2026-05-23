import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Wand2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { AwardWizard, type AwardRecommendation } from '@/components/employees/AwardWizard'

const newEmployeeSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACTOR']),
  startDate: z.string().min(1, 'Required'),
  payFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
  awardCode: z.enum(['MA000038', 'MA000039']).optional(),
  classificationLevel: z.enum(['GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5']).optional(),
  payType: z.enum(['HOURLY', 'SALARY', 'KILOMETRE', 'LOAD', 'REVENUE_SHARE']),
  baseRate: z.coerce.number().min(0, 'Must be ≥ 0'),
  tfn: z.string().optional(),
  taxResidencyStatus: z.enum(['RESIDENT', 'NON_RESIDENT', 'WORKING_HOLIDAY_MAKER']),
  claimsTaxFreeThreshold: z.boolean(),
  hasHECS: z.boolean(),
  superFundName: z.string().optional(),
  superMemberNumber: z.string().optional(),
})

type NewEmployeeForm = z.infer<typeof newEmployeeSchema>

const EMPLOYMENT_TYPE_EXPLANATIONS: Record<string, string> = {
  FULL_TIME:  'Works regular hours each week (typically 38 hrs). Entitled to annual leave, personal leave, and other NES entitlements.',
  PART_TIME:  'Works less than 38 hrs/week with regular hours agreed in advance. Same entitlements as full-time, on a pro-rata basis.',
  CASUAL:     'No guaranteed hours. Paid a 25% casual loading instead of leave entitlements. May become eligible for casual conversion after 12 months.',
  CONTRACTOR: 'Engaged under a services agreement. Not an employee — no PAYG withholding applies unless they quote an ABN.',
}

export function NewEmployeePage() {
  const navigate = useNavigate()
  const { activeCompanyId } = useAuthStore()
  const [error, setError] = useState('')
  const [showWizard, setShowWizard] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewEmployeeForm>({
    resolver: zodResolver(newEmployeeSchema),
    defaultValues: {
      employmentType: 'FULL_TIME',
      payFrequency: 'WEEKLY',
      payType: 'HOURLY',
      taxResidencyStatus: 'RESIDENT',
      claimsTaxFreeThreshold: true,
      hasHECS: false,
      baseRate: 0,
    },
  })

  function applyWizardRecommendation(rec: AwardRecommendation) {
    setValue('awardCode', rec.awardCode)
    if (rec.classificationLevel) setValue('classificationLevel', rec.classificationLevel)
  }

  const watchedEmploymentType = watch('employmentType')

  async function onSubmit(values: NewEmployeeForm) {
    setError('')
    try {
      const { data } = await api.post(`/employees?companyId=${activeCompanyId}`, {
        ...values,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth).toISOString() : undefined,
      })
      navigate(`/employees/${data.data.id}`)
    } catch (err) {
      setError(apiError(err))
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
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('employmentType')}>
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
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('payFrequency')}>
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
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('awardCode')}>
                  <option value="">No award / above-award arrangement</option>
                  <option value="MA000038">MA000038 — Road Transport & Distribution</option>
                  <option value="MA000039">MA000039 — Road Transport (Long Distance Operations)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Classification grade</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('classificationLevel')}>
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
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('payType')}>
                  <option value="HOURLY">Hourly</option>
                  <option value="SALARY">Salary</option>
                  <option value="KILOMETRE">Per kilometre</option>
                  <option value="LOAD">Per load</option>
                  <option value="REVENUE_SHARE">Revenue share</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Base rate ($) *</Label>
                <Input type="number" step="0.01" min="0" {...register('baseRate')} />
                {errors.baseRate && <p className="text-xs text-destructive">{errors.baseRate.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Tax */}
          <Card>
            <CardHeader><CardTitle className="text-base">Tax &amp; super</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tax residency *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('taxResidencyStatus')}>
                  <option value="RESIDENT">Australian resident</option>
                  <option value="NON_RESIDENT">Foreign resident</option>
                  <option value="WORKING_HOLIDAY_MAKER">Working holiday maker</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>TFN (stored encrypted)</Label>
                <Input {...register('tfn')} placeholder="Enter TFN" />
              </div>
              <div className="col-span-2 flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('claimsTaxFreeThreshold')} className="rounded" />
                  Claims tax-free threshold
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" {...register('hasHECS')} className="rounded" />
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

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
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
