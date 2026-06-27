import { ok, fail } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Detaylı rapor verisi - yıllık gelir/gider, kategori trendleri, varlık performansı. */
export async function GET() {
  try {
    const { store, user } = await getStore()
    const uid = user.role === 'admin' ? 'admin-all' : user.id

    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)

    const [banks, cards, loans, assets, properties, vehicles, incomes, expenses, fuel, services] = await Promise.all([
      store.list('bank-accounts', uid),
      store.list('credit-cards', uid),
      store.list('loans', uid),
      store.list('assets', uid),
      store.list('properties', uid),
      store.list('vehicles', uid),
      store.list('income', uid, { months: 18 }),
      store.list('expenses', uid, { months: 18 }),
      store.list('fuel', uid),
      store.list('services', uid),
    ])

    // Aylık 12 aylık trend (bu yıl)
    const monthlyTrend: { month: string; income: number; expense: number; net: number }[] = []
    const monthLabels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    for (let m = 0; m < 12; m++) {
      const start = new Date(now.getFullYear(), m, 1)
      const end = new Date(now.getFullYear(), m + 1, 1)
      const inc = incomes.filter((x: any) => new Date(x.date) >= start && new Date(x.date) < end).reduce((s: number, x: any) => s + x.amount, 0)
      const exp = expenses.filter((x: any) => new Date(x.date) >= start && new Date(x.date) < end).reduce((s: number, x: any) => s + x.amount, 0)
      monthlyTrend.push({ month: monthLabels[m], income: inc, expense: exp, net: inc - exp })
    }

    const thisYearIncome = incomes.filter((x: any) => new Date(x.date) >= yearStart).reduce((s: number, x: any) => s + x.amount, 0)
    const lastYearIncome = incomes.filter((x: any) => new Date(x.date) >= lastYearStart && new Date(x.date) <= lastYearEnd).reduce((s: number, x: any) => s + x.amount, 0)
    const thisYearExpense = expenses.filter((x: any) => new Date(x.date) >= yearStart).reduce((s: number, x: any) => s + x.amount, 0)
    const lastYearExpense = expenses.filter((x: any) => new Date(x.date) >= lastYearStart && new Date(x.date) <= lastYearEnd).reduce((s: number, x: any) => s + x.amount, 0)

    const incomeByCategory = incomes
      .filter((x: any) => new Date(x.date) >= yearStart)
      .reduce<Record<string, number>>((acc, x: any) => { acc[x.category] = (acc[x.category] || 0) + x.amount; return acc }, {})

    const expenseByCategory = expenses
      .filter((x: any) => new Date(x.date) >= yearStart)
      .reduce<Record<string, number>>((acc, x: any) => { acc[x.category] = (acc[x.category] || 0) + x.amount; return acc }, {})

    const bankTotal = banks.reduce((s: number, b: any) => s + b.balance, 0)
    const assetTotal = assets.reduce((s: number, a: any) => s + a.totalValue, 0)
    const propertyTotal = properties.reduce((s: number, p: any) => s + p.currentValue, 0)
    const loanDebt = loans.reduce((s: number, l: any) => s + l.remainingAmount, 0)
    const cardDebt = cards.reduce((s: number, c: any) => s + c.balance, 0)

    const fuelTotal = fuel.reduce((s: number, f: any) => s + f.amount, 0)
    const serviceTotal = services.reduce((s: number, x: any) => s + x.amount, 0)
    const fuelByVehicle = fuel.reduce<Record<string, number>>((acc, f: any) => {
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

    return ok({
      summary: {
        thisYearIncome, lastYearIncome, thisYearExpense, lastYearExpense,
        yearSavings: thisYearIncome - thisYearExpense,
        savingsRate: thisYearIncome > 0 ? ((thisYearIncome - thisYearExpense) / thisYearIncome) * 100 : 0,
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
