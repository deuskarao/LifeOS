'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { formatCurrency, formatCompact, formatDate } from '@/lib/lifeos'
import { StatCard } from '../stat-card'
import { PageHeader } from '../page-header'
import { ChartCard, CHART_COLORS, CHART_COLOR_ARRAY, chartTooltipStyle, gridStroke } from './chart-card'
import { toast } from 'sonner'
import {
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Percent,
  History,
  Wallet,
  Building2,
  Car,
  Fuel,
  Wrench,
  Shield,
  CreditCard,
  Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { motion } from 'framer-motion'

interface ReportsData {
  summary: {
    thisYearIncome: number
    lastYearIncome: number
    thisYearExpense: number
    lastYearExpense: number
    yearSavings: number
    savingsRate: number
    netWorth: number
    bankTotal: number
    assetTotal: number
    propertyTotal: number
    loanDebt: number
    cardDebt: number
    fuelTotal: number
    serviceTotal: number
    vehicleTotalCost: number
  }
  charts: {
    monthlyTrend: { month: string; income: number; expense: number; net: number }[]
    incomeByCategory: { name: string; value: number }[]
    expenseByCategory: { name: string; value: number }[]
    fuelByVehicle: { name: string; value: number }[]
    netWorthBreakdown: { name: string; value: number }[]
  }
  propertyStats: {
    id: string
    name: string
    type: string
    currentValue: number
    purchasePrice: number
    monthlyRent: number
    annualRent: number
    yieldRate: number
    appreciation: number
    status: string
  }[]
}

// Color per net worth bar
const NET_WORTH_COLORS: Record<string, string> = {
  'Banka': CHART_COLORS.emerald,
  'Varlıklar': CHART_COLORS.amber,
  'Emlak': CHART_COLORS.violet,
  'Kredi Borcu': CHART_COLORS.rose,
  'Kart Borcu': CHART_COLORS.pink,
}

const PROPERTY_STATUS_COLORS: Record<string, string> = {
  'Kiralı': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-transparent',
  'Boş': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-transparent',
  'Satılık': 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-transparent',
}

function exportCsv(data: ReportsData) {
  const rows: string[][] = []
  const today = new Date().toLocaleDateString('tr-TR')

  rows.push(['LifeOS Yillik Rapor', today])
  rows.push([])
  rows.push(['OZET'])
  rows.push(['Bu Yil Gelir', String(data.summary.thisYearIncome)])
  rows.push(['Bu Yil Gider', String(data.summary.thisYearExpense)])
  rows.push(['Yillik Tasarruf', String(data.summary.yearSavings)])
  rows.push(['Tasarruf Orani %', data.summary.savingsRate.toFixed(2)])
  rows.push(['Gecen Yil Gelir', String(data.summary.lastYearIncome)])
  rows.push(['Gecen Yil Gider', String(data.summary.lastYearExpense)])
  rows.push(['Net Deger', String(data.summary.netWorth)])
  rows.push(['Banka Toplam', String(data.summary.bankTotal)])
  rows.push(['Varlik Toplam', String(data.summary.assetTotal)])
  rows.push(['Emlak Toplam', String(data.summary.propertyTotal)])
  rows.push(['Kredi Borcu', String(data.summary.loanDebt)])
  rows.push(['Kart Borcu', String(data.summary.cardDebt)])
  rows.push(['Yakit Toplam', String(data.summary.fuelTotal)])
  rows.push(['Servis Toplam', String(data.summary.serviceTotal)])
  rows.push(['Arac Toplam Maliyet', String(data.summary.vehicleTotalCost)])
  rows.push([])

  rows.push(['AYLIK TREND'])
  rows.push(['Ay', 'Gelir', 'Gider', 'Net'])
  data.charts.monthlyTrend.forEach((m) =>
    rows.push([m.month, String(m.income), String(m.expense), String(m.net)])
  )
  rows.push([])

  rows.push(['GELIR KATEGORILERI'])
  rows.push(['Kategori', 'Tutar'])
  data.charts.incomeByCategory.forEach((c) => rows.push([c.name, String(c.value)]))
  rows.push([])

  rows.push(['GIDER KATEGORILERI'])
  rows.push(['Kategori', 'Tutar'])
  data.charts.expenseByCategory.forEach((c) => rows.push([c.name, String(c.value)]))
  rows.push([])

  rows.push(['ARAC YAKIT MALIYETI'])
  rows.push(['Arac', 'Tutar'])
  data.charts.fuelByVehicle.forEach((c) => rows.push([c.name, String(c.value)]))
  rows.push([])

  rows.push(['EMLAK PERFORMANSI'])
  rows.push([
    'Ad',
    'Tip',
    'Guncel Deger',
    'Alis Fiyati',
    'Aylik Kira',
    'Yillik Kira',
    'Getiri %',
    'Deger Artisi %',
    'Durum',
  ])
  data.propertyStats.forEach((p) =>
    rows.push([
      p.name,
      p.type,
      String(p.currentValue),
      String(p.purchasePrice),
      String(p.monthlyRent),
      String(p.annualRent),
      p.yieldRate.toFixed(2),
      p.appreciation.toFixed(2),
      p.status,
    ])
  )

  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const c = String(cell ?? '')
          if (c.includes(',') || c.includes('"') || c.includes('\n')) {
            return `"${c.replace(/"/g, '""')}"`
          }
          return c
        })
        .join(',')
    )
    .join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lifeos-rapor-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success('Excel CSV dosyasi indirildi')
}

