import { NextRequest, NextResponse } from 'next/server'
import { googleLoginTokens } from '../google-callback/route'

export const dynamic = 'force-dynamic'

/**
 * Google login magic token'ı alır, NextAuth credentials ile otomatik login için
 * login sayfasına yönlendirir (Google ile geldiğini belirterek).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?error=no_token', url.origin))
  }

  const data = googleLoginTokens.get(token)
  if (!data || data.expires < Date.now()) {
    return NextResponse.redirect(new URL('/?error=token_expired', url.origin))
  }

  // Token'ı temizle
  googleLoginTokens.delete(token)

  // Login sayfasına email ile yönlendir (kullanıcı şifre girmeden girebilir)
  // Basit yaklaşım: magic link ile direkt login
  const loginUrl = new URL('/', url.origin)
  loginUrl.searchParams.set('google_email', data.email)
  return NextResponse.redirect(loginUrl)
}
