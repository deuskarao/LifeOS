import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.asset.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { assetType, name, quantity, unitPrice, currency, notes } = body as Record<string, string | number | null>
  if (!assetType || !name) return fail('Varlık tipi ve adı zorunludur')
  const qty = Number(quantity) || 0
  const price = Number(unitPrice) || 0
  const item = await db.asset.create({
    data: {
      assetType: assetType as string,
      name: name as string,
      quantity: qty,
      unitPrice: price,
      totalValue: qty * price,
      currency: (currency as string) || 'TRY',
      notes: notes as string | null,
    },
  })
  return ok(item, { status: 201 })
}
