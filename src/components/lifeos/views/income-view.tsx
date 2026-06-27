'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCrud, api } from '@/lib/api-client'
import {
  formatCurrency,
  formatDate,
  formatCompact,
  INCOME_CATEGORIES,
  type CurrencyCode,
} from '@/lib/lifeos'
import { StatCard } from '../stat-card'
import { PageHeader } from '../page-header'
import { EmptyState } from '../empty-state'
import { ConfirmDialog } from '../confirm-dialog'
import { FormDialog } from '../form-dialog'
import { MoneyInput } from '../money-input'
import { ChartCard, CHART_COLOR_ARRAY, chartTooltipStyle, gridStroke } from './chart-card'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Wallet,
  CalendarRange,
  Repeat,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Income {
  id: string
  source: string
  amount: number
  currency: string
  category: string
  date: string
  recurring: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

const dateInput = (d: string | Date) => {
  const x = new Date(d)
  return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10)
}

const INCOME_CATEGORY_COLORS: Record<string, string> = {
  'Maaş': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-transparent',
  'Kira Geliri': 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-transparent',
  'Yatırım': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-transparent',
  'Freelance': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-transparent',
  'Bonus': 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-transparent',
  'Hediye': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-transparent',
  'Diğer': 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-transparent',
}

const MONTH_OPTIONS = [
  { value: 1, label: 'Bu Ay' },
  { value: 3, label: 'Son 3 Ay' },
  { value: 6, label: 'Son 6 Ay' },
] as const

function groupByMonth<T extends { date: string }>(items: T[]): { label: string; items: T[] }[] {
  const groups: Record<string, T[]> = {}
  items.forEach((item) => {
    const d = new Date(item.date)
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const [y, m] = key.split('-').map(Number)
      const label = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(
        new Date(y, m, 1)
      )
      return { label, items }
    })
}

