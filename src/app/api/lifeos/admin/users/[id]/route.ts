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

/** Kullanıcı güncelle (ad, rol, level, şifre). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const body = await readBody<{ name?: string; email?: string; role?: string; level?: string; password?: string }>(req)
    if (!body) return fail('Geçersiz istek')

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return fail('Kullanıcı bulunamadı', 404)

    // Admin kendini demote edemesin
    if (admin.id === id && body.role && body.role !== 'admin') {
      return fail('Kendinizin rolünü düşüremezsiniz', 400)
    }

    const data: any = {}
    if (body.name) data.name = body.name.trim()
    if (body.email) data.email = body.email.toLowerCase().trim()
    if (body.role) data.role = body.role
    if (body.level) data.level = body.level
    if (body.password && body.password.length >= 6) {
      data.password = await bcrypt.hash(body.password, 10)
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, level: true, updatedAt: true },
    })
    return ok(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return fail('Admin yetkisi gerekli', 403)
    throw e
  }
}

/** Kullanıcı sil. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    if (admin.id === id) return fail('Kendinizi silemezsiniz', 400)

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return fail('Kullanıcı bulunamadı', 404)

    // Kullanıcının tüm verilerini sil (cascade yok userId üzerinde, manuel)
    await Promise.all([
      db.vehicleService.deleteMany({ where: { vehicle: { userId: id } } }),
      db.vehicleFuel.deleteMany({ where: { vehicle: { userId: id } } }),
      db.vehicle.deleteMany({ where: { userId: id } }),
      db.rentalContract.deleteMany({ where: { property: { userId: id } } }),
      db.property.deleteMany({ where: { userId: id } }),
      db.expense.deleteMany({ where: { userId: id } }),
      db.income.deleteMany({ where: { userId: id } }),
      db.asset.deleteMany({ where: { userId: id } }),
      db.loan.deleteMany({ where: { userId: id } }),
      db.creditCard.deleteMany({ where: { userId: id } }),
      db.bankAccount.deleteMany({ where: { userId: id } }),
    ])
    await db.user.delete({ where: { id } })
    return ok({ id })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return fail('Admin yetkisi gerekli', 403)
    throw e
  }
}
