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
    const item = await db.expense.update({
      where: { id },
      data: {
        category: b.category as string,
        amount: Number(b.amount),
        currency: b.currency as string,
        date: b.date ? new Date(b.date as string) : undefined,
        paymentMethod: b.paymentMethod as string,
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
    await db.expense.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Kayıt bulunamadı', 404)
  }
}
