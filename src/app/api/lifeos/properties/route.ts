import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.property.findMany({
    include: { contracts: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { name, type, address, city, purchasePrice, currentValue, monthlyRent, status, size, rooms, notes } = body as Record<string, string | number | null>
  if (!name) return fail('Mülk adı zorunludur')
  const item = await db.property.create({
    data: {
      name: name as string,
      type: (type as string) || 'Daire',
      address: address as string | null,
      city: city as string | null,
      purchasePrice: Number(purchasePrice) || 0,
      currentValue: Number(currentValue) || 0,
      monthlyRent: Number(monthlyRent) || 0,
      status: (status as string) || 'Boş',
      size: size ? Number(size) : null,
      rooms: rooms as string | null,
      notes: notes as string | null,
    },
  })
  return ok(item, { status: 201 })
}
