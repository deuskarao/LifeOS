import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  try {
    const item = await db.creditCard.update({
      where: { id },
      data: {
        bankName: body.bankName as string,
        cardName: body.cardName as string,
        cardType: body.cardType as string,
        limit: Number(body.limit),
        balance: Number(body.balance),
        cutoffDay: Number(body.cutoffDay),
        dueDay: Number(body.dueDay),
        color: body.color as string,
      },
    })
    return ok(item)
  } catch {
    return fail('Kart bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.creditCard.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Kart bulunamadı', 404)
  }
}
