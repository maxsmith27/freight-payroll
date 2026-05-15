import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, FileText, Send, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { api, apiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

interface PayRunDetail {
  id: string
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  status: string
  payFrequency: string
  totalGross: number
  totalTax: number
  totalNet: number
  totalSuper: number
  employeeCount: number
  items: Array<{
    id: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    grossPay: number
    taxWithheld: number
    netPay: number
    superContribution: number
    earnings: Array<{ earningType: string; hours: number | null; rate: number | null; amount: number }>
    allowances: Array<{ name: string; amount: number }>
    deductions: Array<{ name: string; amount: number }>
  }>
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  PROCESSING: 'secondary',
  APPROVED: 'default',
  FINALISED: 'default',
  PAID: 'default',
  CANCELLED: 'destructive',
}

export function PayRunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data: run, isLoading } = useQuery<PayRunDetail>({
    queryKey: ['pay-run', id],
    queryFn: async () => {
      const { data } = await api.get(`/payroll/runs/${id}`)
      return data.data
    },
  })

  const finaliseMutation = useMutation({
    mutationFn: () => api.post(`/payroll/runs/${id}/finalise`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-run', id] })
      toast({ title: 'Pay run finalised', description: 'Payslips are being generated.' })
    },
    onError: (err) => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  async function downloadABA() {
    try {
      const { data } = await api.post(`/payroll/runs/${id}/aba`)
      const blob = new Blob([data.data.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.data.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Error generating ABA file', description: apiError(err), variant: 'destructive' })
    }
  }

  async function downloadSTP() {
    try {
      const { data } = await api.get(`/payroll/runs/${id}/stp`)
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stp-${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Error generating STP payload', description: apiError(err), variant: 'destructive' })
    }
  }

  if (isLoading || !run) {
    return (
      <div className="flex flex-col gap-0">
        <PageHeader title="Pay run" />
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  const isFinalised = ['FINALISED', 'PAID'].includes(run.status)
  const isDraft = run.status === 'DRAFT'

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title={`Pay run: ${formatDate(run.payPeriodStart)} – ${formatDate(run.payPeriodEnd)}`}
        description={`Pay date: ${formatDate(run.payDate)} · ${run.payFrequency}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[run.status] ?? 'secondary'}>{run.status}</Badge>
            {isDraft && (
              <Button size="sm" onClick={() => finaliseMutation.mutate()} disabled={finaliseMutation.isPending}>
                {finaliseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Finalise
              </Button>
            )}
            {isFinalised && (
              <>
                <Button size="sm" variant="outline" onClick={downloadABA}>
                  <Download className="h-4 w-4" />
                  ABA file
                </Button>
                <Button size="sm" variant="outline" onClick={downloadSTP}>
                  <Send className="h-4 w-4" />
                  STP payload
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/payroll"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Totals summary */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Gross pay', value: formatCurrency(run.totalGross) },
            { label: 'Tax withheld', value: formatCurrency(run.totalTax) },
            { label: 'Net pay', value: formatCurrency(run.totalNet) },
            { label: 'Superannuation', value: formatCurrency(run.totalSuper) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Employee items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{run.employeeCount} employees</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tax</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Super</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {run.items.map(item => (
                  <>
                    <tr
                      key={item.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedRow(expandedRow === item.id ? null : item.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{item.employeeNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.grossPay)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(item.taxWithheld)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.netPay)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(item.superContribution)}</td>
                      <td className="px-4 py-3 text-right">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                    {expandedRow === item.id && (
                      <tr key={`${item.id}-detail`} className="border-b bg-muted/20">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-6 text-xs">
                            <div>
                              <p className="font-semibold mb-2">Earnings</p>
                              {item.earnings.map((e, i) => (
                                <div key={i} className="flex justify-between py-0.5">
                                  <span className="text-muted-foreground">{e.earningType.replace(/_/g, ' ')}</span>
                                  <span>{formatCurrency(e.amount)}</span>
                                </div>
                              ))}
                            </div>
                            {item.allowances.length > 0 && (
                              <div>
                                <p className="font-semibold mb-2">Allowances</p>
                                {item.allowances.map((a, i) => (
                                  <div key={i} className="flex justify-between py-0.5">
                                    <span className="text-muted-foreground">{a.name}</span>
                                    <span>{formatCurrency(a.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.deductions.length > 0 && (
                              <div>
                                <p className="font-semibold mb-2">Deductions</p>
                                {item.deductions.map((d, i) => (
                                  <div key={i} className="flex justify-between py-0.5">
                                    <span className="text-muted-foreground">{d.name}</span>
                                    <span className="text-destructive">−{formatCurrency(d.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
