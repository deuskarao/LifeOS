'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, useCrud } from '@/lib/api-client'
import {
  formatCurrency,
  formatCompact,
  formatDate,
  VEHICLE_FUEL_TYPES,
  SERVICE_TYPES,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Fuel,
  Wrench,
  Gauge,
  Hash,
  Palette,
  ClipboardList,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

interface Vehicle {
  id: string
  name: string
  plate: string | null
  brand: string | null
  model: string | null
  year: number | null
  fuelType: string
  currentKm: number
  color: string | null
  notes: string | null
  createdAt: string
  _count?: { fuelRecords: number; serviceRecords: number }
}

interface VehicleFuel {
  id: string
  vehicleId: string
  vehicle?: Vehicle
  date: string
  liters: number
  amount: number
  km: number
  fuelType: string
  station: string | null
  createdAt: string
}

interface VehicleService {
  id: string
  vehicleId: string
  vehicle?: Vehicle
  date: string
  serviceType: string
  amount: number
  km: number
  notes: string | null
  createdAt: string
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const dateInput = (d: string | Date | null | undefined) => {
  if (!d) return ''
  const x = new Date(d)
  return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10)
}

const PRESET_COLORS = [
  { name: 'Beyaz', value: '#f8fafc' },
  { name: 'Siyah', value: '#1e293b' },
  { name: 'Gümüş', value: '#cbd5e1' },
  { name: 'Gri', value: '#64748b' },
  { name: 'Kırmızı', value: '#ef4444' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Yeşil', value: '#22c55e' },
  { name: 'Bordo', value: '#9f1239' },
]

function fuelBadge(fuelType: string) {
  const styles: Record<string, string> = {
    Benzin: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
    Dizel: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
    LPG: 'bg-sky-500/15 text-sky-500 border-sky-500/20',
    Hibrit: 'bg-violet-500/15 text-violet-500 border-violet-500/20',
    Elektrik: 'bg-teal-500/15 text-teal-500 border-teal-500/20',
  }
  return (
    <Badge
      className={
        styles[fuelType] ??
        'bg-muted text-muted-foreground border-border'
      }
    >
      {fuelType}
    </Badge>
  )
}

function serviceBadge(type: string) {
  const styles: Record<string, string> = {
    'Periyodik Bakım': 'bg-sky-500/15 text-sky-500 border-sky-500/20',
    'Yağ Değişimi': 'bg-amber-500/15 text-amber-500 border-amber-500/20',
    Lastik: 'bg-violet-500/15 text-violet-500 border-violet-500/20',
    Sigorta: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
    Muayene: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
    Diğer: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <Badge className={styles[type] ?? 'bg-muted text-muted-foreground'}>
      {type}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/* Main view                                                          */
/* ------------------------------------------------------------------ */

const emptyVehicle: Partial<Vehicle> = {
  name: '',
  plate: '',
  brand: '',
  model: '',
  year: null,
  fuelType: 'Benzin',
  currentKm: 0,
  color: '#1e293b',
  notes: '',
}

const emptyFuel: Partial<VehicleFuel> = {
  vehicleId: '',
  date: dateInput(new Date()),
  liters: 0,
  amount: 0,
  km: 0,
  fuelType: 'Benzin',
  station: '',
}

const emptyService: Partial<VehicleService> = {
  vehicleId: '',
  date: dateInput(new Date()),
  serviceType: 'Periyodik Bakım',
  amount: 0,
  km: 0,
  notes: '',
}

export function VehiclesView() {
  const [tab, setTab] = useState<'vehicles' | 'fuel' | 'services'>('vehicles')

  const vehicles = useCrud<Vehicle>('vehicles')
  const fuel = useCrud<VehicleFuel>('fuel')
  const services = useCrud<VehicleService>('services')

  const isLoading = vehicles.list.isLoading
  const vehicleList = vehicles.list.data ?? []
  const fuelList = fuel.list.data ?? []
  const serviceList = services.list.data ?? []

  /* -------------------- Stats -------------------- */
  const stats = useMemo(() => {
    const totalKm = vehicleList.reduce((s, v) => s + (v.currentKm || 0), 0)
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime()
    const fuelThisYear = fuelList
      .filter((f) => new Date(f.date).getTime() >= yearStart)
      .reduce((s, f) => s + (f.amount || 0), 0)
    const serviceThisYear = serviceList
      .filter((s) => new Date(s.date).getTime() >= yearStart)
      .reduce((sum, s) => sum + (s.amount || 0), 0)
    return {
      vehicleCount: vehicleList.length,
      totalKm,
      fuelThisYear,
      serviceThisYear,
    }
  }, [vehicleList, fuelList, serviceList])

  /* -------------------- Vehicle dialog -------------------- */
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [vehicleEditing, setVehicleEditing] = useState<Vehicle | null>(null)
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>(emptyVehicle)
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [vehicleDeleteId, setVehicleDeleteId] = useState<string | null>(null)
  const [vehicleDeleting, setVehicleDeleting] = useState(false)

  const openVehicleCreate = () => {
    setVehicleEditing(null)
    setVehicleForm(emptyVehicle)
    setVehicleOpen(true)
  }
  const openVehicleEdit = (v: Vehicle) => {
    setVehicleEditing(v)
    setVehicleForm({ ...v })
    setVehicleOpen(true)
  }
  const submitVehicle = async () => {
    if (!vehicleForm.name?.trim()) {
      toast.error('Araç adı zorunludur')
      return
    }
    setVehicleSaving(true)
    try {
      const payload = {
        name: vehicleForm.name,
        plate: vehicleForm.plate || null,
        brand: vehicleForm.brand || null,
        model: vehicleForm.model || null,
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        fuelType: vehicleForm.fuelType ?? 'Benzin',
        currentKm: Number(vehicleForm.currentKm) || 0,
        color: vehicleForm.color || null,
        notes: vehicleForm.notes || null,
      }
      if (vehicleEditing) {
        await vehicles.update.mutateAsync({ id: vehicleEditing.id, data: payload })
        toast.success('Araç güncellendi')
      } else {
        await vehicles.create.mutateAsync(payload)
        toast.success('Yeni araç eklendi')
      }
      setVehicleOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydetme başarısız')
    } finally {
      setVehicleSaving(false)
    }
  }
  const confirmDeleteVehicle = async () => {
    if (!vehicleDeleteId) return
    setVehicleDeleting(true)
    try {
      await vehicles.remove.mutateAsync(vehicleDeleteId)
      toast.success('Araç silindi')
      setVehicleDeleteId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Silme başarısız')
    } finally {
      setVehicleDeleting(false)
    }
  }

  /* -------------------- Vehicle detail sheet -------------------- */
  const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null)
  const detailQuery = useQuery({
    queryKey: ['vehicle-records', detailVehicle?.id],
    queryFn: () =>
      api.get<{ fuelRecords: VehicleFuel[]; serviceRecords: VehicleService[] }>(
        `/api/lifeos/vehicles/${detailVehicle!.id}?include=records`
      ),
    enabled: !!detailVehicle,
  })

  /* -------------------- Fuel dialog -------------------- */
  const [fuelOpen, setFuelOpen] = useState(false)
  const [fuelEditing, setFuelEditing] = useState<VehicleFuel | null>(null)
  const [fuelForm, setFuelForm] = useState<Partial<VehicleFuel>>(emptyFuel)
  const [fuelSaving, setFuelSaving] = useState(false)
  const [fuelDeleteId, setFuelDeleteId] = useState<string | null>(null)
  const [fuelDeleting, setFuelDeleting] = useState(false)

  const openFuelCreate = () => {
    setFuelEditing(null)
    setFuelForm({
      ...emptyFuel,
      vehicleId: vehicleList[0]?.id ?? '',
      fuelType: vehicleList[0]?.fuelType ?? 'Benzin',
      km: vehicleList[0]?.currentKm ?? 0,
    })
    setFuelOpen(true)
  }
  const openFuelEdit = (f: VehicleFuel) => {
    setFuelEditing(f)
    setFuelForm({ ...f, date: dateInput(f.date) })
    setFuelOpen(true)
  }
  const submitFuel = async () => {
    if (!fuelForm.vehicleId) {
      toast.error('Araç seçiniz')
      return
    }
    setFuelSaving(true)
    try {
      const payload = {
        vehicleId: fuelForm.vehicleId,
        date: fuelForm.date || dateInput(new Date()),
        liters: Number(fuelForm.liters) || 0,
        amount: Number(fuelForm.amount) || 0,
        km: Number(fuelForm.km) || 0,
        fuelType: fuelForm.fuelType ?? 'Benzin',
        station: fuelForm.station || null,
      }
      if (fuelEditing) {
        await fuel.update.mutateAsync({ id: fuelEditing.id, data: payload })
        toast.success('Yakıt kaydı güncellendi')
      } else {
        await fuel.create.mutateAsync(payload)
        toast.success('Yakıt kaydı eklendi')
      }
      setFuelOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydetme başarısız')
    } finally {
      setFuelSaving(false)
    }
  }
  const confirmDeleteFuel = async () => {
    if (!fuelDeleteId) return
    setFuelDeleting(true)
    try {
      await fuel.remove.mutateAsync(fuelDeleteId)
      toast.success('Yakıt kaydı silindi')
      setFuelDeleteId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Silme başarısız')
    } finally {
      setFuelDeleting(false)
    }
  }

  /* -------------------- Service dialog -------------------- */
  const [serviceOpen, setServiceOpen] = useState(false)
  const [serviceEditing, setServiceEditing] = useState<VehicleService | null>(null)
  const [serviceForm, setServiceForm] = useState<Partial<VehicleService>>(emptyService)
  const [serviceSaving, setServiceSaving] = useState(false)
  const [serviceDeleteId, setServiceDeleteId] = useState<string | null>(null)
  const [serviceDeleting, setServiceDeleting] = useState(false)

  const openServiceCreate = () => {
    setServiceEditing(null)
    setServiceForm({
      ...emptyService,
      vehicleId: vehicleList[0]?.id ?? '',
      km: vehicleList[0]?.currentKm ?? 0,
    })
    setServiceOpen(true)
  }
  const openServiceEdit = (s: VehicleService) => {
    setServiceEditing(s)
    setServiceForm({ ...s, date: dateInput(s.date) })
    setServiceOpen(true)
  }
  const submitService = async () => {
    if (!serviceForm.vehicleId) {
      toast.error('Araç seçiniz')
      return
    }
    if (!serviceForm.serviceType) {
      toast.error('Servis tipi zorunludur')
      return
    }
    setServiceSaving(true)
    try {
      const payload = {
        vehicleId: serviceForm.vehicleId,
        date: serviceForm.date || dateInput(new Date()),
        serviceType: serviceForm.serviceType,
        amount: Number(serviceForm.amount) || 0,
        km: Number(serviceForm.km) || 0,
        notes: serviceForm.notes || null,
      }
      if (serviceEditing) {
        await services.update.mutateAsync({ id: serviceEditing.id, data: payload })
        toast.success('Servis kaydı güncellendi')
      } else {
        await services.create.mutateAsync(payload)
        toast.success('Servis kaydı eklendi')
      }
      setServiceOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kaydetme başarısız')
    } finally {
      setServiceSaving(false)
    }
  }
  const confirmDeleteService = async () => {
    if (!serviceDeleteId) return
    setServiceDeleting(true)
    try {
      await services.remove.mutateAsync(serviceDeleteId)
      toast.success('Servis kaydı silindi')
      setServiceDeleteId(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Silme başarısız')
    } finally {
      setServiceDeleting(false)
    }
  }

  /* -------------------- Loading -------------------- */
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Araçlar"
          description="Araç filonuzu, yakıt ve servis kayıtlarını yönetin"
          icon={Car}
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

  /* -------------------- Header button per tab -------------------- */
  const headerAction = (
    <Button
      className="gap-2"
      onClick={
        tab === 'vehicles'
          ? openVehicleCreate
          : tab === 'fuel'
            ? openFuelCreate
            : openServiceCreate
      }
    >
      <Plus className="h-4 w-4" />
      {tab === 'vehicles' ? 'Araç Ekle' : tab === 'fuel' ? 'Yakıt Ekle' : 'Servis Ekle'}
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Araçlar"
        description="Araç filonuzu, yakıt ve servis kayıtlarını yönetin"
        icon={Car}
        actions={headerAction}
      />

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Araç Sayısı"
          value={String(stats.vehicleCount)}
          icon={Car}
          accent="violet"
          subtitle="kayıtlı araç"
        />
        <StatCard
          title="Toplam Km"
          value={formatCompact(stats.totalKm).replace('₺', '') + ' km'}
          icon={Gauge}
          accent="sky"
          subtitle="tüm araçlar"
        />
        <StatCard
          title="Bu Yıl Yakıt"
          value={formatCurrency(stats.fuelThisYear)}
          icon={Fuel}
          accent="amber"
          subtitle={`${fuelList.length} kayıt`}
        />
        <StatCard
          title="Bu Yıl Servis"
          value={formatCurrency(stats.serviceThisYear)}
          icon={Wrench}
          accent="rose"
          subtitle={`${serviceList.length} kayıt`}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'vehicles' | 'fuel' | 'services')}
      >
        <TabsList>
          <TabsTrigger value="vehicles" className="gap-1.5">
            <Car className="h-3.5 w-3.5" />
            Araçlar
            <Badge variant="secondary" className="ml-1 bg-muted/60">
              {vehicleList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="fuel" className="gap-1.5">
            <Fuel className="h-3.5 w-3.5" />
            Yakıt
            <Badge variant="secondary" className="ml-1 bg-muted/60">
              {fuelList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Servis
            <Badge variant="secondary" className="ml-1 bg-muted/60">
              {serviceList.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* -------------------- Vehicles tab -------------------- */}
        <TabsContent value="vehicles" className="mt-4">
          {vehicleList.length === 0 ? (
            <EmptyState
              icon={Car}
              title="Henüz araç eklenmemiş"
              description="Aracınızı ekleyerek yakıt ve servis giderlerini takip etmeye başlayın."
              action={
                <Button className="gap-2" onClick={openVehicleCreate}>
                  <Plus className="h-4 w-4" /> İlk Aracı Ekle
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
              {vehicleList.map((v) => (
                <motion.div
                  key={v.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/40">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border"
                            style={{
                              background: v.color ?? '#1e293b',
                              borderColor: 'oklch(1 0 0 / 10%)',
                            }}
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold">
                              {v.name}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                              {[v.brand, v.model, v.year].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailVehicle(v)}>
                              <ClipboardList className="h-3.5 w-3.5" /> Detay
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openVehicleEdit(v)}>
                              <Pencil className="h-3.5 w-3.5" /> Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setVehicleDeleteId(v.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {v.plate && (
                          <Badge className="font-mono bg-muted text-foreground border-border">
                            <Hash className="h-3 w-3" />
                            {v.plate}
                          </Badge>
                        )}
                        {fuelBadge(v.fuelType)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-muted-foreground">Kilometre</p>
                          <p className="mt-0.5 text-sm font-semibold">
                            {new Intl.NumberFormat('tr-TR').format(v.currentKm)} km
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-2.5">
                          <p className="text-muted-foreground">Kayıtlar</p>
                          <p className="mt-0.5 text-sm font-semibold">
                            {v._count?.fuelRecords ?? 0} yakıt · {v._count?.serviceRecords ?? 0} servis
                          </p>
                        </div>
                      </div>

                      {v.notes && (
                        <p className="mt-3 line-clamp-2 border-t pt-3 text-xs text-muted-foreground">
                          {v.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* -------------------- Fuel tab -------------------- */}
        <TabsContent value="fuel" className="mt-4">
          {fuelList.length === 0 ? (
            <EmptyState
              icon={Fuel}
              title="Henüz yakıt kaydı yok"
              description="Yakıt alımlarınızı kaydederek tüketim ve maliyetleri takip edin."
              action={
                <Button className="gap-2" onClick={openFuelCreate}>
                  <Plus className="h-4 w-4" /> İlk Yakıt Kaydı
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
                        <TableHead>Tarih</TableHead>
                        <TableHead>Araç</TableHead>
                        <TableHead>Yakıt</TableHead>
                        <TableHead className="text-right">Litre</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead className="text-right">Km</TableHead>
                        <TableHead>İstasyon</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fuelList.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(f.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
                                <Car className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate text-sm font-medium">
                                {f.vehicle?.name ?? '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{fuelBadge(f.fuelType)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(f.liters).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(f.amount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">
                            {new Intl.NumberFormat('tr-TR').format(f.km)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {f.station ?? '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openFuelEdit(f)}>
                                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setFuelDeleteId(f.id)}
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

        {/* -------------------- Services tab -------------------- */}
        <TabsContent value="services" className="mt-4">
          {serviceList.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Henüz servis kaydı yok"
              description="Periyodik bakım, yağ, lastik, sigorta ve muayene kayıtlarını ekleyin."
              action={
                <Button className="gap-2" onClick={openServiceCreate}>
                  <Plus className="h-4 w-4" /> İlk Servis Kaydı
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
                        <TableHead>Tarih</TableHead>
                        <TableHead>Araç</TableHead>
                        <TableHead>Servis Tipi</TableHead>
                        <TableHead className="text-right">Tutar</TableHead>
                        <TableHead className="text-right">Km</TableHead>
                        <TableHead>Notlar</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceList.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatDate(s.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
                                <Car className="h-3.5 w-3.5" />
                              </div>
                              <span className="truncate text-sm font-medium">
                                {s.vehicle?.name ?? '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{serviceBadge(s.serviceType)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(s.amount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">
                            {new Intl.NumberFormat('tr-TR').format(s.km)}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                            {s.notes ?? '—'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openServiceEdit(s)}>
                                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setServiceDeleteId(s.id)}
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

      {/* -------------------- Vehicle FormDialog -------------------- */}
      <FormDialog
        open={vehicleOpen}
        onOpenChange={setVehicleOpen}
        title={vehicleEditing ? 'Aracı Düzenle' : 'Yeni Araç'}
        description="Araç bilgilerini girin. (*) zorunlu alanlar."
        icon={Car}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Araç Adı *</Label>
            <Input
              value={vehicleForm.name ?? ''}
              onChange={(e) => setVehicleForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn. Aile Arabası"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plaka</Label>
            <Input
              value={vehicleForm.plate ?? ''}
              onChange={(e) => setVehicleForm((f) => ({ ...f, plate: e.target.value }))}
              placeholder="34 ABC 123"
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Yakıt Tipi</Label>
            <Select
              value={vehicleForm.fuelType ?? 'Benzin'}
              onValueChange={(v) => setVehicleForm((f) => ({ ...f, fuelType: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_FUEL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Marka</Label>
            <Input
              value={vehicleForm.brand ?? ''}
              onChange={(e) => setVehicleForm((f) => ({ ...f, brand: e.target.value }))}
              placeholder="Volkswagen"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Model</Label>
            <Input
              value={vehicleForm.model ?? ''}
              onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))}
              placeholder="Golf"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Yıl</Label>
            <Input
              type="number"
              value={vehicleForm.year ?? ''}
              onChange={(e) =>
                setVehicleForm((f) => ({
                  ...f,
                  year: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              placeholder="2021"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kilometre</Label>
            <Input
              type="number"
              value={vehicleForm.currentKm ?? 0}
              onChange={(e) =>
                setVehicleForm((f) => ({ ...f, currentKm: Number(e.target.value) || 0 }))
              }
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Renk
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setVehicleForm((f) => ({ ...f, color: c.value }))}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 transition-all ${
                    vehicleForm.color === c.value
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                  style={{ background: c.value }}
                  title={c.name}
                >
                  {vehicleForm.color === c.value && (
                    <span className="text-[10px] font-bold text-foreground mix-blend-difference">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            <Input
              value={vehicleForm.color ?? ''}
              onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))}
              placeholder="#1e293b"
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              rows={3}
              value={vehicleForm.notes ?? ''}
              onChange={(e) => setVehicleForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Sigorta tarihi, kasko, lastik durumu..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setVehicleOpen(false)}>
            İptal
          </Button>
          <Button onClick={submitVehicle} disabled={vehicleSaving}>
            {vehicleSaving ? 'Kaydediliyor…' : vehicleEditing ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </FormDialog>

      {/* -------------------- Fuel FormDialog -------------------- */}
      <FormDialog
        open={fuelOpen}
        onOpenChange={setFuelOpen}
        title={fuelEditing ? 'Yakıt Kaydını Düzenle' : 'Yeni Yakıt Kaydı'}
        description="Yakıt alım bilgilerini girin."
        icon={Fuel}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Araç *</Label>
            <Select
              value={fuelForm.vehicleId ?? ''}
              onValueChange={(v) => {
                const vh = vehicleList.find((x) => x.id === v)
                setFuelForm((f) => ({
                  ...f,
                  vehicleId: v,
                  fuelType: fuelEditing ? f.fuelType : vh?.fuelType ?? f.fuelType,
                  km: fuelEditing ? f.km : vh?.currentKm ?? f.km,
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Araç seçin" />
              </SelectTrigger>
              <SelectContent>
                {vehicleList.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.plate ? `· ${v.plate}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tarih</Label>
            <Input
              type="date"
              value={fuelForm.date ?? ''}
              onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Yakıt Tipi</Label>
            <Select
              value={fuelForm.fuelType ?? 'Benzin'}
              onValueChange={(v) => setFuelForm((f) => ({ ...f, fuelType: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_FUEL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Litre</Label>
            <Input
              type="number"
              step="0.01"
              value={fuelForm.liters ?? 0}
              onChange={(e) =>
                setFuelForm((f) => ({ ...f, liters: Number(e.target.value) || 0 }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tutar</Label>
            <MoneyInput
              value={fuelForm.amount ?? 0}
              onValueChange={(v) => setFuelForm((f) => ({ ...f, amount: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kilometre</Label>
            <Input
              type="number"
              value={fuelForm.km ?? 0}
              onChange={(e) =>
                setFuelForm((f) => ({ ...f, km: Number(e.target.value) || 0 }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>İstasyon</Label>
            <Input
              value={fuelForm.station ?? ''}
              onChange={(e) => setFuelForm((f) => ({ ...f, station: e.target.value }))}
              placeholder="Petrol Ofisi / OPET / Shell..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFuelOpen(false)}>
            İptal
          </Button>
          <Button onClick={submitFuel} disabled={fuelSaving}>
            {fuelSaving ? 'Kaydediliyor…' : fuelEditing ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </FormDialog>

      {/* -------------------- Service FormDialog -------------------- */}
      <FormDialog
        open={serviceOpen}
        onOpenChange={setServiceOpen}
        title={serviceEditing ? 'Servis Kaydını Düzenle' : 'Yeni Servis Kaydı'}
        description="Servis/bakım bilgilerini girin."
        icon={Wrench}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Araç *</Label>
            <Select
              value={serviceForm.vehicleId ?? ''}
              onValueChange={(v) => {
                const vh = vehicleList.find((x) => x.id === v)
                setServiceForm((f) => ({
                  ...f,
                  vehicleId: v,
                  km: serviceEditing ? f.km : vh?.currentKm ?? f.km,
                }))
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Araç seçin" />
              </SelectTrigger>
              <SelectContent>
                {vehicleList.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.plate ? `· ${v.plate}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tarih</Label>
            <Input
              type="date"
              value={serviceForm.date ?? ''}
              onChange={(e) => setServiceForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Servis Tipi *</Label>
            <Select
              value={serviceForm.serviceType ?? 'Periyodik Bakım'}
              onValueChange={(v) => setServiceForm((f) => ({ ...f, serviceType: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tutar</Label>
            <MoneyInput
              value={serviceForm.amount ?? 0}
              onValueChange={(v) => setServiceForm((f) => ({ ...f, amount: v }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kilometre</Label>
            <Input
              type="number"
              value={serviceForm.km ?? 0}
              onChange={(e) =>
                setServiceForm((f) => ({ ...f, km: Number(e.target.value) || 0 }))
              }
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              rows={3}
              value={serviceForm.notes ?? ''}
              onChange={(e) => setServiceForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Yapılan işlemler, değişen parçalar..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setServiceOpen(false)}>
            İptal
          </Button>
          <Button onClick={submitService} disabled={serviceSaving}>
            {serviceSaving ? 'Kaydediliyor…' : serviceEditing ? 'Güncelle' : 'Ekle'}
          </Button>
        </div>
      </FormDialog>

      {/* -------------------- Vehicle Detail Sheet -------------------- */}
      <Sheet open={!!detailVehicle} onOpenChange={(o) => !o && setDetailVehicle(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailVehicle && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{
                      background: detailVehicle.color ?? '#1e293b',
                      borderColor: 'oklch(1 0 0 / 10%)',
                    }}
                  />
                  {detailVehicle.name}
                </SheetTitle>
                <SheetDescription>
                  {[detailVehicle.brand, detailVehicle.model, detailVehicle.year]
                    .filter(Boolean)
                    .join(' · ')}
                  {detailVehicle.plate ? ` · ${detailVehicle.plate}` : ''}
                </SheetDescription>
              </SheetHeader>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2 px-4">
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <Gauge className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-sm font-semibold">
                    {new Intl.NumberFormat('tr-TR').format(detailVehicle.currentKm)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">km</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <Fuel className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-sm font-semibold">
                    {detailVehicle._count?.fuelRecords ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">yakıt kaydı</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-center">
                  <Wrench className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-sm font-semibold">
                    {detailVehicle._count?.serviceRecords ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">servis kaydı</p>
                </div>
              </div>

              {detailQuery.isLoading && (
                <div className="space-y-2 px-4 py-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              )}

              {detailQuery.data && (
                <div className="space-y-4 px-4 pb-6">
                  {/* Recent fuel records */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Fuel className="h-3.5 w-3.5" /> Son Yakıtlar
                      </h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {detailQuery.data.fuelRecords.length}
                      </Badge>
                    </div>
                    {detailQuery.data.fuelRecords.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Kayıt yok.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detailQuery.data.fuelRecords.slice(0, 8).map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center gap-2 rounded-lg border bg-card/50 p-2.5"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                              <Fuel className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">
                                {formatCurrency(f.amount)}
                                <span className="ml-1.5 text-muted-foreground">
                                  · {f.liters} L
                                </span>
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {formatDate(f.date)} · {new Intl.NumberFormat('tr-TR').format(f.km)} km
                                {f.station ? ` · ${f.station}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent service records */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5" /> Son Servisler
                      </h4>
                      <Badge variant="secondary" className="text-[10px]">
                        {detailQuery.data.serviceRecords.length}
                      </Badge>
                    </div>
                    {detailQuery.data.serviceRecords.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Kayıt yok.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {detailQuery.data.serviceRecords.slice(0, 8).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-2 rounded-lg border bg-card/50 p-2.5"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-rose-500/10 text-rose-500">
                              <Wrench className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">
                                {formatCurrency(s.amount)}
                                <span className="ml-1.5 text-muted-foreground">
                                  · {s.serviceType}
                                </span>
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {formatDate(s.date)} · {new Intl.NumberFormat('tr-TR').format(s.km)} km
                                {s.notes ? ` · ${s.notes}` : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* -------------------- Delete confirms -------------------- */}
      <ConfirmDialog
        open={!!vehicleDeleteId}
        onOpenChange={(o) => !o && setVehicleDeleteId(null)}
        title="Aracı Sil"
        description="Bu aracı ve ilişkili yakıt/servis kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        loading={vehicleDeleting}
        onConfirm={confirmDeleteVehicle}
      />
      <ConfirmDialog
        open={!!fuelDeleteId}
        onOpenChange={(o) => !o && setFuelDeleteId(null)}
        title="Yakıt Kaydını Sil"
        description="Bu yakıt kaydını silmek istediğinize emin misiniz?"
        loading={fuelDeleting}
        onConfirm={confirmDeleteFuel}
      />
      <ConfirmDialog
        open={!!serviceDeleteId}
        onOpenChange={(o) => !o && setServiceDeleteId(null)}
        title="Servis Kaydını Sil"
        description="Bu servis kaydını silmek istediğinize emin misiniz?"
        loading={serviceDeleting}
        onConfirm={confirmDeleteService}
      />
    </div>
  )
}
