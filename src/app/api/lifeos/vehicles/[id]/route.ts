import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  if (url.searchParams.get('include') === 'records') {
    const [fuelRecords, serviceRecords] = await Promise.all([
      db.vehicleFuel.findMany({ where: { vehicleId: id }, orderBy: { date: 'desc' } }),
      db.vehicleService.findMany({ where: { vehicleId: id }, orderBy: { date: 'desc' } }),
    ])
    return ok({ fuelRecords, serviceRecords })
  }
  const item = await db.vehicle.findUnique({ where: { id } })
  if (!item) return fail('Araç bulunamadı', 404)
  return ok(item)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  try {
    const b = body as Record<string, string | number | null>
    const item = await db.vehicle.update({
      where: { id },
      data: {
        name: b.name as string,
        plate: b.plate as string | null,
        brand: b.brand as string | null,
        model: b.model as string | null,
        year: b.year ? Number(b.year) : null,
        fuelType: b.fuelType as string,
        currentKm: Number(b.currentKm),
        color: b.color as string | null,
        notes: b.notes as string | null,
      },
    })
    return ok(item)
  } catch {
    return fail('Araç bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.vehicle.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Araç bulunamadı', 404)
  }
}
