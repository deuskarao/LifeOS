import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const url = new URL(req.url)
    const months = parseInt(url.searchParams.get('months') || '6')
    const items = await store.list('income', user.role === 'admin' ? 'admin-all' : user.id, { months })
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
    const { source, amount, currency, category, date, recurring, notes } = body as Record<string, string | number | boolean | null>
    if (!source || amount === undefined) return fail('Kaynak ve tutar zorunludur')
    const item = await store.create('income', user.id, {
      source: source as string, amount: Number(amount) || 0,
      currency: (currency as string) || 'TRY', category: (category as string) || 'Diğer',
      date: date ? new Date(date as string) : new Date(),
      recurring: Boolean(recurring), notes: notes as string | null,
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
