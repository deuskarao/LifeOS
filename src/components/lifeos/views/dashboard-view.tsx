'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api-client'
import { formatCurrency, formatCompact } from '@/lib/lifeos'
import { StatCard } from '../stat-card'
import { PageHeader } from '../page-header'
import { ChartCard, CHART_COLORS, CHART_COLOR_ARRAY, chartTooltipStyle, gridStroke } from './chart-card'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNav } from '@/lib/nav-store'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  CreditCard,
  Landmark,
  Shield,
  Home,
  Car,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  AlertCircle,
  PiggyBank,
  Crown,
  Check,
  Minus,
  Lock,
  PieChart as PieChartIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { motion } from 'framer-motion'

interface DashboardData {
  kpis: {
    netWorth: number
    bankTotal: number
    assetTotal: number
    propertyValue: number
    cardDebt: number
    loanDebt: number
    cardLimit: number
    cardUsageRate: number
    monthlyIncome: number
    monthlyExpense: number
    monthlyNet: number
    incomeChange: number
    expenseChange: number
    activeContracts: number
    monthlyRentIncome: number
    vehicleCount: number
    fuelTotal?: number
    serviceTotal?: number
    vehicleTotalCost?: number
    wealthClass?: { label: string; short: string; description: string; color: string; icon: string }
  }
  charts: {
    months: { month: string; income: number; expense: number }[]
    assetByType: { name: string; value: number }[]
    expenseByCategory: { name: string; value: number }[]
  }
  recent: {
    upcomingPayments: { name: string; type: string; amount: number; dueDay: number }[]
    banks: { id: string; bankName: string; accountName: string; balance: number; color: string }[]
    cards: { id: string; bankName: string; cardName: string; balance: number; limit: number; color: string }[]
    loans: { id: string; loanName: string; lender: string; remainingAmount: number; monthlyPayment: number }[]
    assets: { id: string; assetType: string; name: string; totalValue: number }[]
    properties: { id: string; name: string; type: string; currentValue: number; status: string }[]
  }
}

