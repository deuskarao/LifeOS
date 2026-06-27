'use client'

import { useMemo, useState } from 'react'
import { useCrud } from '@/lib/api-client'
import {
  formatCurrency,
  formatCompact,
  formatDate,
  PROPERTY_TYPES,
} from '@/lib/lifeos'
import { PageHeader } from '../page-header'
import { StatCard } from '../stat-card'
import { FormDialog } from '../form-dialog'
import { ConfirmDialog } from '../confirm-dialog'
import { EmptyState } from '../empty-state'
import { MoneyInput } from '../money-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Home,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Building2,
  FileSignature,
  Wallet,
  TrendingUp,
  MapPin,
  Ruler,
  BedDouble,
  Phone,
  CalendarRange,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RentalContract {
  id: string
  propertyId: string
  property?: Property
  tenantName: string
  tenantPhone: string | null
  tenantEmail: string | null
  monthlyRent: number
  startDate: string
  endDate: string | null
  deposit: number
  status: string
  notes: string | null
  createdAt: string
}

interface Property {
  id: string
  name: string
  type: string
  address: string | null
  city: string | null
  purchasePrice: number
  currentValue: number
  monthlyRent: number
  status: string
  size: number | null
  rooms: string | null
  notes: string | null
  createdAt: string
  contracts?: RentalContract[]
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const dateInput = (d: string | Date | null | undefined) => {
  if (!d) return ''
  const x = new Date(d)
  return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10)
}

const PROPERTY_STATUSES = ['Kiralı', 'Boş', 'Satılık'] as const
const CONTRACT_STATUSES = ['Aktif', 'Bitti', 'Beklemede'] as const

function propertyStatusBadge(status: string) {
  switch (status) {
    case 'Kiralı':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15">
          Kiralı
        </Badge>
      )
    case 'Satılık':
      return (
        <Badge className="bg-sky-500/15 text-sky-500 border-sky-500/20 hover:bg-sky-500/15">
          Satılık
        </Badge>
      )
    case 'Boş':
    default:
      return (
        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 hover:bg-amber-500/15">
          Boş
        </Badge>
      )
  }
}

function contractStatusBadge(status: string) {
  switch (status) {
    case 'Aktif':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15">
          Aktif
        </Badge>
      )
    case 'Beklemede':
      return (
        <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/20 hover:bg-amber-500/15">
          Beklemede
        </Badge>
      )
    case 'Bitti':
    default:
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Bitti
        </Badge>
      )
  }
}

/* ------------------------------------------------------------------ */
/* Main view                                                          */
/* ------------------------------------------------------------------ */

const emptyProperty: Partial<Property> = {
  name: '',
  type: 'Daire',
  address: '',
  city: '',
  purchasePrice: 0,
  currentValue: 0,
  monthlyRent: 0,
  status: 'Boş',
  size: null,
  rooms: '',
  notes: '',
}

const emptyContract: Partial<RentalContract> = {
  propertyId: '',
  tenantName: '',
  tenantPhone: '',
  tenantEmail: '',
  monthlyRent: 0,
  startDate: dateInput(new Date()),
  endDate: '',
  deposit: 0,
  status: 'Aktif',
  notes: '',
}

