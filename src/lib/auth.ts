import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'
import { clearDemoStore } from './store'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 10 * 60, // 10 dakika sonra otomatik logout
    updateAge: 10 * 60, // her 10 dakikada bir token yenile
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

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })
        if (!user) return null

        // Google OAuth ile giriş — şifre kontrolü atla
        if (credentials.password === 'GOOGLE_OAUTH_AUTO_LOGIN') {
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

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          level: user.level,
        } as any
      },
    }),
    // Google OAuth — GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET env var gerekir
    // .env.example'de talimat var
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
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.level = (user as any).level
        token.levelCheckedAt = Date.now()
      }
      // Level değişikliği sonrası session yenileme — her 10 saniyede bir DB'den kontrol
      // (upgrade/downgrade anında yansıması için)
      const lastCheck = (token.levelCheckedAt as number) || 0
      if (Date.now() - lastCheck > 10_000 && token.id) {
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
          /* ignore DB errors */
        }
      }
      // trigger update ile manuel yenileme
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
      if (token?.role === 'demo' && token?.id) {
        clearDemoStore(`demo-${token.id}`)
      }
    },
  },
}
