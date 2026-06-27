'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { api } from '@/lib/api-client'
import { formatCurrency, formatCompact, formatDate } from '@/lib/lifeos'
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
  Wallet,
  Building2,
  Car,
  Fuel,
  Wrench,
  Shield,
  CreditCard,
  Landmark,
  Calendar,
  Check,
  PieChart as PieChartIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  period: { from: string; to: string; prevFrom: string; prevTo: string }
  summary: {
    periodIncome: number
    prevIncome: number
    periodExpense: number
    prevExpense: number
    periodSavings: number
    savingsRate: number
    incomeChange: number
    expenseChange: number
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

type PresetKey = 'this-year' | 'last-year' | '6m' | '3m' | '1m' | 'all' | 'custom'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '1m', label: 'Bu Ay' },
  { key: '3m', label: 'Son 3 Ay' },
  { key: '6m', label: 'Son 6 Ay' },
  { key: 'this-year', label: 'Bu Yıl' },
  { key: 'last-year', label: 'Geçen Yıl' },
  { key: 'all', label: 'Tümü' },
]

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

/** Returns ISO yyyy-mm-dd for a Date (local time). */
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Builds the API query string from the selected date params. */
function buildQuery(preset: PresetKey, from: string, to: string): string {
  if (preset === 'custom' && from && to) {
    return `?from=${from}&to=${to}`
  }
  return `?preset=${preset}`
}

/** Human-readable period label for the chosen date range. */
function periodLabel(preset: PresetKey, from: string, to: string, period?: { from: string; to: string }): string {
  if (preset === 'custom' && from && to) {
    return `${formatDate(from)} - ${formatDate(to)}`
  }
  if (period?.from && period?.to) {
    return `${formatDate(period.from)} - ${formatDate(period.to)}`
  }
  return PRESETS.find((p) => p.key === preset)?.label || 'Dönem'
}

/** Real PDF export using jsPDF + jspdf-autotable. */
// Türkçe karakterleri PDF için ASCII'ye çevirir (jsPDF standart font Türkçe desteklemez)
function tr(s: string): string {
  return s
    .replace(/₺/g, 'TL')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
}

