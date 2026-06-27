'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useCrud } from '@/lib/api-client'
import { formatCurrency, formatCompact, ASSET_TYPES, CURRENCIES, type CurrencyCode } from '@/lib/lifeos'
import { PageHeader } from '../page-header'
import { StatCard } from '../stat-card'
import { EmptyState } from '../empty-state'
import { ConfirmDialog } from '../confirm-dialog'
import { FormDialog } from '../form-dialog'
import { MoneyInput } from '../money-input'
import { ChartCard, CHART_COLOR_ARRAY, chartTooltipStyle } from './chart-card'
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
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Shield,
  Plus,
  Wallet,
  Layers,
  Trophy,
  Coins,
  Pencil,
  Trash2,
  CircleDot,
} from 'lucide-react'

interface Asset {
  id: string
  assetType: string
  name: string
  quantity: number
  unitPrice: number
  totalValue: number
  currency: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

const TYPE_ICON: Record<string, typeof Coins> = {
  Altın: Coins,
  Döviz: Wallet,
  Hisse: Trophy,
  Kripto: CircleDot,
  Fon: Layers,
  Diğer: Shield,
}

const TYPE_COLOR: Record<string, string> = {
  Altın: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Döviz: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Hisse: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Kripto: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Fon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Diğer: 'bg-muted text-muted-foreground',
}

export function AssetsView() {
  const { list, create, update, remove } = useCrud<Asset>('assets')
  const { data, isLoading } = list

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [form, setForm] = useState<Partial<Asset>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm({ assetType: 'Altın', currency: 'TRY', quantity: 0, unitPrice: 0 })
    setOpen(true)
  }
  function openEdit(item: Asset) {
    setEditing(item)
    setForm(item)
    setOpen(true)
  }

