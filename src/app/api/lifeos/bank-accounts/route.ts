import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await db.bankAccount.findMany({ orderBy: { createdAt: 'desc' } })
  return ok(items)
}

export async function POST(req: NextRequest) {
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')

  const { bankName, accountName, accountType, balance, iban, easyAddress, holderName, expectedAmount, color, description } = body as {
    bankName?: string
    accountName?: string
    accountType?: string
    balance?: number
    iban?: string
    easyAddress?: string
    holderName?: string
    expectedAmount?: number
    color?: string
    description?: string
  }

  if (!bankName || !accountName) return fail('Banka adı ve hesap adı zorunludur')

  const item = await db.bankAccount.create({
    data: {
      bankName,
      accountName,
      accountType: accountType || 'Vadesiz',
      balance: Number(balance) || 0,
      iban: iban || null,
      easyAddress: easyAddress || null,
      holderName: holderName || null,
      expectedAmount: Number(expectedAmount) || 0,
      color: color || '#3b82f6',
      description: description || null,
    },
  })
  return ok(item, { status: 201 })
}
