import { ok, fail, getWealthClass } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Tüm varlıkları toparlayan dashboard aggregate endpoint. */
export async function GET() {
  try {
    const { store, user } = await getStore()
    const uid = user.role === 'admin' ? 'admin-all' : user.id

    const [banks, cards, loans, assets, properties, vehicles] = await Promise.all([
      store.list('bank-accounts', uid),
      store.list('credit-cards', uid),
      store.list('loans', uid),
      store.list('assets', uid),
      store.list('properties', uid),
      store.list('vehicles', uid),
    ])

    // Son 6 ay gelir/gider + yakıt/servis
    const now = new Date()
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)

    const [incomes, expenses, fuel, services] = await Promise.all([
      store.list('income', uid, { months: 6 }),
      store.list('expenses', uid, { months: 6 }),
      store.list('fuel', uid),
      store.list('services', uid),
    ])

    // ===== Hesaplamalar =====
    const bankTotal = banks.reduce((s: number, b: any) => s + b.balance, 0)
    const cardDebt = cards.reduce((s: number, c: any) => s + c.balance, 0)
    const cardLimit = cards.reduce((s: number, c: any) => s + c.limit, 0)
    const loanDebt = loans.reduce((s: number, l: any) => s + l.remainingAmount, 0)
    const assetTotal = assets.reduce((s: number, a: any) => s + a.totalValue, 0)
    const propertyValue = properties.reduce((s: number, p: any) => s + p.currentValue, 0)
    const vehicleValue = vehicles.reduce((s: number, v: any) => s + (v.currentValue || 0), 0)

    const netWorth = bankTotal + assetTotal + propertyValue + vehicleValue - cardDebt - loanDebt

    const totalIncome = incomes.reduce((s: number, i: any) => s + i.amount, 0)
    const totalExpense = expenses.reduce((s: number, e: any) => s + e.amount, 0)
    // monthlyNet bu ayın gelir-gider farkı (yıllık değil)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthIncome = incomes.filter((x: any) => new Date(x.date) >= thisMonthStart).reduce((s: number, x: any) => s + x.amount, 0)
    const lastMonthIncome = incomes.filter((x: any) => new Date(x.date) >= lastMonthStart && new Date(x.date) < thisMonthStart).reduce((s: number, x: any) => s + x.amount, 0)
    const thisMonthExpense = expenses.filter((x: any) => new Date(x.date) >= thisMonthStart).reduce((s: number, x: any) => s + x.amount, 0)
    const lastMonthExpense = expenses.filter((x: any) => new Date(x.date) >= lastMonthStart && new Date(x.date) < thisMonthStart).reduce((s: number, x: any) => s + x.amount, 0)
    const monthlyNet = thisMonthIncome - thisMonthExpense

    const months: { month: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('tr-TR', { month: 'short' })
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const inc = incomes.filter((x: any) => new Date(x.date) >= d && new Date(x.date) < next).reduce((s: number, x: any) => s + x.amount, 0)
      const exp = expenses.filter((x: any) => new Date(x.date) >= d && new Date(x.date) < next).reduce((s: number, x: any) => s + x.amount, 0)
      months.push({ month: label, income: inc, expense: exp })
    }

    const incomeChange = lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0
    const expenseChange = lastMonthExpense > 0 ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0

    const assetByType = assets.reduce<Record<string, number>>((acc, a: any) => {
      acc[a.assetType] = (acc[a.assetType] || 0) + a.totalValue
      return acc
    }, {})

    const expenseByCategory = expenses
      .filter((e: any) => new Date(e.date) >= thisMonthStart)
      .reduce<Record<string, number>>((acc, e: any) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount
        return acc
      }, {})

    // Araç yakıt ve servis giderlerini kategoriye ekle (ayrı gider kaydı olmadan)
    const thisMonthFuel = fuel.filter((f: any) => new Date(f.date) >= thisMonthStart).reduce((s: number, f: any) => s + f.amount, 0)
    const thisMonthService = services.filter((s: any) => new Date(s.date) >= thisMonthStart).reduce((s: number, x: any) => s + x.amount, 0)
    if (thisMonthFuel > 0) expenseByCategory['Yakıt'] = (expenseByCategory['Yakıt'] || 0) + thisMonthFuel
    if (thisMonthService > 0) expenseByCategory['Servis/Bakım'] = (expenseByCategory['Servis/Bakım'] || 0) + thisMonthService

    // Bu ayın gider totaline yakıt+servis ekle
    const thisMonthExpenseWithVehicle = thisMonthExpense + thisMonthFuel + thisMonthService

    const activeContracts = properties.flatMap((p: any) => p.contracts || []).filter((c: any) => c.status === 'Aktif').length
    const monthlyRentIncome = properties.flatMap((p: any) => p.contracts || []).filter((c: any) => c.status === 'Aktif').reduce((s: number, c: any) => s + c.monthlyRent, 0)

    const upcomingPayments = [
      ...loans.map((l: any) => ({ name: l.loanName, type: 'Kredi Taksiti', amount: l.monthlyPayment, dueDay: 1 })),
      ...cards.filter((c: any) => c.balance > 0).map((c: any) => ({ name: c.cardName, type: 'Kart Borcu', amount: c.balance, dueDay: c.dueDay })),
    ].slice(0, 5)

    // Bu yıl yakıt/servis toplamları
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const fuelTotal = fuel.filter((f: any) => new Date(f.date) >= yearStart).reduce((s: number, f: any) => s + f.amount, 0)
    const serviceTotal = services.filter((s: any) => new Date(s.date) >= yearStart).reduce((s: number, x: any) => s + x.amount, 0)

    return ok({
      kpis: {
        netWorth, bankTotal, assetTotal, propertyValue, vehicleValue,
        cardDebt, loanDebt, cardLimit,
        cardUsageRate: cardLimit > 0 ? (cardDebt / cardLimit) * 100 : 0,
        monthlyIncome: thisMonthIncome, monthlyExpense: thisMonthExpenseWithVehicle,
        monthlyNet: thisMonthIncome - thisMonthExpenseWithVehicle,
        incomeChange, expenseChange, activeContracts, monthlyRentIncome,
        vehicleCount: vehicles.length,
        fuelTotal,
        serviceTotal,
        vehicleTotalCost: fuelTotal + serviceTotal,
        wealthClass: await getWealthClass(netWorth),
      },
      charts: {
        months,
        assetByType: Object.entries(assetByType).map(([name, value]) => ({ name, value })),
        expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      },
      recent: {
        upcomingPayments,
        banks: banks.slice(0, 5),
        cards: cards.slice(0, 5),
        loans: loans.slice(0, 5),
        assets: assets.slice(0, 5),
        properties: properties.slice(0, 5).map((p: any) => ({
          id: p.id, name: p.name, type: p.type, status: p.status,
          currentValue: p.currentValue, monthlyRent: p.monthlyRent,
          contractsCount: (p.contracts || []).length,
        })),
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