  async function onSubmit() {
    if (!form.assetType || !form.name) {
      toast.error('Varlık tipi ve adı zorunludur')
      return
    }
    setSaving(true)
    try {
      const qty = Number(form.quantity) || 0
      const price = Number(form.unitPrice) || 0
      const payload = { ...form, quantity: qty, unitPrice: price, totalValue: qty * price }
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: payload })
        toast.success('Varlık güncellendi')
      } else {
        await create.mutateAsync(payload)
        toast.success('Varlık eklendi')
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
      toast.success('Varlık silindi')
      setDeleteId(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Silinemedi')
    }
  }

  const assets = data ?? []
  const totalValue = assets.reduce((s, a) => s + (a.totalValue || 0), 0)
  const uniqueTypes = new Set(assets.map((a) => a.assetType)).size
  const biggest = assets.length > 0
    ? assets.reduce((m, a) => (a.totalValue > m.totalValue ? a : m))
    : null
  const goldForexTotal = assets
    .filter((a) => a.assetType === 'Altın' || a.assetType === 'Döviz')
    .reduce((s, a) => s + a.totalValue, 0)

  // Aggregated by type for chart
  const byType = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of assets) {
      map.set(a.assetType, (map.get(a.assetType) || 0) + a.totalValue)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [assets])

  // Grouped by type for list
  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>()
    for (const a of assets) {
      const list = map.get(a.assetType) || []
      list.push(a)
      map.set(a.assetType, list)
    }
    return Array.from(map.entries()).sort((a, b) => {
      const ta = a[1].reduce((s, x) => s + x.totalValue, 0)
      const tb = b[1].reduce((s, x) => s + x.totalValue, 0)
      return tb - ta
    })
  }, [assets])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Yatırım Varlıkları" description="Portföyünüzü takip edin" icon={Shield} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yatırım Varlıkları"
        description={`${assets.length} varlık • ${uniqueTypes} çeşit`}
        icon={Shield}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Varlık Ekle
          </Button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Portföy Değeri" value={formatCurrency(totalValue)} icon={Wallet} accent="emerald" />
        <StatCard title="Varlık Çeşidi" value={String(uniqueTypes)} icon={Layers} accent="sky" />
        <StatCard
          title="En Büyük Varlık"
          value={biggest ? formatCompact(biggest.totalValue) : '-'}
          icon={Trophy}
          accent="amber"
          subtitle={biggest?.name}
        />
        <StatCard title="Altın + Döviz" value={formatCurrency(goldForexTotal)} icon={Coins} accent="violet" />
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Henüz varlık yok"
          description="Altın, döviz, hisse, kripto ve fon varlıklarınızı ekleyerek portföyünüzü takip edin."
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Varlık Ekle
            </Button>
          }
        />
      ) : (
        <>
          {/* Allocation chart + breakdown */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Dağılım" description="Varlık türüne göre" icon={Layers}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {byType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(v: number, n: string) => [formatCurrency(v), n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {byType.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length] }} />
                    <span className="text-muted-foreground">{a.name}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <Card className="lg:col-span-2">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Tür Bazında Özet</h3>
                </div>
                <div className="space-y-3">
                  {byType.map((t, i) => {
                    const pct = totalValue > 0 ? (t.value / totalValue) * 100 : 0
                    return (
                      <div key={t.name}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length] }} />
                            <span className="font-medium">{t.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({assets.filter((a) => a.assetType === t.name).length})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">%{pct.toFixed(1)}</span>
                            <span className="font-semibold">{formatCurrency(t.value)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, pct)}%`, background: CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grouped list */}
          <div className="space-y-6">
            {grouped.map(([typeName, items]) => {
              const typeTotal = items.reduce((s, a) => s + a.totalValue, 0)
              const Icon = TYPE_ICON[typeName] || Shield
              return (
                <div key={typeName}>
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">{typeName}</h3>
                    <Badge variant="secondary" className="text-xs">{items.length} varlık</Badge>
                    <span className="ml-auto text-sm font-semibold">{formatCurrency(typeTotal)}</span>
                  </div>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((a, i) => {
                      const pct = totalValue > 0 ? ((a.totalValue / totalValue) * 100).toFixed(1) : '0'
                      return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Card className="group relative overflow-hidden transition-all hover:shadow-md">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="truncate font-semibold">{a.name}</h4>
                                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLOR[a.assetType] || TYPE_COLOR.Diğer}`}>
                                    {a.assetType}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {a.quantity.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} adet × {formatCurrency(a.unitPrice, a.currency as CurrencyCode)}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {a.currency}
                              </Badge>
                            </div>

                            <div className="mt-4">
                              <p className="text-xs text-muted-foreground">Toplam Değer</p>
                              <p className="text-2xl font-bold tracking-tight">{formatCurrency(a.totalValue, a.currency as CurrencyCode)}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Portföyün %{pct} payı
                              </p>
                            </div>

                            <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => openEdit(a)}>
                                <Pencil className="h-3 w-3" /> Düzenle
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-rose-500 hover:text-rose-600" onClick={() => setDeleteId(a.id)}>
                                <Trash2 className="h-3 w-3" /> Sil
                              </Button>
                            </div>

                            {a.notes && (
                              <p className="mt-2 line-clamp-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                                {a.notes}
                              </p>
                            )}
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
        </>
      )}

      {/* Form Dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Varlığı Düzenle' : 'Yeni Varlık'}
        description={editing ? 'Varlık bilgilerini güncelleyin' : 'Yeni yatırım varlığınızı ekleyin'}
        icon={Shield}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Varlık Türü</Label>
              <Select value={form.assetType} onValueChange={(v) => setForm({ ...form, assetType: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tür seçin" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Para birimi" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CURRENCIES).map((c) => (
                    <SelectItem key={c} value={c}>{c} — {CURRENCIES[c as CurrencyCode].name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ad</Label>
            <Input
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Gram Altın / USD / THYAO"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Miktar</Label>
              <Input
                type="number"
                step="0.0001"
                value={form.quantity ?? 0}
                onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Birim Fiyat</Label>
              <MoneyInput
                value={form.unitPrice ?? 0}
                onValueChange={(v) => setForm({ ...form, unitPrice: v })}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Toplam Değer</span>
              <span className="font-semibold">
                {formatCurrency((Number(form.quantity) || 0) * (Number(form.unitPrice) || 0), (form.currency as CurrencyCode) || 'TRY')}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
        title="Varlığı Sil"
        description="Bu varlık kalıcı olarak silinecek. Bu işlem geri alınamaz."
        onConfirm={onConfirmDelete}
        loading={remove.isPending}
      />
    </div>
  )
}