export function IncomeView() {
  const [months, setMonths] = useState<number>(6)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { create, update, remove } = useCrud<Income>('income')
  const { data, isLoading } = useQuery<Income[]>({
    queryKey: ['income', months],
    queryFn: () => api.get<Income[]>(`/api/lifeos/income?months=${months}`),
  })

  const items = data ?? []

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthItems = items.filter((i) => new Date(i.date) >= monthStart)
  const thisMonthTotal = thisMonthItems.reduce((s, i) => s + i.amount, 0)
  const periodTotal = items.reduce((s, i) => s + i.amount, 0)
  const recurringCount = items.filter((i) => i.recurring).length

  // Largest income source
  const bySource: Record<string, number> = {}
  items.forEach((i) => {
    bySource[i.source] = (bySource[i.source] || 0) + i.amount
  })
  const topSource = Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]

  // By-category breakdown for chart
  const byCategory: Record<string, number> = {}
  items.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + i.amount
  })
  const categoryChart = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const periodLabel = MONTH_OPTIONS.find((o) => o.value === months)?.label ?? 'Dönem'

  const handleEdit = (item: Income) => {
    setEditing(item)
    setFormOpen(true)
  }
  const handleNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await remove.mutateAsync(deleteId)
      toast.success('Gelir kaydı silindi')
      setDeleteId(null)
    } catch {
      toast.error('Silinemedi')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gelir"
          description="Gelir kaynaklarınızı takip edin"
          icon={TrendingUp}
        />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gelir"
        description="Gelir kaynaklarınızı ve tekrarlı ödemeleri takip edin"
        icon={TrendingUp}
        actions={
          <div className="flex items-center gap-2">
            <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
              <SelectTrigger className="h-9 w-[130px]">
                <CalendarRange className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Ekle
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Bu Ay Gelir"
          value={formatCurrency(thisMonthTotal)}
          icon={Wallet}
          accent="emerald"
          subtitle={`${thisMonthItems.length} kayıt`}
        />
        <StatCard
          title={`${periodLabel} Toplam`}
          value={formatCurrency(periodTotal)}
          icon={TrendingUp}
          accent="sky"
          subtitle={`${items.length} kayıt`}
        />
        <StatCard
          title="Tekrarlı Gelir"
          value={String(recurringCount)}
          icon={Repeat}
          accent="violet"
          subtitle="aktif kaynak"
        />
        <StatCard
          title="En Büyük Kaynak"
          value={topSource ? topSource[0] : '-'}
          icon={Trophy}
          accent="amber"
          subtitle={topSource ? formatCurrency(topSource[1]) : 'Kayıt yok'}
        />
      </div>

      {/* Chart + List */}
      {items.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Henüz gelir kaydı yok"
          description="İlk gelir kaydınızı ekleyerek başlayın. Maaş, kira geliri, yatırım getirisi gibi kaynakları takip edebilirsiniz."
          action={
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Gelir Ekle
            </Button>
          }
        />
      ) : (
        <>
          {categoryChart.length > 0 && (
            <ChartCard
              title="Kategori Dağılımı"
              description={`${periodLabel} • Toplam ${formatCompact(periodTotal)}`}
              icon={Trophy}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={categoryChart} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompact(v)}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v: number) => formatCurrency(v)}
                    cursor={{ fill: 'oklch(0.5 0.01 240 / 0.08)' }}
                  />
                  <Bar dataKey="value" name="Gelir" radius={[6, 6, 0, 0]}>
                    {categoryChart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div className="space-y-6">
            {groupByMonth(items).map((group) => {
              const groupTotal = group.items.reduce((s, i) => s + i.amount, 0)
              return (
                <div key={group.label}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold capitalize text-muted-foreground">
                      {group.label}
                    </h3>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(groupTotal)}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {group.items.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:border-primary/30"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className={INCOME_CATEGORY_COLORS[item.category] || INCOME_CATEGORY_COLORS['Diğer']}>
                              {item.category}
                            </Badge>
                            {item.recurring && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <RefreshCw className="h-3 w-3" />
                                Tekrarlı
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-medium">{item.source}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(item.date)}</span>
                            {item.notes && (
                              <>
                                <span>•</span>
                                <span className="truncate">{item.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(item.amount, item.currency as CurrencyCode)}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-600"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Form Dialog */}
      <IncomeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        submitting={create.isPending || update.isPending}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await update.mutateAsync({ id: editing.id, data: body })
              toast.success('Gelir kaydı güncellendi')
            } else {
              await create.mutateAsync(body)
              toast.success('Yeni gelir eklendi')
            }
            setFormOpen(false)
            setEditing(null)
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Kaydedilemedi')
          }
        }}
      />

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Geliri sil"
        description="Bu gelir kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={handleDelete}
        loading={remove.isPending}
      />
    </div>
  )
}

// ============== FORM DIALOG ==============

interface IncomeFormProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: Income | null
  submitting: boolean
  onSubmit: (body: Partial<Income>) => void | Promise<void>
}

function IncomeFormDialog({ open, onOpenChange, initial, submitting, onSubmit }: IncomeFormProps) {
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState(0)
  const [currency, setCurrency] = useState<string>('TRY')
  const [category, setCategory] = useState<string>('Maaş')
  const [date, setDate] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [notes, setNotes] = useState('')
  const [bankAccountId, setBankAccountId] = useState<string | null>(null)

  // Banka hesaplarını çek (bakiyeli)
  const { data: banks } = useQuery<{ id: string; accountName: string; bankName: string; balance: number }[]>({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/api/lifeos/bank-accounts'),
  })

  // Sync form when opening
  const lastInitial = React.useRef<Income | null>(null)
  React.useEffect(() => {
    if (open && initial !== lastInitial.current) {
      lastInitial.current = initial
      setSource(initial?.source ?? '')
      setAmount(initial?.amount ?? 0)
      setCurrency(initial?.currency ?? 'TRY')
      setCategory(initial?.category ?? 'Maaş')
      setDate(initial ? dateInput(initial.date) : dateInput(new Date()))
      setRecurring(initial?.recurring ?? false)
      setNotes(initial?.notes ?? '')
    }
    if (!open) {
      lastInitial.current = null
    }
  }, [open, initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!source.trim()) {
      toast.error('Kaynak zorunludur')
      return
    }
    if (!amount || amount <= 0) {
      toast.error('Tutar 0 dan büyük olmalı')
      return
    }
    onSubmit({
      source: source.trim(),
      amount,
      currency,
      category,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      recurring,
      notes: notes.trim() || null,
      bankAccountId,
    } as any)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Geliri Düzenle' : 'Yeni Gelir'}
      description={initial ? 'Kaydı güncelleyin' : 'Yeni bir gelir kaydı oluşturun'}
      icon={TrendingUp}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="inc-source">Kaynak</Label>
          <Input
            id="inc-source"
            placeholder="Örn: Şirket Maaşı, Kira Geliri..."
            value={source}
            onChange={(e) => setSource(e.target.value)}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="inc-amount">Tutar</Label>
            <MoneyInput id="inc-amount" value={amount} onValueChange={setAmount} />
          </div>
          <div className="space-y-1.5">
            <Label>Para Birimi</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">₺ TRY</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inc-date">Tarih</Label>
            <Input
              id="inc-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Yatan Hesap (opsiyonel)</Label>
          <Select
            value={bankAccountId || 'none'}
            onValueChange={(v) => setBankAccountId(v === 'none' ? null : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Hesap seçilmedi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Hesap seçilmedi</SelectItem>
              {banks?.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.accountName} — {b.bankName} ({formatCurrency(b.balance)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Seçilen hesabın bakiyesi artacak</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Tekrarlı gelir</p>
              <p className="text-xs text-muted-foreground">Her ay otomatik eklensin</p>
            </div>
          </div>
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inc-notes">Notlar</Label>
          <Textarea
            id="inc-notes"
            placeholder="Eklemek istediğiniz not..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Kaydediliyor...' : initial ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
