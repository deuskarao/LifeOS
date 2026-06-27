import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.vehicle.findMany({
    include: { _count: { select: { fuelRecords: true, serviceRecords: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { name, plate, brand, model, year, fuelType, currentKm, color, notes } = body as Record<string, string | number | null>
  if (!name) return fail('Araç adı zorunludur')
  const item = await db.vehicle.create({
    data: {
      name: name as string,
      plate: plate as string | null,
      brand: brand as string | null,
      model: model as string | null,
      year: year ? Number(year) : null,
      fuelType: (fuelType as string) || 'Benzin',
      currentKm: Number(currentKm) || 0,
      color: color as string | null,
      notes: notes as string | null,
    },
  })
  return ok(item, { status: 201 })
}
