import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface ComplianceAlert {
  employeeId: string
  employeeName: string
  type: 'LICENCE' | 'ACCREDITATION' | 'MEDICAL'
  subType: string
  expiryDate: string
  daysUntilExpiry: number
  alertLevel: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'NOTICE'
}

const ALERT_VARIANTS: Record<string, 'destructive' | 'secondary' | 'default'> = {
  EXPIRED: 'destructive',
  CRITICAL: 'destructive',
  WARNING: 'secondary',
  NOTICE: 'default',
}

const ALERT_COLOURS: Record<string, string> = {
  EXPIRED: 'text-destructive',
  CRITICAL: 'text-destructive',
  WARNING: 'text-orange-600',
  NOTICE: 'text-blue-600',
}

export function CompliancePage() {
  const { activeCompanyId } = useAuthStore()
  const [daysAhead, setDaysAhead] = useState(90)
  const [typeFilter, setTypeFilter] = useState('')

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['compliance-alerts', activeCompanyId, daysAhead],
    queryFn: async () => {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/compliance/alerts?daysAhead=${daysAhead}`
      )
      return data.data as ComplianceAlert[]
    },
    enabled: !!activeCompanyId,
  })

  const filtered = (alerts ?? []).filter(a => !typeFilter || a.type === typeFilter)

  const counts = {
    EXPIRED: (alerts ?? []).filter(a => a.alertLevel === 'EXPIRED').length,
    CRITICAL: (alerts ?? []).filter(a => a.alertLevel === 'CRITICAL').length,
    WARNING: (alerts ?? []).filter(a => a.alertLevel === 'WARNING').length,
    NOTICE: (alerts ?? []).filter(a => a.alertLevel === 'NOTICE').length,
  }

  return (
    <div className="flex flex-col gap-0">
      <PageHeader
        title="Compliance"
        description="Licences, accreditations &amp; medicals"
        actions={
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              <option value="LICENCE">Licences</option>
              <option value="ACCREDITATION">Accreditations</option>
              <option value="MEDICAL">Medicals</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={daysAhead}
              onChange={e => setDaysAhead(Number(e.target.value))}
            >
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
              <option value={180}>Next 180 days</option>
            </select>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Expired', key: 'EXPIRED', colour: 'text-destructive bg-red-50' },
            { label: 'Critical (< 30d)', key: 'CRITICAL', colour: 'text-destructive bg-red-50' },
            { label: 'Warning (< 60d)', key: 'WARNING', colour: 'text-orange-600 bg-orange-50' },
            { label: 'Notice (< 90d)', key: 'NOTICE', colour: 'text-blue-600 bg-blue-50' },
          ].map(({ label, key, colour }) => (
            <Card key={key}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${colour.split(' ')[0]}`} />
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
                <p className="mt-1 text-2xl font-bold">{counts[key as keyof typeof counts]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Alert table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No compliance alerts in this window.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Detail</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Days</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
                    .map((alert, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{alert.employeeName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{alert.type}</td>
                        <td className="px-4 py-3 text-muted-foreground">{alert.subType}</td>
                        <td className="px-4 py-3">
                          <span className={ALERT_COLOURS[alert.alertLevel]}>
                            {formatDate(alert.expiryDate)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center font-medium ${ALERT_COLOURS[alert.alertLevel]}`}>
                          {alert.daysUntilExpiry < 0
                            ? `${Math.abs(alert.daysUntilExpiry)}d ago`
                            : `${alert.daysUntilExpiry}d`}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={ALERT_VARIANTS[alert.alertLevel] ?? 'secondary'}>
                            {alert.alertLevel}
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
