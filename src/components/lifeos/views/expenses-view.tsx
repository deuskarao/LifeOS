'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCrud, api } from '@/lib/api-client'
import {
  formatCurrency,
  formatDate,
  formatCompact,
  EXPENSE_CATEGORIES,
  type CurrencyCode,
} from '@/lib/lifeos'
import { StatCard } from '../stat-card'
import { PageHeader } from '../page-header'
import { EmptyState } from '../empty-state'
import { ConfirmDialog } from '../confirm-dialog'
import { FormDialog } from '../form-dialog'
import { MoneyInput } from '../money-input'
import { ChartCard, CHART_COLORS, chartTooltipStyle, gridStroke } from './chart-card'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  CalendarRange,
  Receipt,
  CalendarDays,
  PieChart as PieIcon,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Expense {
  id: string
  category: string
  amount: number
  currency: string
  date: string
  paymentMethod: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

const dateInput = (d: string | Date) => {
  const x = new Date(d)
  return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10)
}

// Tailwind badge colors per category
const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  'Market': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-transparent',
  'Fatura': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-transparent',
  'Yakıt': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-transparent',
  'Kira': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-transparent',
  'Eğlence': 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-transparent',
  'Sağlık': 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-transparent',
  'Ulaşım': 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-transparent',
  'Eğitim': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-transparent',
  'Giysim': 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-transparent',
  'Restoran': 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-transparent',
  'Abonelik': 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-transparent',
  'Diğer': 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-transparent',
}

// Chart hex/oklch colors per category — must match badge tones
const EXPENSE_CHART_COLORS: Record<string, string> = {
  'Market': CHART_COLORS.emerald,
  'Fatura': CHART_COLORS.amber,
  'Yakıt': 'oklch(0.7 0.18 50)',
  'Kira': CHART_COLORS.violet,
  'Eğlence': CHART_COLORS.pink,
  'Sağlık': CHART_COLORS.rose,
  'Ulaşım': CHART_COLORS.teal,
  'Eğitim': CHART_COLORS.violet,
  'Giysim': 'oklch(0.65 0.2 330)',
  'Restoran': 'oklch(0.7 0.18 50)',
  'Abonelik': CHART_COLORS.teal,
  'Diğer': 'oklch(0.6 0.01 240)',
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'Nakit': 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-transparent',
  'Kart': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-transparent',
  'Banka': 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-transparent',
  'Havale': 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-transparent',
}

const PAYMENT_METHODS = ['Nakit', 'Kart', 'Havale'] as const

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

