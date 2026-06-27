import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'
import { writeLog } from '@/lib/logger'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await readBody<{ name?: string; email?: string; password?: string }>(req)
  if (!body) return fail('Geçersiz istek')

  const name = body.name?.trim()
  const email = body.email?.toLowerCase().trim()
  const password = body.password

  if (!name || !email || !password) return fail('Ad, email ve şifre zorunludur')
  if (password.length < 6) return fail('Şifre en az 6 karakter olmalıdır')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Geçerli bir email giriniz')

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return fail('Bu email zaten kayıtlı')

  const hashed = await bcrypt.hash(password, 10)
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'user',
      level: 'standard',
    },
  })

  // Kayıt log'u
  await writeLog('register', user, 'Yeni kullanıcı kaydı', req)

  return ok({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    level: user.level,
  }, { status: 201 })
}
