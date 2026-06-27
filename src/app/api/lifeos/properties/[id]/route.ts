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
      const item = await store.update('properties', id, {
        name: b.name as string, type: b.type as string,
        address: b.address as string | null, city: b.city as string | null,
        purchasePrice: Number(b.purchasePrice), currentValue: Number(b.currentValue),
        monthlyRent: Number(b.monthlyRent), status: b.status as string,
        size: b.size ? Number(b.size) : null, rooms: b.rooms as string | null,
        notes: b.notes as string | null,
      })
      return ok(item)
    } catch {
      return fail('Mülk bulunamadı', 404)
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
      await store.delete('properties', id)
      return ok({ id })
    } catch {
      return fail('Mülk bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
