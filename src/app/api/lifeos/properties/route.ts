import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { store, user } = await getStore()
    const items = await store.list('properties', user.role === 'admin' ? 'admin-all' : user.id)
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
    const { name, type, address, city, purchasePrice, currentValue, monthlyRent, status, size, rooms, notes } = body as Record<string, string | number | null>
    if (!name) return fail('Mülk adı zorunludur')
    const item = await store.create('properties', user.id, {
      name: name as string, type: (type as string) || 'Daire',
      address: address as string | null, city: city as string | null,
      purchasePrice: Number(purchasePrice) || 0, currentValue: Number(currentValue) || 0,
      monthlyRent: Number(monthlyRent) || 0, status: (status as string) || 'Boş',
      size: size ? Number(size) : null, rooms: rooms as string | null,
      notes: notes as string | null,
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
