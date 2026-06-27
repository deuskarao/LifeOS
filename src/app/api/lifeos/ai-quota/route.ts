import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/lifeos'
import { getSessionUser } from '@/lib/store'

export const dynamic = 'force-dynamic'

/** Kullanıcının AI soru hak durumunu döndürür ve gerekirse sıfırlar. */
export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return fail('Yetkisiz', 401)

    // Demo kullanıcıları için sınırsız (memory'de tutulmaz)
    if (sessionUser.role === 'demo') {
      return ok({
        level: 'premium',
        canUseAi: true,
        usedToday: 0,
        limit: 999,
        remaining: 999,
        isPremium: true,
      })
    }

    const user = await db.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) return fail('Kullanıcı bulunamadı', 404)

    const isPremium = user.level === 'premium'
    const limit = isPremium ? 5 : 1

    // Günlük sıfırlama — son 24 saatte sıfırlanmadıysa sıfırla
    const now = new Date()
    let usedToday = user.aiQuestionsUsed
    if (user.aiQuestionsResetAt) {
      const hoursSinceReset = (now.getTime() - user.aiQuestionsResetAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceReset >= 24) {
        usedToday = 0
        await db.user.update({
          where: { id: user.id },
          data: { aiQuestionsUsed: 0, aiQuestionsResetAt: now },
        })
      }
    } else if (usedToday > 0) {
      usedToday = 0
      await db.user.update({
        where: { id: user.id },
        data: { aiQuestionsUsed: 0, aiQuestionsResetAt: now },
      })
    }

    return ok({
      level: user.level,
      canUseAi: usedToday < limit,
      usedToday,
      limit,
      remaining: Math.max(0, limit - usedToday),
      isPremium,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
