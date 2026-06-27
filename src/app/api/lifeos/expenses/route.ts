import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const url = new URL(req.url)
    const months = parseInt(url.searchParams.get('months') || '6')
    const items = await store.list('expenses', user.role === 'admin' ? 'admin-all' : user.id, { months })
    return ok(items)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

export async function POST(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const body = await readBody<Record<string, unknown>>(req)
    if (!body) return fail('Geçersiz istek')
    const { category, amount, currency, date, paymentMethod, notes, paymentSourceId, paymentSourceType } = body as Record<string, string | number | null>
    if (!category || amount === undefined) return fail('Kategori ve tutar zorunludur')
    const expenseAmount = Number(amount) || 0

    const item = await store.create('expenses', user.id, {
      category: category as string, amount: expenseAmount,
      currency: (currency as string) || 'TRY',
      date: date ? new Date(date as string) : new Date(),
      paymentMethod: (paymentMethod as string) || 'Nakit', notes: notes as string | null,
    })

    // Ödeme kaynağı varsa kart/banka bakiyesini güncelle
    if (paymentSourceId && paymentSourceType && user.role !== 'demo') {
      try {
        if (paymentSourceType === 'card') {
          // Kart borcunu artır
          const card = await db.creditCard.findUnique({ where: { id: paymentSourceId as string } })
          if (card) {
            await db.creditCard.update({
              where: { id: card.id },
              data: { balance: card.balance + expenseAmount },
            })
          }
        } else if (paymentSourceType === 'bank') {
          // Banka bakiyesini düşür
          const bank = await db.bankAccount.findUnique({ where: { id: paymentSourceId as string } })
          if (bank) {
            await db.bankAccount.update({
              where: { id: bank.id },
              data: { balance: bank.balance - expenseAmount },
            })
          }
        }
      } catch {
        // Bakiye güncelleme başarısız olsa bile expense kaydı başarılı
      }
    }

    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
