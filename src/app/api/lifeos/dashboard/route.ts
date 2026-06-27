import { db } from '@/lib/db'
import { ok } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

/** Tüm varlıkları toparlayan dashboard aggregate endpoint. */
export async function GET() {
  const [banks, cards, loans, assets, properties, vehicles] = await Promise.all([
    db.bankAccount.findMany(),
    db.creditCard.findMany(),
    db.loan.findMany(),
    db.asset.findMany(),
    db.property.findMany({ include: { contracts: true } }),
    db.vehicle.findMany(),
  ])

  // Son 6 ay gelir/gider
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)

  const [incomes, expenses] = await Promise.all([
    db.income.findMany({ where: { date: { gte: sixMonthsAgo } } }),
    db.expense.findMany({ where: { date: { gte: sixMonthsAgo } } }),
  ])

  // ===== Hesaplamalar =====
  const bankTotal = banks.reduce((s, b) => s + b.balance, 0)
  const cardDebt = cards.reduce((s, c) => s + c.balance, 0)
  const cardLimit = cards.reduce((s, c) => s + c.limit, 0)
  const loanDebt = loans.reduce((s, l) => s + l.remainingAmount, 0)
  const assetTotal = assets.reduce((s, a) => s + a.totalValue, 0)
  const propertyValue = properties.reduce((s, p) => s + p.currentValue, 0)
  const vehicleValue = vehicles.reduce((s, v) => s + (v.currentKm ? 0 : 0) + 850000, 0) // araç değer tahmini

  const netWorth = bankTotal + assetTotal + propertyValue + vehicleValue - cardDebt - loanDebt

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
  const monthlyNet = totalIncome - totalExpense

  // Aylık gelir/gider trendi (son 6 ay)
  const months: { month: string; income: number; expense: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('tr-TR', { month: 'short' })
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const inc = incomes.filter((x) => x.date >= d && x.date < next).reduce((s, x) => s + x.amount, 0)
    const exp = expenses.filter((x) => x.date >= d && x.date < next).reduce((s, x) => s + x.amount, 0)
    months.push({ month: label, income: inc, expense: exp })
  }

  // Bu ay vs geçen ay karşılaştırma
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthIncome = incomes.filter((x) => x.date >= thisMonthStart).reduce((s, x) => s + x.amount, 0)
  const lastMonthIncome = incomes.filter((x) => x.date >= lastMonthStart && x.date < thisMonthStart).reduce((s, x) => s + x.amount, 0)
  const thisMonthExpense = expenses.filter((x) => x.date >= thisMonthStart).reduce((s, x) => s + x.amount, 0)
  const lastMonthExpense = expenses.filter((x) => x.date >= lastMonthStart && x.date < thisMonthStart).reduce((s, x) => s + x.amount, 0)

  const incomeChange = lastMonthIncome > 0 ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0
  const expenseChange = lastMonthExpense > 0 ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0

  // Varlık dağılımı
  const assetByType = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.assetType] = (acc[a.assetType] || 0) + a.totalValue
    return acc
  }, {})

  // Gider kategori dağılımı (bu ay)
  const expenseByCategory = expenses
    .filter((e) => e.date >= thisMonthStart)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

  // Kira durumları
  const activeContracts = properties.flatMap((p) => p.contracts).filter((c) => c.status === 'Aktif').length
  const monthlyRentIncome = properties.flatMap((p) => p.contracts).filter((c) => c.status === 'Aktif').reduce((s, c) => s + c.monthlyRent, 0)

  // Yaklaşan ödemeler (kredi taksitleri + kart borçları)
  const upcomingPayments = [
    ...loans.map((l) => ({ name: l.loanName, type: 'Kredi Taksiti', amount: l.monthlyPayment, dueDay: 1 })),
    ...cards.filter((c) => c.balance > 0).map((c) => ({ name: c.cardName, type: 'Kart Borcu', amount: c.balance, dueDay: c.dueDay })),
  ]

  return ok({
    kpis: {
      netWorth,
      bankTotal,
      assetTotal,
      propertyValue,
      cardDebt,
      loanDebt,
      cardLimit,
      cardUsageRate: cardLimit > 0 ? (cardDebt / cardLimit) * 100 : 0,
      monthlyIncome: thisMonthIncome,
      monthlyExpense: thisMonthExpense,
      monthlyNet,
      incomeChange,
      expenseChange,
      activeContracts,
      monthlyRentIncome,
      vehicleCount: vehicles.length,
    },
    charts: {
      months,
      assetByType: Object.entries(assetByType).map(([name, value]) => ({ name, value })),
      expenseByCategory: Object.entries(expenseByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    },
    recent: {
      upcomingPayments,
      banks: banks.slice(0, 5),
      cards: cards.slice(0, 5),
      loans: loans.slice(0, 5),
      assets: assets.slice(0, 5),
      properties: properties.slice(0, 5),
    },
  })
}
