import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type Payslip = {
  id: string
  grossEarnings: number
  netPay: number
  paygWithholding: number
  superGuarantee: number
  payRun: {
    id: string
    periodStartDate: string
    periodEndDate: string
    payDate: string
    payFrequency: string
    status: string
  }
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n)
}

export function EmployeePayslips() {
  const { data, isLoading } = useQuery<{ data: Payslip[] }>({
    queryKey: ['self-service', 'payslips'],
    queryFn: () => api.get('/self-service/payslips').then(r => r.data),
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Payslips</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your pay history once pay runs are approved</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (data?.data ?? []).length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <FileText className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">No payslips available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(data?.data ?? []).map(ps => (
            <Card key={ps.id} className="border-0 shadow-sm">
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(ps.payRun.periodStartDate)} – {formatDate(ps.payRun.periodEndDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pay date: {formatDate(ps.payRun.payDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">{fmt(Number(ps.netPay))}</p>
                    <p className="text-xs text-muted-foreground">net pay</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs border-t pt-3">
                  <div>
                    <p className="text-muted-foreground">Gross</p>
                    <p className="font-medium">{fmt(Number(ps.grossEarnings))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tax withheld</p>
                    <p className="font-medium">{fmt(Number(ps.paygWithholding))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Super</p>
                    <p className="font-medium">{fmt(Number(ps.superGuarantee))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