export function DashboardView() {
  const { set } = useNav()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as 'admin' | 'demo' | 'user' | undefined
  const level = (session?.user as any)?.level as 'standard' | 'premium' | 'pending_premium' | undefined
  const isPremiumOrDemo = role === 'admin' || role === 'demo' || level === 'premium'
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/api/lifeos/dashboard'),
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gösterge Paneli" description="Tüm finansal yaşamınız tek bakışta" icon={Wallet} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  const k = data.kpis
  const today = new Date().getDate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gösterge Paneli"
        description={`Hoş geldin Ahmet — ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        icon={Wallet}
        actions={
          <Button onClick={() => set('ai-insights')} className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Analizi
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Değer"
          value={formatCurrency(k.netWorth)}
          icon={Wallet}
          accent="emerald"
          change={k.incomeChange}
          changeLabel="bu ay gelir"
        />
        <StatCard
          title="Aylık Gelir"
          value={formatCurrency(k.monthlyIncome)}
          icon={TrendingUp}
          accent="sky"
          change={k.incomeChange}
          changeLabel="geçen aya göre"
        />
        <StatCard
          title="Aylık Gider"
          value={formatCurrency(k.monthlyExpense)}
          icon={TrendingDown}
          accent="rose"
          change={k.expenseChange}
          changeLabel="geçen aya göre"
        />
        <StatCard
          title="Aylık Net"
          value={formatCurrency(k.monthlyNet)}
          icon={PiggyBank}
          accent="violet"
          subtitle={`Tasarruf oranı: ${k.monthlyIncome > 0 ? ((k.monthlyNet / k.monthlyIncome) * 100).toFixed(1) : 0}%`}
        />
      </div>

      {/* Asset breakdown row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={Building2} label="Banka Nakit" value={k.bankTotal} color="emerald" onClick={() => set('bank-accounts')} />
        <MiniStat icon={Shield} label="Yatırım Varlıkları" value={k.assetTotal} color="amber" onClick={() => set('assets')} />
        <MiniStat icon={Home} label="Emlak Değeri" value={k.propertyValue} color="violet" onClick={() => set('rental')} />
        <MiniStat icon={CreditCard} label="Toplam Borç" value={k.cardDebt + k.loanDebt} color="rose" onClick={() => set('credit-cards')} />
      </div>

      {/* Wealth class banner — sadece premium/demo/admin */}
      {k.wealthClass && isPremiumOrDemo && <WealthClassBanner wealthClass={k.wealthClass} netWorth={k.netWorth} />}
      {/* Standart kullanıcı için kilitli banner */}
      {k.wealthClass && !isPremiumOrDemo && (
        <LockedWealthClassBanner netWorth={k.netWorth} />
      )}

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Income vs Expense trend */}
        <ChartCard
          title="Gelir & Gider Trendi"
          description="Son 6 ay"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.charts.months} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.rose} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS.rose} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 240)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Area type="monotone" dataKey="income" name="Gelir" stroke={CHART_COLORS.emerald} strokeWidth={2} fill="url(#incGrad)" />
              <Area type="monotone" dataKey="expense" name="Gider" stroke={CHART_COLORS.rose} strokeWidth={2} fill="url(#expGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Asset allocation */}
        <ChartCard title="Varlık Dağılımı" description="Yatırım portföyü" icon={Shield}>
          {data.charts.assetByType.length === 0 || data.charts.assetByType.every((d) => d.value === 0) ? (
            <EmptyChart height={280} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.charts.assetByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {data.charts.assetByType.map((_, i) => (
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
                {data.charts.assetByType.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length] }} />
                    <span className="text-muted-foreground">{a.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 + sidebar */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Expense by category */}
        <ChartCard
          title="Gider Kategorileri"
          description="Bu ay"
          icon={TrendingDown}
          className="lg:col-span-2"
        >
          {data.charts.expenseByCategory.length === 0 || data.charts.expenseByCategory.every((d) => d.value === 0) ? (
            <EmptyChart height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.charts.expenseByCategory} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 240)' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 240)' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v: number) => formatCurrency(v)}
                  cursor={{ fill: 'oklch(0.5 0.01 240 / 0.08)' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {data.charts.expenseByCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Upcoming payments */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Yaklaşan Ödemeler</h3>
            </div>
            <div className="space-y-3">
              {data.recent.upcomingPayments.length === 0 && (
                <p className="text-xs text-muted-foreground">Yaklaşan ödeme yok.</p>
              )}
              {data.recent.upcomingPayments.map((p, i) => {
                const isOverdue = p.dueDay < today
                const isSoon = !isOverdue && p.dueDay - today <= 5
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-lg border bg-card/50 p-2.5"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isOverdue ? 'bg-rose-500/10 text-rose-500' : isSoon ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.type} • Ayın {p.dueDay}. günü
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(p.amount)}</p>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick lists */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Banks */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Banka Hesapları
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => set('bank-accounts')}>
                Tümü <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {data.recent.banks.map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.bankName}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.accountName}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(b.balance)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cards usage */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Kart Kullanımı
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => set('credit-cards')}>
                Tümü <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-3">
              {data.recent.cards.map((c) => {
                const usage = c.limit > 0 ? (c.balance / c.limit) * 100 : 0
                return (
                  <div key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium">{c.cardName}</span>
                      <span className="text-muted-foreground">{usage.toFixed(0)}%</span>
                    </div>
                    <Progress value={usage} className="h-1.5" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Loans */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                Aktif Krediler
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => set('loans')}>
                Tümü <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {data.recent.loans.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.loanName}</p>
                    <p className="text-xs text-muted-foreground">{l.lender}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCompact(l.remainingAmount)}</p>
                    <p className="text-xs text-muted-foreground">/{formatCurrency(l.monthlyPayment)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real estate + vehicle summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Home className="h-4 w-4 text-muted-foreground" />
                Emlak Portföyü
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => set('rental')}>
                Detaylar <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Mülk Sayısı</p>
                <p className="mt-1 text-xl font-bold">{data.recent.properties.length}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Aktif Kira</p>
                <p className="mt-1 text-xl font-bold">{k.activeContracts}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Aylık Kira</p>
                <p className="mt-1 text-xl font-bold">{formatCompact(k.monthlyRentIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Car className="h-4 w-4 text-muted-foreground" />
                Araç Filosu
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => set('vehicles')}>
                Detaylar <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Araç Sayısı</p>
                <p className="mt-1 text-xl font-bold">{k.vehicleCount}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Yakıt (Yıl)</p>
                <p className="mt-1 text-xl font-bold text-amber-500">{formatCompact(k.fuelTotal || 0)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Servis (Yıl)</p>
                <p className="mt-1 text-xl font-bold text-sky-500">{formatCompact(k.serviceTotal || 0)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Toplam Maliyet</p>
                <p className="mt-1 text-xl font-bold">{formatCompact(k.vehicleTotalCost || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: typeof Building2
  label: string
  value: number
  color: 'emerald' | 'violet' | 'amber' | 'rose' | 'sky'
  onClick?: () => void
}) {
  const colors = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    violet: 'text-violet-500 bg-violet-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    rose: 'text-rose-500 bg-rose-500/10',
    sky: 'text-sky-500 bg-sky-500/10',
  }
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary/40"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-base font-bold">{formatCurrency(value)}</p>
      </div>
    </button>
  )
}

function WealthClassBanner({
  wealthClass,
  netWorth,
}: {
  wealthClass: { label: string; short: string; description: string; color: string; icon: string }
  netWorth: number
}) {
  const colorMap: Record<string, { bg: string; text: string; ring: string; gradient: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/30', gradient: 'from-emerald-500/20 to-emerald-500/5' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/30', gradient: 'from-violet-500/20 to-violet-500/5' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/30', gradient: 'from-sky-500/20 to-sky-500/5' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/30', gradient: 'from-amber-500/20 to-amber-500/5' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500/30', gradient: 'from-rose-500/20 to-rose-500/5' },
  }
  const c = colorMap[wealthClass.color] || colorMap.sky

  const icons: Record<string, typeof Crown> = {
    crown: Crown,
    'trending-up': TrendingUp,
    'trending-down': TrendingDown,
    check: Check,
    minus: Minus,
  }
  const Icon = icons[wealthClass.icon] || Crown

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-r ${c.gradient} p-5`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.text} ring-1 ${c.ring}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finansal Sınıfınız</p>
            <span className={`text-sm font-bold ${c.text}`}>{wealthClass.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{wealthClass.description}</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[10px] uppercase text-muted-foreground">Net Servet</p>
          <p className="text-lg font-bold">{formatCurrency(netWorth)}</p>
        </div>
      </div>
    </motion.div>
  )
}

function LockedWealthClassBanner({ netWorth }: { netWorth: number }) {
  const { set } = useNav()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-violet-500/5 p-5"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/30">
          <Lock className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finansal Sınıfınız</p>
          <p className="mt-0.5 text-sm font-semibold">Premium özellik</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Net servetinize göre finansal sınıfınızı görmek için Premium'a geçin
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => set('settings')} className="shrink-0 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Premium'a Geç
        </Button>
      </div>
    </motion.div>
  )
}

/** Empty chart placeholder shown when chart data is missing or all zeros. */
function EmptyChart({ height = 280 }: { height?: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 text-muted-foreground"
      style={{ height }}
    >
      <PieChartIcon className="h-12 w-12 opacity-30" />
      <p className="text-sm font-medium">Veri yok</p>
      <p className="text-xs">Bu dönem için kayıt bulunamadı</p>
    </div>
  )
}
