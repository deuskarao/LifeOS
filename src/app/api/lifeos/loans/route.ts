import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.loan.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')
  const { loanName, lender, principalAmount, remainingAmount, interestRate, monthlyPayment, startDate, endDate, installmentsTotal, installmentsPaid, category, description } = body as Record<string, string | number | null>
  if (!loanName || !lender) return fail('Kredi adı ve veren zorunludur')
  const item = await db.loan.create({
    data: {
      loanName,
      lender,
      principalAmount: Number(principalAmount) || 0,
      remainingAmount: Number(remainingAmount) || 0,
      interestRate: Number(interestRate) || 0,
      monthlyPayment: Number(monthlyPayment) || 0,
      startDate: startDate ? new Date(startDate as string) : new Date(),
      endDate: endDate ? new Date(endDate as string) : null,
      installmentsTotal: Number(installmentsTotal) || 0,
      installmentsPaid: Number(installmentsPaid) || 0,
      category: (category as string) || 'İhtiyaç',
      description: (description as string) || null,
    },
  })
  return ok(item, { status: 201 })
}
