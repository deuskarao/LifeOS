'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useCrud } from '@/lib/api-client'
import { formatCurrency, TURKISH_BANKS } from '@/lib/lifeos'
import { PageHeader } from '../page-header'
import { StatCard } from '../stat-card'
import { EmptyState } from '../empty-state'
import { ConfirmDialog } from '../confirm-dialog'
import { FormDialog } from '../form-dialog'
import { MoneyInput } from '../money-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  Plus,
  Wallet,
  PiggyBank,
  TrendingUp,
  Landmark,
  Pencil,
  Trash2,
  Copy,
  User,
} from 'lucide-react'

interface BankAccount {
  id: string
  bankName: string
  accountName: string
  accountType: string
  balance: number
  iban: string | null
  easyAddress: string | null
  holderName: string | null
  expectedAmount: number
  color: string
  description: string | null
  createdAt: string
  updatedAt: string
}

const ACCOUNT_TYPES = ['Vadesiz', 'Vadeli', 'Birikim', 'Nakit'] as const

const COLOR_PRESETS = [
  '#e11d48', '#f59e0b', '#16a34a', '#10b981',
  '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b',
]

const TYPE_BADGE: Record<string, string> = {
  Vadesiz: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Vadeli: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Birikim: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Nakit: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

function truncateIban(iban: string | null): string {
  if (!iban) return '-'
  const trimmed = iban.replace(/\s+/g, '')
  if (trimmed.length <= 12) return iban
  return `${iban.slice(0, 8)} •••• ${iban.slice(-4)}`
}

export function BankAccountsView() {
  const { list, create, update, remove } = useCrud<BankAccount>('bank-accounts')
  const { data, isLoading } = list

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BankAccount | null>(null)
  const [form, setForm] = useState<Partial<BankAccount>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm({ bankName: 'İş Bankası', accountType: 'Vadesiz', color: COLOR_PRESETS[0], balance: 0, expectedAmount: 0 })
    setOpen(true)
  }
  function openEdit(item: BankAccount) {
    setEditing(item)
    setForm(item)
    setOpen(true)
  }

  async function onSubmit() {
    if (!form.bankName || !form.accountName) {
      toast.error('Banka adı ve hesap adı zorunludur')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: form })
        toast.success('Hesap güncellendi')
      } else {
        await create.mutateAsync(form)
        toast.success('Hesap eklendi')
      }
      setOpen(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmDelete() {
    if (!deleteId) return
    try {
      await remove.mutateAsync(deleteId)
      toast.success('Hesap silindi')
      setDeleteId(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  function copyIban(iban: string) {
    navigator.clipboard.writeText(iban)
    toast.success('IBAN kopyalandı')
  }

  // Stats
  const accounts = data ?? []
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0)
  const vadesizTotal = accounts.filter((a) => a.accountType === 'Vadesiz').reduce((s, a) => s + a.balance, 0)
  const vadeliTotal = accounts.filter((a) => a.accountType === 'Vadeli').reduce((s, a) => s + a.balance, 0)
  const expectedTotal = accounts.reduce((s, a) => s + (a.expectedAmount || 0), 0)

  // Group by bankName
  const grouped = accounts.reduce<Record<string, BankAccount[]>>((acc, a) => {
    ;(acc[a.bankName] = acc[a.bankName] || []).push(a)
    return acc
  }, {})
  const bankNames = Object.keys(grouped).sort()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Banka Hesapları" description="Tüm hesaplarınızı tek yerden yönetin" icon={Building2} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banka Hesapları"
        description={`${accounts.length} hesap • ${bankNames.length} banka`}
        icon={Building2}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Hesap Ekle
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Toplam Bakiye" value={formatCurrency(totalBalance)} icon={Wallet} accent="emerald" />
        <StatCard title="Vadesiz" value={formatCurrency(vadesizTotal)} icon={Landmark} accent="sky" />
        <StatCard title="Vadeli" value={formatCurrency(vadeliTotal)} icon={PiggyBank} accent="violet" />
        <StatCard title="Beklenen Tutar" value={formatCurrency(expectedTotal)} icon={TrendingUp} accent="amber" />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Henüz hesap yok"
          description="İlk banka hesabınızı ekleyerek başlayın. Mevcut bakiyenizi ve beklenen tutarınızı takip edin."
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Hesap Ekle
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {bankNames.map((bankName) => {
            const bankAccounts = grouped[bankName]
            const bankTotal = bankAccounts.reduce((s, a) => s + a.balance, 0)
            const accentColor = bankAccounts[0]?.color || '#64748b'
            return (
              <div key={bankName}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: accentColor }} />
                  <h3 className="text-sm font-semibold">{bankName}</h3>
                  <Badge variant="secondary" className="text-xs">{bankAccounts.length} hesap</Badge>
                  <span className="ml-auto text-sm font-semibold">{formatCurrency(bankTotal)}</span>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {bankAccounts.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Card className="group relative overflow-hidden transition-all hover:shadow-md">
                        <div className="h-1" style={{ background: a.color }} />
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate font-semibold">{a.accountName}</h4>
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[a.accountType] || 'bg-muted text-muted-foreground'}`}>
                                  {a.accountType}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.bankName}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(a)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(a.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-xs text-muted-foreground">Bakiye</p>
                            <p className="text-2xl font-bold tracking-tight">{formatCurrency(a.balance)}</p>
                            {a.expectedAmount > 0 && a.expectedAmount !== a.balance && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Hedef: <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(a.expectedAmount)}</span>
                              </p>
                            )}
                          </div>

                          <div className="mt-4 space-y-1.5 border-t pt-3 text-xs">
                            {a.iban && (
                              <button
                                onClick={() => copyIban(a.iban!)}
                                className="flex w-full items-center justify-between gap-2 text-muted-foreground hover:text-foreground"
                              >
                                <span className="truncate font-mono">{truncateIban(a.iban)}</span>
                                <Copy className="h-3 w-3 shrink-0" />
                              </button>
                            )}
                            {a.easyAddress && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <span className="text-[10px] uppercase">PAPARA:</span>
                                <span className="truncate">{a.easyAddress}</span>
                              </div>
                            )}
                            {a.holderName && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="truncate">{a.holderName}</span>
                              </div>
                            )}
                          </div>

                          {a.description && (
                            <p className="mt-3 line-clamp-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                              {a.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Hesabı Düzenle' : 'Yeni Hesap'}
        description={editing ? 'Hesap bilgilerini güncelleyin' : 'Yeni banka hesabınızı ekleyin'}
        icon={Building2}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Banka</Label>
              <Select value={form.bankName} onValueChange={(v) => setForm({ ...form, bankName: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Banka seçin" />
                </SelectTrigger>
                <SelectContent>
                  {TURKISH_BANKS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hesap Adı</Label>
              <Input
                value={form.accountName ?? ''}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                placeholder="Vadesiz Maaş"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Hesap Türü</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Hesap Sahibi</Label>
              <Input
                value={form.holderName ?? ''}
                onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                placeholder="Ad Soyad"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Bakiye (₺)</Label>
              <MoneyInput
                value={form.balance ?? 0}
                onValueChange={(v) => setForm({ ...form, balance: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hedef Tutar (₺)</Label>
              <MoneyInput
                value={form.expectedAmount ?? 0}
                onValueChange={(v) => setForm({ ...form, expectedAmount: v })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input
                value={form.iban ?? ''}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kolay Adres (Papara vb.)</Label>
              <Input
                value={form.easyAddress ?? ''}
                onChange={(e) => setForm({ ...form, easyAddress: e.target.value })}
                placeholder="kullaniciadi"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Renk</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''}`}
                  style={{ background: c }}
                  aria-label={`Renk ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Opsiyonel not"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={onSubmit} disabled={saving}>
              {saving ? 'Kaydediliyor…' : editing ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hesabı Sil"
        description="Bu hesap kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={onConfirmDelete}
        loading={remove.isPending}
      />
    </div>
  )
}
