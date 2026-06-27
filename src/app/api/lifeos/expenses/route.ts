import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

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
    const { category, amount, currency, date, paymentMethod, notes } = body as Record<string, string | number | null>
    if (!category || amount === undefined) return fail('Kategori ve tutar zorunludur')
    const item = await store.create('expenses', user.id, {
      category: category as string, amount: Number(amount) || 0,
      currency: (currency as string) || 'TRY',
      date: date ? new Date(date as string) : new Date(),
      paymentMethod: (paymentMethod as string) || 'Nakit', notes: notes as string | null,
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
