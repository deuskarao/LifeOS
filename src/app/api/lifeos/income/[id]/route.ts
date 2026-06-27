import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  try {
    const b = body as Record<string, string | number | boolean | null>
    const item = await db.income.update({
      where: { id },
      data: {
        source: b.source as string,
        amount: Number(b.amount),
        currency: b.currency as string,
        category: b.category as string,
        date: b.date ? new Date(b.date as string) : undefined,
        recurring: Boolean(b.recurring),
        notes: b.notes as string | null,
      },
    })
    return ok(item)
  } catch {
    return fail('Kayıt bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.income.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Kayıt bulunamadı', 404)
  }
}
