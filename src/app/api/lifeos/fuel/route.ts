import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const url = new URL(req.url)
    const vehicleId = url.searchParams.get('vehicleId')
    let items = await store.list('fuel', user.role === 'admin' ? 'admin-all' : user.id)
    if (vehicleId) items = items.filter((i: { vehicleId: string }) => i.vehicleId === vehicleId)
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
    const { vehicleId, date, liters, amount, fuelType, station } = body as Record<string, string | number | null>
    if (!vehicleId) return fail('Araç zorunludur')
    const fuelAmount = Number(amount) || 0
    const fuelDate = date ? new Date(date as string) : new Date()

    const item = await store.create('fuel', user.id, {
      vehicleId: vehicleId as string,
      date: fuelDate,
      liters: Number(liters) || 0, amount: fuelAmount,
      fuelType: (fuelType as string) || 'Benzin',
      station: station as string | null,
    })

    // Otomatik olarak Giderler menüsüne de düşür
    try {
      await store.create('expenses', user.id, {
        category: 'Yakıt',
        amount: fuelAmount,
        currency: 'TRY',
        date: fuelDate,
        paymentMethod: 'Kart',
        notes: `Araç yakıt kaydı — ${station || ''}`.trim(),
      })
    } catch {
      // Expense oluşturma başarısız olsa bile fuel kaydı başarılı
    }

    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
