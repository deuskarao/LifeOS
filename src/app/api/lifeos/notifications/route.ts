import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

interface Notification {
  id: string
  type: 'payment' | 'debt' | 'rental' | 'budget' | 'balance' | 'vehicle' | 'card'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  amount?: number
  dueDate?: string
  daysLeft?: number
  action?: string
}

/** Tüm finansal veriyi tarar ve gerçek bildirimler üretir. */
export async function GET(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const uid = user.role === 'admin' ? 'admin-all' : user.id

    const url = new URL(req.url)
    const onlyUnread = url.searchParams.get('unread') === '1'

    const now = new Date()
    const today = now.getDate()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [banks, cards, loans, incomes, expenses, properties, vehicles, services] = await Promise.all([
      store.list('bank-accounts', uid),
      store.list('credit-cards', uid),
      store.list('loans', uid),
      store.list('income', uid, { months: 1 }),
      store.list('expenses', uid, { months: 1 }),
      store.list('properties', uid),
      store.list('vehicles', uid),
      store.list('services', uid),
    ])

    // Vehicles için son servis kaydını ekle
    const vehiclesWithService = vehicles.map((v: any) => ({
      ...v,
      serviceRecords: services.filter((s: any) => s.vehicleId === v.id).slice(0, 1),
    }))

    const notifications: Notification[] = []

    // 1. Kredi kartı ödeme günleri
  for (const card of cards) {
    if (card.balance <= 0) continue
    const daysLeft = card.dueDay - today
    if (daysLeft < 0) {
      // Son ödeme günü geçti ama hala borç var
      notifications.push({
        id: `card-overdue-${card.id}`,
        type: 'card',
        severity: 'high',
        title: `${card.cardName} ödeme günü geçti`,
        description: `${card.bankName} kartının son ödeme günü ${card.dueDay}. gündü. ${card.balance > 0 ? 'Borç hala mevcut.' : ''}`,
        amount: card.balance,
        dueDate: `${now.getMonth() + 1}. ay ${card.dueDay}. gün`,
        daysLeft: daysLeft,
        action: 'credit-cards',
      })
    } else if (daysLeft <= 7) {
      notifications.push({
        id: `card-due-${card.id}`,
        type: 'payment',
        severity: daysLeft <= 3 ? 'high' : 'medium',
        title: `${card.cardName} ödemesi yaklaşıyor`,
        description: `${card.bankName} kartının son ödeme gününe ${daysLeft} gün kaldı.`,
        amount: card.balance,
        dueDate: `Bu ay ${card.dueDay}. gün`,
        daysLeft,
        action: 'credit-cards',
      })
    }
  }

  // 2. Yüksek kart kullanımı (>85%)
  for (const card of cards) {
    if (card.limit <= 0) continue
    const usage = (card.balance / card.limit) * 100
    if (usage >= 85) {
      notifications.push({
        id: `card-usage-${card.id}`,
        type: 'debt',
        severity: usage >= 95 ? 'high' : 'medium',
        title: `${card.cardName} limit kullanımı yüksek`,
        description: `Kart limitinin %${usage.toFixed(0)}'i kullanıldı. Limit aşımı riskine dikkat.`,
        amount: card.balance,
        action: 'credit-cards',
      })
    }
  }

  // 3. Kredi taksit hatırlatma (aylık ödeme)
  for (const loan of loans) {
    if (loan.remainingAmount <= 0) continue
    // Ay başı + 5 gün içinde hatırlat
    if (today <= 10) {
      notifications.push({
        id: `loan-${loan.id}`,
        type: 'payment',
        severity: today <= 5 ? 'medium' : 'low',
        title: `${loan.loanName} taksiti`,
        description: `${loan.lender} kredisi için aylık ${loan.monthlyPayment} ödeme bekleniyor. Kalan borç: ${loan.remainingAmount}.`,
        amount: loan.monthlyPayment,
        dueDate: 'Bu ay',
        daysLeft: 15 - today,
        action: 'loans',
      })
    }
    // Kredi sonu yaklaşıyorsa
    if (loan.endDate) {
      const daysToEnd = Math.ceil((loan.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysToEnd > 0 && daysToEnd <= 60) {
        notifications.push({
          id: `loan-ending-${loan.id}`,
          type: 'debt',
          severity: daysToEnd <= 30 ? 'medium' : 'low',
          title: `${loan.loanName} bitiyor`,
          description: `${loan.lender} kredisi ${daysToEnd} gün içinde sona eriyor. ${loan.installmentsTotal - loan.installmentsPaid} taksit kaldı.`,
          dueDate: loan.endDate.toISOString(),
          daysLeft: daysToEnd,
          action: 'loans',
        })
      }
    }
  }

  // 4. Kira sözleşme bitişleri (30 gün içinde)
  for (const prop of properties) {
    for (const contract of prop.contracts) {
      if (contract.status !== 'Aktif' || !contract.endDate) continue
      const daysToEnd = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysToEnd > 0 && daysToEnd <= 60) {
        notifications.push({
          id: `contract-${contract.id}`,
          type: 'rental',
          severity: daysToEnd <= 15 ? 'high' : daysToEnd <= 30 ? 'medium' : 'low',
          title: `${prop.name} kira sözleşmesi bitiyor`,
          description: `${contract.tenantName} ile sözleşme ${daysToEnd} gün sonra sona eriyor. Yenileme gerekli.`,
          amount: contract.monthlyRent,
          dueDate: contract.endDate.toISOString(),
          daysLeft: daysToEnd,
          action: 'rental',
        })
      }
    }
    // Boş mülk uyarısı (kira geliri kaybı)
    if (prop.status === 'Boş' && prop.monthlyRent > 0) {
      notifications.push({
        id: `property-empty-${prop.id}`,
        type: 'rental',
        severity: 'medium',
        title: `${prop.name} boş`,
        description: `Mülk boş. Aylık ${prop.monthlyRent} potansiyel kira geliri kaybı.`,
        amount: prop.monthlyRent,
        action: 'rental',
      })
    }
  }

  // 5. Bütçe aşımı kontrolü
  const monthIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const monthExpense = expenses.reduce((s, e) => s + e.amount, 0)
  if (monthIncome > 0 && monthExpense > monthIncome) {
    notifications.push({
      id: 'budget-overrun',
      type: 'budget',
      severity: 'high',
      title: 'Bu ay bütçe aşımı',
      description: `Aylık giderler (${monthExpense.toFixed(0)}) gelirleri (${monthIncome.toFixed(0)}) aşıyor. ${monthExpense - monthIncome} açık.`,
      amount: monthExpense - monthIncome,
      action: 'expenses',
    })
  }
  // Tasarruf oranı düşükse (<10%)
  if (monthIncome > 0) {
    const savingsRate = ((monthIncome - monthExpense) / monthIncome) * 100
    if (savingsRate < 10 && savingsRate >= 0) {
      notifications.push({
        id: 'low-savings',
        type: 'budget',
        severity: 'medium',
        title: 'Tasarruf oranı düşük',
        description: `Bu ay tasarruf oranınız %${savingsRate.toFixed(1)}. Sağlıklı finansal durum için %20+ önerilir.`,
        action: 'reports',
      })
    }
  }

  // 6. Düşük banka bakiyesi
  for (const bank of banks) {
    if (bank.accountType === 'Nakit') continue
    if (bank.balance < 5000 && bank.balance > 0) {
      notifications.push({
        id: `bank-low-${bank.id}`,
        type: 'balance',
        severity: 'low',
        title: `${bank.accountName} bakiyesi düşük`,
        description: `${bank.bankName} - ${bank.accountName} hesabında ${bank.balance.toFixed(2)} kaldı.`,
        amount: bank.balance,
        action: 'bank-accounts',
      })
    }
  }

  // 7. Araç servis zamanı (son servisten 6+ ay veya 10000+ km geçtiyse)
  for (const vehicle of vehiclesWithService) {
    const lastService = vehicle.serviceRecords[0]
    if (!lastService) {
      notifications.push({
        id: `vehicle-noservice-${vehicle.id}`,
        type: 'vehicle',
        severity: 'low',
        title: `${vehicle.name} servis geçmişi yok`,
        description: 'Araç için hiç servis kaydı yok. Periyodik bakım önerilir.',
        action: 'vehicles',
      })
      continue
    }
    const monthsSinceService = (now.getTime() - lastService.date.getTime()) / (1000 * 60 * 60 * 24 * 30)
    const kmSinceService = vehicle.currentKm - lastService.km
    if (monthsSinceService >= 6 || kmSinceService >= 10000) {
      notifications.push({
        id: `vehicle-service-${vehicle.id}`,
        type: 'vehicle',
        severity: monthsSinceService >= 12 ? 'medium' : 'low',
        title: `${vehicle.name} servis zamanı`,
        description: `Son servisten ${Math.floor(monthsSinceService)} ay geçti, ${kmSinceService} km yol yapıldı. Periyodik bakım önerilir.`,
        action: 'vehicles',
      })
    }
  }

  // Sırala: yüksek öncelik + yakınsa önde
  const severityOrder = { high: 0, medium: 1, low: 2 }
  notifications.sort((a, b) => {
    const sa = severityOrder[a.severity]
    const sb = severityOrder[b.severity]
    if (sa !== sb) return sa - sb
    return (a.daysLeft ?? 999) - (b.daysLeft ?? 999)
  })

  // Okundu durumunu client-side localStorage'dan yönetiyoruz (DB'de tutmuyoruz, lightweight)
  // Burada tüm bildirimleri döndürüyoruz, frontend filtreler
  return ok({
    notifications,
    unreadCount: notifications.filter((n) => n.severity === 'high').length,
    totalCount: notifications.length,
  })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
