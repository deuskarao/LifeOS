import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  try {
    const b = body as Record<string, string | number | null>
    const item = await db.property.update({
      where: { id },
      data: {
        name: b.name as string,
        type: b.type as string,
        address: b.address as string | null,
        city: b.city as string | null,
        purchasePrice: Number(b.purchasePrice),
        currentValue: Number(b.currentValue),
        monthlyRent: Number(b.monthlyRent),
        status: b.status as string,
        size: b.size ? Number(b.size) : null,
        rooms: b.rooms as string | null,
        notes: b.notes as string | null,
      },
    })
    return ok(item)
  } catch {
    return fail('Mülk bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.property.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Mülk bulunamadı', 404)
  }
}
