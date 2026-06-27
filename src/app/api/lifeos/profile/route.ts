import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getSessionUser } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Kullanıcı profil bilgilerini getir. */
export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return fail('Yetkisiz', 401)

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, name: true, role: true, level: true, createdAt: true },
    })
    if (!user) return fail('Kullanıcı bulunamadı', 404)

    return ok(user)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

/** Profil bilgilerini güncelle (ad). */
export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return fail('Yetkisiz', 401)

    const body = await readBody<{ name?: string }>(req)
    if (!body?.name?.trim()) return fail('Ad zorunludur')

    const updated = await db.user.update({
      where: { id: sessionUser.id },
      data: { name: body.name.trim() },
      select: { id: true, email: true, name: true, role: true, level: true },
    })
    return ok(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
