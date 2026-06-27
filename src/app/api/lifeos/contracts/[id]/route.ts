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
    const item = await db.rentalContract.update({
      where: { id },
      data: {
        tenantName: b.tenantName as string,
        tenantPhone: b.tenantPhone as string | null,
        tenantEmail: b.tenantEmail as string | null,
        monthlyRent: Number(b.monthlyRent),
        startDate: b.startDate ? new Date(b.startDate as string) : undefined,
        endDate: b.endDate ? new Date(b.endDate as string) : null,
        deposit: Number(b.deposit),
        status: b.status as string,
        notes: b.notes as string | null,
      },
    })
    return ok(item)
  } catch {
    return fail('Kontrat bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.rentalContract.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Kontrat bulunamadı', 404)
  }
}
