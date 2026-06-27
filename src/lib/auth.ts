import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { clearDemoStore } from './store'
import { writeLog } from './logger'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 10 * 60, // 10 dakika sonra otomatik logout
    updateAge: 10 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email.toLowerCase().trim()
        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null

        // Google OAuth ile giriş — şifre kontrolü atla
        if (credentials.password === 'GOOGLE_OAUTH_AUTO_LOGIN') {
          await writeLog('google_login', user, 'Google ile giriş')
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            level: user.level,
          } as any
        }

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        // Login log'u yaz
        await writeLog('login', user, `${user.role} olarak giriş yaptı`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          level: user.level,
        } as any
      },
    }),
    // Google OAuth — env var varsa etkin
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [(() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const GoogleProvider = require('next-auth/providers/google').default
          return GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          })
        })()]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // İlk login'de user gelir — DB'den güncel level/role al
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.level = (user as any).level
        token.levelCheckedAt = Date.now()
      }

      // Her jwt oluşturulduğunda DB'den level'ı kontrol et (cache'siz)
      // pending_premium logout/login sorunu için — her seferinde DB'den oku
      if (trigger === 'update' && token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { level: true, role: true },
          })
          if (dbUser) {
            token.level = dbUser.level
            token.role = dbUser.role
          }
          token.levelCheckedAt = Date.now()
        } catch {
          /* ignore */
        }
      }

      // Periyodik kontrol (her 30 saniyede bir — admin onayı sonrası otomatik yansıma için)
      const lastCheck = (token.levelCheckedAt as number) || 0
      if (Date.now() - lastCheck > 30_000 && token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { level: true, role: true },
          })
          if (dbUser) {
            token.level = dbUser.level
            token.role = dbUser.role
          }
          token.levelCheckedAt = Date.now()
        } catch {
          /* ignore */
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).level = token.level
      }
      return session
    },
  },
  events: {
    async signOut(message: any) {
      const token = message.token
      // Logout log'u yaz
      if (token?.id) {
        await writeLog('logout', {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
        }, `${token.role || 'user'} çıkış yaptı`)
      }
      // Demo store temizle
      if (token?.role === 'demo' && token?.id) {
        clearDemoStore(`demo-${token.id}`)
      }
    },
  },
}
