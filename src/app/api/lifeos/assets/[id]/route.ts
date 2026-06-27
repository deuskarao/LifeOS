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
      const b = body as Record<string, string | number | null>
      const qty = Number(b.quantity) || 0
      const price = Number(b.unitPrice) || 0
      const item = await store.update('assets', id, {
        assetType: b.assetType as string, name: b.name as string,
        quantity: qty, unitPrice: price, totalValue: qty * price,
        currency: b.currency as string, notes: b.notes as string | null,
      })
      return ok(item)
    } catch {
      return fail('Varlık bulunamadı', 404)
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
      await store.delete('assets', id)
      return ok({ id })
    } catch {
      return fail('Varlık bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
