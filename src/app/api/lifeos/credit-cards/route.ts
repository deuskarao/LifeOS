import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.creditCard.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { bankName, cardName, cardType, limit, balance, cutoffDay, dueDay, color } = body as Record<string, string | number>
  if (!bankName || !cardName) return fail('Banka ve kart adı zorunludur')
  const item = await db.creditCard.create({
    data: {
      bankName,
      cardName,
      cardType: (cardType as string) || 'Visa',
      limit: Number(limit) || 0,
      balance: Number(balance) || 0,
      cutoffDay: Number(cutoffDay) || 1,
      dueDay: Number(dueDay) || 15,
      color: (color as string) || '#8b5cf6',
    },
  })
  return ok(item, { status: 201 })
}
