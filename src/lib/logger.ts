import { db } from './db'
import { NextRequest } from 'next/server'

export type LogAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'premium_request'
  | 'premium_approved'
  | 'premium_rejected'
  | 'ai_analysis'
  | 'google_login'

/** Sistem log'u yazar — DB'ye kaydeder. */
export async function writeLog(
  action: LogAction,
  user?: { id?: string; email?: string; name?: string } | null,
  details?: string,
  req?: NextRequest
) {
  try {
    await db.log.create({
      data: {
        userId: user?.id || null,
        userEmail: user?.email || null,
        userName: user?.name || null,
        action,
        details: details || null,
        ipAddress: req?.headers?.get('x-forwarded-for') || req?.headers?.get('x-real-ip') || null,
      },
    })
  } catch (e) {
    // Log hatası uygulamayı kırmasın
    console.error('Log write error:', e)
  }
}
