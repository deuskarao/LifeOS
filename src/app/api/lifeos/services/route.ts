import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const url = new URL(req.url)
    const vehicleId = url.searchParams.get('vehicleId')
    let items = await store.list('services', user.role === 'admin' ? 'admin-all' : user.id)
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
    const { vehicleId, date, serviceType, amount, km, notes } = body as Record<string, string | number | null>
    if (!vehicleId || !serviceType) return fail('Araç ve servis tipi zorunludur')
    const serviceAmount = Number(amount) || 0
    const serviceDate = date ? new Date(date as string) : new Date()

    const item = await store.create('services', user.id, {
      vehicleId: vehicleId as string,
      date: serviceDate,
      serviceType: serviceType as string, amount: serviceAmount,
      km: Number(km) || 0, notes: notes as string | null,
    })

    // Otomatik olarak Giderler menüsüne de düşür
    try {
      await store.create('expenses', user.id, {
        category: 'Servis/Bakım',
        amount: serviceAmount,
        currency: 'TRY',
        date: serviceDate,
        paymentMethod: 'Kart',
        notes: `Araç servis — ${serviceType}`.trim(),
      })
    } catch {
      // Expense oluşturma başarısız olsa bile servis kaydı başarılı
    }

    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
