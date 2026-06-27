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
      const b = body as Record<string, string | number>
      const item = await store.update('credit-cards', id, {
        bankName: b.bankName as string, cardName: b.cardName as string, cardType: b.cardType as string,
        limit: Number(b.limit), balance: Number(b.balance), cutoffDay: Number(b.cutoffDay),
        dueDay: Number(b.dueDay), color: b.color as string,
      })
      return ok(item)
    } catch {
      return fail('Kart bulunamadı', 404)
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
      await store.delete('credit-cards', id)
      return ok({ id })
    } catch {
      return fail('Kart bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
