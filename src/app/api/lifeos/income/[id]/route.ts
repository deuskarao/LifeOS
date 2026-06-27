import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    const body = await readBody<Record<string, unknown>>(req)
    if (!body) return fail('Geçersiz istek')
    try {
      const b = body as Record<string, string | number | boolean | null>
      const item = await store.update('income', id, {
        source: b.source as string, amount: Number(b.amount), currency: b.currency as string,
        category: b.category as string, date: b.date ? new Date(b.date as string) : undefined,
        recurring: Boolean(b.recurring), notes: b.notes as string | null,
      })
      return ok(item)
    } catch {
      return fail('Kayıt bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    try {
      await store.delete('income', id)
      return ok({ id })
    } catch {
      return fail('Kayıt bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
