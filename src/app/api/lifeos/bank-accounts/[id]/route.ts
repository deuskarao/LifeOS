import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, readBody } from '@/lib/lifeos'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await readBody<Record<string, unknown>>(req)
  if (!body) return fail('Geçersiz istek')

  const { bankName, accountName, accountType, balance, iban, easyAddress, holderName, expectedAmount, color, description } = body as Record<string, string | number | null>

  try {
    const item = await db.bankAccount.update({
      where: { id },
      data: {
        ...(bankName !== undefined && { bankName: String(bankName) }),
        ...(accountName !== undefined && { accountName: String(accountName) }),
        ...(accountType !== undefined && { accountType: String(accountType) }),
        ...(balance !== undefined && { balance: Number(balance) }),
        ...(iban !== undefined && { iban: iban ? String(iban) : null }),
        ...(easyAddress !== undefined && { easyAddress: easyAddress ? String(easyAddress) : null }),
        ...(holderName !== undefined && { holderName: holderName ? String(holderName) : null }),
        ...(expectedAmount !== undefined && { expectedAmount: Number(expectedAmount) }),
        ...(color !== undefined && { color: String(color) }),
        ...(description !== undefined && { description: description ? String(description) : null }),
      },
    })
    return ok(item)
  } catch {
    return fail('Hesap bulunamadı', 404)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.bankAccount.delete({ where: { id } })
    return ok({ id })
  } catch {
    return fail('Hesap bulunamadı', 404)
  }
}
