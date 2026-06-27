'use client'

import { useSyncExternalStore, useState } from 'react'
import { useTheme } from 'next-themes'
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
import { CURRENCIES, type CurrencyCode } from '@/lib/lifeos'
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
        <TabsContent value="data" className="mt-0">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* -------------------------- Profile -------------------------- */

function ProfileTab() {
  const [name, setName] = useState('Ahmet Yılmaz')
  const [phone, setPhone] = useState('+90 532 000 00 00')
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast.success('Profil bilgileriniz kaydedildi', {
        description: 'Değişiklikler hesabınıza uygulandı.',
      })
    }, 600)
  }

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
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              AY
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-sm font-medium">Profil Fotoğrafı</p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG • Maks 2MB
            </p>
            <Button variant="outline" size="sm" className="mt-1" disabled>
              Yükle
            </Button>
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
                value="ahmet@lifeos.app"
                disabled
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">E-posta değiştirilemez</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Telefon</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-plan">Üyelik Planı</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border bg-muted/30 px-3">
              <Badge variant="secondary" className="bg-violet-500/15 text-violet-600 dark:text-violet-400">
                Pro
              </Badge>
              <span className="text-sm text-muted-foreground">Yıllık • 2025-12-31</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => {
            setName('Ahmet Yılmaz')
            setPhone('+90 532 000 00 00')
            toast.info('Değişiklikler geri alındı')
          }}>
            Sıfırla
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
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
