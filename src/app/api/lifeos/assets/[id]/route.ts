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
    const qty = Number(b.quantity) || 0
    const price = Number(b.unitPrice) || 0
    const item = await db.asset.update({
      where: { id },
      data: {
        assetType: b.assetType as string,
        name: b.name as string,
        quantity: qty,
        unitPrice: price,
        totalValue: qty * price,
        currency: b.currency as string,
        notes: b.notes as string | null,
      },
    })
    return ok(item)
  } catch {
    return fail('Varlık bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.asset.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Varlık bulunamadı', 404)
  }
}
