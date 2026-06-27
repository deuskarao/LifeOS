import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.vehicleFuel.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Kayıt bulunamadı', 404)
  }
}
