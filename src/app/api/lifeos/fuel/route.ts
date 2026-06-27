import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const vehicleId = url.searchParams.get('vehicleId')
  const items = await db.vehicleFuel.findMany({
    where: vehicleId ? { vehicleId } : undefined,
    include: { vehicle: true },
    orderBy: { date: 'desc' },
  })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { vehicleId, date, liters, amount, km, fuelType, station } = body as Record<string, string | number | null>
  if (!vehicleId) return fail('Araç zorunludur')
  const item = await db.vehicleFuel.create({
    data: {
      vehicleId: vehicleId as string,
      date: date ? new Date(date as string) : new Date(),
      liters: Number(liters) || 0,
      amount: Number(amount) || 0,
      km: Number(km) || 0,
      fuelType: (fuelType as string) || 'Benzin',
      station: station as string | null,
    },
  })
  // Aracın km'sini güncelle
  if (Number(km) > 0) {
    await db.vehicle.update({ where: { id: vehicleId as string }, data: { currentKm: Number(km) } })
  }
  return ok(item, { status: 201 })
}
