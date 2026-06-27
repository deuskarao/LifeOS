import { NextRequest } from 'next/server'
import { ok, fail, readBody } from '@/lib/lifeos'
import { getStore } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { store, user } = await getStore()
    const items = await store.list('bank-accounts', user.role === 'admin' ? 'admin-all' : user.id)
    return ok(items)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}

export async function POST(req: NextRequest) {
  try {
    const { store, user } = await getStore()
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

    const item = await store.create('bank-accounts', user.id, {
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
    })
    return ok(item, { status: 201 })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return fail('Yetkisiz', 401)
    throw e
  }
}
