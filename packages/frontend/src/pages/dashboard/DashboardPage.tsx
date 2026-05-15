import { useQuery } from '@tanstack/react-query'
import { Users, DollarSign, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface DashboardStats {
  activeEmployees: number
  pendingTimesheets: number
  pendingLeaveRequests: number
  lastPayRunTotal: number
  lastPayRunDate: string | null
  expiryAlerts: number
  upcomingHolidays: Array<{ name: string; date: string; state: string }>
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  accent?: 'blue' | 'green' | 'orange' | 'red'
}) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
  }
  const color = colors[accent ?? 'blue']

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const { activeCompanyId } = useAuthStore()

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}/dashboard`)
      return data.data
    },
    enabled: !!activeCompanyId,
  })

  const { data: alerts } = useQuery({
    queryKey: ['compliance-alerts', activeCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${activeCompanyId}/compliance/alerts?daysAhead=30`)
      return data.data as Array<{ employeeName: string; type: string; alertLevel: string; daysUntilExpiry: number }>
    },
    enabled: !!activeCompanyId,
  })

  return (
    <div className="flex flex-col gap-0">
      <PageHeader title="Dashboard" description="Overview of your workforce and payroll" />

      <div className="p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Active employees"
            value={isLoading ? '—' : (stats?.activeEmployees ?? 0)}
            icon={Users}
            accent="blue"
          />
          <StatCard
            title="Last pay run"
            value={isLoading ? '—' : (stats?.lastPayRunTotal != null ? formatCurrency(stats.lastPayRunTotal) : '—')}
            subtitle={stats?.lastPayRunDate ? new Date(stats.lastPayRunDate).toLocaleDateString('en-AU') : undefined}
            icon={DollarSign}
            accent="green"
          />
          <StatCard
            title="Pending timesheets"
            value={isLoading ? '—' : (stats?.pendingTimesheets ?? 0)}
            subtitle="awaiting approval"
            icon={Clock}
            accent="orange"
          />
          <StatCard
            title="Compliance alerts"
            value={isLoading ? '—' : (stats?.expiryAlerts ?? 0)}
            subtitle="expiring within 30 days"
            icon={AlertTriangle}
            accent={stats?.expiryAlerts ? 'red' : 'blue'}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Compliance alerts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Compliance alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!alerts || alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No alerts in the next 30 days.</p>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 8).map((alert, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{alert.employeeName}</span>
                        <span className="ml-2 text-muted-foreground">{alert.type}</span>
                      </div>
                      <Badge
                        variant={
                          alert.alertLevel === 'EXPIRED'
                            ? 'destructive'
                            : alert.alertLevel === 'CRITICAL'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {alert.daysUntilExpiry < 0
                          ? 'Expired'
                          : `${alert.daysUntilExpiry}d`}
                      </Badge>
                    </div>
                  ))}
                  {alerts.length > 8 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      +{alerts.length - 8} more — view Compliance page
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming public holidays */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-blue-500" />
                Upcoming public holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.upcomingHolidays || stats.upcomingHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground">No public holidays in the next 30 days.</p>
              ) : (
                <div className="space-y-2">
                  {stats.upcomingHolidays.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{h.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{h.state}</Badge>
                        <span className="text-muted-foreground">
                          {new Date(h.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'New pay run', href: '/payroll/new' },
                { label: 'Add employee', href: '/employees/new' },
                { label: 'Approve timesheets', href: '/time-attendance' },
                { label: 'View roster', href: '/roster' },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-lg border p-3 text-center text-sm font-medium hover:bg-muted transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
