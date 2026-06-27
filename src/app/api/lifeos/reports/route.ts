import { db } from '@/lib/db'
import { ok } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

/** Detaylı rapor verisi - yıllık gelir/gider, kategori trendleri, varlık performansı. */
export async function GET() {
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)

  const [incomes, expenses, assets, loans, banks, cards, properties, vehicles, fuel, services] = await Promise.all([
    db.income.findMany({ where: { date: { gte: lastYearStart } } }),
    db.expense.findMany({ where: { date: { gte: lastYearStart } } }),
    db.asset.findMany(),
    db.loan.findMany(),
    db.bankAccount.findMany(),
    db.creditCard.findMany(),
    db.property.findMany({ include: { contracts: true } }),
    db.vehicle.findMany(),
    db.vehicleFuel.findMany({ where: { date: { gte: yearStart } } }),
    db.vehicleService.findMany({ where: { date: { gte: yearStart } } }),
  ])

  // Aylık 12 aylık trend (bu yıl)
  const monthlyTrend: { month: string; income: number; expense: number; net: number }[] = []
  const monthLabels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  for (let m = 0; m < 12; m++) {
    const start = new Date(now.getFullYear(), m, 1)
    const end = new Date(now.getFullYear(), m + 1, 1)
    const inc = incomes.filter((x) => x.date >= start && x.date < end).reduce((s, x) => s + x.amount, 0)
    const exp = expenses.filter((x) => x.date >= start && x.date < end).reduce((s, x) => s + x.amount, 0)
    monthlyTrend.push({ month: monthLabels[m], income: inc, expense: exp, net: inc - exp })
  }

  // Geçen yıl vs bu yıl (şu ana kadar)
  const thisYearIncome = incomes.filter((x) => x.date >= yearStart).reduce((s, x) => s + x.amount, 0)
  const lastYearIncome = incomes.filter((x) => x.date >= lastYearStart && x.date <= lastYearEnd).reduce((s, x) => s + x.amount, 0)
  const thisYearExpense = expenses.filter((x) => x.date >= yearStart).reduce((s, x) => s + x.amount, 0)
  const lastYearExpense = expenses.filter((x) => x.date >= lastYearStart && x.date <= lastYearEnd).reduce((s, x) => s + x.amount, 0)

  // Gelir kategori dağılımı (bu yıl)
  const incomeByCategory = incomes
    .filter((x) => x.date >= yearStart)
    .reduce<Record<string, number>>((acc, x) => {
      acc[x.category] = (acc[x.category] || 0) + x.amount
      return acc
    }, {})

  // Gider kategori dağılımı (bu yıl)
  const expenseByCategory = expenses
    .filter((x) => x.date >= yearStart)
    .reduce<Record<string, number>>((acc, x) => {
      acc[x.category] = (acc[x.category] || 0) + x.amount
      return acc
    }, {})

  // Net değer breakdown
  const bankTotal = banks.reduce((s, b) => s + b.balance, 0)
  const assetTotal = assets.reduce((s, a) => s + a.totalValue, 0)
  const propertyTotal = properties.reduce((s, p) => s + p.currentValue, 0)
  const loanDebt = loans.reduce((s, l) => s + l.remainingAmount, 0)
  const cardDebt = cards.reduce((s, c) => s + c.balance, 0)

  // Araç maliyet analizi
  const fuelTotal = fuel.reduce((s, f) => s + f.amount, 0)
  const serviceTotal = services.reduce((s, x) => s + x.amount, 0)
  const fuelByVehicle = fuel.reduce<Record<string, number>>((acc, f) => {
    const key = vehicles.find((v) => v.id === f.vehicleId)?.name || 'Bilinmiyor'
    acc[key] = (acc[key] || 0) + f.amount
    return acc
  }, {})

  // Emlak getirisi
  const propertyStats = properties.map((p) => {
    const activeContract = p.contracts.find((c) => c.status === 'Aktif')
    const annualRent = activeContract ? activeContract.monthlyRent * 12 : 0
    const yieldRate = p.currentValue > 0 ? (annualRent / p.currentValue) * 100 : 0
    const appreciation = p.purchasePrice > 0 ? ((p.currentValue - p.purchasePrice) / p.purchasePrice) * 100 : 0
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      currentValue: p.currentValue,
      purchasePrice: p.purchasePrice,
      monthlyRent: activeContract?.monthlyRent || 0,
      annualRent,
      yieldRate,
      appreciation,
      status: p.status,
    }
  })

  return ok({
    summary: {
      thisYearIncome,
      lastYearIncome,
      thisYearExpense,
      lastYearExpense,
      yearSavings: thisYearIncome - thisYearExpense,
      savingsRate: thisYearIncome > 0 ? ((thisYearIncome - thisYearExpense) / thisYearIncome) * 100 : 0,
      netWorth: bankTotal + assetTotal + propertyTotal - loanDebt - cardDebt,
      bankTotal,
      assetTotal,
      propertyTotal,
      loanDebt,
      cardDebt,
      fuelTotal,
      serviceTotal,
      vehicleTotalCost: fuelTotal + serviceTotal,
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
}
