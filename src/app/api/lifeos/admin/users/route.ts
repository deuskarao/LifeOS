import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getSessionUser } from '@/lib/store'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) throw new Error('UNAUTHORIZED')
  if (user.role !== 'admin') throw new Error('FORBIDDEN')
  return user
}

/** Tüm kullanıcıları listele. */
export async function GET() {
  try {
    await requireAdmin()
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true, level: true,
        aiQuestionsUsed: true, aiQuestionsResetAt: true,
        createdAt: true, updatedAt: true,
      },
    })
    const enriched = await Promise.all(
      users.map(async (u) => {
        const [banks, cards, loans, assets, incomes, expenses, properties, vehicles] = await Promise.all([
          db.bankAccount.count({ where: { userId: u.id } }),
          db.creditCard.count({ where: { userId: u.id } }),
          db.loan.count({ where: { userId: u.id } }),
          db.asset.count({ where: { userId: u.id } }),
          db.income.count({ where: { userId: u.id } }),
          db.expense.count({ where: { userId: u.id } }),
          db.property.count({ where: { userId: u.id } }),
          db.vehicle.count({ where: { userId: u.id } }),
        ])
        return {
          ...u,
          stats: {
            bankCount: banks, cardCount: cards, loanCount: loans,
            assetCount: assets, incomeCount: incomes, expenseCount: expenses,
            propertyCount: properties, vehicleCount: vehicles,
            totalRecords: banks + cards + loans + assets + incomes + expenses + properties + vehicles,
          },
        }
      })
    )
    return ok(enriched)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return fail('Admin yetkisi gerekli', 403)
    throw e
  }
}

/** Yeni kullanıcı oluştur (admin tarafından). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await readBody<{ name?: string; email?: string; password?: string; role?: string; level?: string }>(req)
    if (!body) return fail('Geçersiz istek')

    const name = body.name?.trim()
    const email = body.email?.toLowerCase().trim()
    const password = body.password

    if (!name || !email || !password) return fail('Ad, email ve şifre zorunludur')
    if (password.length < 6) return fail('Şifre en az 6 karakter olmalıdır')

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) return fail('Bu email zaten kayıtlı')

    const hashed = await bcrypt.hash(password, 10)
    const user = await db.user.create({
      data: {
        name, email, password: hashed,
        role: body.role || 'user', level: body.level || 'standard',
      },
      select: { id: true, email: true, name: true, role: true, level: true, createdAt: true },
    })
    return ok(user, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return fail('Admin yetkisi gerekli', 403)
    throw e
  }
}
