import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { store, user } = await getStore()
    const items = await store.list('contracts', user.role === 'admin' ? 'admin-all' : user.id)
    return ok(items)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

export async function POST(req: NextRequest) {
  try {
    const { store, user } = await getStore()
    const body = await readBody<Record<string, unknown>>(req)
    if (!body) return fail('Geçersiz istek')
    const { propertyId, tenantName, tenantPhone, tenantEmail, monthlyRent, startDate, endDate, deposit, status, notes } = body as Record<string, string | number | null>
    if (!propertyId || !tenantName) return fail('Mülk ve kiracı adı zorunludur')
    const item = await store.create('contracts', user.id, {
      propertyId: propertyId as string, tenantName: tenantName as string,
      tenantPhone: tenantPhone as string | null, tenantEmail: tenantEmail as string | null,
      monthlyRent: Number(monthlyRent) || 0,
      startDate: startDate ? new Date(startDate as string) : new Date(),
      endDate: endDate ? new Date(endDate as string) : null,
      deposit: Number(deposit) || 0, status: (status as string) || 'Aktif',
      notes: notes as string | null,
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
