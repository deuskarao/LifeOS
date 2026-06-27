'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useCrud } from '@/lib/api-client'
import { formatCurrency, formatDate, LOAN_CATEGORIES } from '@/lib/lifeos'
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
  Landmark,
  Plus,
  Wallet,
  CalendarClock,
  TrendingDown,
  Percent,
  Pencil,
  Trash2,
  Building2,
} from 'lucide-react'

interface Loan {
  id: string
  loanName: string
  lender: string
  principalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  endDate: string | null
  installmentsTotal: number
  installmentsPaid: number
  category: string
  description: string | null
  createdAt: string
  updatedAt: string
}

function dateInputValue(d: string | Date | null | undefined): string {
  if (!d) return ''
  const x = new Date(d)
  if (isNaN(x.getTime())) return ''
  return x.toISOString().slice(0, 10)
}

const CATEGORY_BADGE: Record<string, string> = {
  İhtiyaç: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Konut: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Taşıt: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Ticari: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

export function LoansView() {
  const { list, create, update, remove } = useCrud<Loan>('loans')
  const { data, isLoading } = list

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [form, setForm] = useState<Partial<Loan>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    const today = new Date().toISOString().slice(0, 10)
    setForm({
      category: 'İhtiyaç',
      principalAmount: 0,
      remainingAmount: 0,
      interestRate: 0,
      monthlyPayment: 0,
      installmentsTotal: 0,
      installmentsPaid: 0,
      startDate: today,
    })
    setOpen(true)
  }
  function openEdit(item: Loan) {
    setEditing(item)
    setForm({ ...item, startDate: dateInputValue(item.startDate), endDate: dateInputValue(item.endDate) })
    setOpen(true)
  }

  async function onSubmit() {
    if (!form.loanName || !form.lender) {
      toast.error('Kredi adı ve veren zorunludur')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: payload })
        toast.success('Kredi güncellendi')
      } else {
        await create.mutateAsync(payload)
        toast.success('Kredi eklendi')
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
      toast.success('Kredi silindi')
      setDeleteId(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const loans = data ?? []
  // Calculate effective remaining debt: use DB value if present, else fall back to calculation
  const loansWithCalc = loans.map((l) => {
    const installmentsLeft = Math.max(0, (l.installmentsTotal || 0) - (l.installmentsPaid || 0))
    const calculatedRemaining = installmentsLeft * (l.monthlyPayment || 0)
    const isAutoCalculated = l.remainingAmount <= 0 && calculatedRemaining > 0
    const displayRemaining = l.remainingAmount > 0 ? l.remainingAmount : calculatedRemaining
    return { ...l, calculatedRemaining, displayRemaining, isAutoCalculated }
  })
  const totalDebt = loansWithCalc.reduce((s, l) => s + l.displayRemaining, 0)
  const monthlyTotal = loans.reduce((s, l) => s + (l.monthlyPayment || 0), 0)
  const activeCount = loansWithCalc.filter((l) => l.displayRemaining > 0).length
  const avgInterest =
    loans.length > 0 ? loans.reduce((s, l) => s + (l.interestRate || 0), 0) / loans.length : 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Krediler" description="Aktif kredileriniz ve ödeme planınız" icon={Landmark} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Krediler"
        description={`${loans.length} kredi kaydı • ${activeCount} aktif`}
        icon={Landmark}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Kredi Ekle
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Toplam Borç" value={formatCurrency(totalDebt)} icon={TrendingDown} accent="rose" />
        <StatCard title="Aylık Taksit" value={formatCurrency(monthlyTotal)} icon={CalendarClock} accent="amber" />
        <StatCard title="Aktif Kredi" value={String(activeCount)} icon={Landmark} accent="sky" />
        <StatCard title="Ortalama Faiz" value={`%${avgInterest.toFixed(2)}`} icon={Percent} accent="violet" />
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Henüz kredi yok"
          description="Kredilerinizi ekleyerek kalan borç, taksit tutarı ve ödeme takviminizi takip edin."
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Kredi Ekle
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {loansWithCalc.map((l, i) => {
            const progress = l.installmentsTotal > 0 ? (l.installmentsPaid / l.installmentsTotal) * 100 : 0
            const isComplete = l.displayRemaining <= 0 || progress >= 100
            const differs = l.remainingAmount > 0 && l.calculatedRemaining > 0 && l.remainingAmount !== l.calculatedRemaining
            return (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="group relative overflow-hidden transition-all hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-semibold">{l.loanName}</h4>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_BADGE[l.category] || 'bg-muted text-muted-foreground'}`}>
                            {l.category}
                          </span>
                          {isComplete && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                              Tamamlandı
                            </Badge>
                          )}
                          {l.isAutoCalculated && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
                              Otomatik hesaplandı
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {l.lender}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(l)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Kalan Borç</p>
                        <p className="text-xl font-bold tracking-tight">{formatCurrency(l.displayRemaining)}</p>
                        {differs && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            (Hesaplanan: <span className="font-medium text-amber-600 dark:text-amber-400">{formatCurrency(l.calculatedRemaining)}</span>)
                          </p>
                        )}
                        {l.isAutoCalculated && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            DB: <span className="font-medium">{formatCurrency(l.remainingAmount)}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Aylık Taksit</p>
                        <p className="text-xl font-bold tracking-tight">{formatCurrency(l.monthlyPayment)}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Taksit: <span className="font-medium text-foreground">{l.installmentsPaid}/{l.installmentsTotal}</span>
                        </span>
                        <span className="font-semibold">%{progress.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Percent className="h-3 w-3" /> Faiz: <span className="font-medium text-foreground">%{l.interestRate.toFixed(2)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" /> Anapara: <span className="font-medium text-foreground">{formatCurrency(l.principalAmount)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> {formatDate(l.startDate)} — {l.endDate ? formatDate(l.endDate) : '?'}
                      </span>
                    </div>

                    {l.description && (
                      <p className="mt-3 line-clamp-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                        {l.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Form Dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Krediyi Düzenle' : 'Yeni Kredi'}
        description={editing ? 'Kredi bilgilerini güncelleyin' : 'Yeni kredi kaydınızı ekleyin'}
        icon={Landmark}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kredi Adı</Label>
              <Input
                value={form.loanName ?? ''}
                onChange={(e) => setForm({ ...form, loanName: e.target.value })}
                placeholder="Konut Kredisi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Veren Kurum</Label>
              <Input
                value={form.lender ?? ''}
                onChange={(e) => setForm({ ...form, lender: e.target.value })}
                placeholder="Garanti BBVA"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {LOAN_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Anapara (₺)</Label>
              <MoneyInput
                value={form.principalAmount ?? 0}
                onValueChange={(v) => setForm({ ...form, principalAmount: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kalan Borç (₺)</Label>
              <MoneyInput
                value={form.remainingAmount ?? 0}
                onValueChange={(v) => setForm({ ...form, remainingAmount: v })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Aylık Taksit (₺)</Label>
              <MoneyInput
                value={form.monthlyPayment ?? 0}
                onValueChange={(v) => setForm({ ...form, monthlyPayment: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Faiz Oranı (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.interestRate ?? 0}
                onChange={(e) => setForm({ ...form, interestRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Toplam Taksit</Label>
              <Input
                type="number"
                min={0}
                value={form.installmentsTotal ?? 0}
                onChange={(e) => setForm({ ...form, installmentsTotal: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ödenen Taksit</Label>
              <Input
                type="number"
                min={0}
                value={form.installmentsPaid ?? 0}
                onChange={(e) => setForm({ ...form, installmentsPaid: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={form.startDate ?? ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bitiş Tarihi (opsiyonel)</Label>
              <Input
                type="date"
                value={form.endDate ?? ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value || null })}
              />
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
        title="Krediyi Sil"
        description="Bu kredi kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={onConfirmDelete}
        loading={remove.isPending}
      />
    </div>
  )
}
