import { useQuery } from '@tanstack/react-query'
import { FileText, ExternalLink, ShieldCheck, Stethoscope, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, apiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/useToast'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ComplianceLicence {
  id: string
  licenceNumber: string
  licenceState: string
  licenceClasses: string[]
  issueDate: string
  expiryDate: string
  documentKey: string | null
}

interface ComplianceAccreditation {
  id: string
  accreditationType: string
  certificateNumber: string | null
  issueDate: string
  expiryDate: string | null
  documentKey: string | null
}

interface ComplianceMedical {
  id: string
  certType: string
  issueDate: string
  expiryDate: string | null
  restrictions: string | null
  documentKey: string | null
}

interface ComplianceDocs {
  licences: ComplianceLicence[]
  accreditations: ComplianceAccreditation[]
  medicals: ComplianceMedical[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeeDocuments() {
  const { toast } = useToast()

  const { data, isLoading, isError } = useQuery<{ data: ComplianceDocs }>({
    queryKey: ['self-service', 'compliance'],
    queryFn: () => api.get('/self-service/compliance').then(r => r.data),
  })

  const docs = data?.data

  async function viewDoc(docType: 'licence' | 'accreditation' | 'medical', docId: string) {
    try {
      const res = await api.get(`/self-service/compliance/documents/${docType}/${docId}`)
      window.open(res.data.data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast({ title: 'Could not open document', description: apiError(err), variant: 'destructive' })
    }
  }

  function daysUntil(dateStr: string | null) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  function ExpiryBadge({ date }: { date: string | null }) {
    if (!date) return <span className="text-muted-foreground text-xs">No expiry</span>
    const days = daysUntil(date)!
    if (days < 0)  return <Badge variant="destructive">Expired</Badge>
    if (days <= 30) return <Badge variant="destructive">{days}d left</Badge>
    if (days <= 90) return <Badge variant="secondary" className="text-orange-600">{days}d left</Badge>
    return <span className="text-sm">{formatDate(date)}</span>
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-1">My Documents</h1>
        <p className="text-sm text-muted-foreground mb-6">Your licences, accreditations, and medical certificates</p>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (isError || !docs) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-1">My Documents</h1>
        <div className="text-sm text-destructive mt-4">Could not load documents. Please try again.</div>
      </div>
    )
  }

  const hasAny = docs.licences.length > 0 || docs.accreditations.length > 0 || docs.medicals.length > 0

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your licences, accreditations, and medical certificates recorded by your employer
        </p>
      </div>

      {!hasAny && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No compliance documents have been recorded for your profile yet.
          </CardContent>
        </Card>
      )}

      {/* Driver licences */}
      {docs.licences.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Driver Licences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Class(es)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Document</th>
                </tr>
              </thead>
              <tbody>
                {docs.licences.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{l.licenceClasses.join(', ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.licenceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.licenceState}</td>
                    <td className="px-4 py-3"><ExpiryBadge date={l.expiryDate} /></td>
                    <td className="px-4 py-3">
                      {l.documentKey ? (
                        <button
                          onClick={() => viewDoc('licence', l.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Accreditations */}
      {docs.accreditations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Accreditations & Certifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Certificate #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Document</th>
                </tr>
              </thead>
              <tbody>
                {docs.accreditations.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{a.accreditationType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.certificateNumber ?? '—'}</td>
                    <td className="px-4 py-3"><ExpiryBadge date={a.expiryDate} /></td>
                    <td className="px-4 py-3">
                      {a.documentKey ? (
                        <button
                          onClick={() => viewDoc('accreditation', a.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Medical certificates */}
      {docs.medicals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-red-600" />
              Medical Certificates
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expiry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Restrictions</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Document</th>
                </tr>
              </thead>
              <tbody>
                {docs.medicals.map(m => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{m.certType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(m.issueDate)}</td>
                    <td className="px-4 py-3"><ExpiryBadge date={m.expiryDate} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{m.restrictions ?? 'None'}</td>
                    <td className="px-4 py-3">
                      {m.documentKey ? (
                        <button
                          onClick={() => viewDoc('medical', m.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground pb-4">
        To update your compliance documents, contact your payroll manager or company admin.
      </p>
    </div>
  )
}
