import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/lifeos'
import { getSessionUser } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Admin için tüm logları getir. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) return fail('Yetkisiz', 401)
    if (user.role !== 'admin') return fail('Admin yetkisi gerekli', 403)

    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const action = url.searchParams.get('action')

    const logs = await db.log.findMany({
      where: action ? { action } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    })

    return ok(logs)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
