import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PayRun {
  id: string
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  status: string
  totalGross: number
  totalTax: number
  totalNet: number
  totalSuper: number
  employeeCount: number
  payFrequency: string
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  PROCESSING: 'secondary',
  APPROVED: 'default',
  FINALISED: 'default',
  PAID: 'default',
  CANCELLED: 'destructive',
}

export function PayRunsPage() {
  const { activeCompanyId } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['pay-runs', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}/payroll/runs?page=1&limit=20`)
      return data.data as { items: PayRun[]; total: number }
    },
    enabled: !!activeCompanyId,
  })

  const payRuns = data?.items ?? []

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Payroll"
        description="Pay runs and payslips"
        actions={
          <Button asChild size="sm">
            <Link to="/payroll/new">
              <Plus className="h-4 w-4" />
              New pay run
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading pay runs…</div>
            ) : payRuns.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No pay runs yet.{' '}
                <Link to="/payroll/new" className="text-primary underline">
                  Create your first pay run
                </Link>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pay period</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pay date</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Employees</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tax</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Super</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payRuns.map(run => (
                    <tr key={run.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/payroll/${run.id}`} className="font-medium hover:underline">
                          {formatDate(run.payPeriodStart)} – {formatDate(run.payPeriodEnd)}
                        </Link>
                        <div className="text-xs text-muted-foreground">{run.payFrequency}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(run.payDate)}</td>
                      <td className="px-4 py-3 text-center">{run.employeeCount}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(run.totalGross)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(run.totalTax)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(run.totalNet)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(run.totalSuper)}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_VARIANTS[run.status] ?? 'secondary'}>
                          {run.status}
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