export function RentalView() {
  const [tab, setTab] = useState<'properties' | 'contracts'>('properties')

  const properties = useCrud<Property>('properties')
  const contracts = useCrud<RentalContract>('contracts')

  const isLoading = properties.list.isLoading || contracts.list.isLoading
  const propertyList = properties.list.data ?? []
  const contractList = contracts.list.data ?? []

  /* -------------------- Stats (always visible) -------------------- */
  const stats = useMemo(() => {
    const totalValue = propertyList.reduce((s, p) => s + (p.currentValue || 0), 0)
    const activeContracts = contractList.filter((c) => c.status === 'Aktif')
    const activeCount = activeContracts.length
    const monthlyRent = activeContracts.reduce((s, c) => s + (c.monthlyRent || 0), 0)
    const annualRent = monthlyRent * 12
    const yieldPct = totalValue > 0 ? (annualRent / totalValue) * 100 : 0
    return { totalValue, activeCount, monthlyRent, yieldPct }
  }, [propertyList, contractList])

  /* -------------------- Property dialog state -------------------- */
  const [propOpen, setPropOpen] = useState(false)
  const [propEditing, setPropEditing] = useState<Property | null>(null)
  const [propForm, setPropForm] = useState<Partial<Property>>(emptyProperty)
  const [propSaving, setPropSaving] = useState(false)
  const [propDeleteId, setPropDeleteId] = useState<string | null>(null)
  const [propDeleting, setPropDeleting] = useState(false)

  const openPropCreate = () => {
    setPropEditing(null)
    setPropForm(emptyProperty)
    setPropOpen(true)
  }
  const openPropEdit = (p: Property) => {
    setPropEditing(p)
    setPropForm({ ...p })
    setPropOpen(true)
  }
  const submitProperty = async () => {
    if (!propForm.name || !propForm.name.trim()) {
      toast.error('Mülk adı zorunludur')
      return
    }
    setPropSaving(true)
    try {
      const payload = {
        name: propForm.name,
        type: propForm.type ?? 'Daire',
        address: propForm.address ?? null,
        city: propForm.city ?? null,
        purchasePrice: Number(propForm.purchasePrice) || 0,
        currentValue: Number(propForm.currentValue) || 0,
        monthlyRent: Number(propForm.monthlyRent) || 0,
        status: propForm.status ?? 'Boş',
        size: propForm.size ? Number(propForm.size) : null,
        rooms: propForm.rooms ?? null,
        notes: propForm.notes ?? null,
      }
      if (propEditing) {
        await properties.update.mutateAsync({ id: propEditing.id, data: payload })
        toast.success('Mülk güncellendi')
      } else {
        await properties.create.mutateAsync(payload)
        toast.success('Yeni mülk eklendi')
      }
      setPropOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydetme başarısız')
    } finally {
      setPropSaving(false)
    }
  }
  const confirmDeleteProperty = async () => {
    if (!propDeleteId) return
    setPropDeleting(true)
    try {
      await properties.remove.mutateAsync(propDeleteId)
      toast.success('Mülk silindi')
      setPropDeleteId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Silme başarısız')
    } finally {
      setPropDeleting(false)
    }
  }

  /* -------------------- Contract dialog state -------------------- */
  const [contractOpen, setContractOpen] = useState(false)
  const [contractEditing, setContractEditing] = useState<RentalContract | null>(null)
  const [contractForm, setContractForm] = useState<Partial<RentalContract>>(emptyContract)
  const [contractSaving, setContractSaving] = useState(false)
  const [contractDeleteId, setContractDeleteId] = useState<string | null>(null)
  const [contractDeleting, setContractDeleting] = useState(false)

  const openContractCreate = () => {
    setContractEditing(null)
    setContractForm({
      ...emptyContract,
      propertyId: propertyList[0]?.id ?? '',
      monthlyRent: propertyList[0]?.monthlyRent ?? 0,
    })
    setContractOpen(true)
  }
  const openContractEdit = (c: RentalContract) => {
    setContractEditing(c)
    setContractForm({ ...c, startDate: dateInput(c.startDate), endDate: dateInput(c.endDate) })
    setContractOpen(true)
  }
  const submitContract = async () => {
    if (!contractForm.propertyId) {
      toast.error('Mülk seçiniz')
      return
    }
    if (!contractForm.tenantName?.trim()) {
      toast.error('Kiracı adı zorunludur')
      return
    }
    setContractSaving(true)
    try {
      const payload = {
        propertyId: contractForm.propertyId,
        tenantName: contractForm.tenantName,
        tenantPhone: contractForm.tenantPhone ?? null,
        tenantEmail: contractForm.tenantEmail ?? null,
        monthlyRent: Number(contractForm.monthlyRent) || 0,
        startDate: contractForm.startDate || dateInput(new Date()),
        endDate: contractForm.endDate || null,
        deposit: Number(contractForm.deposit) || 0,
        status: contractForm.status ?? 'Aktif',
        notes: contractForm.notes ?? null,
      }
      if (contractEditing) {
        await contracts.update.mutateAsync({ id: contractEditing.id, data: payload })
        toast.success('Kontrat güncellendi')
      } else {
        await contracts.create.mutateAsync(payload)
        toast.success('Yeni kontrat eklendi')
      }
      setContractOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydetme başarısız')
    } finally {
      setContractSaving(false)
    }
  }
  const confirmDeleteContract = async () => {
    if (!contractDeleteId) return
    setContractDeleting(true)
    try {
      await contracts.remove.mutateAsync(contractDeleteId)
      toast.success('Kontrat silindi')
      setContractDeleteId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Silme başarısız')
    } finally {
      setContractDeleting(false)
    }
  }

  /* -------------------- Loading skeleton -------------------- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Emlak & Kira"
          description="Mülklerinizi ve kira kontratlarınızı yönetin"
          icon={Home}
        />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Emlak & Kira"
        description="Mülklerinizi ve kira kontratlarınızı yönetin"
        icon={Home}
        actions={
          <Button
            className="gap-2"
            onClick={tab === 'properties' ? openPropCreate : openContractCreate}
          >
            <Plus className="h-4 w-4" />
            {tab === 'properties' ? 'Mülk Ekle' : 'Kontrat Ekle'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Mülk Değeri"
          value={formatCurrency(stats.totalValue)}
          icon={Building2}
          accent="violet"
          subtitle={`${propertyList.length} mülk`}
        />
        <StatCard
          title="Aktif Kira"
          value={String(stats.activeCount)}
          icon={FileSignature}
          accent="emerald"
          subtitle="aktif kontrat"
        />
        <StatCard
          title="Aylık Kira Geliri"
          value={formatCurrency(stats.monthlyRent)}
          icon={Wallet}
          accent="sky"
          subtitle={`Yıllık: ${formatCompact(stats.monthlyRent * 12)}`}
        />
        <StatCard
          title="Yıllık Getiri"
          value={`%${stats.yieldPct.toFixed(2)}`}
          icon={TrendingUp}
          accent="amber"
          subtitle="yıllık kira / mülk değeri"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'properties' | 'contracts')}>
        <TabsList>
          <TabsTrigger value="properties" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Mülkler
            <Badge variant="secondary" className="ml-1 bg-muted/60">
              {propertyList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <FileSignature className="h-3.5 w-3.5" />
            Kontratlar
            <Badge variant="secondary" className="ml-1 bg-muted/60">
              {contractList.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* -------------------- Properties tab -------------------- */}
        <TabsContent value="properties" className="mt-4">
          {propertyList.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Henüz mülk eklenmemiş"
              description="Daire, villa, dükkan veya arsa ekleyerek portföyünüzü oluşturmaya başlayın."
              action={
                <Button className="gap-2" onClick={openPropCreate}>
                  <Plus className="h-4 w-4" /> İlk Mülkü Ekle
                </Button>
              }
            />
          ) : (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {propertyList.map((p) => (
                <motion.div
                  key={p.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-muted/50">
                              {p.type}
                            </Badge>
                            {propertyStatusBadge(p.status)}
                          </div>
                          <h3 className="mt-2 truncate text-base font-semibold">{p.name}</h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPropEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" /> Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPropDeleteId(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {p.address && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            {p.address}
                            {p.city ? `, ${p.city}` : ''}
                          </span>
                        </div>
                      )}

                      <div className="mt-4 space-y-1">
                        <p className="text-xs text-muted-foreground">Güncel Değer</p>
                        <p className="text-2xl font-bold tracking-tight">
                          {formatCurrency(p.currentValue)}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-muted-foreground">Alış Fiyatı</p>
                          <p className="font-medium">{formatCurrency(p.purchasePrice)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Aylık Kira</p>
                          <p className="font-medium">{formatCurrency(p.monthlyRent)}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                        {p.size != null && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3.5 w-3.5" /> {p.size} m²
                          </span>
                        )}
                        {p.rooms && (
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3.5 w-3.5" /> {p.rooms}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* -------------------- Contracts tab -------------------- */}
        <TabsContent value="contracts" className="mt-4">
          {contractList.length === 0 ? (
            <EmptyState
              icon={FileSignature}
              title="Henüz kontrat eklenmemiş"
              description="Mülklerinize kiracı atayarak kira gelirinizi takip edin."
              action={
                <Button className="gap-2" onClick={openContractCreate}>
                  <Plus className="h-4 w-4" /> İlk Kontratı Ekle
                </Button>
              }
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[640px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mülk</TableHead>
                        <TableHead>Kiracı</TableHead>
                        <TableHead className="text-right">Aylık Kira</TableHead>
                        <TableHead>Süre</TableHead>
                        <TableHead className="text-right">Depozito</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractList.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {c.property?.name ?? '—'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {c.property?.city ?? ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{c.tenantName}</div>
                            {c.tenantPhone && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" /> {c.tenantPhone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(c.monthlyRent)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs">
                              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{formatDate(c.startDate)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-muted-foreground">
                                {c.endDate ? formatDate(c.endDate) : '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(c.deposit)}
                          </TableCell>
                          <TableCell>{contractStatusBadge(c.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openContractEdit(c)}>
                                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setContractDeleteId(c.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* -------------------- Property FormDialog -------------------- */}
      <FormDialog
        open={propOpen}
        onOpenChange={setPropOpen}
        title={propEditing ? 'Mülkü Düzenle' : 'Yeni Mülk'}
        description="Mülk bilgilerini girin. (*) zorunlu alanlar."
        icon={Building2}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Mülk Adı *</Label>
            <Input
              value={propForm.name ?? ''}
              onChange={(e) => setPropForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn. Kadıköy Daire 1"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tür</Label>
            <Select
              value={propForm.type ?? 'Daire'}
              onValueChange={(v) => setPropForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select
              value={propForm.status ?? 'Boş'}
              onValueChange={(v) => setPropForm((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Adres</Label>
            <Input
              value={propForm.address ?? ''}
              onChange={(e) => setPropForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Mahalle, sokak, no"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Şehir</Label>
            <Input
              value={propForm.city ?? ''}
              onChange={(e) => setPropForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="İstanbul"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Alan (m²)</Label>
            <Input
              type="number"
              value={propForm.size ?? ''}
              onChange={(e) =>
                setPropForm((f) => ({
                  ...f,
                  size: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              placeholder="120"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Oda Sayısı</Label>
            <Input
              value={propForm.rooms ?? ''}
              onChange={(e) => setPropForm((f) => ({ ...f, rooms: e.target.value }))}
              placeholder="2+1"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Alış Fiyatı</Label>
            <MoneyInput
              value={propForm.purchasePrice ?? 0}
              onValueChange={(v) => setPropForm((f) => ({ ...f, purchasePrice: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Güncel Değer</Label>
            <MoneyInput
              value={propForm.currentValue ?? 0}
              onValueChange={(v) => setPropForm((f) => ({ ...f, currentValue: v }))}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Aylık Kira</Label>
            <MoneyInput
              value={propForm.monthlyRent ?? 0}
              onValueChange={(v) => setPropForm((f) => ({ ...f, monthlyRent: v }))}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              rows={3}
              value={propForm.notes ?? ''}
              onChange={(e) => setPropForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Ek bilgiler..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPropOpen(false)}>
            İptal
          </Button>
          <Button onClick={submitProperty} disabled={propSaving}>
            {propSaving ? 'Kaydediliyor…' : propEditing ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </FormDialog>

      {/* -------------------- Contract FormDialog -------------------- */}
      <FormDialog
        open={contractOpen}
        onOpenChange={setContractOpen}
        title={contractEditing ? 'Kontratı Düzenle' : 'Yeni Kontrat'}
        description="Kiracı ve sözleşme bilgilerini girin."
        icon={FileSignature}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Mülk *</Label>
            <Select
              value={contractForm.propertyId ?? ''}
              onValueChange={(v) => {
                const prop = propertyList.find((p) => p.id === v)
                setContractForm((f) => ({
                  ...f,
                  propertyId: v,
                  monthlyRent: contractEditing ? f.monthlyRent : prop?.monthlyRent ?? f.monthlyRent,
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Mülk seçin" />
              </SelectTrigger>
              <SelectContent>
                {propertyList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.city ? `· ${p.city}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {propertyList.length === 0 && (
              <p className="text-xs text-amber-500">Önce bir mülk eklemelisiniz.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Kiracı Adı *</Label>
            <Input
              value={contractForm.tenantName ?? ''}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, tenantName: e.target.value }))
              }
              placeholder="Ad Soyad"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Telefon</Label>
            <Input
              value={contractForm.tenantPhone ?? ''}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, tenantPhone: e.target.value }))
              }
              placeholder="05XX XXX XX XX"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>E-posta</Label>
            <Input
              type="email"
              value={contractForm.tenantEmail ?? ''}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, tenantEmail: e.target.value }))
              }
              placeholder="kiraci@ornek.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Başlangıç Tarihi</Label>
            <Input
              type="date"
              value={contractForm.startDate ?? ''}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, startDate: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Bitiş Tarihi</Label>
            <Input
              type="date"
              value={contractForm.endDate ?? ''}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, endDate: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Aylık Kira</Label>
            <MoneyInput
              value={contractForm.monthlyRent ?? 0}
              onValueChange={(v) =>
                setContractForm((f) => ({ ...f, monthlyRent: v }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Depozito</Label>
            <MoneyInput
              value={contractForm.deposit ?? 0}
              onValueChange={(v) => setContractForm((f) => ({ ...f, deposit: v }))}
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Durum</Label>
            <Select
              value={contractForm.status ?? 'Aktif'}
              onValueChange={(v) =>
                setContractForm((f) => ({ ...f, status: v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              rows={3}
              value={contractForm.notes ?? ''}
              onChange={(e) =>
                setContractForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Sözleşme notları..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setContractOpen(false)}>
            İptal
          </Button>
          <Button onClick={submitContract} disabled={contractSaving}>
            {contractSaving ? 'Kaydediliyor…' : contractEditing ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </FormDialog>

      {/* -------------------- Delete confirms -------------------- */}
      <ConfirmDialog
        open={!!propDeleteId}
        onOpenChange={(o) => !o && setPropDeleteId(null)}
        title="Mülkü Sil"
        description="Bu mülkü ve ilişkili kontratları silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        loading={propDeleting}
        onConfirm={confirmDeleteProperty}
      />
      <ConfirmDialog
        open={!!contractDeleteId}
        onOpenChange={(o) => !o && setContractDeleteId(null)}
        title="Kontratı Sil"
        description="Bu kontratı silmek istediğinize emin misiniz?"
        loading={contractDeleting}
        onConfirm={confirmDeleteContract}
      />
    </div>
  )
}
