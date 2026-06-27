import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.rentalContract.findMany({
    include: { property: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { propertyId, tenantName, tenantPhone, tenantEmail, monthlyRent, startDate, endDate, deposit, status, notes } = body as Record<string, string | number | null>
  if (!propertyId || !tenantName) return fail('Mülk ve kiracı adı zorunludur')
  const item = await db.rentalContract.create({
    data: {
      propertyId: propertyId as string,
      tenantName: tenantName as string,
      tenantPhone: tenantPhone as string | null,
      tenantEmail: tenantEmail as string | null,
      monthlyRent: Number(monthlyRent) || 0,
      startDate: startDate ? new Date(startDate as string) : new Date(),
      endDate: endDate ? new Date(endDate as string) : null,
      deposit: Number(deposit) || 0,
      status: (status as string) || 'Aktif',
      notes: notes as string | null,
    },
  })
  return ok(item, { status: 201 })
}
