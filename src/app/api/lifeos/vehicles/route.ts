import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { store, user } = await getStore()
    const items = await store.list('vehicles', user.role === 'admin' ? 'admin-all' : user.id)
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
    const { name, plate, brand, model, year, fuelType, currentKm, color, notes } = body as Record<string, string | number | null>
    if (!name) return fail('Araç adı zorunludur')
    const item = await store.create('vehicles', user.id, {
      name: name as string, plate: plate as string | null,
      brand: brand as string | null, model: model as string | null,
      year: year ? Number(year) : null, fuelType: (fuelType as string) || 'Benzin',
      currentKm: Number(currentKm) || 0, color: color as string | null,
      notes: notes as string | null,
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
