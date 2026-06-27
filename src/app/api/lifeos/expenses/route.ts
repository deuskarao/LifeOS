import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const months = parseInt(url.searchParams.get('months') || '6')
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const items = await db.expense.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'desc' },
  })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { category, amount, currency, date, paymentMethod, notes } = body as Record<string, string | number | null>
  if (!category || amount === undefined) return fail('Kategori ve tutar zorunludur')
  const item = await db.expense.create({
    data: {
      category: category as string,
      amount: Number(amount) || 0,
      currency: (currency as string) || 'TRY',
      date: date ? new Date(date as string) : new Date(),
      paymentMethod: (paymentMethod as string) || 'Nakit',
      notes: notes as string | null,
    },
  })
  return ok(item, { status: 201 })
}
