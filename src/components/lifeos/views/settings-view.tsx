'use client'

import { useSyncExternalStore, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '../page-header'
import { useNotificationPrefs } from '@/lib/notification-prefs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import {
  CURRENCIES,
  type CurrencyCode,
  getWealthClass,
  formatCompact,
} from '@/lib/lifeos'
import {
  Settings,
  User,
  Mail,
  Phone,
  Sun,
  Moon,
  Monitor,
  Coins,
  Bell,
  Database,
  Save,
  Download,
  RefreshCw,
  Trash2,
  Loader2,
  Check,
  X,
  Crown,
  Sparkles,
  Lock,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Clock,
} from 'lucide-react'

const CURRENCY_STORAGE_KEY = 'lifeos_currency'

const EXPORT_RESOURCES = [
  'bank-accounts',
  'credit-cards',
  'loans',
  'assets',
  'income',
  'expenses',
  'properties',
  'contracts',
  'vehicles',
  'fuel',
  'services',
] as const

export function SettingsView() {
  const [tab, setTab] = useState('profile')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Hesap ve uygulama tercihleri"
        icon={Settings}
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-lg bg-muted/50 p-1 no-scrollbar">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Görünüm</span>
          </TabsTrigger>
          <TabsTrigger value="currency" className="gap-1.5">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline">Para Birimi</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Bildirimler</span>
          </TabsTrigger>
          <TabsTrigger value="membership" className="gap-1.5">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Üyelik</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Veri</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-0">
          <AppearanceTab />
        </TabsContent>
        <TabsContent value="currency" className="mt-0">
          <CurrencyTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-0">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="membership" className="mt-0">
          <MembershipTab />
        </TabsContent>
        <TabsContent value="data" className="mt-0">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------------- Profile -------------------------- */

function ProfileTab() {
  const { data: session, update: updateSession } = useSession()
  const qc = useQueryClient()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ id: string; email: string; name: string; role: string; level: string; createdAt: string }>('/api/lifeos/profile'),
  })

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.name) setName(profile.name)
  }, [profile?.name])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Ad boş olamaz')
      return
    }
    setSaving(true)
    try {
      await api.put('/api/lifeos/profile', { name })
      await updateSession({})
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profil bilgileriniz kaydedildi')
    } catch (e: any) {
      toast.error(e?.message || 'Kaydetme başarısız')
    } finally {
      setSaving(false)
    }
  }

  const email = profile?.email || session?.user?.email || ''
  const role = profile?.role || (session?.user as any)?.role
  const level = profile?.level || (session?.user as any)?.level
  const initials = (name || email).split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    )
  }

  const levelLabel = level === 'premium' ? 'Premium' : level === 'pending_premium' ? 'Premium (Onay Bekliyor)' : 'Standart'
  const levelBadgeClass = level === 'premium'
    ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
    : level === 'pending_premium'
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    : 'bg-muted text-muted-foreground'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          Profil Bilgileri
        </CardTitle>
        <CardDescription>Kişisel bilgilerinizi güncelleyin</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar — baş harfler (upload yok) */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium">{name || 'Kullanıcı'}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
            <Badge variant="secondary" className={levelBadgeClass}>
              {levelLabel}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Ad Soyad</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ad Soyad"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-posta</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-email"
                value={email}
                disabled
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">E-posta değiştirilemez</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-role">Rol</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3">
              <Badge variant="outline" className="capitalize">
                {role === 'admin' ? 'Yönetici' : role === 'demo' ? 'Demo' : 'Kullanıcı'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-plan">Üyelik Planı</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3">
              <Badge variant="secondary" className={levelBadgeClass}>
                {levelLabel}
              </Badge>
              {profile?.createdAt && (
                <span className="text-xs text-muted-foreground">
                  Üyelik: {new Date(profile.createdAt).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => setName(profile?.name || '')}>
            Sıfırla
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Kaydet
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------- Appearance -------------------------- */

const emptySubscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

/** Returns true only after client-side hydration completes. */
function useMounted() {
  return useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot)
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  const options: {
    value: 'light' | 'dark' | 'system'
    label: string
    desc: string
    icon: typeof Sun
  }[] = [
    { value: 'light', label: 'Açık Tema', desc: 'Parlak, gün ışığı teması', icon: Sun },
    { value: 'dark', label: 'Koyu Tema', desc: 'Göz yormayan karanlık tema', icon: Moon },
    { value: 'system', label: 'Sistem', desc: 'Cihaz ayarına uy', icon: Monitor },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="h-4 w-4 text-primary" />
          Görünüm Tercihleri
        </CardTitle>
        <CardDescription>Tema seçiminiz tüm cihazlarda senkronize edilir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {options.map((opt) => {
            const Icon = opt.icon
            const active = mounted && theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`group relative flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all ${
                  active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="theme-active-badge"
                    className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-3 w-3" />
                  </motion.span>
                )}
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
        {!mounted && (
          <p className="mt-4 text-xs text-muted-foreground">Tema durumu yükleniyor…</p>
        )}
      </CardContent>
    </Card>
  )
}

/* -------------------------- Currency -------------------------- */

function CurrencyTab() {
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    if (typeof window === 'undefined') return 'TRY'
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null
    return saved && CURRENCIES[saved] ? saved : 'TRY'
  })
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
      setSaving(false)
      toast.success('Para birimi güncellendi', {
        description: `Varsayılan para birimi: ${CURRENCIES[currency].name} (${CURRENCIES[currency].symbol})`,
      })
    }, 500)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="h-4 w-4 text-primary" />
          Para Birimi
        </CardTitle>
        <CardDescription>
          Tutarların gösterileceği varsayılan para birimini seçin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <RadioGroup
          value={currency}
          onValueChange={(v) => setCurrency(v as CurrencyCode)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
            const c = CURRENCIES[code]
            const active = currency === code
            return (
              <Label
                key={code}
                htmlFor={`cur-${code}`}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  active
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem id={`cur-${code}`} value={code} className="sr-only" />
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ${
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {c.symbol}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.code}</p>
                </div>
                {active && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </Label>
            )
          })}
        </RadioGroup>
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Not: Bu ayar yalnızca görüntüleme tercihidir. Mevcut kurlara göre dönüştürme yapılmaz.
        </div>
        <div className="flex justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Para Birimini Kaydet
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------- Notifications -------------------------- */

function NotificationsTab() {
  const { prefs, update } = useNotificationPrefs()

  const items: {
    key: keyof typeof prefs
    title: string
    desc: string
    icon: typeof Bell
  }[] = [
    {
      key: 'paymentReminders',
      title: 'Ödeme hatırlatıcıları',
      desc: 'Kart ödeme günü, kredi taksiti ve kira sözleşme bitişlerinden önce bildirim alın',
      icon: Bell,
    },
    {
      key: 'cardDebtAlerts',
      title: 'Kart borcu & limit uyarıları',
      desc: 'Kart borcu ödeme günü yaklaştığında ve limit kullanımı %85’i aştığında uyarılın',
      icon: Bell,
    },
    {
      key: 'budgetLimits',
      title: 'Bütçe & tasarruf uyarıları',
      desc: 'Aylık gider gelirinizi aştığında ve tasarruf oranı düştüğünde bildirim alın',
      icon: Bell,
    },
    {
      key: 'weeklyReport',
      title: 'AI haftalık rapor',
      desc: 'Her pazartesi finansal özet ve AI önerileri alın',
      icon: Bell,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          Bildirim Tercihleri
        </CardTitle>
        <CardDescription>
          Hangi durumlarda bildirim alacağınızı seçin. Tercihleriniz tarayıcınızda saklanır ve üst paneldeki bildirim ikonuna anında yansır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
            const Icon = item.icon
            const enabled = prefs[item.key]
            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-lg border bg-card/50 p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      enabled
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => update({ [item.key]: v })}
                  aria-label={item.title}
                />
              </div>
            )
          })
        }
        <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Bildirim tipleri:</p>
          <ul className="mt-1.5 space-y-1">
            <li>• Kart ödeme günü yaklaştığında (7 gün önceden)</li>
            <li>• Kart limit kullanımı %85’i aştığında</li>
            <li>• Kredi taksiti ve kredi sonu yaklaştığında</li>
            <li>• Kira sözleşmesi 60 gün içinde bitiyorsa</li>
            <li>• Aylık gider geliri aştığında (bütçe açığı)</li>
            <li>• Düşük banka bakiyesi (&lt;5.000₺)</li>
            <li>• Araç servis zamanı geldiğinde</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------- Data -------------------------- */

function DataTab() {
  const [exporting, setExporting] = useState(false)

  const handleResetDemo = () => {
    toast.info('Demo verileri sıfırlanıyor', {
      description: 'Sayfa yeniden yükleniyor…',
    })
    setTimeout(() => window.location.reload(), 800)
  }

  const handleExport = async () => {
    setExporting(true)
    const dateStr = new Date().toISOString().slice(0, 10)
    try {
      const entries = await Promise.all(
        EXPORT_RESOURCES.map(async (res) => {
          try {
            const data = await api.get<unknown[]>(`/api/lifeos/${res}`)
            return [res, data]
          } catch (e) {
            return [res, { error: e instanceof Error ? e.message : 'failed' }]
          }
        })
      )
      const payload = {
        exportedAt: new Date().toISOString(),
        app: 'LifeOS',
        version: '2.0',
        data: Object.fromEntries(entries),
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-export-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Veriler dışa aktarıldı', {
        description: `lifeos-export-${dateStr}.json indirildi`,
      })
    } catch (e) {
      toast.error('Dışa aktarma başarısız', {
        description: e instanceof Error ? e.message : 'Bilinmeyen hata',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = () => {
    toast.warning('Hesap silme talebi alındı', {
      description: 'Bu özellik demo modunda devre dışıdır.',
    })
  }

  return (
    <div className="space-y-4">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4 text-primary" />
            Verileri Dışa Aktar
          </CardTitle>
          <CardDescription>
            Tüm finansal verilerinizi JSON formatında indirin
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Banka hesapları, kartlar, krediler, varlıklar, gelir-gider, emlak ve araç verileriniz tek bir
            dosyada toplanır.
          </p>
          <Button onClick={handleExport} disabled={exporting} className="gap-2 sm:w-auto">
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Dışa Aktarılıyor…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Dışa Aktar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Reset demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-primary" />
            Demo Verilerini Sıfırla
          </CardTitle>
          <CardDescription>Demo verilerini başlangıç haline getirin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Tüm değişiklikler sıfırlanır ve demo verileri yeniden yüklenir. Bu işlem geri alınamaz.
          </p>
          <Button variant="outline" onClick={handleResetDemo} className="gap-2 sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Sıfırla
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-rose-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-rose-600 dark:text-rose-400">
            <Trash2 className="h-4 w-4" />
            Tehlikeli Bölge
          </CardTitle>
          <CardDescription>
            Bu işlem geri alınamaz — lütfen emin olun
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Hesabınızı ve tüm ilişkili verilerinizi kalıcı olarak siler.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2 sm:w-auto">
                <Trash2 className="h-4 w-4" />
                Hesabı Sil
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                  Hesabınızı silmek istediğinize emin misiniz?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Bu işlem geri alınamaz. Tüm banka hesaplarınız, kartlarınız, kredileriniz, varlıklarınız,
                  gelir-gider geçmişiniz, emlak ve araç verileriniz kalıcı olarak silinecektir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-rose-600 text-white hover:bg-rose-700"
                >
                  Evet, Hesabımı Sil
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

/* -------------------------- Membership -------------------------- */

interface AiQuota {
  level: string
  canUseAi: boolean
  usedToday: number
  limit: number
  remaining: number
  isPremium: boolean
}

interface WealthClass {
  label: string
  short: string
  description: string
  color: string
  icon: string
}

interface DashboardResponse {
  kpis: {
    netWorth: number
    wealthClass?: WealthClass
  }
}

interface PlanFeature {
  label: string
  included: boolean
}

const STANDARD_FEATURES: PlanFeature[] = [
  { label: '1 AI sorusu/gün', included: true },
  { label: 'Temel raporlar', included: true },
  { label: 'Tüm finans modülleri', included: true },
  { label: 'Gelişmiş raporlar', included: false },
  { label: 'Finansal sınıf analizi', included: false },
  { label: 'Öncelikli destek', included: false },
]

const PREMIUM_FEATURES: PlanFeature[] = [
  { label: '5 AI sorusu/gün', included: true },
  { label: 'Gelişmiş raporlar', included: true },
  { label: 'Finansal sınıf analizi', included: true },
  { label: 'Öncelikli destek', included: true },
  { label: 'Tüm standart özellikler', included: true },
]

const WEALTH_COLOR_BORDER: Record<string, string> = {
  rose: 'border-rose-500/30 bg-rose-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  sky: 'border-sky-500/30 bg-sky-500/5',
  violet: 'border-violet-500/30 bg-violet-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
}

const WEALTH_ICON_COLOR: Record<string, string> = {
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

function WealthClassIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case 'crown':
      return <Crown className={className} />
    case 'trending-up':
      return <TrendingUp className={className} />
    case 'trending-down':
      return <TrendingDown className={className} />
    case 'check':
      return <Check className={className} />
    case 'minus':
      return <Minus className={className} />
    default:
      return <Minus className={className} />
  }
}

function MembershipTab() {
  const { data: session, update: updateSession } = useSession()
  const qc = useQueryClient()
  const user = session?.user as
    | { id?: string; role?: string; level?: string; name?: string; email?: string }
    | undefined
  const userId = user?.id
  const role = user?.role
  const sessionLevel = user?.level
  const isDemo = role === 'demo'
  const isAdmin = role === 'admin'

  const { data: quota, isLoading: quotaLoading } = useQuery<AiQuota>({
    queryKey: ['ai-quota'],
    queryFn: () => api.get<AiQuota>('/api/lifeos/ai-quota'),
  })

  const { data: dashboard } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/api/lifeos/dashboard'),
  })

  const levelMut = useMutation<unknown, Error, string>({
    mutationFn: (level: string) =>
      api.put(`/api/lifeos/users/${userId}/level`, { level }),
    onSuccess: async (_data, level) => {
      await qc.invalidateQueries({ queryKey: ['ai-quota'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(
        level === 'premium'
          ? 'Premium talebiniz iletildi — Admin onayı bekleniyor'
          : 'Standart üyeliğe geçildi',
      )
      await updateSession({})
      setTimeout(() => window.location.reload(), 500)
    },
    onError: (e: Error) => toast.error(e?.message || 'İşlem başarısız'),
  })

  // Demo & admin → always premium
  const currentLevel: string =
    isDemo || isAdmin ? 'premium' : (quota?.level || sessionLevel || 'standard')
  const isPremium = currentLevel === 'premium'
  const isPendingPremium = currentLevel === 'pending_premium'

  const usedToday = quota?.usedToday ?? 0
  const limit = quota?.limit ?? (isPremium ? 5 : 1)
  const remaining = quota?.remaining ?? Math.max(0, limit - usedToday)
  const usagePercent = limit > 0 ? Math.min(100, (usedToday / limit) * 100) : 0
  const canChangePlan = !isDemo && !isAdmin && !!userId && !isPendingPremium

  const netWorth = dashboard?.kpis?.netWorth ?? 0
  const wealthClass: WealthClass =
    dashboard?.kpis?.wealthClass ?? getWealthClass(netWorth)

  return (
    <div className="space-y-4">
      {/* Pending premium banner */}
      {isPendingPremium && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Premium Onay Bekliyor
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Premium üyelik talebiniz alındı. Yönetici onayladıktan sonra premium özellikleri kullanabilirsiniz.
              Onay sonrası otomatik olarak aktif olacaktır.
            </p>
          </div>
        </div>
      )}

      {/* Current plan summary card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className={isPremium ? 'border-violet-500/40' : ''}>
          <div
            className={`h-1 w-full rounded-t-xl ${
              isPremium
                ? 'bg-gradient-to-r from-violet-500 via-emerald-500 to-violet-500'
                : 'bg-muted-foreground/25'
            }`}
          />
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardDescription>Mevcut Üyeliğiniz</CardDescription>
                <CardTitle className="flex items-center gap-2 text-base">
                  {isPremium ? (
                    <Crown className="h-5 w-5 text-violet-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                  {isPremium ? 'Premium' : 'Standart'}
                  {isPremium && (
                    <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400">
                      PRO
                    </Badge>
                  )}
                </CardTitle>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Üyelik Başlangıcı</p>
                <p className="text-sm font-medium">2025</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Bugün AI kullanımı</p>
                {quotaLoading ? (
                  <Skeleton className="mt-1.5 h-5 w-16" />
                ) : (
                  <p className="mt-0.5 text-lg font-semibold">
                    {usedToday}
                    <span className="text-sm text-muted-foreground">/{limit}</span>
                  </p>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Kalan hak</p>
                {quotaLoading ? (
                  <Skeleton className="mt-1.5 h-5 w-16" />
                ) : (
                  <p className="mt-0.5 text-lg font-semibold">{remaining}</p>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Durum</p>
                {quotaLoading ? (
                  <Skeleton className="mt-1.5 h-5 w-16" />
                ) : (
                  <p className="mt-0.5 text-sm font-semibold">
                    {quota?.canUseAi === false ? (
                      <span className="text-rose-500">Limit doldu</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Aktif
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Bugün: {usedToday}/{limit} hak kullanıldı
                </span>
                <span className="text-muted-foreground">
                  %{Math.round(usagePercent)}
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Demo notice */}
      {isDemo && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Card className="border-violet-500/30 bg-violet-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Demo modu — Premium özellikler aktiftir
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Demo modunda Premium özellikler aktiftir. Çıkış yaptığınızda
                  veriler sıfırlanır. Üyelik değişikliği yapamazsınız.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Wealth class card */}
      <WealthClassCard
        isPremium={isPremium}
        isDemo={isDemo}
        netWorth={netWorth}
        wealthClass={wealthClass}
        canUpgrade={!isPremium && canChangePlan}
        onUpgrade={() => levelMut.mutate('premium')}
        upgrading={levelMut.isPending && levelMut.variables === 'premium'}
      />

      {/* Plan cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <PlanCard
          name="Standart"
          price="Ücretsiz"
          priceNote="her zaman"
          features={STANDARD_FEATURES}
          isCurrent={currentLevel === 'standard'}
          accent="standard"
          canChange={canChangePlan}
          changing={levelMut.isPending}
          onChange={() => levelMut.mutate('standard')}
          actionLabel="Düşür"
          disabledHint={
            isDemo
              ? 'Demo modunda değiştirilemez'
              : isAdmin
                ? 'Yönetici hesabı her zaman Premium'
                : undefined
          }
        />
        <PlanCard
          name="Premium"
          price="₺49"
          priceNote="/ay"
          features={PREMIUM_FEATURES}
          isCurrent={currentLevel === 'premium'}
          accent="premium"
          recommended
          canChange={canChangePlan}
          changing={levelMut.isPending}
          onChange={() => levelMut.mutate('premium')}
          actionLabel="Yükselt"
          disabledHint={
            isDemo
              ? 'Demo modunda değiştirilemez'
              : isAdmin
                ? 'Yönetici hesabı her zaman Premium'
                : undefined
          }
        />
      </div>
    </div>
  )
}

function PlanCard({
  name,
  price,
  priceNote,
  features,
  isCurrent,
  accent,
  recommended,
  canChange,
  changing,
  onChange,
  actionLabel,
  disabledHint,
}: {
  name: string
  price: string
  priceNote: string
  features: PlanFeature[]
  isCurrent: boolean
  accent: 'standard' | 'premium'
  recommended?: boolean
  canChange: boolean
  changing: boolean
  onChange: () => void
  actionLabel: string
  disabledHint?: string
}) {
  const isPremium = accent === 'premium'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
    >
      <Card
        className={`relative h-full transition-shadow ${
          isCurrent
            ? isPremium
              ? 'border-violet-500/60 shadow-lg shadow-violet-500/10'
              : 'border-primary/50'
            : isPremium
              ? 'border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5'
              : 'hover:border-border'
        }`}
      >
        {isPremium && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-emerald-500 to-violet-500" />
        )}
        {recommended && !isCurrent && (
          <div className="absolute right-3 top-3">
            <Badge className="bg-violet-500/15 text-violet-600 dark:text-violet-400">
              <Sparkles className="mr-1 h-3 w-3" />
              ÖNERİLEN
            </Badge>
          </div>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isPremium
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isPremium ? (
                <Crown className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm">{name}</CardTitle>
              <CardDescription className="text-[11px]">
                {isPremium ? 'Gelişmiş özellikler' : 'Temel özellikler'}
              </CardDescription>
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{price}</span>
            <span className="text-xs text-muted-foreground">{priceNote}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <ul className="space-y-1.5">
            {features.map((f) => (
              <li key={f.label} className="flex items-start gap-2 text-xs">
                {f.included ? (
                  <Check
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      isPremium ? 'text-emerald-500' : 'text-primary'
                    }`}
                  />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                )}
                <span
                  className={
                    f.included
                      ? 'text-foreground/90'
                      : 'text-muted-foreground line-through'
                  }
                >
                  {f.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="pt-2">
            {isCurrent ? (
              <Button variant="outline" className="w-full gap-2" disabled>
                <Check className="h-4 w-4" />
                Mevcut Plan
              </Button>
            ) : (
              <Button
                className={`w-full gap-2 ${
                  isPremium
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : ''
                }`}
                variant={isPremium ? 'default' : 'outline'}
                disabled={!canChange || changing}
                onClick={onChange}
              >
                {changing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    İşleniyor…
                  </>
                ) : (
                  <>
                    {isPremium && <Sparkles className="h-4 w-4" />}
                    {actionLabel}
                  </>
                )}
              </Button>
            )}
          </div>
          {!canChange && !isCurrent && disabledHint && (
            <p className="text-center text-xs text-muted-foreground">
              {disabledHint}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function WealthClassCard({
  isPremium,
  isDemo,
  netWorth,
  wealthClass,
  canUpgrade,
  onUpgrade,
  upgrading,
}: {
  isPremium: boolean
  isDemo: boolean
  netWorth: number
  wealthClass: WealthClass
  canUpgrade: boolean
  onUpgrade: () => void
  upgrading: boolean
}) {
  // Premium or demo → show actual wealth class
  if (isPremium || isDemo) {
    const colorBorder =
      WEALTH_COLOR_BORDER[wealthClass.color] || WEALTH_COLOR_BORDER.violet
    const iconColor =
      WEALTH_ICON_COLOR[wealthClass.color] || WEALTH_ICON_COLOR.violet
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Card className={`overflow-hidden ${colorBorder}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-violet-500" />
              Finansal Sınıf Analizi
              <Badge
                variant="secondary"
                className="bg-violet-500/15 text-violet-600 dark:text-violet-400"
              >
                PREMIUM
              </Badge>
            </CardTitle>
            <CardDescription>
              Net servetinize göre finansal sınıfınız
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-xl ${iconColor}`}
              >
                <WealthClassIcon
                  name={wealthClass.icon}
                  className="h-8 w-8"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="text-xl font-bold">{wealthClass.label}</p>
                  <Badge variant="outline" className="text-xs">
                    {formatCompact(netWorth)} net servet
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {wealthClass.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Standard → locked (clean design, no blur)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
    >
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-violet-500" />
            Finansal Sınıf Analizi
          </CardTitle>
          <CardDescription>
            Net servetinize göre finansal sınıfınızı öğrenin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500 ring-1 ring-violet-500/20">
              <Lock className="h-7 w-7" />
            </div>
            <div className="max-w-sm">
              <p className="text-sm font-semibold text-foreground">
                Premium Özellik
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Net servetinize göre finansal sınıfınızı (Alt, Orta, Üst sınıf) görmek için Premium üyeliğe geçin.
              </p>
            </div>
            {canUpgrade && (
              <Button
                className="mt-2 gap-2 bg-violet-600 text-white hover:bg-violet-700"
                onClick={onUpgrade}
                disabled={upgrading}
              >
                {upgrading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Premium&apos;a Geç
                </Button>
              )}
            </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
