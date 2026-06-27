import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Detaylı rapor verisi - tarih aralığı destekler. */
export async function GET(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const uid = user.role === 'admin' ? 'admin-all' : user.id

    const url = new URL(req.url)
    const fromParam = url.searchParams.get('from') // yyyy-mm-dd
    const toParam = url.searchParams.get('to') // yyyy-mm-dd
    const preset = url.searchParams.get('preset') // this-year, last-year, 6m, 3m, 1m, all

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (fromParam && toParam) {
      startDate = new Date(fromParam)
      endDate = new Date(toParam)
      endDate.setHours(23, 59, 59, 999)
    } else if (preset === 'last-year') {
      // Geçen yıl tam — Oca-Ara
      startDate = new Date(now.getFullYear() - 1, 0, 1)
      endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
    } else if (preset === '6m') {
      // Son 6 tam ay — bu ay dahil, 6 ay geri. Oca-Haz gibi tam aylar.
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) // bu ayın son günü
    } else if (preset === '3m') {
      // Son 3 tam ay
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (preset === '1m') {
      // Bu ay tam
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (preset === 'all') {
      startDate = new Date(2025, 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    } else {
      // default: this year (Oca-Ara tam)
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    }

    // Karşılaştırma için önceki dönem (aynı uzunlukta)
    const periodMs = endDate.getTime() - startDate.getTime()
    const prevEndDate = new Date(startDate.getTime() - 1)
    const prevStartDate = new Date(prevEndDate.getTime() - periodMs)

    // Tüm veriyi çek (geniş aralıkta, sonra filtrele)
    const [banks, cards, loans, assets, properties, vehicles, incomes, expenses, fuel, services] = await Promise.all([
      store.list('bank-accounts', uid),
      store.list('credit-cards', uid),
      store.list('loans', uid),
      store.list('assets', uid),
      store.list('properties', uid),
      store.list('vehicles', uid),
      store.list('income', uid, { months: 36 }),
      store.list('expenses', uid, { months: 36 }),
      store.list('fuel', uid),
      store.list('services', uid),
    ])

    // Tarih aralığına göre filtrele
    const inRange = (d: any) => {
      const date = new Date(d.date)
      return date >= startDate && date <= endDate
    }
    const inPrevRange = (d: any) => {
      const date = new Date(d.date)
      return date >= prevStartDate && date <= prevEndDate
    }

    const periodIncomes = incomes.filter(inRange)
    const periodExpenses = expenses.filter(inRange)
    const prevIncomes = incomes.filter(inPrevRange)
    const prevExpenses = expenses.filter(inPrevRange)
    const periodFuel = fuel.filter(inRange)
    const periodServices = services.filter(inRange)

    // Aylık trend (seçilen dönem boyunca)
    const monthlyTrend: { month: string; income: number; expense: number; net: number }[] = []
    const monthLabels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (cursor <= endDate) {
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      const inc = incomes.filter((x: any) => {
        const d = new Date(x.date)
        return d >= cursor && d < monthEnd
      }).reduce((s: number, x: any) => s + x.amount, 0)
      const exp = expenses.filter((x: any) => {
        const d = new Date(x.date)
        return d >= cursor && d < monthEnd
      }).reduce((s: number, x: any) => s + x.amount, 0)
      monthlyTrend.push({
        month: `${monthLabels[cursor.getMonth()]} ${cursor.getFullYear().toString().slice(-2)}`,
        income: inc, expense: exp, net: inc - exp,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    const periodIncome = periodIncomes.reduce((s: number, x: any) => s + x.amount, 0)
    const prevIncome = prevIncomes.reduce((s: number, x: any) => s + x.amount, 0)
    const periodExpense = periodExpenses.reduce((s: number, x: any) => s + x.amount, 0)
    const prevExpense = prevExpenses.reduce((s: number, x: any) => s + x.amount, 0)

    const incomeByCategory = periodIncomes
      .reduce<Record<string, number>>((acc, x: any) => { acc[x.category] = (acc[x.category] || 0) + x.amount; return acc }, {})

    const expenseByCategory = periodExpenses
      .reduce<Record<string, number>>((acc, x: any) => { acc[x.category] = (acc[x.category] || 0) + x.amount; return acc }, {})

    const bankTotal = banks.reduce((s: number, b: any) => s + b.balance, 0)
    const assetTotal = assets.reduce((s: number, a: any) => s + a.totalValue, 0)
    const propertyTotal = properties.reduce((s: number, p: any) => s + p.currentValue, 0)
    const loanDebt = loans.reduce((s: number, l: any) => s + l.remainingAmount, 0)
    const cardDebt = cards.reduce((s: number, c: any) => s + c.balance, 0)

    const fuelTotal = periodFuel.reduce((s: number, f: any) => s + f.amount, 0)
    const serviceTotal = periodServices.reduce((s: number, x: any) => s + x.amount, 0)
    const fuelByVehicle = periodFuel.reduce<Record<string, number>>((acc, f: any) => {
      const key = vehicles.find((v: any) => v.id === f.vehicleId)?.name || 'Bilinmiyor'
      acc[key] = (acc[key] || 0) + f.amount
      return acc
    }, {})

    const propertyStats = properties.map((p: any) => {
      const activeContract = (p.contracts || []).find((c: any) => c.status === 'Aktif')
      const annualRent = activeContract ? activeContract.monthlyRent * 12 : 0
      const yieldRate = p.currentValue > 0 ? (annualRent / p.currentValue) * 100 : 0
      const appreciation = p.purchasePrice > 0 ? ((p.currentValue - p.purchasePrice) / p.purchasePrice) * 100 : 0
      return {
        id: p.id, name: p.name, type: p.type,
        currentValue: p.currentValue, purchasePrice: p.purchasePrice,
        monthlyRent: activeContract?.monthlyRent || 0, annualRent,
        yieldRate, appreciation, status: p.status,
      }
    })

    // Değişim yüzdeleri
    const incomeChange = prevIncome > 0 ? ((periodIncome - prevIncome) / prevIncome) * 100 : 0
    const expenseChange = prevExpense > 0 ? ((periodExpense - prevExpense) / prevExpense) * 100 : 0

    return ok({
      period: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
        prevFrom: prevStartDate.toISOString(),
        prevTo: prevEndDate.toISOString(),
      },
      summary: {
        periodIncome, prevIncome, periodExpense, prevExpense,
        periodSavings: periodIncome - periodExpense,
        savingsRate: periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0,
        incomeChange, expenseChange,
        netWorth: bankTotal + assetTotal + propertyTotal - loanDebt - cardDebt,
        bankTotal, assetTotal, propertyTotal, loanDebt, cardDebt,
        fuelTotal, serviceTotal, vehicleTotalCost: fuelTotal + serviceTotal,
      },
      charts: {
        monthlyTrend,
        incomeByCategory: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
        expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
        fuelByVehicle: Object.entries(fuelByVehicle).map(([name, value]) => ({ name, value })),
        netWorthBreakdown: [
          { name: 'Banka', value: bankTotal },
          { name: 'Varlıklar', value: assetTotal },
          { name: 'Emlak', value: propertyTotal },
          { name: 'Kredi Borcu', value: -loanDebt },
          { name: 'Kart Borcu', value: -cardDebt },
        ],
      },
      propertyStats,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
