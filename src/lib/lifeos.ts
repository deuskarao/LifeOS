// LifeOS shared utilities - currency formatting, API helpers, types

export const CURRENCIES = {
  TRY: { symbol: '₺', code: 'TRY', name: 'Türk Lirası' },
  USD: { symbol: '$', code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', name: 'Pound Sterling' },
} as const

export type CurrencyCode = keyof typeof CURRENCIES

/** Para birimini Türk locale'inde formatlar. */
export function formatCurrency(amount: number, currency: CurrencyCode = 'TRY'): string {
  const c = CURRENCIES[currency] ?? CURRENCIES.TRY
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))
  const sign = amount < 0 ? '-' : ''
  return `${sign}${c.symbol}${formatted}`
}

/** Kısa para formatı (1.2K, 3.4M gibi). */
export function formatCompact(amount: number, currency: CurrencyCode = 'TRY'): string {
  const c = CURRENCIES[currency] ?? CURRENCIES.TRY
  const abs = Math.abs(amount)
  let str: string
  if (abs >= 1_000_000) str = (abs / 1_000_000).toFixed(1) + 'M'
  else if (abs >= 1_000) str = (abs / 1_000).toFixed(1) + 'K'
  else str = abs.toFixed(0)
  const sign = amount < 0 ? '-' : ''
  return `${sign}${c.symbol}${str}`
}

/** Tarihi Türkçe gösterir. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** API yanıt standardı. */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, init)
}

export function fail(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status })
}

/** URL search params'tan sayısal değer okur. */
export function getQuery(req: Request, key: string): string | null {
  const url = new URL(req.url)
  return url.searchParams.get(key)
}

/** JSON body okur, hata yakalar. */
export async function readBody<T = unknown>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

/** Turkish bank listesi (logo domain ile). */
export const TURKISH_BANKS = [
  'Nakit / Cüzdan',
  'Ziraat Bankası',
  'İş Bankası',
  'Garanti BBVA',
  'Yapı Kredi',
  'Halkbank',
  'VakıfBank',
  'QNB Finansbank',
  'Akbank',
  'DenizBank',
  'TEB',
  'Kuveyt Türk',
  'Enpara.com',
  'Albaraka Türk',
  'ING Bank',
  'Odeabank',
  'Fibabanka',
  'Burgan Bank',
  'Alternatif Bank',
  'Türkiye Finans',
  'Papara',
  'Tosla',
  'Paycell',
] as const

export const EXPENSE_CATEGORIES = [
  'Market',
  'Fatura',
  'Yakıt',
  'Kira',
  'Eğlence',
  'Sağlık',
  'Ulaşım',
  'Eğitim',
  'Giysim',
  'Restoran',
  'Abonelik',
  'Diğer',
] as const

export const INCOME_CATEGORIES = [
  'Maaş',
  'Kira Geliri',
  'Yatırım',
  'Freelance',
  'Bonus',
  'Hediye',
  'Diğer',
] as const

export const ASSET_TYPES = [
  'Altın',
  'Döviz',
  'Hisse',
  'Kripto',
  'Fon',
  'Diğer',
] as const

export const LOAN_CATEGORIES = [
  'İhtiyaç',
  'Konut',
  'Taşıt',
  'Ticari',
] as const

export const PROPERTY_TYPES = ['Daire', 'Villa', 'Dükkan', 'Arsa', 'Ofis'] as const
export const VEHICLE_FUEL_TYPES = ['Benzin', 'Dizel', 'LPG', 'Hibrit', 'Elektrik'] as const
export const SERVICE_TYPES = ['Periyodik Bakım', 'Yağ Değişimi', 'Lastik', 'Sigorta', 'Muayene', 'Diğer'] as const

/** Net servete göre sosyal sınıf belirler — DB'den threshold'ları okur. */
export async function getWealthClass(netWorth: number): Promise<{
  label: string
  short: string
  description: string
  color: string
  icon: string
}> {
  try {
    // Dynamic import — client-side'da çağrılmaz
    const { db } = await import('./db')
    const thresholds = await db.wealthClassThreshold.findMany({
      orderBy: { minAmount: 'asc' },
    })

    for (const t of thresholds) {
      const minOk = netWorth >= t.minAmount
      const maxOk = t.maxAmount === 0 || netWorth < t.maxAmount
      if (minOk && maxOk) {
        return {
          label: t.label,
          short: t.shortLabel,
          description: t.description,
          color: t.color,
          icon: t.icon,
        }
      }
    }

    // Fallback: eşleşmezse son threshold
    if (thresholds.length > 0) {
      const last = thresholds[thresholds.length - 1]
      return {
        label: last.label,
        short: last.shortLabel,
        description: last.description,
        color: last.color,
        icon: last.icon,
      }
    }
  } catch {
    /* DB hatası — fallback'e düş */
  }

  // Fallback (DB yoksa) — hardcoded
  return getWealthClassFallback(netWorth)
}

/** Fallback — DB erişilemezse kullanılır. */
function getWealthClassFallback(netWorth: number): {
  label: string
  short: string
  description: string
  color: string
  icon: string
} {
  if (netWorth < 0) {
    return { label: 'Borçlu', short: 'Borçlu', description: 'Net servet negatif', color: 'rose', icon: 'trending-down' }
  }
  if (netWorth < 250000) {
    return { label: 'Alt Sınıf', short: 'Alt', description: '250K altı', color: 'rose', icon: 'trending-down' }
  }
  if (netWorth < 1000000) {
    return { label: 'Alt-Orta Sınıf', short: 'Alt-Orta', description: '250K-1M', color: 'amber', icon: 'minus' }
  }
  if (netWorth < 5000000) {
    return { label: 'Orta Sınıf', short: 'Orta', description: '1M-5M', color: 'sky', icon: 'check' }
  }
  if (netWorth < 20000000) {
    return { label: 'Üst-Orta Sınıf', short: 'Üst-Orta', description: '5M-20M', color: 'violet', icon: 'trending-up' }
  }
  return { label: 'Üst Sınıf', short: 'Üst', description: '20M+', color: 'emerald', icon: 'crown' }
}

