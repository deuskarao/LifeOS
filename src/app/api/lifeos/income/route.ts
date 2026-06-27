import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const months = parseInt(url.searchParams.get('months') || '6')
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  const items = await db.income.findMany({
    where: { date: { gte: since } },
    orderBy: { date: 'desc' },
  })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { source, amount, currency, category, date, recurring, notes } = body as Record<string, string | number | boolean | null>
  if (!source || amount === undefined) return fail('Kaynak ve tutar zorunludur')
  const item = await db.income.create({
    data: {
      source: source as string,
      amount: Number(amount) || 0,
      currency: (currency as string) || 'TRY',
      category: (category as string) || 'Diğer',
      date: date ? new Date(date as string) : new Date(),
      recurring: Boolean(recurring),
      notes: notes as string | null,
    },
  })
  return ok(item, { status: 201 })
}