function exportPdf(data: ReportsData, label: string) {
  try {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14

    // === Header ===
    doc.setFontSize(20)
    doc.setTextColor(20, 20, 20)
    doc.setFont('helvetica', 'bold')
    doc.text('LifeOS Finansal Rapor', margin, 22)
    doc.setFont('helvetica', 'normal')

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(tr(`Dönem: ${label}`), margin, 30)
    doc.text(tr(`Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}`), margin, 36)

    // Separator line
    doc.setDrawColor(220)
    doc.line(margin, 40, pageWidth - margin, 40)

    /** Adds a section title with page break protection. Returns the new Y position. */
    const addSectionTitle = (title: string, y: number): number => {
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(13)
      doc.setTextColor(50, 50, 50)
      doc.setFont('helvetica', 'bold')
      doc.text(tr(title), margin, y)
      doc.setFont('helvetica', 'normal')
      return y + 6
    }

    let nextY = 50

    // === 1. ÖZET ===
    nextY = addSectionTitle('1. ÖZET', nextY)
    autoTable(doc, {
      startY: nextY,
      head: [[tr('Özet'), tr('Tutar')]],
      body: [
        [tr('Dönem Geliri'), formatCurrency(data.summary.periodIncome)],
        [tr('Dönem Gideri'), formatCurrency(data.summary.periodExpense)],
        [tr('Dönem Tasarrufu'), formatCurrency(data.summary.periodSavings)],
        [tr('Tasarruf Oranı'), `%${data.summary.savingsRate.toFixed(1)}`],
        [tr('Net Değer'), formatCurrency(data.summary.netWorth)],
        [tr('Banka Toplam'), formatCurrency(data.summary.bankTotal)],
        [tr('Varlıklar'), formatCurrency(data.summary.assetTotal)],
        [tr('Emlak'), formatCurrency(data.summary.propertyTotal)],
        [tr('Kredi Borcu'), formatCurrency(data.summary.loanDebt)],
        [tr('Kart Borcu'), formatCurrency(data.summary.cardDebt)],
      ].map(([a, b]) => [tr(a), tr(b as string)]),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { textColor: 50, fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 250, 248] },
      margin: { left: margin, right: margin },
    })
    nextY = (doc as any).lastAutoTable.finalY + 18

    // === 2. GELİR KATEGORİLERİ ===
    nextY = addSectionTitle('2. GELIR KATEGORILERI', nextY)
    const incomeBody =
      data.charts.incomeByCategory.length > 0
        ? data.charts.incomeByCategory.map((c) => [tr(c.name), formatCurrency(c.value)])
        : [[tr('Veri yok'), '-']]
    autoTable(doc, {
      startY: nextY,
      head: [[tr('Gelir Kategorisi'), tr('Tutar')]],
      body: incomeBody,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { fontSize: 10, textColor: 50 },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      margin: { left: margin, right: margin },
    })
    nextY = (doc as any).lastAutoTable.finalY + 18

    // === 3. GİDER KATEGORİLERİ ===
    nextY = addSectionTitle('3. GIDER KATEGORILERI', nextY)
    const expenseBody =
      data.charts.expenseByCategory.length > 0
        ? data.charts.expenseByCategory.map((c) => [tr(c.name), formatCurrency(c.value)])
        : [[tr('Veri yok'), '-']]
    autoTable(doc, {
      startY: nextY,
      head: [[tr('Gider Kategorisi'), tr('Tutar')]],
      body: expenseBody,
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94], textColor: 255, fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { fontSize: 10, textColor: 50 },
      alternateRowStyles: { fillColor: [255, 240, 245] },
      margin: { left: margin, right: margin },
    })
    nextY = (doc as any).lastAutoTable.finalY + 18

    // === 4. AYLIK TREND ===
    if (data.charts.monthlyTrend.length > 0) {
      nextY = addSectionTitle('4. AYLIK TREND', nextY)
      autoTable(doc, {
        startY: nextY,
        head: [[tr('Ay'), tr('Gelir'), tr('Gider'), tr('Net')]],
        body: data.charts.monthlyTrend.map((m) => [
          tr(m.month),
          formatCurrency(m.income),
          formatCurrency(m.expense),
          formatCurrency(m.net),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        bodyStyles: { fontSize: 10, textColor: 50 },
        alternateRowStyles: { fillColor: [245, 240, 255] },
        margin: { left: margin, right: margin },
      })
      nextY = (doc as any).lastAutoTable.finalY + 18
    }

    // === 5. EMLAK PERFORMANSI ===
    if (data.propertyStats.length > 0) {
      nextY = addSectionTitle('5. EMLAK PERFORMANSI', nextY)
      autoTable(doc, {
        startY: nextY,
        head: [[tr('Mülk'), tr('Tip'), tr('Güncel Değer'), tr('Aylık Kira'), tr('Yıllık Getiri %'), tr('Değer Artışı %')]],
        body: data.propertyStats.map((p) => [
          tr(p.name),
          tr(p.type),
          formatCurrency(p.currentValue),
          formatCurrency(p.monthlyRent),
          `%${p.yieldRate.toFixed(1)}`,
          `%${p.appreciation.toFixed(1)}`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        bodyStyles: { fontSize: 9, textColor: 50 },
        alternateRowStyles: { fillColor: [245, 240, 255] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 28 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
        },
        margin: { left: margin, right: margin },
      })
      nextY = (doc as any).lastAutoTable.finalY + 18
    }

    // === 6. ARAÇ MALİYETLERİ ===
    nextY = addSectionTitle('6. ARAC MALIYETLERI', nextY)
    if (data.charts.fuelByVehicle.length > 0) {
      autoTable(doc, {
        startY: nextY,
        head: [[tr('Araç Yakıt Maliyeti'), tr('Tutar')]],
        body: data.charts.fuelByVehicle.map((c) => [tr(c.name), formatCurrency(c.value)]),
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 11 },
        bodyStyles: { fontSize: 10, textColor: 50 },
        alternateRowStyles: { fillColor: [255, 248, 235] },
        margin: { left: margin, right: margin },
      })
      nextY = (doc as any).lastAutoTable.finalY + 8
    }
    // Page break safety for the totals table
    if (nextY > 260) {
      doc.addPage()
      nextY = 20
    }
    autoTable(doc, {
      startY: nextY,
      body: [
        [tr('Yakıt Toplam'), formatCurrency(data.summary.fuelTotal)],
        [tr('Servis Toplam'), formatCurrency(data.summary.serviceTotal)],
        [tr('Araç Toplam Maliyet'), formatCurrency(data.summary.vehicleTotalCost)],
      ].map(([a, b]) => [tr(a), tr(b as string)]),
      theme: 'grid',
      bodyStyles: { fontSize: 10, textColor: 50, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
    })

    // === Footer ===
    const pageCount = (doc as any).internal.getNumberOfPages()
    const footerDate = tr(new Date().toLocaleDateString('tr-TR'))
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      const footerY = pageHeight - 8
      // Left: report name
      doc.text(tr('LifeOS Finansal Rapor'), margin, footerY)
      // Center: date
      const dateWidth = doc.getTextWidth(footerDate)
      doc.text(footerDate, pageWidth / 2 - dateWidth / 2, footerY)
      // Right: page number
      const pageStr = tr(`Sayfa ${i}/${pageCount}`)
      const pageStrWidth = doc.getTextWidth(pageStr)
      doc.text(pageStr, pageWidth - margin - pageStrWidth, footerY)
    }

    doc.save(`lifeos-rapor-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF raporu indirildi')
  } catch (e: unknown) {
    console.error('PDF export error:', e)
    toast.error('PDF oluşturulurken hata oluştu')
  }
}

function exportCsv(data: ReportsData, label: string) {
  const rows: string[][] = []
  const today = new Date().toLocaleDateString('tr-TR')

  rows.push(['LifeOS Finansal Rapor', label, today])
  rows.push([])
  rows.push(['OZET'])
  rows.push(['Dönem Geliri', String(data.summary.periodIncome)])
  rows.push(['Dönem Gideri', String(data.summary.periodExpense)])
  rows.push(['Dönem Tasarrufu', String(data.summary.periodSavings)])
  rows.push(['Tasarruf Orani %', data.summary.savingsRate.toFixed(2)])
  rows.push(['Gelir Degisimi %', data.summary.incomeChange.toFixed(2)])
  rows.push(['Gider Degisimi %', data.summary.expenseChange.toFixed(2)])
  rows.push(['Onceki Doner Geliri', String(data.summary.prevIncome)])
  rows.push(['Onceki Donem Gideri', String(data.summary.prevExpense)])
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
  toast.success('Excel CSV dosyası indirildi')
}

export function ReportsView() {
  // Preset + custom date range state
  const [preset, setPreset] = useState<PresetKey>('this-year')
  const now = new Date()
  const defaultFrom = isoDate(new Date(now.getFullYear(), 0, 1))
  const defaultTo = isoDate(now)
  const [customFrom, setCustomFrom] = useState<string>(defaultFrom)
  const [customTo, setCustomTo] = useState<string>(defaultTo)

  // The actually-applied query (separate from inputs so user can type then click "Uygula")
  const [appliedFrom, setAppliedFrom] = useState<string>(defaultFrom)
  const [appliedTo, setAppliedTo] = useState<string>(defaultTo)

  const queryStr = buildQuery(preset, appliedFrom, appliedTo)

  const { data, isLoading } = useQuery<ReportsData>({
    queryKey: ['reports', preset, appliedFrom, appliedTo],
    queryFn: () => api.get<ReportsData>(`/api/lifeos/reports${queryStr}`),
  })

  const handlePresetClick = (key: PresetKey) => {
    setPreset(key)
    // Reset custom inputs to sensible defaults when switching to a preset
    if (key !== 'custom') {
      // Keep customFrom/customTo as-is so user can switch back; the API only uses them when preset==='custom'
    }
  }

  const handleApplyCustom = () => {
    if (!customFrom || !customTo) {
      toast.error('Lütfen başlangıç ve bitiş tarihlerini seçin')
      return
    }
    if (new Date(customFrom) > new Date(customTo)) {
      toast.error('Başlangıç tarihi bitiş tarihinden sonra olamaz')
      return
    }
    setPreset('custom')
    setAppliedFrom(customFrom)
    setAppliedTo(customTo)
    toast.success('Tarih aralığı uygulandı')
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Raporlar"
          description="Dönemsel finansal özet ve performans analizi"
          icon={FileText}
        />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
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
  const label = periodLabel(preset, appliedFrom, appliedTo, data.period)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raporlar"
        description="Dönemsel finansal özet, kategori analizi ve varlık performansı"
        icon={FileText}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => exportCsv(data, label)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel'e Aktar
            </Button>
            <Button onClick={() => exportPdf(data, label)} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF İndir
            </Button>
          </div>
        }
      />

      {/* Date range selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Dönem:
              </div>
              {PRESETS.map((p) => (
                <Button
                  key={p.key}
                  size="sm"
                  variant={preset === p.key ? 'default' : 'outline'}
                  onClick={() => handlePresetClick(p.key)}
                  className="h-8 px-3 text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 w-[150px] text-xs"
                aria-label="Başlangıç tarihi"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 w-[150px] text-xs"
                aria-label="Bitiş tarihi"
              />
              <Button
                size="sm"
                onClick={handleApplyCustom}
                className="h-8 gap-1.5 text-xs"
                variant={preset === 'custom' ? 'default' : 'outline'}
              >
                <Check className="h-3.5 w-3.5" />
                Uygula
              </Button>
            </div>
          </div>

          {/* Active period indicator */}
          <div className="mt-3 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Aktif dönem:</span>
            <Badge variant="secondary" className="text-xs">
              {PRESETS.find((p) => p.key === preset)?.label || 'Özel'}
            </Badge>
            <span className="font-medium text-foreground">{label}</span>
          </div>
        </CardContent>
      </Card>

      {/* Compact KPI cards — 5 across on lg */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <CompactKpi
          title="Dönem Geliri"
          value={formatCurrency(s.periodIncome)}
          icon={TrendingUp}
          accent="emerald"
          change={s.incomeChange}
          changeLabel="önceki döneme göre"
        />
        <CompactKpi
          title="Dönem Gideri"
          value={formatCurrency(s.periodExpense)}
          icon={TrendingDown}
          accent="rose"
          change={s.expenseChange}
          changeLabel="önceki döneme göre"
        />
        <CompactKpi
          title="Dönem Tasarrufu"
          value={formatCurrency(s.periodSavings)}
          icon={PiggyBank}
          accent="violet"
          subtitle={s.periodSavings >= 0 ? 'Artıda' : 'Eksi'}
        />
        <CompactKpi
          title="Tasarruf Oranı"
          value={`%${s.savingsRate.toFixed(1)}`}
          icon={Percent}
          accent="amber"
          subtitle={s.savingsRate >= 20 ? 'Hedefe uygun' : 'Hedef: %20'}
        />
        <CompactKpi
          title="Net Değer"
          value={formatCurrency(s.netWorth)}
          icon={Wallet}
          accent="sky"
          subtitle="Güncel servet"
        />
      </div>

      {/* Charts row 1: Monthly trend (2/3) + Income by category (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Aylık Trend"
          description="Dönem boyunca gelir, gider ve net"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          {c.monthlyTrend.length === 0 || c.monthlyTrend.every((d) => d.income === 0 && d.expense === 0 && d.net === 0) ? (
            <EmptyChart height={300} />
          ) : (
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
          )}
        </ChartCard>

        <ChartCard
          title="Gelir Kategorileri"
          description="Dönem dağılımı"
          icon={TrendingUp}
        >
          {c.incomeByCategory.length === 0 || c.incomeByCategory.every((d) => d.value === 0) ? (
            <EmptyChart height={260} />
          ) : (
            <>
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
              <div className="mt-2 flex flex-wrap gap-2 justify-center max-h-20 overflow-y-auto">
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
            </>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2: Expense pie (1/3) + Net worth breakdown (2/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Gider Kategorileri"
          description="Dönem dağılımı"
          icon={TrendingDown}
        >
          {c.expenseByCategory.length === 0 || c.expenseByCategory.every((d) => d.value === 0) ? (
            <EmptyChart height={260} />
          ) : (
            <>
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
            </>
          )}
        </ChartCard>

        <ChartCard
          title="Net Değer Dağılımı"
          description="Varlıklar ve borçlar"
          icon={Wallet}
          className="lg:col-span-2"
        >
          {c.netWorthBreakdown.length === 0 || c.netWorthBreakdown.every((d) => d.value === 0) ? (
            <EmptyChart height={300} />
          ) : (
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
          )}
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
              <p className="mt-0.5 text-xs text-muted-foreground">dönem boyunca</p>
            </div>
          </CardContent>
        </Card>

        <ChartCard
          title="Araç Bazında Yakıt"
          description="Dönemdeki yakıt harcaması"
          icon={Fuel}
          className="lg:col-span-2"
        >
          {c.fuelByVehicle.length === 0 || c.fuelByVehicle.every((d) => d.value === 0) ? (
            <EmptyChart height={300} />
          ) : (
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
          )}
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

/** Compact KPI card — fits 5-across on lg without overflow. */
function CompactKpi({
  title,
  value,
  icon: Icon,
  accent = 'emerald',
  change,
  changeLabel,
  subtitle,
}: {
  title: string
  value: string
  icon: typeof Wallet
  accent?: 'emerald' | 'violet' | 'amber' | 'rose' | 'sky'
  change?: number
  changeLabel?: string
  subtitle?: string
}) {
  const ACCENTS = {
    emerald: { bg: 'oklch(0.68 0.17 155 / 0.12)', text: 'oklch(0.7 0.17 155)', ring: 'oklch(0.68 0.17 155 / 0.2)' },
    violet: { bg: 'oklch(0.65 0.18 280 / 0.12)', text: 'oklch(0.7 0.18 280)', ring: 'oklch(0.65 0.18 280 / 0.2)' },
    amber: { bg: 'oklch(0.75 0.18 65 / 0.12)', text: 'oklch(0.78 0.18 65)', ring: 'oklch(0.75 0.18 65 / 0.2)' },
    rose: { bg: 'oklch(0.65 0.2 25 / 0.12)', text: 'oklch(0.7 0.2 25)', ring: 'oklch(0.65 0.2 25 / 0.2)' },
    sky: { bg: 'oklch(0.6 0.15 200 / 0.12)', text: 'oklch(0.65 0.15 200)', ring: 'oklch(0.6 0.15 200 / 0.2)' },
  }
  const a = ACCENTS[accent]
  const positive = (change ?? 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="relative overflow-hidden p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="mt-1.5 truncate text-lg font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{subtitle}</p>
            )}
            {typeof change === 'number' && (
              <div className="mt-1.5 flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold ${
                    positive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(change).toFixed(1)}%
                </span>
                {changeLabel && (
                  <span className="truncate text-[10px] text-muted-foreground">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: a.bg, color: a.text, boxShadow: `inset 0 0 0 1px ${a.ring}` }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </Card>
    </motion.div>
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
