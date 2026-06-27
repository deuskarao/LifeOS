// Home kullanıcısı veri migrasyonu — JSON → Supabase DB
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

interface JsonData {
  income: any[]
  expenses: any[]
  bank_accounts: any[]
  credit_cards: any[]
  loans: any[]
  assets: any[]
  vehicles: any[]
  fuel_records: any[]
  service_records: any[]
  properties: any[]
  contracts: any[]
  tenants: any[]
  rent_collections: any[]
  [key: string]: any[]
}

function parseDate(d: string | null): Date {
  if (!d) return new Date()
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? new Date() : dt
}

function dayFromDate(d: string | null): number {
  if (!d) return 1
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? 1 : dt.getDate()
}

function safeJson(str: string | null): any {
  if (!str) return {}
  try { return JSON.parse(str) } catch { return {} }
}

async function main() {
  console.log('📥 Home kullanıcısı veri migrasyonu başlıyor...')

  const raw = readFileSync('/home/z/my-project/upload/Pasted Content_1782576933376.txt', 'utf-8')
  const data: JsonData = JSON.parse(raw)
  console.log(`   Kaynak veri: ${data.income.length} gelir, ${data.expenses.length} gider, ${data.bank_accounts.length} banka, ${data.credit_cards.length} kart, ${data.loans.length} kredi, ${data.assets.length} varlık, ${data.vehicles.length} araç, ${data.fuel_records.length} yakıt, ${data.service_records.length} servis, ${data.properties.length} mülk, ${data.contracts.length} kontrat`)

  // Home kullanıcısını bul
  const home = await db.user.findUnique({ where: { email: 'home@lifeos.com' } })
  if (!home) {
    console.error('❌ home@lifeos.com bulunamadı!')
    process.exit(1)
  }
  console.log(`   Hedef kullanıcı: ${home.email} (${home.id})`)

  // Önce home kullanıcısının mevcut verilerini temizle (sıralı, pool limit için)
  console.log('🧹 Mevcut veriler temizleniyor...')
  await db.vehicleService.deleteMany({ where: { vehicle: { userId: home.id } } })
  await db.vehicleFuel.deleteMany({ where: { vehicle: { userId: home.id } } })
  await db.vehicle.deleteMany({ where: { userId: home.id } })
  await db.rentalContract.deleteMany({ where: { property: { userId: home.id } } })
  await db.property.deleteMany({ where: { userId: home.id } })
  await db.expense.deleteMany({ where: { userId: home.id } })
  await db.income.deleteMany({ where: { userId: home.id } })
  await db.asset.deleteMany({ where: { userId: home.id } })
  await db.loan.deleteMany({ where: { userId: home.id } })
  await db.creditCard.deleteMany({ where: { userId: home.id } })
  await db.bankAccount.deleteMany({ where: { userId: home.id } })
  console.log('   ✓ Temizlendi')

  // ID mapping (eski UUID → yeni Prisma ID)
  const idMap: Record<string, Record<string, string>> = {
    vehicles: {},
    properties: {},
  }

  // ===== BANK ACCOUNTS =====
  console.log('🏦 Banka hesapları ekleniyor...')
  for (const b of data.bank_accounts) {
    const desc = safeJson(b.description)
    const accountType = b.account_type === 'savings' ? 'Vadeli' : b.account_type === 'checking' ? 'Vadesiz' : 'Vadesiz'
    await db.bankAccount.create({
      data: {
        userId: home.id,
        bankName: b.bank_name || 'Bilinmiyor',
        accountName: b.account_name || 'Hesap',
        accountType,
        balance: Number(b.balance) || 0,
        iban: b.iban || null,
        holderName: b.holder_name || null,
        expectedAmount: Number(b.expected_amount) || 0,
        color: '#3b82f6',
        description: desc.text || null,
      },
    })
  }
  console.log(`   ✓ ${data.bank_accounts.length} banka hesabı`)

  // ===== CREDIT CARDS =====
  console.log('💳 Kredi kartları ekleniyor...')
  for (const c of data.credit_cards) {
    const cardInfo = safeJson(c.card_name)
    const cutoffDay = c.statement_date ? parseInt(c.statement_date) : (cardInfo.statement_date ? parseInt(cardInfo.statement_date) : 1)
    await db.creditCard.create({
      data: {
        userId: home.id,
        bankName: c.bank_name || cardInfo.bank_name || 'Bilinmiyor',
        cardName: cardInfo.card_name || c.card_name || 'Kart',
        cardType: 'Visa',
        limit: Number(c.card_limit) || 0,
        balance: Number(c.current_debt) || 0,
        cutoffDay: isNaN(cutoffDay) ? 1 : cutoffDay,
        dueDay: dayFromDate(c.due_date),
        color: '#8b5cf6',
      },
    })
  }
  console.log(`   ✓ ${data.credit_cards.length} kredi kartı`)

  // ===== LOANS =====
  console.log('🏠 Krediler ekleniyor...')
  for (const l of data.loans) {
    await db.loan.create({
      data: {
        userId: home.id,
        loanName: l.loan_name || 'Kredi',
        lender: 'Banka',
        principalAmount: Number(l.total_amount) || Number(l.remaining_balance) || 0,
        remainingAmount: Number(l.remaining_balance) || 0,
        interestRate: Number(l.interest_rate) || 0,
        monthlyPayment: Number(l.monthly_payment) || 0,
        startDate: parseDate(l.start_date),
        endDate: l.end_date ? parseDate(l.end_date) : null,
        installmentsTotal: Number(l.vade) || 0,
        installmentsPaid: 0,
        category: 'İhtiyaç',
        description: null,
      },
    })
  }
  console.log(`   ✓ ${data.loans.length} kredi`)

  // ===== ASSETS =====
  console.log('📊 Varlıklar ekleniyor...')
  for (const a of data.assets) {
    const qty = Number(a.quantity) || 0
    const price = Number(a.unit_price) || 0
    const total = Number(a.current_value) || (qty * price)
    await db.asset.create({
      data: {
        userId: home.id,
        assetType: a.category || 'Diğer',
        name: a.asset_name || 'Varlık',
        quantity: qty,
        unitPrice: price,
        totalValue: total,
        currency: 'TRY',
        notes: null,
      },
    })
  }
  console.log(`   ✓ ${data.assets.length} varlık`)

  // ===== INCOME =====
  console.log('💰 Gelirler ekleniyor...')
  for (const i of data.income) {
    await db.income.create({
      data: {
        userId: home.id,
        source: i.description || i.category || 'Gelir',
        amount: Number(i.amount) || 0,
        currency: 'TRY',
        category: i.category || 'Diğer',
        date: parseDate(i.date),
        recurring: false,
        notes: i.description || null,
      },
    })
  }
  console.log(`   ✓ ${data.income.length} gelir kaydı`)

  // ===== EXPENSES =====
  console.log('💸 Giderler ekleniyor...')
  for (const e of data.expenses) {
    await db.expense.create({
      data: {
        userId: home.id,
        category: e.category || 'Diğer',
        amount: Number(e.amount) || 0,
        currency: 'TRY',
        date: parseDate(e.date),
        paymentMethod: e.payment_method || 'Nakit',
        notes: e.description || null,
      },
    })
  }
  console.log(`   ✓ ${data.expenses.length} gider kaydı`)

  // ===== PROPERTIES =====
  console.log('🏘️ Mülkler ekleniyor...')
  for (const p of data.properties) {
    const type = p.type === 'House' ? 'Daire' : p.type === 'Land' ? 'Arsa' : p.type || 'Daire'
    const created = await db.property.create({
      data: {
        userId: home.id,
        name: p.property_name || 'Mülk',
        type,
        address: p.address || null,
        city: p.city || null,
        purchasePrice: Number(p.purchase_price) || 0,
        currentValue: Number(p.current_value) || 0,
        monthlyRent: 0,
        status: 'Boş',
        notes: null,
      },
    })
    idMap.properties[p.id] = created.id
  }
  console.log(`   ✓ ${data.properties.length} mülk`)

  // ===== CONTRACTS =====
  console.log('📝 Kontratlar ekleniyor...')
  // Kiracıları da burada işle
  const tenantsMap: Record<string, any> = {}
  for (const t of (data.tenants || [])) {
    tenantsMap[t.id] = t
  }

  for (const c of data.contracts) {
    const propertyId = idMap.properties[c.property_id]
    if (!propertyId) continue
    const tenant = tenantsMap[c.tenant_id]
    const tenantName = c.tenant_name || tenant?.name || 'Kiracı'
    const status = c.status === 'Active' ? 'Aktif' : c.status === 'Inactive' ? 'Bitti' : 'Aktif'

    const created = await db.rentalContract.create({
      data: {
        propertyId,
        tenantName,
        tenantPhone: tenant?.phone || null,
        tenantEmail: tenant?.email || null,
        monthlyRent: Number(c.monthly_rent) || 0,
        startDate: parseDate(c.start_date),
        endDate: c.end_date ? parseDate(c.end_date) : null,
        deposit: Number(c.deposit_amount) || 0,
        status,
        notes: null,
      },
    })

    // Eğer aktif kontratsa mülkün monthlyRent ve status'unu güncelle
    if (status === 'Aktif') {
      await db.property.update({
        where: { id: propertyId },
        data: { monthlyRent: Number(c.monthly_rent) || 0, status: 'Kiralı' },
      })
    }
  }
  console.log(`   ✓ ${data.contracts.length} kontrat`)

  // ===== VEHICLES =====
  console.log('🚗 Araçlar ekleniyor...')
  for (const v of data.vehicles) {
    const created = await db.vehicle.create({
      data: {
        userId: home.id,
        name: `${v.brand || ''} ${v.model || ''}`.trim() || 'Araç',
        plate: v.plate_number || null,
        brand: v.brand || null,
        model: v.model || null,
        year: v.year ? Number(v.year) : null,
        fuelType: 'Benzin',
        currentKm: Number(v.current_mileage) || 0,
        color: null,
        notes: null,
      },
    })
    idMap.vehicles[v.id] = created.id
  }
  console.log(`   ✓ ${data.vehicles.length} araç`)

  // ===== FUEL RECORDS =====
  console.log('⛽ Yakıt kayıtları ekleniyor...')
  for (const f of data.fuel_records) {
    const vehicleId = idMap.vehicles[f.vehicle_id]
    if (!vehicleId) continue
    await db.vehicleFuel.create({
      data: {
        vehicleId,
        date: parseDate(f.date),
        liters: Number(f.liters) || 0,
        amount: Number(f.cost) || 0,
        km: Number(f.mileage) || 0,
        fuelType: 'Benzin',
        station: f.station || null,
      },
    })
  }
  console.log(`   ✓ ${data.fuel_records.length} yakıt kaydı`)

  // ===== SERVICE RECORDS =====
  console.log('🔧 Servis kayıtları ekleniyor...')
  for (const s of data.service_records) {
    const vehicleId = idMap.vehicles[s.vehicle_id]
    if (!vehicleId) continue
    const desc = safeJson(s.description)
    const notes = [desc.servisYeri, desc.notlar].filter(Boolean).join(' — ') || s.description || null
    await db.vehicleService.create({
      data: {
        vehicleId,
        date: parseDate(s.date),
        serviceType: s.service_type || 'Diğer',
        amount: Number(s.cost) || 0,
        km: Number(s.mileage) || 0,
        notes,
      },
    })
  }
  console.log(`   ✓ ${data.service_records.length} servis kaydı`)

  // Özet
  console.log('\n=== Migrasyon Özeti ===')
  const counts = await Promise.all([
    db.bankAccount.count({ where: { userId: home.id } }),
    db.creditCard.count({ where: { userId: home.id } }),
    db.loan.count({ where: { userId: home.id } }),
    db.asset.count({ where: { userId: home.id } }),
    db.income.count({ where: { userId: home.id } }),
    db.expense.count({ where: { userId: home.id } }),
    db.property.count({ where: { userId: home.id } }),
    db.rentalContract.count({ where: { property: { userId: home.id } } }),
    db.vehicle.count({ where: { userId: home.id } }),
    db.vehicleFuel.count({ where: { vehicle: { userId: home.id } } }),
    db.vehicleService.count({ where: { vehicle: { userId: home.id } } }),
  ])
  console.log(`   Banka: ${counts[0]}, Kart: ${counts[1]}, Kredi: ${counts[2]}, Varlık: ${counts[3]}`)
  console.log(`   Gelir: ${counts[4]}, Gider: ${counts[5]}`)
  console.log(`   Mülk: ${counts[6]}, Kontrat: ${counts[7]}`)
  console.log(`   Araç: ${counts[8]}, Yakıt: ${counts[9]}, Servis: ${counts[10]}`)
  console.log('\n✅ Migrasyon tamamlandı!')
}

main()
  .catch((e) => {
    console.error('❌ Migrasyon hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
