import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    const url = new URL(req.url)
    if (url.searchParams.get('include') === 'records') {
      const item = await store.get('vehicles', id, { include: 'records' })
      if (!item) return fail('Araç bulunamadı', 404)
      return ok(item)
    }
    const item = await store.get('vehicles', id)
    if (!item) return fail('Araç bulunamadı', 404)
    return ok(item)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    const body = await readBody<Record<string, unknown>>(req)
    if (!body) return fail('Geçersiz istek')
    try {
      const b = body as Record<string, string | number | null>
      const item = await store.update('vehicles', id, {
        name: b.name as string, plate: b.plate as string | null,
        brand: b.brand as string | null, model: b.model as string | null,
        year: b.year ? Number(b.year) : null, fuelType: b.fuelType as string,
        currentKm: Number(b.currentKm), currentValue: Number(b.currentValue), color: b.color as string | null,
        notes: b.notes as string | null,
      })
      return ok(item)
    } catch {
      return fail('Araç bulunamadı', 404)
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
      await store.delete('vehicles', id)
      return ok({ id })
    } catch {
      return fail('Araç bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
