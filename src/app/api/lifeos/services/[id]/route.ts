import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    try {
      await store.delete('services', id)
      return ok({ id })
    } catch {
      return fail('Kayıt bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
