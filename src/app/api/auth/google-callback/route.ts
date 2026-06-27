import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase-client'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * Supabase Google OAuth callback.
 * Supabase '/auth/v1/callback' URL'sine yönlendirir, sonra buraya ?code= ile döner.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, url.origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', url.origin))
  }

  try {
    const { data, error: sbError } = await supabase.auth.exchangeCodeForSession(code)

    if (sbError || !data.user) {
      console.error('Supabase auth error:', sbError)
      return NextResponse.redirect(new URL('/?error=auth_failed', url.origin))
    }

    const email = data.user.email!
    const name = (data.user.user_metadata?.full_name as string) || email.split('@')[0]

    // DB'de user var mı kontrol et, yoksa oluştur
    let user = await db.user.findUnique({ where: { email } })
    if (!user) {
      const randomPass = randomUUID()
      user = await db.user.create({
        data: {
          email,
          name,
          password: await bcrypt.hash(randomPass, 10),
          role: 'user',
          level: 'standard',
        },
      })
    }

    await supabase.auth.signOut()

    // Magic token ile NextAuth login'e yönlendir
    const magicToken = randomUUID()
    googleLoginTokens.set(magicToken, { email, expires: Date.now() + 30_000 })

    return NextResponse.redirect(
      new URL(`/api/auth/google-login?token=${magicToken}`, url.origin)
    )
  } catch (e) {
    console.error('Google callback error:', e)
    return NextResponse.redirect(new URL('/?error=exception', url.origin))
  }
}

export const googleLoginTokens = new Map<string, { email: string; expires: number }>()
