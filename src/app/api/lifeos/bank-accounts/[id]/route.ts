import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    const body = await readBody<Record<string, unknown>>(req)
    if (!body) return fail('Geçersiz istek')

    const { bankName, accountName, accountType, balance, iban, easyAddress, holderName, expectedAmount, color, description } = body as Record<string, string | number | null>

    try {
      const item = await store.update('bank-accounts', id, {
        bankName: bankName as string,
        accountName: accountName as string,
        accountType: accountType as string,
        balance: Number(balance),
        iban: iban ? String(iban) : null,
        easyAddress: easyAddress ? String(easyAddress) : null,
        holderName: holderName ? String(holderName) : null,
        expectedAmount: Number(expectedAmount),
        color: color as string,
        description: description ? String(description) : null,
      })
      return ok(item)
    } catch {
      return fail('Hesap bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { store } = await getStore()
    const { id } = await params
    try {
      await store.delete('bank-accounts', id)
      return ok({ id })
    } catch {
      return fail('Hesap bulunamadı', 404)
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
