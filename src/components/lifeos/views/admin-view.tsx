'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api-client'
import { PageHeader } from '../page-header'
import { StatCard } from '../stat-card'
import { EmptyState } from '../empty-state'
import { ConfirmDialog } from '../confirm-dialog'
import { FormDialog } from '../form-dialog'
import { ChartCard, CHART_COLOR_ARRAY, chartTooltipStyle, gridStroke } from './chart-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { formatCurrency, formatCompact, formatDate } from '@/lib/lifeos'
import {
  ShieldCheck,
  Users,
  User,
  Database,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  RotateCcw,
  Crown,
  Sparkles,
  Clock,
} from 'lucide-react'

// ===== Types =====
interface AdminUserStats {
  bankCount: number
  cardCount: number
  loanCount: number
  assetCount: number
  incomeCount: number
  expenseCount: number
  propertyCount: number
  vehicleCount: number
  totalRecords: number
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  level: string
  aiQuestionsUsed: number
  aiQuestionsResetAt: string | null
  createdAt: string
  updatedAt: string
  stats: AdminUserStats
}

interface AdminData {
  users: {
    id: string
    email: string
    name: string
    role: string
    createdAt: string
    stats: {
      netWorth: number
      bankTotal: number
      assetTotal: number
      propertyTotal: number
      loanDebt: number
      cardDebt: number
      incomeCount: number
      expenseCount: number
      vehicleCount: number
      propertyCount: number
    }
  }[]
  systemStats: {
    totalUsers: number
    totalNetWorth: number
    totalBankBalance: number
    totalAssets: number
    totalDebt: number
    totalIncome: number
    totalExpense: number
    totalRecords: number
    recentActivity: {
      recordsLast7Days: number
      income: number
      expense: number
      bank: number
      asset: number
    }
    resourceCounts: {
      banks: number
      cards: number
      loans: number
      assets: number
      incomes: number
      expenses: number
      properties: number
      vehicles: number
      fuel: number
      services: number
    }
  }
}

// ===== Constants =====
const ROLE_BADGE_CLASS: Record<string, string> = {
  admin: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  demo: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20',
  user: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20',
}

const ROLE_LABEL: Record<string, string> = { admin: 'ADMIN', demo: 'DEMO', user: 'USER' }

const LEVEL_BADGE_CLASS: Record<string, string> = {
  premium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  standard: 'bg-muted text-muted-foreground border-border',
}

const LEVEL_LABEL: Record<string, string> = { premium: 'PREMIUM', standard: 'STANDART' }

/** AI günlük soru limitleri (backend ai-insights/route.ts ile uyumlu). */
const AI_LIMIT: Record<string, number> = { premium: 5, standard: 1 }

const RESOURCE_LABELS: Record<string, string> = {
  banks: 'Banka',
  cards: 'Kart',
  loans: 'Kredi',
  assets: 'Varlık',
  incomes: 'Gelir',
  expenses: 'Gider',
  properties: 'Mülk',
  vehicles: 'Araç',
  fuel: 'Yakıt',
  services: 'Servis',
}

// ===== Helpers =====
function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

/** Backend'in 24 saatlik reset kuralını istemci tarafında uygular. */
function getEffectiveAiUsed(u: AdminUser): number {
  if (!u.aiQuestionsResetAt) return 0
  const resetAt = new Date(u.aiQuestionsResetAt)
  const hoursSinceReset = (Date.now() - resetAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceReset >= 24) return 0
  return u.aiQuestionsUsed || 0
}

