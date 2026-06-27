import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/lifeos'
import { getSessionUser } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Admin panel için tüm kullanıcılar + sistem istatistikleri. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return fail('Yetkisiz', 401)
  if (user.role !== 'admin') return fail('Admin yetkisi gerekli', 403)

  const [users, banks, cards, loans, assets, incomes, expenses, properties, vehicles, fuel, services] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, email: true, name: true, role: true, level: true, aiQuestionsUsed: true, aiQuestionsResetAt: true, createdAt: true, updatedAt: true } }),
    db.bankAccount.findMany(),
    db.creditCard.findMany(),
    db.loan.findMany(),
    db.asset.findMany(),
    db.income.findMany(),
    db.expense.findMany(),
    db.property.findMany({ include: { contracts: true } }),
    db.vehicle.findMany(),
    db.vehicleFuel.findMany(),
    db.vehicleService.findMany(),
  ])

  // Kullanıcı başına istatistik
  const userStats = users.map((u) => {
    const ub = banks.filter((b) => b.userId === u.id)
    const uc = cards.filter((c) => c.userId === u.id)
    const ul = loans.filter((l) => l.userId === u.id)
    const ua = assets.filter((a) => a.userId === u.id)
    const ui = incomes.filter((i) => i.userId === u.id)
    const ue = expenses.filter((e) => e.userId === u.id)
    const up = properties.filter((p) => p.userId === u.id)
    const uv = vehicles.filter((v) => v.userId === u.id)

    const bankTotal = ub.reduce((s, x) => s + x.balance, 0)
    const assetTotal = ua.reduce((s, x) => s + x.totalValue, 0)
    const propertyTotal = up.reduce((s, x) => s + x.currentValue, 0)
    const loanDebt = ul.reduce((s, x) => s + x.remainingAmount, 0)
    const cardDebt = uc.reduce((s, x) => s + x.balance, 0)

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      stats: {
        netWorth: bankTotal + assetTotal + propertyTotal - loanDebt - cardDebt,
        bankTotal,
        assetTotal,
        propertyTotal,
        loanDebt,
        cardDebt,
        incomeCount: ui.length,
        expenseCount: ue.length,
        vehicleCount: uv.length,
        propertyCount: up.length,
      },
    }
  })

  // Sistem geneli istatistikler
  const totalNetWorth = userStats.reduce((s, u) => s + u.stats.netWorth, 0)
  const totalBankBalance = banks.reduce((s, b) => s + b.balance, 0)
  const totalAssets = assets.reduce((s, a) => s + a.totalValue, 0)
  const totalDebt = loans.reduce((s, l) => s + l.remainingAmount, 0) + cards.reduce((s, c) => s + c.balance, 0)
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)

  // Son 7 gün aktivite (kayıt oluşturma)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentActivity = await Promise.all([
    db.income.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.expense.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.bankAccount.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    db.asset.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
  ])

  return ok({
    users: userStats,
    systemStats: {
      totalUsers: users.length,
      totalNetWorth,
      totalBankBalance,
      totalAssets,
      totalDebt,
      totalIncome,
      totalExpense,
      totalRecords: banks.length + cards.length + loans.length + assets.length + incomes.length + expenses.length + properties.length + vehicles.length + fuel.length + services.length,
      recentActivity: {
        recordsLast7Days: recentActivity.reduce((s, x) => s + x, 0),
        income: recentActivity[0],
        expense: recentActivity[1],
        bank: recentActivity[2],
        asset: recentActivity[3],
      },
      resourceCounts: {
        banks: banks.length,
        cards: cards.length,
        loans: loans.length,
        assets: assets.length,
        incomes: incomes.length,
        expenses: expenses.length,
        properties: properties.length,
        vehicles: vehicles.length,
        fuel: fuel.length,
        services: services.length,
      },
    },
  })
}
