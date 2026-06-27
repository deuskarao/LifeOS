'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useCrud, api } from '@/lib/api-client'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard as CreditCardIcon,
  Plus,
  Wallet,
  Gauge,
  CircleDollarSign,
  CalendarClock,
  Pencil,
  Trash2,
} from 'lucide-react'

interface CreditCard {
  id: string
  bankName: string
  cardName: string
  cardType: string
  limit: number
  balance: number
  cutoffDay: number
  dueDay: number
  color: string
  createdAt: string
  updatedAt: string
}

const CARD_TYPES = ['Visa', 'Mastercard', 'Troy'] as const

const COLOR_PRESETS = [
  '#8b5cf6', '#e11d48', '#f59e0b', '#16a34a',
  '#0ea5e9', '#ec4899', '#6366f1', '#0f172a',
]

function usageColor(rate: number): string {
  if (rate >= 85) return 'bg-rose-500'
  if (rate >= 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function CreditCardsView() {
  const { list, create, update, remove } = useCrud<CreditCard>('credit-cards')
  const { data, isLoading } = list

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CreditCard | null>(null)
  const [form, setForm] = useState<Partial<CreditCard>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [payCard, setPayCard] = useState<CreditCard | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [paySaving, setPaySaving] = useState(false)
  const [payBankId, setPayBankId] = useState<string | null>(null)

  // Banka hesaplarını çek (bakiyeli)
  const { data: banks } = useQuery<{ id: string; accountName: string; bankName: string; balance: number }[]>({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/api/lifeos/bank-accounts'),
  })

  function openCreate() {
    setEditing(null)
    setForm({
      cardType: 'Visa',
      color: COLOR_PRESETS[0],
      limit: 0,
      balance: 0,
      cutoffDay: 1,
      dueDay: 15,
    })
    setOpen(true)
  }
  function openEdit(item: CreditCard) {
    setEditing(item)
    setForm(item)
    setOpen(true)
  }

  async function onSubmit() {
    if (!form.bankName || !form.cardName) {
      toast.error('Banka ve kart adı zorunludur')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: form })
        toast.success('Kart güncellendi')
      } else {
        await create.mutateAsync(form)
        toast.success('Kart eklendi')
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
      toast.success('Kart silindi')
      setDeleteId(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const cards = data ?? []
  const totalLimit = cards.reduce((s, c) => s + (c.limit || 0), 0)
  const totalUsed = cards.reduce((s, c) => s + (c.balance || 0), 0)
  const totalRemaining = totalLimit - totalUsed
  const usageRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0

  // Group by bankName (bank-accounts-view pattern)
  const grouped = cards.reduce<Record<string, CreditCard[]>>((acc, c) => {
    ;(acc[c.bankName] = acc[c.bankName] || []).push(c)
    return acc
  }, {})
  const bankNames = Object.keys(grouped).sort()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Kredi Kartları" description="Kart limitleriniz ve kullanımınız" icon={CreditCardIcon} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kredi Kartları"
        description={`${cards.length} kart • ${bankNames.length} banka • ${formatCurrency(totalUsed)} kullanıldı`}
        icon={CreditCardIcon}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Kart Ekle
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Toplam Limit" value={formatCurrency(totalLimit)} icon={Wallet} accent="emerald" />
        <StatCard title="Kullanılan" value={formatCurrency(totalUsed)} icon={CircleDollarSign} accent="rose" />
        <StatCard title="Kalan Limit" value={formatCurrency(totalRemaining)} icon={Gauge} accent="sky" />
        <StatCard
          title="Kullanım Oranı"
          value={`%${usageRate.toFixed(1)}`}
          icon={Gauge}
          accent={usageRate >= 85 ? 'rose' : usageRate >= 60 ? 'amber' : 'emerald'}
          subtitle={`Kalan: ${formatCurrency(totalRemaining)}`}
        />
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          title="Henüz kart yok"
          description="Kredi kartlarınızı ekleyerek limit kullanımınızı ve ödeme takviminizi takip edin."
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Kart Ekle
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {bankNames.map((bankName) => {
            const bankCards = grouped[bankName]
            const bankLimit = bankCards.reduce((s, c) => s + (c.limit || 0), 0)
            const bankUsed = bankCards.reduce((s, c) => s + (c.balance || 0), 0)
            const accentColor = bankCards[0]?.color || '#64748b'
            return (
              <div key={bankName}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: accentColor }} />
                  <h3 className="text-sm font-semibold">{bankName}</h3>
                  <Badge variant="secondary" className="text-xs">{bankCards.length} kart</Badge>
                  <div className="ml-auto flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Borç: <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCurrency(bankUsed)}</span>
                    </span>
                    <span className="font-semibold">{formatCurrency(bankLimit)}</span>
                  </div>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {bankCards.map((c, i) => {
                    const usage = c.limit > 0 ? (c.balance / c.limit) * 100 : 0
                    const remaining = Math.max(0, c.limit - c.balance)
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
                          {/* Card Visual */}
                          <div
                            className="relative h-36 overflow-hidden p-4 text-white"
                            style={{
                              background: `linear-gradient(135deg, ${c.color}, ${c.color}cc 60%, ${c.color}99)`,
                            }}
                          >
                            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                            <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-black/10" />
                            <div className="relative flex items-start justify-between">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider opacity-90">{c.bankName}</p>
                                <p className="mt-1 text-lg font-bold">{c.cardName}</p>
                              </div>
                              <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur">
                                {c.cardType}
                              </Badge>
                            </div>
                            <div className="relative mt-4 flex items-end justify-between">
                              <div>
                                <p className="text-[10px] uppercase opacity-80">Limit</p>
                                <p className="text-sm font-semibold">{formatCurrency(c.limit)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase opacity-80">Kullanılan</p>
                                <p className="text-sm font-semibold">{formatCurrency(c.balance)}</p>
                              </div>
                            </div>
                          </div>

                          <CardContent className="space-y-3 p-4">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Kullanım</span>
                                <span className="font-semibold">{usage.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full transition-all ${usageColor(usage)}`}
                                  style={{ width: `${Math.min(100, usage)}%` }}
                                />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Kalan: <span className="font-medium text-foreground">{formatCurrency(remaining)}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 rounded-md bg-muted/40 p-2 text-xs">
                              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Kesim: <span className="font-medium text-foreground">{c.cutoffDay}. gün</span>
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">
                                Son Ödeme: <span className="font-medium text-foreground">{c.dueDay}. gün</span>
                              </span>
                            </div>

                            <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {c.balance > 0 && (
                                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-emerald-600 hover:text-emerald-700" onClick={() => { setPayCard(c); setPayOpen(true) }}>
                                  <Wallet className="h-3 w-3" /> Ödeme Yap
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => openEdit(c)}>
                                <Pencil className="h-3 w-3" /> Düzenle
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(c.id)}>
                                <Trash2 className="h-3 w-3" /> Sil
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
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
        title={editing ? 'Kartı Düzenle' : 'Yeni Kart'}
        description={editing ? 'Kart bilgilerini güncelleyin' : 'Yeni kredi kartınızı ekleyin'}
        icon={CreditCardIcon}
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
              <Label>Kart Adı</Label>
              <Input
                value={form.cardName ?? ''}
                onChange={(e) => setForm({ ...form, cardName: e.target.value })}
                placeholder="Bonus Card"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kart Türü</Label>
              <Select value={form.cardType} onValueChange={(v) => setForm({ ...form, cardType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kart Rengi</Label>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Limit (₺)</Label>
              <MoneyInput
                value={form.limit ?? 0}
                onValueChange={(v) => setForm({ ...form, limit: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kullanılan Limit (₺)</Label>
              <MoneyInput
                value={form.balance ?? 0}
                onValueChange={(v) => setForm({ ...form, balance: v })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Hesap Kesim Günü (1-31)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.cutoffDay ?? 1}
                onChange={(e) => setForm({ ...form, cutoffDay: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Son Ödeme Günü (1-31)</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={form.dueDay ?? 15}
                onChange={(e) => setForm({ ...form, dueDay: parseInt(e.target.value) || 15 })}
              />
            </div>
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
        title="Kartı Sil"
        description="Bu kart kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={onConfirmDelete}
        loading={remove.isPending}
      />

      {/* Ödeme Yap Dialog */}
      <FormDialog
        open={payOpen}
        onOpenChange={(o) => { setPayOpen(o); if (!o) { setPayCard(null); setPayAmount(0); setPayBankId(null) } }}
        title="Kart Borcu Öde"
        description={payCard ? `${payCard.cardName} — Borç: ${formatCurrency(payCard.balance)}` : ''}
        icon={Wallet}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ödeme Tutarı</Label>
            <MoneyInput
              value={payAmount}
              onValueChange={setPayAmount}
            />
            {payCard && payAmount > payCard.balance && (
              <p className="text-xs text-amber-500">Borçtan fazla tutar girdiniz. Tam borç ödenecek.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ödenecek Hesap (banka bakiyesinden düşülür)</Label>
            <Select
              value={payBankId || 'none'}
              onValueChange={(v) => setPayBankId(v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Hesap seçilmedi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Hesap seçilmedi (manuel)</SelectItem>
                {banks?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.accountName} — {b.bankName} ({formatCurrency(b.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPayOpen(false); setPayCard(null); setPayAmount(0); setPayBankId(null) }}>
              İptal
            </Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={paySaving || payAmount <= 0}
              onClick={async () => {
                if (!payCard) return
                setPaySaving(true)
                try {
                  await api.post(`/api/lifeos/credit-cards/${payCard.id}/pay`, {
                    amount: payAmount,
                    bankAccountId: payBankId,
                  })
                  toast.success('Ödeme başarıyla yapıldı')
                  setPayOpen(false)
                  setPayCard(null)
                  setPayAmount(0)
                  setPayBankId(null)
                } catch (e: any) {
                  toast.error(e?.message || 'Ödeme başarısız')
                } finally {
                  setPaySaving(false)
                }
              }}
            >
              {paySaving ? 'Ödeniyor…' : 'Öde'}
            </Button>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