export function ExpensesView() {
  const [months, setMonths] = useState<number>(6)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { create, update, remove } = useCrud<Expense>('expenses')
  const { data, isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses', months],
    queryFn: () => api.get<Expense[]>(`/api/lifeos/expenses?months=${months}`),
  })

  const items = data ?? []

  // Stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthItems = items.filter((i) => new Date(i.date) >= monthStart)
  const thisMonthTotal = thisMonthItems.reduce((s, i) => s + i.amount, 0)

  const periodTotal = items.reduce((s, i) => s + i.amount, 0)

  // Last 30 days average
  const last30 = new Date()
  last30.setDate(last30.getDate() - 30)
  const last30Items = items.filter((i) => new Date(i.date) >= last30)
  const last30Total = last30Items.reduce((s, i) => s + i.amount, 0)
  const dailyAvg = last30Total / 30

  // Largest category
  const byCategory: Record<string, number> = {}
  items.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + i.amount
  })
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]

  const categoryChart = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const periodLabel = MONTH_OPTIONS.find((o) => o.value === months)?.label ?? 'Dönem'

  const handleEdit = (item: Expense) => {
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
      toast.success('Gider kaydı silindi')
      setDeleteId(null)
    } catch {
      toast.error('Silinemedi')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gider"
          description="Giderlerinizi yönetin"
          icon={TrendingDown}
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
        title="Gider"
        description="Harcamalarınızı kategori bazında takip edin"
        icon={TrendingDown}
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
          title="Bu Ay Gider"
          value={formatCurrency(thisMonthTotal)}
          icon={Receipt}
          accent="rose"
          subtitle={`${thisMonthItems.length} kayıt`}
        />
        <StatCard
          title={`${periodLabel} Toplam`}
          value={formatCurrency(periodTotal)}
          icon={TrendingDown}
          accent="amber"
          subtitle={`${items.length} kayıt`}
        />
        <StatCard
          title="Günlük Ortalama"
          value={formatCurrency(dailyAvg)}
          icon={CalendarDays}
          accent="violet"
          subtitle="son 30 gün"
        />
        <StatCard
          title="En Büyük Kategori"
          value={topCategory ? topCategory[0] : '-'}
          icon={Crown}
          accent="sky"
          subtitle={topCategory ? formatCurrency(topCategory[1]) : 'Kayıt yok'}
        />
      </div>

      {/* Chart */}
      {items.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="Henüz gider kaydı yok"
          description="İlk gider kaydınızı ekleyerek başlayın. Market, fatura, yakıt gibi harcamalarınızı takip edebilirsiniz."
          action={
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Gider Ekle
            </Button>
          }
        />
      ) : (
        <>
          {categoryChart.length > 0 && (
            <ChartCard
              title="Kategori Bazında Giderler"
              description={`${periodLabel} • Toplam ${formatCompact(periodTotal)}`}
              icon={PieIcon}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={categoryChart}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatCompact(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 240)' }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v: number) => formatCurrency(v)}
                    cursor={{ fill: 'oklch(0.5 0.01 240 / 0.08)' }}
                  />
                  <Bar dataKey="value" name="Gider" radius={[0, 6, 6, 0]}>
                    {categoryChart.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={EXPENSE_CHART_COLORS[entry.name] || 'oklch(0.6 0.01 240)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* List grouped by month */}
          <div className="space-y-6">
            {groupByMonth(items).map((group) => {
              const groupTotal = group.items.reduce((s, i) => s + i.amount, 0)
              return (
                <div key={group.label}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold capitalize text-muted-foreground">
                      {group.label}
                    </h3>
                    <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(groupTotal)}
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <TrendingDown className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              className={
                                EXPENSE_CATEGORY_COLORS[item.category] ||
                                EXPENSE_CATEGORY_COLORS['Diğer']
                              }
                            >
                              {item.category}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                PAYMENT_METHOD_COLORS[item.paymentMethod] ||
                                PAYMENT_METHOD_COLORS['Nakit']
                              }
                            >
                              {item.paymentMethod}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
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
                          <p className="font-semibold text-rose-600 dark:text-rose-400">
                            -{formatCurrency(item.amount, item.currency as CurrencyCode)}
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
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        submitting={create.isPending || update.isPending}
        onSubmit={async (body) => {
          try {
            if (editing) {
              await update.mutateAsync({ id: editing.id, data: body })
              toast.success('Gider kaydı güncellendi')
            } else {
              await create.mutateAsync(body)
              toast.success('Yeni gider eklendi')
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
        title="Gideri sil"
        description="Bu gider kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={handleDelete}
        loading={remove.isPending}
      />
    </div>
  )
}

// ============== FORM DIALOG ==============

interface ExpenseFormProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: Expense | null
  submitting: boolean
  onSubmit: (body: Partial<Expense>) => void | Promise<void>
}

function ExpenseFormDialog({
  open,
  onOpenChange,
  initial,
  submitting,
  onSubmit,
}: ExpenseFormProps) {
  const [category, setCategory] = useState<string>('Market')
  const [amount, setAmount] = useState(0)
  const [currency, setCurrency] = useState<string>('TRY')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<string>('Nakit')
  const [paymentSourceId, setPaymentSourceId] = useState<string | null>(null)
  const [paymentSourceType, setPaymentSourceType] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  // Kart ve banka hesaplarını çek (bakiyeli)
  const { data: cards } = useQuery<{ id: string; cardName: string; bankName: string; balance: number; limit: number }[]>({
    queryKey: ['credit-cards'],
    queryFn: () => api.get('/api/lifeos/credit-cards'),
  })
  const { data: banks } = useQuery<{ id: string; accountName: string; bankName: string; balance: number }[]>({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/api/lifeos/bank-accounts'),
  })

  const lastInitial = React.useRef<Expense | null>(null)
  React.useEffect(() => {
    if (open && initial !== lastInitial.current) {
      lastInitial.current = initial
      setCategory(initial?.category ?? 'Market')
      setAmount(initial?.amount ?? 0)
      setCurrency(initial?.currency ?? 'TRY')
      setDate(initial ? dateInput(initial.date) : dateInput(new Date()))
      setPaymentMethod(initial?.paymentMethod ?? 'Nakit')
      setNotes(initial?.notes ?? '')
    }
    if (!open) {
      lastInitial.current = null
    }
  }, [open, initial])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) {
      toast.error('Kategori zorunludur')
      return
    }
    if (!amount || amount <= 0) {
      toast.error('Tutar 0 dan büyük olmalı')
      return
    }
    onSubmit({
      category,
      amount,
      currency,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      paymentMethod,
      paymentSourceId,
      paymentSourceType,
      notes: notes.trim() || null,
    } as any)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Gideri Düzenle' : 'Yeni Gider'}
      description={initial ? 'Kaydı güncelleyin' : 'Yeni bir gider kaydı oluşturun'}
      icon={TrendingDown}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exp-amount">Tutar</Label>
            <MoneyInput id="exp-amount" value={amount} onValueChange={setAmount} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="exp-date">Tarih</Label>
            <Input
              id="exp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ödeme Tipi</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                setPaymentMethod(v)
                setPaymentSourceId(null)
                setPaymentSourceType(null)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nakit">Nakit</SelectItem>
                <SelectItem value="Banka">Banka Hesabı</SelectItem>
                <SelectItem value="Kart">Kredi Kartı</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'Banka' && (
            <div className="space-y-1.5">
              <Label>Hesap Seç</Label>
              <Select
                value={paymentSourceId || ''}
                onValueChange={(v) => { setPaymentSourceId(v); setPaymentSourceType('bank') }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Hesap seçin" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.accountName} — {b.bankName} ({formatCurrency(b.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentMethod === 'Kart' && (
            <div className="space-y-1.5">
              <Label>Kart Seç</Label>
              <Select
                value={paymentSourceId || ''}
                onValueChange={(v) => { setPaymentSourceId(v); setPaymentSourceType('card') }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kart seçin" />
                </SelectTrigger>
                <SelectContent>
                  {cards?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cardName} — {c.bankName} (Borç: {formatCurrency(c.balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exp-notes">Notlar</Label>
          <Textarea
            id="exp-notes"
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
