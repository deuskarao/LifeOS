import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'
import { writeLog } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/** Kredi kartına ödeme yap — kart borcunu düşürür, banka bakiyesini düşürür, gider kaydı oluşturur. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store, user } = await getStore()
    const { id } = await params
    const body = await readBody<{ amount?: number; bankAccountId?: string; date?: string }>(req)
    if (!body?.amount || body.amount <= 0) return fail('Geçerli bir tutar giriniz')

    const paymentAmount = Number(body.amount)

    // Kartı bul
    const card = user.role === 'demo'
      ? null // Demo için memory store'da kart güncelleme
      : await db.creditCard.findUnique({ where: { id } })

    if (user.role !== 'demo' && !card) return fail('Kart bulunamadı', 404)

    // Kart borcunu düşür
    if (user.role !== 'demo' && card) {
      await db.creditCard.update({
        where: { id },
        data: { balance: Math.max(0, card.balance - paymentAmount) },
      })

      // Banka hesabından düşür (eğer seçilirse)
      if (body.bankAccountId) {
        const bank = await db.bankAccount.findUnique({ where: { id: body.bankAccountId } })
        if (bank) {
          await db.bankAccount.update({
            where: { id: bank.id },
            data: { balance: bank.balance - paymentAmount },
          })
        }
      }
    }

    // Gider kaydı oluştur (Kart Ödemesi kategorisi)
    await store.create('expenses', user.id, {
      category: 'Kart Ödemesi',
      amount: paymentAmount,
      currency: 'TRY',
      date: body.date ? new Date(body.date) : new Date(),
      paymentMethod: 'Banka',
      notes: `${card?.cardName || 'Kart'} ödemesi`,
    })

    return ok({ id, paidAmount: paymentAmount, newBalance: card ? Math.max(0, card.balance - paymentAmount) : 0 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