export function ReportsView() {
  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ['reports'],
    queryFn: () => api.get<ReportsData>('/api/lifeos/reports'),
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Raporlar"
          description="Yillik finansal ozet ve performans analizi"
          icon={FileText}
        />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const s = data.summary
  const c = data.charts

  // Year-over-year change (net)
  const thisYearNet = s.thisYearIncome - s.thisYearExpense
  const lastYearNet = s.lastYearIncome - s.lastYearExpense
  const changeVsLastYear =
    lastYearNet !== 0 ? ((thisYearNet - lastYearNet) / Math.abs(lastYearNet)) * 100 : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="Yıllık finansal özet, kategori analizi ve varlık performansı"
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => exportCsv(data)}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel'e Aktar
            </Button>
            <Button onClick={() => window.print()} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF İndir
            </Button>
          </div>
        }
      />

      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Bu Yıl Gelir"
          value={formatCurrency(s.thisYearIncome)}
          icon={TrendingUp}
          accent="emerald"
        />
        <StatCard
          title="Bu Yıl Gider"
          value={formatCurrency(s.thisYearExpense)}
          icon={TrendingDown}
          accent="rose"
        />
        <StatCard
          title="Yıllık Tasarruf"
          value={formatCurrency(s.yearSavings)}
          icon={PiggyBank}
          accent="violet"
        />
        <StatCard
          title="Tasarruf Oranı"
          value={`%${s.savingsRate.toFixed(1)}`}
          icon={Percent}
          accent="amber"
          subtitle={s.savingsRate >= 20 ? 'Hedefe uygun' : 'Hedef: %20'}
        />
        <StatCard
          title="Geçen Yıla Göre"
          value={formatCurrency(thisYearNet)}
          icon={History}
          accent="sky"
          change={changeVsLastYear}
          changeLabel="net değişim"
        />
      </div>

      {/* Charts row 1: Monthly trend (2/3) + Income by category (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Aylık Trend"
          description="Bu yıl aylık gelir, gider ve net"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={c.monthlyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="month"
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
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="income" name="Gelir" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Gider" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Gelir Kategorileri"
          description="Bu yılki dağılım"
          icon={TrendingUp}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={c.incomeByCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {c.incomeByCategory.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number, n: string) => [formatCurrency(v), n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            {c.incomeByCategory.map((a, i) => (
              <div key={a.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length] }}
                />
                <span className="text-muted-foreground">{a.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2: Expense pie (1/3) + Net worth breakdown (2/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Gider Kategorileri"
          description="Bu yılki dağılım"
          icon={TrendingDown}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={c.expenseByCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {c.expenseByCategory.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number, n: string) => [formatCurrency(v), n]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2 justify-center max-h-20 overflow-y-auto">
            {c.expenseByCategory.map((a, i) => (
              <div key={a.name} className="flex items-center gap-1.5 text-xs">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: CHART_COLOR_ARRAY[i % CHART_COLOR_ARRAY.length] }}
                />
                <span className="text-muted-foreground">{a.name}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Net Değer Dağılımı"
          description="Varlıklar ve borçlar"
          icon={Wallet}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={c.netWorthBreakdown}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
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
              <ReferenceLine x={0} stroke="oklch(0.5 0.01 240 / 0.4)" />
              <Bar dataKey="value" name="Tutar" radius={[0, 6, 6, 0]}>
                {c.netWorthBreakdown.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={NET_WORTH_COLORS[entry.name] || 'oklch(0.6 0.01 240)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <SummaryRow icon={Landmark} label="Banka" value={s.bankTotal} color="emerald" />
            <SummaryRow icon={Shield} label="Varlıklar" value={s.assetTotal} color="amber" />
            <SummaryRow icon={Building2} label="Emlak" value={s.propertyTotal} color="violet" />
            <SummaryRow icon={CreditCard} label="Kart Borcu" value={-s.cardDebt} color="pink" />
            <SummaryRow icon={Landmark} label="Kredi Borcu" value={-s.loanDebt} color="rose" />
            <SummaryRow icon={Wallet} label="Net Değer" value={s.netWorth} color="emerald" bold />
          </div>
        </ChartCard>
      </div>

      {/* Property performance */}
      {data.propertyStats.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Emlak Performansı
              </h3>
              <span className="text-xs text-muted-foreground">
                {data.propertyStats.length} mülk • Toplam {formatCompact(s.propertyTotal)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mülk</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Güncel Değer</TableHead>
                    <TableHead className="text-right">Aylık Kira</TableHead>
                    <TableHead className="text-right">Yıllık Kira</TableHead>
                    <TableHead className="text-right">Getiri %</TableHead>
                    <TableHead className="text-right">Değer Artışı</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.propertyStats.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-muted/50 border-b transition-colors"
                    >
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.currentValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.monthlyRent > 0 ? formatCurrency(p.monthlyRent) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.annualRent > 0 ? formatCurrency(p.annualRent) : '-'}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          p.yieldRate >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {p.yieldRate.toFixed(1)}%
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          p.appreciation >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {p.appreciation >= 0 ? '+' : ''}
                        {p.appreciation.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            PROPERTY_STATUS_COLORS[p.status] ||
                            'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-transparent'
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle cost section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-5 space-y-3">
            <div className="mb-2 flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Araç Maliyeti</h3>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Fuel className="h-3.5 w-3.5" />
                Yakıt Toplam
              </div>
              <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(s.fuelTotal)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                Servis Toplam
              </div>
              <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(s.serviceTotal)}
              </p>
            </div>
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Car className="h-3.5 w-3.5" />
                Toplam Maliyet
              </div>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(s.vehicleTotalCost)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">bu yıl</p>
            </div>
          </CardContent>
        </Card>

        <ChartCard
          title="Araç Bazında Yakıt"
          description="Bu yılki yakıt harcaması"
          icon={Fuel}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={c.fuelByVehicle}
              margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
            >
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
              <Bar dataKey="value" name="Yakıt" radius={[6, 6, 0, 0]}>
                {c.fuelByVehicle.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      [CHART_COLORS.amber, CHART_COLORS.rose, CHART_COLORS.teal, CHART_COLORS.violet][
                        i % 4
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Report footer */}
      <div className="flex items-center justify-center py-4 text-xs text-muted-foreground">
        <p>
          LifeOS Raporları • {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihinde oluşturuldu
        </p>
      </div>
    </div>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  color,
  bold,
}: {
  icon: typeof Building2
  label: string
  value: number
  color: 'emerald' | 'violet' | 'amber' | 'rose' | 'pink' | 'sky'
  bold?: boolean
}) {
  const colors = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    violet: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
    pink: 'text-pink-600 dark:text-pink-400',
    sky: 'text-sky-600 dark:text-sky-400',
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card/50 px-2.5 py-1.5">
      <Icon className={`h-3.5 w-3.5 ${colors[color]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`truncate text-xs ${bold ? 'font-bold' : 'font-medium'} ${colors[color]}`}>
          {formatCurrency(value)}
        </p>
      </div>
    </div>
  )
}
