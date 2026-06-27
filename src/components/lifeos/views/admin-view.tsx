'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { PageHeader } from '../page-header'
import { StatCard } from '../stat-card'
import { ChartCard, CHART_COLOR_ARRAY, chartTooltipStyle } from './chart-card'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ShieldCheck,
  Users,
  Database,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  Car,
  CreditCard,
  Landmark,
} from 'lucide-react'
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
import { motion } from 'framer-motion'

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

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  demo: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  user: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  demo: 'Demo',
  user: 'Kullanıcı',
}

export function AdminView() {
  const { data, isLoading } = useQuery<AdminData>({
    queryKey: ['admin'],
    queryFn: () => api.get<AdminData>('/api/lifeos/admin'),
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin Panel" description="Sistem yönetimi ve kullanıcı istatistikleri" icon={ShieldCheck} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const s = data.systemStats
  const resourceData = Object.entries(s.resourceCounts).map(([name, value]) => ({
    name: RESOURCE_LABELS[name] || name,
    value,
  }))

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

      {/* Sistem İstatistikleri */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Kullanıcı"
          value={String(s.totalUsers)}
          icon={Users}
          accent="emerald"
          subtitle={`${data.users.filter((u) => u.role === 'admin').length} admin, ${data.users.filter((u) => u.role === 'demo').length} demo, ${data.users.filter((u) => u.role === 'user').length} user`}
        />
        <StatCard
          title="Toplam Net Değer"
          value={formatCurrency(s.totalNetWorth)}
          icon={Wallet}
          accent="violet"
          subtitle="Tüm kullanıcılar"
        />
        <StatCard
          title="Toplam Kayıt"
          value={s.totalRecords.toLocaleString('tr-TR')}
          icon={Database}
          accent="sky"
          subtitle={`${s.recentActivity.recordsLast7Days} son 7 gün`}
        />
        <StatCard
          title="Toplam Borç"
          value={formatCurrency(s.totalDebt)}
          icon={TrendingDown}
          accent="rose"
          subtitle="Kredi + Kart"
        />
      </div>

      {/* Finansal Özet */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Building2} label="Banka Nakit" value={s.totalBankBalance} color="emerald" />
        <MiniStat icon={ShieldCheck} label="Yatırımlar" value={s.totalAssets} color="amber" />
        <MiniStat icon={TrendingUp} label="Toplam Gelir" value={s.totalIncome} color="sky" />
        <MiniStat icon={TrendingDown} label="Toplam Gider" value={s.totalExpense} color="rose" />
      </div>

      {/* Kaynak Dağılımı + Son Aktivite */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Kaynak Dağılımı" description="DB'deki toplam kayıt sayıları" icon={Database}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={resourceData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0.01 240 / 0.15)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 240)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'oklch(0.5 0.01 240 / 0.08)' }} />
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
              <ActivityCard label="Yeni Kayıt" value={s.recentActivity.recordsLast7Days} icon={Database} color="emerald" />
              <ActivityCard label="Gelir Kaydı" value={s.recentActivity.income} icon={TrendingUp} color="sky" />
              <ActivityCard label="Gider Kaydı" value={s.recentActivity.expense} icon={TrendingDown} color="rose" />
              <ActivityCard label="Banka Hesabı" value={s.recentActivity.bank} icon={Building2} color="violet" />
            </div>
            <div className="mt-4 rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Demo Modu:</span> Demo kullanıcılarının verileri
                DB'ye yazılmaz, server-side memory'de tutulur ve çıkışta otomatik sıfırlanır.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kullanıcı Listesi */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              Kullanıcılar ({data.users.length})
            </h3>
          </div>
          <div className="space-y-2">
            {data.users.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 rounded-lg border bg-card/50 p-4 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{u.name}</p>
                    <Badge className={`text-[10px] h-5 ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Kayıt: {formatDate(u.createdAt)}
                  </p>
                </div>

                {/* Kullanıcı istatistikleri */}
                <div className="hidden md:grid grid-cols-4 gap-4 text-right">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Net Değer</p>
                    <p className="text-sm font-semibold">{formatCompact(u.stats.netWorth)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Kayıtlar</p>
                    <p className="text-sm font-semibold">{u.stats.incomeCount + u.stats.expenseCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Mülk</p>
                    <p className="text-sm font-semibold">{u.stats.propertyCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Araç</p>
                    <p className="text-sm font-semibold">{u.stats.vehicleCount}</p>
                  </div>
                </div>

                {u.role === 'demo' && (
                  <Badge variant="outline" className="text-[10px]">
                    Memory
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bilgi Kartı */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Sistem Durumu</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Veritabanı: <span className="font-medium text-foreground">Supabase PostgreSQL</span> (aws-1-ap-southeast-2).
                Tüm admin ve user verileri kalıcı olarak DB'de saklanır. Demo kullanıcıları
                için veriler server-side memory'de tutulur — DB'ye yazılmaz, çıkışta sıfırlanır.
                Toplam {s.totalRecords.toLocaleString('tr-TR')} kayıt aktif.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}>
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
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${colors[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
