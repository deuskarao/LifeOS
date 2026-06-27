import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { store, user } = await getStore()
    const items = await store.list('credit-cards', user.role === 'admin' ? 'admin-all' : user.id)
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
    const { bankName, cardName, cardType, limit, balance, cutoffDay, dueDay, color } = body as Record<string, string | number>
    if (!bankName || !cardName) return fail('Banka ve kart adı zorunludur')
    const item = await store.create('credit-cards', user.id, {
      bankName, cardName, cardType: (cardType as string) || 'Visa',
      limit: Number(limit) || 0, balance: Number(balance) || 0,
      cutoffDay: Number(cutoffDay) || 1, dueDay: Number(dueDay) || 15,
      color: (color as string) || '#8b5cf6',
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
