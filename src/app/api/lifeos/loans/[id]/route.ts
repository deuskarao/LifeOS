import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  try {
    const b = body as Record<string, string | number | null>
    const item = await db.loan.update({
      where: { id },
      data: {
        loanName: b.loanName as string,
        lender: b.lender as string,
        principalAmount: Number(b.principalAmount),
        remainingAmount: Number(b.remainingAmount),
        interestRate: Number(b.interestRate),
        monthlyPayment: Number(b.monthlyPayment),
        startDate: b.startDate ? new Date(b.startDate as string) : undefined,
        endDate: b.endDate ? new Date(b.endDate as string) : null,
        installmentsTotal: Number(b.installmentsTotal),
        installmentsPaid: Number(b.installmentsPaid),
        category: b.category as string,
        description: b.description as string | null,
      },
    })
    return ok(item)
  } catch {
    return fail('Kredi bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.loan.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Kredi bulunamadı', 404)
  }
}