// ===== Main Component =====
export function AdminView() {
  const { data: session } = useSession()
  const currentUserId = (session?.user as { id?: string } | undefined)?.id

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Panel"
        description="Sistem yönetimi, kullanıcı yönetimi ve genel istatistikler"
        icon={ShieldCheck}
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Database className="h-3 w-3" />
            Supabase
          </Badge>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Genel Bakış
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Kullanıcılar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===== Overview Tab =====
function OverviewTab() {
  const { data, isLoading } = useQuery<AdminData>({
    queryKey: ['admin'],
    queryFn: () => api.get<AdminData>('/api/lifeos/admin'),
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-24" />
      </div>
    )
  }

  const s = data.systemStats
  const resourceData = Object.entries(s.resourceCounts).map(([name, value]) => ({
    name: RESOURCE_LABELS[name] || name,
    value,
  }))
  const adminCount = data.users.filter((u) => u.role === 'admin').length
  const demoCount = data.users.filter((u) => u.role === 'demo').length
  const userCount = data.users.filter((u) => u.role === 'user').length
  const premiumCount = data.users.filter((u) => u.level === 'premium').length
  const standardCount = data.users.filter((u) => u.level === 'standard').length
  const pendingCount = data.users.filter((u) => u.level === 'pending_premium').length

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Kullanıcı"
          value={String(s.totalUsers)}
          icon={Users}
          accent="emerald"
          subtitle={`${adminCount} admin, ${demoCount} demo, ${userCount} user`}
        />
        <StatCard
          title="Premium Kullanıcılar"
          value={String(premiumCount)}
          icon={Crown}
          accent="violet"
          subtitle="Aktif premium üyeler"
        />
        <StatCard
          title="Standart Kullanıcılar"
          value={String(standardCount)}
          icon={User}
          accent="sky"
          subtitle="Standart üyeler"
        />
        <StatCard
          title="Toplam Kayıt"
          value={s.totalRecords.toLocaleString('tr-TR')}
          icon={Database}
          accent="amber"
          subtitle={`${s.recentActivity.recordsLast7Days} son 7 gün`}
        />
      </div>

      {/* Pending premium talepleri — varsa uyarı */}
      {pendingCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {pendingCount} premium talebi onay bekliyor
              </p>
              <p className="text-xs text-muted-foreground">
                Kullanıcılar sekmesinden onaylayabilirsiniz.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart + Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Kaynak Dağılımı" description="DB'deki toplam kayıt sayıları" icon={Database}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={resourceData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }}
                axisLine={false}
                tickLine={false}
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
                cursor={{ fill: 'oklch(0.5 0.01 240 / 0.08)' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {resourceData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Son 7 Gün Aktivite
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ActivityCard
                label="Yeni Kayıt"
                value={s.recentActivity.recordsLast7Days}
                icon={Database}
                color="emerald"
              />
              <ActivityCard
                label="Gelir Kaydı"
                value={s.recentActivity.income}
                icon={TrendingUp}
                color="sky"
              />
              <ActivityCard
                label="Gider Kaydı"
                value={s.recentActivity.expense}
                icon={TrendingDown}
                color="rose"
              />
              <ActivityCard
                label="Banka Hesabı"
                value={s.recentActivity.bank}
                icon={Building2}
                color="violet"
              />
            </div>
            <div className="mt-4 rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Demo Modu:</span> Demo
                kullanıcılarının verileri DB&apos;ye yazılmaz, server-side memory&apos;de tutulur ve
                çıkışta otomatik sıfırlanır.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sistem Durumu</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Veritabanı:{' '}
                <span className="font-medium text-foreground">
                  Supabase PostgreSQL
                </span>{' '}
                (aws-1-ap-southeast-2). Tüm admin ve user verileri kalıcı olarak DB&apos;de
                saklanır. Demo kullanıcıları için veriler server-side memory&apos;de tutulur —
                DB&apos;ye yazılmaz, çıkışta sıfırlanır. Toplam{' '}
                {s.totalRecords.toLocaleString('tr-TR')} kayıt aktif.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ===== Users Tab =====
function UsersTab({ currentUserId }: { currentUserId?: string }) {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.get<AdminUser[]>('/api/lifeos/admin/users'),
  })

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<Partial<AdminUser & { password?: string }>>({})
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-users'] })
    qc.invalidateQueries({ queryKey: ['admin'] })
  }

  // Create
  const createMut = useMutation({
    mutationFn: (data: Partial<AdminUser & { password?: string }>) =>
      api.post('/api/lifeos/admin/users', data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Kullanıcı eklendi')
      setOpen(false)
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Kullanıcı eklenemedi'),
  })

  // Update
  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<AdminUser & { password?: string }>
    }) => api.put(`/api/lifeos/admin/users/${id}`, data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Kullanıcı güncellendi')
      setOpen(false)
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Kullanıcı güncellenemedi'),
  })

  // Delete
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/lifeos/admin/users/${id}`),
    onSuccess: () => {
      invalidateAll()
      toast.success('Kullanıcı silindi')
      setDeleteTarget(null)
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Kullanıcı silinemedi'),
  })

  // Level change (standard <-> premium)
  const levelMut = useMutation({
    mutationFn: ({ id, level }: { id: string; level: 'premium' | 'standard' }) =>
      api.put(`/api/lifeos/users/${id}/level`, { level }),
    onSuccess: () => {
      invalidateAll()
      toast.success('Kullanıcı seviyesi güncellendi')
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Seviye güncellenemedi'),
  })

  // AI quota reset
  const resetQuotaMut = useMutation({
    mutationFn: (id: string) =>
      api.put(`/api/lifeos/users/${id}/level?action=reset-quota`, {}),
    onSuccess: () => {
      invalidateAll()
      toast.success('AI hakları sıfırlandı')
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'AI hakları sıfırlanamadı'),
  })

  function openCreate() {
    setEditing(null)
    setForm({ role: 'user', level: 'standard', name: '', email: '', password: '' })
    setOpen(true)
  }

  function openEdit(u: AdminUser) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, role: u.role, level: u.level, password: '' })
    setOpen(true)
  }

  function onSubmit() {
    const name = form.name?.trim()
    const email = form.email?.toLowerCase().trim()
    const password = form.password
    if (!name || !email) {
      toast.error('Ad ve email zorunludur')
      return
    }
    if (!editing) {
      if (!password || password.length < 6) {
        toast.error('Şifre en az 6 karakter olmalıdır')
        return
      }
      createMut.mutate({
        name,
        email,
        password,
        role: form.role || 'user',
        level: form.level || 'standard',
      })
    } else {
      const payload: Partial<AdminUser & { password?: string }> = {
        name,
        email,
        role: form.role,
        level: form.level,
      }
      if (password && password.length > 0) {
        if (password.length < 6) {
          toast.error('Şifre en az 6 karakter olmalıdır')
          return
        }
        payload.password = password
      }
      updateMut.mutate({ id: editing.id, data: payload })
    }
  }

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-muted-foreground">
            {users ? `${users.length} kullanıcı` : 'Yükleniyor…'}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Kullanıcı Ekle
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !users || users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Kullanıcı bulunamadı"
          description="Sistemde kayıtlı kullanıcı yok. Yeni bir kullanıcı ekleyin."
          action={
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Kullanıcı Ekle
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[220px]">Kullanıcı</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="min-w-[170px]">Seviye</TableHead>
                  <TableHead className="min-w-[120px]">AI Kullanım</TableHead>
                  <TableHead className="text-right">Kayıt Sayısı</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">Aksiyonlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u, i) => {
                  const isSelf = u.id === currentUserId
                  const isDemo = u.role === 'demo'
                  const limit = AI_LIMIT[u.level] || 1
                  const used = getEffectiveAiUsed(u)
                  const pct = isDemo ? 0 : Math.min(100, (used / limit) * 100)
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      {/* Kullanıcı */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate max-w-[180px]">
                                {u.name}
                              </p>
                              {isSelf && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 px-1 bg-primary/5 text-primary border-primary/20"
                                >
                                  SİZ
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Rol */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${ROLE_BADGE_CLASS[u.role] || ''}`}
                        >
                          {ROLE_LABEL[u.role] || u.role.toUpperCase()}
                        </Badge>
                      </TableCell>

                      {/* Seviye + toggle */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${LEVEL_BADGE_CLASS[u.level] || ''}`}
                          >
                            {u.level === 'premium' && <Crown className="h-2.5 w-2.5" />}
                            {LEVEL_LABEL[u.level] || u.level.toUpperCase()}
                          </Badge>
                          <Switch
                            checked={u.level === 'premium'}
                            disabled={isDemo || levelMut.isPending}
                            onCheckedChange={(checked) =>
                              levelMut.mutate({
                                id: u.id,
                                level: checked ? 'premium' : 'standard',
                              })
                            }
                            aria-label="Seviye değiştir"
                          />
                        </div>
                      </TableCell>

                      {/* AI Kullanım */}
                      <TableCell>
                        {isDemo ? (
                          <span className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400">
                            <Sparkles className="h-3 w-3" />
                            Sınırsız
                          </span>
                        ) : (
                          <div className="w-[88px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium tabular-nums">
                                {used}/{limit}
                              </span>
                              {used >= limit && (
                                <span className="text-[10px] text-rose-500 font-medium">
                                  doldu
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pct >= 100
                                    ? 'bg-rose-500'
                                    : pct >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* Kayıt Sayısı */}
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold tabular-nums">
                          {u.stats.totalRecords.toLocaleString('tr-TR')}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {u.stats.bankCount}b {u.stats.cardCount}k {u.stats.assetCount}v
                        </p>
                      </TableCell>

                      {/* Kayıt Tarihi */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </TableCell>

                      {/* Aksiyonlar */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Aksiyonlar</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Düzenle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={isDemo || resetQuotaMut.isPending}
                              onClick={() => resetQuotaMut.mutate(u.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              AI Haklarını Sıfırla
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={isSelf}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog (Create / Edit) */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
        description={
          editing
            ? `${editing.name} kullanıcısını düzenleyin`
            : 'Sisteme yeni bir kullanıcı ekleyin'
        }
        icon={editing ? Pencil : Plus}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Ad Soyad</Label>
            <Input
              id="u-name"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ahmet Yılmaz"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ahmet@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-password">
              Şifre{' '}
              {editing && (
                <span className="text-xs text-muted-foreground font-normal">
                  (boş bırakılırsa değişmez)
                </span>
              )}
            </Label>
            <Input
              id="u-password"
              type="password"
              value={form.password || ''}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? '••••••' : 'En az 6 karakter'}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select
                value={form.role || 'user'}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Yönetici</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Seviye</Label>
              <Select
                value={form.level || 'standard'}
                onValueChange={(v) => setForm({ ...form, level: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seviye seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standart</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              İptal
            </Button>
            <Button onClick={onSubmit} disabled={saving}>
              {saving
                ? 'Kaydediliyor…'
                : editing
                  ? 'Güncelle'
                  : 'Oluştur'}
            </Button>
          </div>
        </div>
      </FormDialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Kullanıcıyı Sil"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" kullanıcısını ve tüm verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : ''
        }
        confirmText="Sil"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  )
}

// ===== Sub Components =====
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Building2
  label: string
  value: number
  color: 'emerald' | 'violet' | 'amber' | 'rose' | 'sky'
}) {
  const colors = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    sky: 'text-sky-500 bg-sky-500/10',
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-bold">{formatCurrency(value)}</p>
      </div>
    </div>
  )
}

function ActivityCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: typeof Activity
  color: 'emerald' | 'sky' | 'rose' | 'violet'
}) {
  const colors = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    sky: 'text-sky-500 bg-sky-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
  }
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div
        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${colors[color]}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
