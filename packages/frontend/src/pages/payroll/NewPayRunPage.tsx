import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'

const schema = z.object({
  payPeriodStart: z.string().min(1, 'Required'),
  payPeriodEnd: z.string().min(1, 'Required'),
  payDate: z.string().min(1, 'Required'),
  payFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY']),
})

type Form = z.infer<typeof schema>

export function NewPayRunPage() {
  const navigate = useNavigate()
  const { activeCompanyId } = useAuthStore()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { payFrequency: 'WEEKLY' },
  })

  async function onSubmit(values: Form) {
    setError('')
    try {
      const { data } = await api.post(`/companies/${activeCompanyId}/payroll/runs`, values)
      navigate(`/payroll/${data.data.id}`)
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <div className="flex flex-col gap-0">
      <PageHeader title="New pay run" description="Create a pay run for a specific pay period" />

      <div className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pay period</CardTitle>
              <CardDescription>
                The system will automatically include all approved timesheets within this period.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Pay frequency *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('payFrequency')}>
                  <option value="WEEKLY">Weekly</option>
                  <option value="FORTNIGHTLY">Fortnightly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Period start *</Label>
                  <Input type="date" {...register('payPeriodStart')} />
                  {errors.payPeriodStart && <p className="text-xs text-destructive">{errors.payPeriodStart.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Period end *</Label>
                  <Input type="date" {...register('payPeriodEnd')} />
                  {errors.payPeriodEnd && <p className="text-xs text-destructive">{errors.payPeriodEnd.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Pay date *</Label>
                <Input type="date" {...register('payDate')} />
                {errors.payDate && <p className="text-xs text-destructive">{errors.payDate.message}</p>}
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create pay run
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/payroll')}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
