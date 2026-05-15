import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, BarChart3, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface ReportConfig {
  id: string
  name: string
  description: string
  params: Array<{ key: string; label: string; type: 'date' | 'select'; options?: Array<{ value: string; label: string }> }>
}

const REPORTS: ReportConfig[] = [
  {
    id: 'payroll-summary',
    name: 'Payroll summary',
    description: 'Total gross, tax, net and super by employee for a date range.',
    params: [
      { key: 'from', label: 'From date', type: 'date' },
      { key: 'to', label: 'To date', type: 'date' },
    ],
  },
  {
    id: 'leave-liability',
    name: 'Leave liability',
    description: 'Current leave balances and estimated dollar value per employee.',
    params: [],
  },
  {
    id: 'timesheet-hours',
    name: 'Timesheet hours',
    description: 'Regular, overtime and total hours per employee for a period.',
    params: [
      { key: 'from', label: 'From date', type: 'date' },
      { key: 'to', label: 'To date', type: 'date' },
    ],
  },
  {
    id: 'compliance-expiry',
    name: 'Compliance expiry',
    description: 'All licences, accreditations and medicals expiring within a window.',
    params: [
      {
        key: 'daysAhead',
        label: 'Days ahead',
        type: 'select',
        options: [
          { value: '30', label: '30 days' },
          { value: '60', label: '60 days' },
          { value: '90', label: '90 days' },
          { value: '180', label: '180 days' },
        ],
      },
    ],
  },
  {
    id: 'super-contributions',
    name: 'Super contributions',
    description: 'Superannuation obligations by employee and fund for a date range.',
    params: [
      { key: 'from', label: 'From date', type: 'date' },
      { key: 'to', label: 'To date', type: 'date' },
    ],
  },
  {
    id: 'roster-cost-forecast',
    name: 'Roster cost forecast',
    description: 'Estimated payroll cost based on rostered shifts for a period.',
    params: [
      { key: 'from', label: 'From date', type: 'date' },
      { key: 'to', label: 'To date', type: 'date' },
    ],
  },
]

function ReportCard({ report }: { report: ReportConfig }) {
  const { activeCompanyId } = useAuthStore()
  const { toast } = useToast()
  const [params, setParams] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function runReport() {
    setLoading(true)
    try {
      const query = new URLSearchParams({ ...params, format: 'csv' })
      const { data } = await api.get(`/companies/${activeCompanyId}/reports/${report.id}?${query}`)
      const blob = new Blob([data.data.csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.id}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast({ title: 'Error', description: apiError(err), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-blue-500" />
          {report.name}
        </CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.params.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {report.params.map(p => (
              <div key={p.key} className="space-y-1">
                <Label className="text-xs">{p.label}</Label>
                {p.type === 'date' ? (
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={params[p.key] ?? ''}
                    onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                  />
                ) : (
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={params[p.key] ?? (p.options?.[0]?.value ?? '')}
                    onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                  >
                    {p.options?.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
        <Button size="sm" variant="outline" onClick={runReport} disabled={loading} className="w-full">
          <Download className="h-4 w-4" />
          {loading ? 'Generating…' : 'Download CSV'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function ReportsPage() {
  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Reports"
        description="Download payroll, leave, compliance and workforce reports"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map(r => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          All reports export as CSV. PDF export and scheduled delivery will be available in a future release.
        </p>
      </div>
    </div>
  )
}
