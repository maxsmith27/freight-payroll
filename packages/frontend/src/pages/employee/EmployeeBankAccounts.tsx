import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api, apiError } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface BankAccount {
  id: string
  accountName: string
  bsb: string
  accountNumber: string
  isPrimary: boolean
  allocationPercent: number | null
}

interface NewAccountForm {
  bsb: string
  accountNumber: string
  accountName: string
  isPrimary: boolean
  allocationPercent?: number
}

const EMPTY_FORM: NewAccountForm = {
  bsb: '',
  accountNumber: '',
  accountName: '',
  isPrimary: false,
}

function maskAccount(num: string) {
  if (num.length <= 3) return num
  return '•'.repeat(num.length - 3) + num.slice(-3)
}

export function EmployeeBankAccounts() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewAccountForm>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: accounts, isLoading } = useQuery<BankAccount[]>({
    queryKey: ['self-service', 'bank-accounts'],
    queryFn: () => api.get('/self-service/bank-accounts').then(r => r.data.data),
  })

  const addMutation = useMutation({
    mutationFn: (data: NewAccountForm) => api.post('/self-service/bank-accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-service', 'bank-accounts'] })
      toast({ title: 'Bank account added' })
      setShowForm(false)
      setForm(EMPTY_FORM)
      setFormError('')
    },
    onError: err => {
      setFormError(apiError(err))
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: (id: string) => api.put(`/self-service/bank-accounts/${id}`, { isPrimary: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-service', 'bank-accounts'] })
      toast({ title: 'Primary account updated' })
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/self-service/bank-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-service', 'bank-accounts'] })
      toast({ title: 'Bank account removed' })
      setDeleteConfirm(null)
    },
    onError: err => toast({ title: 'Error', description: apiError(err), variant: 'destructive' }),
  })

  function handleAdd() {
    setFormError('')
    if (!form.bsb || !form.accountNumber || !form.accountName) {
      setFormError('All fields are required.')
      return
    }
    if (form.bsb.length !== 6) {
      setFormError('BSB must be exactly 6 digits.')
      return
    }
    if (form.accountNumber.length < 5 || form.accountNumber.length > 10) {
      setFormError('Account number must be 5–10 digits.')
      return
    }
    addMutation.mutate(form)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Bank Accounts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage where your wages are deposited</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add account
          </Button>
        )}
      </div>

      {/* Existing accounts */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !accounts || accounts.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <CreditCard className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-muted-foreground">No bank accounts on file</p>
            <Button size="sm" onClick={() => setShowForm(true)}>Add your bank account</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => (
            <Card key={acc.id} className={`border-0 shadow-sm ${acc.isPrimary ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{acc.accountName}</p>
                      {acc.isPrimary && <Badge className="text-xs">Primary</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      BSB {acc.bsb} &nbsp;·&nbsp; {maskAccount(acc.accountNumber)}
                    </p>
                    {acc.allocationPercent && (
                      <p className="text-xs text-muted-foreground">{acc.allocationPercent}% allocation</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!acc.isPrimary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPrimaryMutation.mutate(acc.id)}
                      disabled={setPrimaryMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Set primary
                    </Button>
                  )}
                  {!acc.isPrimary && (
                    deleteConfirm === acc.id ? (
                      <div className="flex gap-1.5">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(acc.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Confirm delete
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteConfirm(acc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add account form */}
      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Add bank account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>BSB <span className="text-muted-foreground">(6 digits)</span></Label>
                <Input
                  value={form.bsb}
                  onChange={e => setForm(p => ({ ...p, bsb: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                  placeholder="012345"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Account number</Label>
                <Input
                  value={form.accountNumber}
                  onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="123456789"
                  maxLength={10}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Account name</Label>
                <Input
                  value={form.accountName}
                  onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))}
                  placeholder="Matches your bank account name exactly"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPrimary}
                onChange={e => setForm(p => ({ ...p, isPrimary: e.target.checked }))}
              />
              Set as primary account (wages deposited here)
            </label>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Saving…' : 'Add account'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError('') }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p className="font-medium mb-0.5">Privacy notice</p>
        <p className="text-xs text-muted-foreground">Your BSB and account number are stored encrypted. They are only used for payroll processing and are never shared with third parties. To update banking details mid-pay-period, please contact your payroll manager as well.</p>
      </div>
    </div>
  )
}
