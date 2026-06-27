import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'
import ZAI from 'z-ai-web-dev-sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Insight {
  type: 'success' | 'warning' | 'info' | 'danger'
  title: string
  description: string
  category: 'budget' | 'debt' | 'savings' | 'investment' | 'spending'
}

/** Kullanıcının finansal verisini toparla ve AI'a analiz ettir. */
async function buildContext() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

  const [banks, cards, loans, assets, incomes, expenses, properties, vehicles, fuel, services] = await Promise.all([
    db.bankAccount.findMany(),
    db.creditCard.findMany(),
    db.loan.findMany(),
    db.asset.findMany(),
    db.income.findMany({ where: { date: { gte: sixMonthsAgo } } }),
    db.expense.findMany({ where: { date: { gte: sixMonthsAgo } } }),
    db.property.findMany({ include: { contracts: true } }),
    db.vehicle.findMany(),
    db.vehicleFuel.findMany({ where: { date: { gte: sixMonthsAgo } } }),
    db.vehicleService.findMany({ where: { date: { gte: sixMonthsAgo } } }),
  ])

  const bankTotal = banks.reduce((s, b) => s + b.balance, 0)
  const cardDebt = cards.reduce((s, c) => s + c.balance, 0)
  const cardLimit = cards.reduce((s, c) => s + c.limit, 0)
  const loanDebt = loans.reduce((s, l) => s + l.remainingAmount, 0)
  const assetTotal = assets.reduce((s, a) => s + a.totalValue, 0)
  const propertyValue = properties.reduce((s, p) => s + p.currentValue, 0)

  const thisMonthIncome = incomes.filter((x) => x.date >= monthStart).reduce((s, x) => s + x.amount, 0)
  const lastMonthIncome = incomes.filter((x) => x.date >= lastMonthStart && x.date < monthStart).reduce((s, x) => s + x.amount, 0)
  const thisMonthExpense = expenses.filter((x) => x.date >= monthStart).reduce((s, x) => s + x.amount, 0)
  const lastMonthExpense = expenses.filter((x) => x.date >= lastMonthStart && x.date < monthStart).reduce((s, x) => s + x.amount, 0)

  const expenseByCategory = expenses
    .filter((e) => e.date >= sixMonthsAgo)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

  const fuelTotal = fuel.reduce((s, f) => s + f.amount, 0)
  const serviceTotal = services.reduce((s, x) => s + x.amount, 0)

  return {
    netWorth: bankTotal + assetTotal + propertyValue - cardDebt - loanDebt,
    bankTotal,
    assetTotal,
    propertyValue,
    cardDebt,
    cardLimit,
    cardUsageRate: cardLimit > 0 ? (cardDebt / cardLimit) * 100 : 0,
    loanDebt,
    loanCount: loans.length,
    monthlyLoanPayment: loans.reduce((s, l) => s + l.monthlyPayment, 0),
    thisMonthIncome,
    lastMonthIncome,
    thisMonthExpense,
    lastMonthExpense,
    savingsRate: thisMonthIncome > 0 ? ((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100 : 0,
    expenseByCategory,
    assets: assets.map((a) => ({ type: a.assetType, name: a.name, value: a.totalValue })),
    properties: properties.map((p) => ({
      name: p.name,
      value: p.currentValue,
      rent: p.contracts.find((c) => c.status === 'Aktif')?.monthlyRent || 0,
    })),
    vehicles: {
      count: vehicles.length,
      fuelTotal,
      serviceTotal,
      totalCost: fuelTotal + serviceTotal,
    },
  }
}

export async function POST(req: NextRequest) {
  const body = await readBody<{ question?: string }>(req)
  const question = body?.question

  try {
    const ctx = await buildContext()

    const zai = await ZAI.create()

    const systemPrompt = `Sen LifeOS finansal asistanısın. Türkçe yanıt ver. Kullanıcının finansal verisini analiz edip:
1. Net değer, borç oranı, tasarruf oranı gibi metrikleri değerlendir
2. Riskli alanları tespit et (yüksek kart kullanımı, düşük tasarruf, aşırı harcama kategorisi)
3. Somut, uygulanabilir öneriler ver (sayılarla destekle)
4. Pozitif alanları da vurgula

Yanıtını HER ZAMAN geçerli JSON olarak ver, şu formatta:
{
  "summary": "Kısa 2-3 cümlelik genel durum",
  "insights": [
    { "type": "success|warning|info|danger", "title": "Başlık", "description": "Detay (sayılarla)", "category": "budget|debt|savings|investment|spending" }
  ],
  "recommendations": ["Öneri 1", "Öneri 2", "Öneri 3"]
}
JSON dışında hiçbir metin yazma.`

    const userContent = question
      ? `Kullanıcının sorusu: "${question}"\n\nFinansal veri:\n${JSON.stringify(ctx, null, 2)}`
      : `Kullanıcının finansal verisini analiz et ve öneriler ver:\n${JSON.stringify(ctx, null, 2)}`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content || ''

    // JSON'u çıkar (bazen markdown kod bloğu içinde gelir)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return ok({ summary: raw, insights: [], recommendations: [] })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return ok(parsed)
  } catch (e) {
    console.error('AI insights error:', e)
    return fail('AI analizi şu anda kullanılamıyor. Lütfen tekrar deneyin.', 500)
  }
}
