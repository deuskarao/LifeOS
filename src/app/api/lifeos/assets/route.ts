import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { store, user } = await getStore()
    const items = await store.list('assets', user.role === 'admin' ? 'admin-all' : user.id)
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
    const { assetType, name, quantity, unitPrice, currency, notes } = body as Record<string, string | number | null>
    if (!assetType || !name) return fail('Varlık tipi ve adı zorunludur')
    const qty = Number(quantity) || 0
    const price = Number(unitPrice) || 0
    const item = await store.create('assets', user.id, {
      assetType: assetType as string, name: name as string,
      quantity: qty, unitPrice: price, totalValue: qty * price,
      currency: (currency as string) || 'TRY', notes: notes as string | null,
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
