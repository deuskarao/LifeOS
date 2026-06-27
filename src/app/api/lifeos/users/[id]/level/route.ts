import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/lifeos'
import { getSessionUser } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Kullanıcı seviyesini güncelle (standart/premium). Admin VE kullanıcı kendisi yapabilir. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return fail('Yetkisiz', 401)

    const { id } = await params
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    const isAdmin = sessionUser.role === 'admin'
    if (!isAdmin && sessionUser.id !== id) return fail('Yetkisiz', 403)

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return fail('Kullanıcı bulunamadı', 404)
    if (existing.role === 'demo') return fail('Demo kullanıcısının seviyesi değiştirilemez', 400)

    if (action === 'reset-quota') {
      await db.user.update({
        where: { id },
        data: { aiQuestionsUsed: 0, aiQuestionsResetAt: new Date() },
      })
      return ok({ id, aiQuestionsUsed: 0 })
    }

    const body = await req.json().catch(() => null) as { level?: string } | null
    if (!body?.level) return fail('Level gerekli')
    if (!['standard', 'premium'].includes(body.level)) return fail('Geçersiz level')

    const updated = await db.user.update({
      where: { id },
      data: {
        level: body.level,
        aiQuestionsUsed: 0,
        aiQuestionsResetAt: new Date(),
      },
      select: { id: true, email: true, name: true, role: true, level: true },
    })
    return ok(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
