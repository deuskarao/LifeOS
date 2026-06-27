/* eslint-disable @typescript-eslint/no-require-imports */
// LifeOS seed — admin + demo kullanıcıları + admin finansal verisi
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const db = new PrismaClient()

async function main() {
  console.log('🌱 LifeOS seed başlıyor...')

  // Tüm mevcut veriyi temizle (Supabase)
  await db.vehicleService.deleteMany()
  await db.vehicleFuel.deleteMany()
  await db.vehicle.deleteMany()
  await db.rentalContract.deleteMany()
  await db.property.deleteMany()
  await db.expense.deleteMany()
  await db.income.deleteMany()
  await db.asset.deleteMany()
  await db.loan.deleteMany()
  await db.creditCard.deleteMany()
  await db.bankAccount.deleteMany()
  await db.user.deleteMany()

  // ===== KULLANICILAR =====
  const adminPass = await bcrypt.hash('admin123', 10)
  const demoPass = await bcrypt.hash('demo123', 10)
  const userPass = await bcrypt.hash('user123', 10)

  const admin = await db.user.create({
    data: { email: 'admin@lifeos.app', name: 'Yönetici', password: adminPass, role: 'admin' },
  })
  const demo = await db.user.create({
    data: { email: 'demo@lifeos.app', name: 'Demo Kullanıcı', password: demoPass, role: 'demo' },
  })
  const normalUser = await db.user.create({
    data: { email: 'ahmet@lifeos.app', name: 'Ahmet Yılmaz', password: userPass, role: 'user' },
  })

  console.log(`   ✓ Kullanıcılar: admin@lifeos.app/admin123, demo@lifeos.app/demo123, ahmet@lifeos.app/user123`)

  // ===== ADMIN + NORMAL USER için finansal veri (DB'ye) =====
  // Admin kendi demo verisi görür; normal user kendi verisini görür
  const targetUser = admin // admin ve ahmet için aynı veriyi ekleyelim
  const userIds = [admin.id, normalUser.id]

  for (const userId of userIds) {
    const now = new Date()
    const monthsAgo = (m: number) => new Date(now.getFullYear(), now.getMonth() - m, 15)

    // BANK ACCOUNTS
    await db.bankAccount.createMany({
      data: [
        { userId, bankName: 'İş Bankası', accountName: 'Vadesiz Maaş', accountType: 'Vadesiz', balance: 48250, iban: 'TR12 0006 4000 0011 2345 6789 01', holderName: 'Ahmet Yılmaz', color: '#e11d48' },
        { userId, bankName: 'Garanti BBVA', accountName: 'Vadeli Birikim', accountType: 'Vadeli', balance: 125000, iban: 'TR34 0006 2000 0022 3456 7890 12', holderName: 'Ahmet Yılmaz', color: '#16a34a' },
        { userId, bankName: 'Akbank', accountName: 'Günlük Hesap', accountType: 'Vadesiz', balance: 8730, iban: 'TR56 0004 6000 0033 4567 8901 23', holderName: 'Ahmet Yılmaz', color: '#f59e0b' },
        { userId, bankName: 'Nakit / Cüzdan', accountName: 'Nakit', accountType: 'Nakit', balance: 1250, holderName: 'Ahmet Yılmaz', color: '#10b981' },
        { userId, bankName: 'Yapı Kredi', accountName: 'Birikim Hesabı', accountType: 'Birikim', balance: 67500, expectedAmount: 80000, iban: 'TR78 0006 7000 0044 5678 9012 34', holderName: 'Ahmet Yılmaz', color: '#0ea5e9' },
      ],
    })

    // CREDIT CARDS
    await db.creditCard.createMany({
      data: [
        { userId, bankName: 'Garanti BBVA', cardName: 'Bonus Card', cardType: 'Visa', limit: 35000, balance: 8420, cutoffDay: 8, dueDay: 23, color: '#16a34a' },
        { userId, bankName: 'Akbank', cardName: 'Axess', cardType: 'Mastercard', limit: 50000, balance: 15630, cutoffDay: 12, dueDay: 27, color: '#f59e0b' },
        { userId, bankName: 'İş Bankası', cardName: 'Maximum', cardType: 'Mastercard', limit: 25000, balance: 3250, cutoffDay: 5, dueDay: 20, color: '#e11d48' },
        { userId, bankName: 'Yapı Kredi', cardName: 'World', cardType: 'Visa', limit: 40000, balance: 0, cutoffDay: 15, dueDay: 30, color: '#0ea5e9' },
      ],
    })

    // LOANS
    await db.loan.createMany({
      data: [
        { userId, loanName: 'Konut Kredisi', lender: 'Garanti BBVA', principalAmount: 1200000, remainingAmount: 845000, interestRate: 2.45, monthlyPayment: 18450, startDate: monthsAgo(18), endDate: new Date(now.getFullYear() + 12, now.getMonth(), 1), installmentsTotal: 120, installmentsPaid: 18, category: 'Konut' },
        { userId, loanName: 'Araç Kredisi', lender: 'Akbank', principalAmount: 450000, remainingAmount: 198000, interestRate: 3.10, monthlyPayment: 12450, startDate: monthsAgo(24), endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1), installmentsTotal: 36, installmentsPaid: 24, category: 'Taşıt' },
        { userId, loanName: 'İhtiyaç Kredisi', lender: 'İş Bankası', principalAmount: 75000, remainingAmount: 22800, interestRate: 4.20, monthlyPayment: 3800, startDate: monthsAgo(18), endDate: new Date(now.getFullYear(), now.getMonth() + 6, 1), installmentsTotal: 24, installmentsPaid: 18, category: 'İhtiyaç' },
      ],
    })

    // ASSETS
    await db.asset.createMany({
      data: [
        { userId, assetType: 'Altın', name: 'Gram Altın', quantity: 85, unitPrice: 2845, totalValue: 85 * 2845 },
        { userId, assetType: 'Altın', name: 'Çeyrek Altın', quantity: 20, unitPrice: 4720, totalValue: 20 * 4720 },
        { userId, assetType: 'Döviz', name: 'USD', quantity: 3200, unitPrice: 34.15, totalValue: 3200 * 34.15 },
        { userId, assetType: 'Döviz', name: 'EUR', quantity: 1800, unitPrice: 36.80, totalValue: 1800 * 36.80 },
        { userId, assetType: 'Hisse', name: 'THYAO', quantity: 500, unitPrice: 285.50, totalValue: 500 * 285.50 },
        { userId, assetType: 'Hisse', name: 'ASELS', quantity: 1200, unitPrice: 64.20, totalValue: 1200 * 64.20 },
        { userId, assetType: 'Fon', name: 'A Type Fon', quantity: 1, unitPrice: 45200, totalValue: 45200 },
        { userId, assetType: 'Kripto', name: 'Bitcoin', quantity: 0.085, unitPrice: 2350000, totalValue: 0.085 * 2350000 },
      ],
    })

    // INCOME (son 6 ay)
    const incomes = []
    for (let m = 0; m < 6; m++) {
      incomes.push({ userId, source: 'Maaş', amount: 85000, category: 'Maaş', date: monthsAgo(m), recurring: true })
      incomes.push({ userId, source: 'Freelance Proje', amount: 15000 + Math.floor(Math.random() * 10000), category: 'Freelance', date: monthsAgo(m) })
      if (m % 3 === 0) incomes.push({ userId, source: 'Kira Geliri - Kadıköy Daire', amount: 22500, category: 'Kira Geliri', date: monthsAgo(m), recurring: true })
    }
    await db.income.createMany({ data: incomes })

    // EXPENSES (son 6 ay)
    const expenses = []
    const expCats = [
      { cat: 'Market', min: 4500, max: 8500, freq: 4 },
      { cat: 'Fatura', min: 1200, max: 3800, freq: 3 },
      { cat: 'Yakıt', min: 2500, max: 5200, freq: 3 },
      { cat: 'Kira', min: 18000, max: 18000, freq: 1 },
      { cat: 'Eğlence', min: 800, max: 3200, freq: 2 },
      { cat: 'Sağlık', min: 500, max: 4500, freq: 1 },
      { cat: 'Restoran', min: 600, max: 2800, freq: 3 },
      { cat: 'Abonelik', min: 250, max: 800, freq: 1 },
    ]
    for (let m = 0; m < 6; m++) {
      for (const e of expCats) {
        for (let i = 0; i < e.freq; i++) {
          expenses.push({
            userId, category: e.cat, amount: Math.floor(e.min + Math.random() * (e.max - e.min)),
            date: new Date(now.getFullYear(), now.getMonth() - m, Math.floor(1 + Math.random() * 27)),
            paymentMethod: Math.random() > 0.4 ? 'Kart' : 'Nakit', notes: e.cat + ' harcaması',
          })
        }
      }
    }
    await db.expense.createMany({ data: expenses })

    // PROPERTIES
    const p1 = await db.property.create({
      data: { userId, name: 'Kadıköy Daire', type: 'Daire', address: 'Caferağa Mah. Moda Cad. No:12', city: 'İstanbul', purchasePrice: 3200000, currentValue: 4250000, monthlyRent: 22500, status: 'Kiralı', size: 105, rooms: '2+1', notes: '2019 yılında satın alındı' },
    })
    const p2 = await db.property.create({
      data: { userId, name: 'Ataşehir Ofis', type: 'Ofis', address: 'Kozyatağı Mah. Büyükdere Cad. No:45', city: 'İstanbul', purchasePrice: 1850000, currentValue: 2350000, monthlyRent: 0, status: 'Boş', size: 75, rooms: '1+1', notes: 'Yatırımlık ofis' },
    })
    await db.property.create({
      data: { userId, name: 'Bodrum Yazlık', type: 'Villa', address: 'Yalıkavak Mevkii', city: 'Muğla', purchasePrice: 5800000, currentValue: 7200000, monthlyRent: 0, status: 'Boş', size: 220, rooms: '4+2', notes: 'Tatil için kullanılıyor' },
    })

    // CONTRACTS
    await db.rentalContract.createMany({
      data: [
        { propertyId: p1.id, tenantName: 'Mehmet Demir', tenantPhone: '+90 532 111 22 33', tenantEmail: 'mehmet.demir@email.com', monthlyRent: 22500, startDate: monthsAgo(11), endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1), deposit: 45000, status: 'Aktif' },
        { propertyId: p2.id, tenantName: 'Ayşe Kaya', tenantPhone: '+90 533 444 55 66', monthlyRent: 18000, startDate: monthsAgo(24), endDate: monthsAgo(12), deposit: 36000, status: 'Bitti' },
      ],
    })

    // VEHICLES
    const v1 = await db.vehicle.create({
      data: { userId, name: 'BMW 320i', plate: '34 ABC 123', brand: 'BMW', model: '320i', year: 2021, fuelType: 'Benzin', currentKm: 42500, color: 'Beyaz', notes: 'Şahsi araç' },
    })
    const v2 = await db.vehicle.create({
      data: { userId, name: 'Honda Civic', plate: '06 XYZ 789', brand: 'Honda', model: 'Civic', year: 2019, fuelType: 'Dizel', currentKm: 87200, color: 'Gri', notes: 'Eşin aracı' },
    })

    // FUEL
    const fuels = []
    for (const v of [v1, v2]) {
      let km = v.currentKm - 6000
      for (let i = 0; i < 8; i++) {
        km += 600 + Math.floor(Math.random() * 400)
        const liters = 35 + Math.floor(Math.random() * 20)
        fuels.push({ vehicleId: v.id, date: new Date(now.getFullYear(), now.getMonth() - i, 5 + Math.floor(Math.random() * 20)), liters, amount: liters * (v.fuelType === 'Dizel' ? 41.5 : 43.8), km, fuelType: v.fuelType, station: ['Shell', 'BP', 'Petrol Ofisi', 'Total'][Math.floor(Math.random() * 4)] })
      }
    }
    await db.vehicleFuel.createMany({ data: fuels })

    // SERVICES
    await db.vehicleService.createMany({
      data: [
        { vehicleId: v1.id, date: monthsAgo(2), serviceType: 'Periyodik Bakım', amount: 8500, km: 38500, notes: '15.000 km bakımı' },
        { vehicleId: v1.id, date: monthsAgo(5), serviceType: 'Yağ Değişimi', amount: 3200, km: 36000, notes: 'Motor yağı + filtre' },
        { vehicleId: v2.id, date: monthsAgo(1), serviceType: 'Muayene', amount: 1200, km: 85000, notes: 'Araç muayenesi' },
        { vehicleId: v2.id, date: monthsAgo(4), serviceType: 'Sigorta', amount: 6800, km: 82000, notes: 'Kasko yenileme' },
      ],
    })
  }

  console.log('✅ Seed tamamlandı!')
  console.log(`   - 3 kullanıcı (1 admin, 1 demo, 1 user)`)
  console.log(`   - Admin + user için finansal veri (DB)`)
  console.log(`   - Demo için memory store (login'de yüklenir, DB'ye yazılmaz)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
