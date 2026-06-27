// LifeOS Data Store — Prisma (DB) ve Demo (memory) için tek interface
//
// Demo kullanıcısı: server-side in-memory Map<sessionId, DemoData>
//   - Login'de seed'li demo verisi yüklenir
//   - Logout'ta otomatik temizlenir
//   - DB'ye HİÇBİR ŞEY yazılmaz
//
// Admin/normal user: Prisma (Supabase)

import { db } from './db'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

// ===== Tipler (tüm modellerin ortak şekli) =====

export interface BankAccount {
  id: string; userId: string; bankName: string; accountName: string; accountType: string;
  balance: number; iban: string | null; easyAddress: string | null; holderName: string | null;
  expectedAmount: number; color: string; description: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface CreditCard {
  id: string; userId: string; bankName: string; cardName: string; cardType: string;
  limit: number; balance: number; cutoffDay: number; dueDay: number; color: string;
  createdAt: Date; updatedAt: Date;
}
export interface Loan {
  id: string; userId: string; loanName: string; lender: string; principalAmount: number;
  remainingAmount: number; interestRate: number; monthlyPayment: number; startDate: Date;
  endDate: Date | null; installmentsTotal: number; installmentsPaid: number; category: string;
  description: string | null; createdAt: Date; updatedAt: Date;
}
export interface Asset {
  id: string; userId: string; assetType: string; name: string; quantity: number;
  unitPrice: number; totalValue: number; currency: string; notes: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface Income {
  id: string; userId: string; source: string; amount: number; currency: string;
  category: string; date: Date; recurring: boolean; notes: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface Expense {
  id: string; userId: string; category: string; amount: number; currency: string;
  date: Date; paymentMethod: string; notes: string | null;
  createdAt: Date; updatedAt: Date;
}
export interface Property {
  id: string; userId: string; name: string; type: string; address: string | null;
  city: string | null; purchasePrice: number; currentValue: number; monthlyRent: number;
  status: string; size: number | null; rooms: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date; contracts?: RentalContract[];
}
export interface RentalContract {
  id: string; propertyId: string; tenantName: string; tenantPhone: string | null;
  tenantEmail: string | null; monthlyRent: number; startDate: Date; endDate: Date | null;
  deposit: number; status: string; notes: string | null;
  createdAt: Date; updatedAt: Date; property?: Property;
}
export interface Vehicle {
  id: string; userId: string; name: string; plate: string | null; brand: string | null;
  model: string | null; year: number | null; fuelType: string; currentKm: number;
  color: string | null; notes: string | null;
  createdAt: Date; updatedAt: Date;
  _count?: { fuelRecords: number; serviceRecords: number };
}
export interface VehicleFuel {
  id: string; vehicleId: string; date: Date; liters: number; amount: number;
  km: number; fuelType: string; station: string | null;
  createdAt: Date; vehicle?: Vehicle;
}
export interface VehicleService {
  id: string; vehicleId: string; date: Date; serviceType: string; amount: number;
  km: number; notes: string | null; createdAt: Date; vehicle?: Vehicle;
}

export type ResourceType =
  | 'bank-accounts' | 'credit-cards' | 'loans' | 'assets' | 'income' | 'expenses'
  | 'properties' | 'contracts' | 'vehicles' | 'fuel' | 'services'

// ===== Demo Memory Store =====

interface DemoData {
  bankAccounts: BankAccount[]
  creditCards: CreditCard[]
  loans: Loan[]
  assets: Asset[]
  income: Income[]
  expenses: Expense[]
  properties: Property[]
  contracts: RentalContract[]
  vehicles: Vehicle[]
  fuel: VehicleFuel[]
  services: VehicleService[]
}

// Global session-isolated store
const demoStores = new Map<string, DemoData>()

const DEMO_USER_ID = 'demo-user'

function emptyDemoData(): DemoData {
  return {
    bankAccounts: [], creditCards: [], loans: [], assets: [], income: [], expenses: [],
    properties: [], contracts: [], vehicles: [], fuel: [], services: [],
  }
}

// Demo seed verisi (ilk login'de yüklenir)
function seedDemoData(): DemoData {
  const data = emptyDemoData()
  const now = new Date()
  const monthsAgo = (m: number) => new Date(now.getFullYear(), now.getMonth() - m, 15)

  data.bankAccounts = [
    { id: 'd-b1', userId: DEMO_USER_ID, bankName: 'İş Bankası', accountName: 'Vadesiz Maaş', accountType: 'Vadesiz', balance: 28500, iban: 'TR12 0006 4000 0011 2345 6789 01', easyAddress: null, holderName: 'Demo Kullanıcı', expectedAmount: 35000, color: '#e11d48', description: null, createdAt: now, updatedAt: now },
    { id: 'd-b2', userId: DEMO_USER_ID, bankName: 'Garanti BBVA', accountName: 'Vadeli Birikim', accountType: 'Vadeli', balance: 78000, iban: 'TR34 0006 2000 0022 3456 7890 12', easyAddress: null, holderName: 'Demo Kullanıcı', expectedAmount: 100000, color: '#16a34a', description: null, createdAt: now, updatedAt: now },
    { id: 'd-b3', userId: DEMO_USER_ID, bankName: 'Nakit / Cüzdan', accountName: 'Nakit', accountType: 'Nakit', balance: 850, iban: null, easyAddress: null, holderName: 'Demo Kullanıcı', expectedAmount: 0, color: '#10b981', description: null, createdAt: now, updatedAt: now },
  ]

  data.creditCards = [
    { id: 'd-c1', userId: DEMO_USER_ID, bankName: 'Garanti BBVA', cardName: 'Bonus Card', cardType: 'Visa', limit: 25000, balance: 6200, cutoffDay: 8, dueDay: 23, color: '#16a34a', createdAt: now, updatedAt: now },
    { id: 'd-c2', userId: DEMO_USER_ID, bankName: 'Akbank', cardName: 'Axess', cardType: 'Mastercard', limit: 30000, balance: 0, cutoffDay: 12, dueDay: 27, color: '#f59e0b', createdAt: now, updatedAt: now },
  ]

  data.loans = [
    { id: 'd-l1', userId: DEMO_USER_ID, loanName: 'İhtiyaç Kredisi', lender: 'İş Bankası', principalAmount: 50000, remainingAmount: 18500, interestRate: 3.8, monthlyPayment: 3100, startDate: monthsAgo(12), endDate: new Date(now.getFullYear(), now.getMonth() + 6, 1), installmentsTotal: 24, installmentsPaid: 12, category: 'İhtiyaç', description: null, createdAt: now, updatedAt: now },
  ]

  data.assets = [
    { id: 'd-a1', userId: DEMO_USER_ID, assetType: 'Altın', name: 'Gram Altın', quantity: 25, unitPrice: 2845, totalValue: 25 * 2845, currency: 'TRY', notes: null, createdAt: now, updatedAt: now },
    { id: 'd-a2', userId: DEMO_USER_ID, assetType: 'Döviz', name: 'USD', quantity: 800, unitPrice: 34.15, totalValue: 800 * 34.15, currency: 'TRY', notes: null, createdAt: now, updatedAt: now },
    { id: 'd-a3', userId: DEMO_USER_ID, assetType: 'Hisse', name: 'THYAO', quantity: 150, unitPrice: 285.5, totalValue: 150 * 285.5, currency: 'TRY', notes: null, createdAt: now, updatedAt: now },
  ]

  // Son 6 ay gelir/gider
  for (let m = 0; m < 6; m++) {
    data.income.push(
      { id: `d-i${m}-1`, userId: DEMO_USER_ID, source: 'Maaş', amount: 45000, currency: 'TRY', category: 'Maaş', date: monthsAgo(m), recurring: true, notes: null, createdAt: now, updatedAt: now },
      { id: `d-i${m}-2`, userId: DEMO_USER_ID, source: 'Freelance', amount: 8000 + Math.floor(Math.random() * 5000), currency: 'TRY', category: 'Freelance', date: monthsAgo(m), recurring: false, notes: null, createdAt: now, updatedAt: now },
    )
    const expCats = [
      { cat: 'Market', amt: 3500 + Math.floor(Math.random() * 2000) },
      { cat: 'Fatura', amt: 1200 + Math.floor(Math.random() * 1500) },
      { cat: 'Yakıt', amt: 2000 + Math.floor(Math.random() * 1500) },
      { cat: 'Kira', amt: 12000 },
      { cat: 'Restoran', amt: 800 + Math.floor(Math.random() * 1200) },
    ]
    expCats.forEach((e, i) => {
      data.expenses.push({
        id: `d-e${m}-${i}`, userId: DEMO_USER_ID, category: e.cat, amount: e.amt,
        currency: 'TRY', date: new Date(now.getFullYear(), now.getMonth() - m, 5 + i * 4),
        paymentMethod: Math.random() > 0.4 ? 'Kart' : 'Nakit', notes: null, createdAt: now, updatedAt: now,
      })
    })
  }

  data.properties = [
    { id: 'd-p1', userId: DEMO_USER_ID, name: 'Kadıköy Daire', type: 'Daire', address: 'Caferağa Mah.', city: 'İstanbul', purchasePrice: 1800000, currentValue: 2350000, monthlyRent: 12500, status: 'Kiralı', size: 85, rooms: '2+1', notes: null, createdAt: now, updatedAt: now, contracts: [] },
  ]

  data.contracts = [
    { id: 'd-ct1', propertyId: 'd-p1', tenantName: 'Mehmet Demir', tenantPhone: '+90 532 111 22 33', tenantEmail: null, monthlyRent: 12500, startDate: monthsAgo(8), endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1), deposit: 25000, status: 'Aktif', notes: null, createdAt: now, updatedAt: now, property: data.properties[0] },
  ]
  data.properties[0].contracts = [data.contracts[0]]

  data.vehicles = [
    { id: 'd-v1', userId: DEMO_USER_ID, name: 'Volkswagen Golf', plate: '34 DEMO 1', brand: 'Volkswagen', model: 'Golf', year: 2020, fuelType: 'Benzin', currentKm: 38500, color: '#3b82f6', notes: 'Demo araç', createdAt: now, updatedAt: now, _count: { fuelRecords: 0, serviceRecords: 0 } },
  ]

  // Yakıt + servis
  let km = 33500
  for (let i = 0; i < 4; i++) {
    km += 1200 + Math.floor(Math.random() * 400)
    data.fuel.push({
      id: `d-f${i}`, vehicleId: 'd-v1', date: new Date(now.getFullYear(), now.getMonth() - i, 10),
      liters: 38, amount: 38 * 43.5, km, fuelType: 'Benzin', station: 'Shell', createdAt: now, vehicle: data.vehicles[0],
    })
  }
  data.vehicles[0]._count = { fuelRecords: data.fuel.length, serviceRecords: 1 }
  data.services.push({
    id: 'd-s1', vehicleId: 'd-v1', date: monthsAgo(2), serviceType: 'Periyodik Bakım', amount: 4500, km: 35000, notes: 'Yağ değişimi', createdAt: now, vehicle: data.vehicles[0],
  })

  return data
}

function getDemoStore(sessionToken: string): DemoData {
  if (!demoStores.has(sessionToken)) {
    demoStores.set(sessionToken, seedDemoData())
  }
  return demoStores.get(sessionToken)!
}

export function clearDemoStore(sessionToken: string) {
  demoStores.delete(sessionToken)
}

// ===== Store Interface =====

interface StoreOperations {
  list(resource: ResourceType, userId: string, options?: { months?: number; includeContracts?: boolean }): Promise<any[]>
  get(resource: ResourceType, id: string, options?: { include?: string }): Promise<any | null>
  create(resource: ResourceType, userId: string, data: any): Promise<any>
  update(resource: ResourceType, id: string, data: any): Promise<any>
  delete(resource: ResourceType, id: string): Promise<void>
}

// ===== Demo Memory Store Implementation =====

const DEMO_KEY_MAP: Record<ResourceType, keyof DemoData> = {
  'bank-accounts': 'bankAccounts',
  'credit-cards': 'creditCards',
  loans: 'loans',
  assets: 'assets',
  income: 'income',
  expenses: 'expenses',
  properties: 'properties',
  contracts: 'contracts',
  vehicles: 'vehicles',
  fuel: 'fuel',
  services: 'services',
}

function memoryStore(token: string): StoreOperations {
  return {
    async list(resource, _userId, options) {
      const store = getDemoStore(token)
      const key = DEMO_KEY_MAP[resource]
      let items = [...store[key]] as any[]

      if (options?.months && (resource === 'income' || resource === 'expenses')) {
        const since = new Date()
        since.setMonth(since.getMonth() - options.months)
        items = items.filter((i) => new Date(i.date) >= since)
      }

      // İlişkileri yükle
      if (resource === 'properties') {
        items = items.map((p) => ({ ...p, contracts: store.contracts.filter((c) => c.propertyId === p.id) }))
      }
      if (resource === 'contracts') {
        items = items.map((c) => ({ ...c, property: store.properties.find((p) => p.id === c.propertyId) }))
      }
      if (resource === 'vehicles') {
        items = items.map((v) => ({
          ...v,
          _count: {
            fuelRecords: store.fuel.filter((f) => f.vehicleId === v.id).length,
            serviceRecords: store.services.filter((s) => s.vehicleId === v.id).length,
          },
        }))
      }
      if (resource === 'fuel') {
        items = items.map((f) => ({ ...f, vehicle: store.vehicles.find((v) => v.id === f.vehicleId) }))
      }
      if (resource === 'services') {
        items = items.map((s) => ({ ...s, vehicle: store.vehicles.find((v) => v.id === s.vehicleId) }))
      }

      // Sıralama
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      if (resource === 'income' || resource === 'expenses' || resource === 'fuel' || resource === 'services') {
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }
      return items
    },
    async get(resource, id, options) {
      const store = getDemoStore(token)
      const key = DEMO_KEY_MAP[resource]
      const item = (store[key] as any[]).find((x) => x.id === id)
      if (!item) return null
      if (options?.include === 'records' && resource === 'vehicles') {
        return {
          ...item,
          fuelRecords: store.fuel.filter((f) => f.vehicleId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          serviceRecords: store.services.filter((s) => s.vehicleId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        }
      }
      return item
    },
    async create(resource, userId, data) {
      const store = getDemoStore(token)
      const key = DEMO_KEY_MAP[resource]
      const now = new Date()
      const id = `d-${resource.slice(0, 2)}-${Date.now()}`
      const item = { ...data, id, userId, createdAt: now, updatedAt: now }
      ;(store[key] as any[]).push(item)

      // Yakıt/servis eklenince araç km güncelle
      if (resource === 'fuel' || resource === 'services') {
        const v = store.vehicles.find((x) => x.id === data.vehicleId)
        if (v && data.km > v.currentKm) v.currentKm = data.km
      }
      return item
    },
    async update(resource, id, data) {
      const store = getDemoStore(token)
      const key = DEMO_KEY_MAP[resource]
      const arr = store[key] as any[]
      const idx = arr.findIndex((x) => x.id === id)
      if (idx === -1) throw new Error('not found')
      arr[idx] = { ...arr[idx], ...data, updatedAt: new Date() }
      return arr[idx]
    },
    async delete(resource, id) {
      const store = getDemoStore(token)
      const key = DEMO_KEY_MAP[resource]
      const arr = store[key] as any[]
      const idx = arr.findIndex((x) => x.id === id)
      if (idx === -1) throw new Error('not found')
      arr.splice(idx, 1)
      // Cascade: property silinince contracts da silinir
      if (resource === 'properties') {
        store.contracts = store.contracts.filter((c) => c.propertyId !== id)
      }
      if (resource === 'vehicles') {
        store.fuel = store.fuel.filter((f) => f.vehicleId !== id)
        store.services = store.services.filter((s) => s.vehicleId !== id)
      }
    },
  }
}

// ===== Prisma Store Implementation =====

function prismaStore(): StoreOperations {
  return {
    async list(resource, userId, options) {
      const where = (resource === 'contracts' || resource === 'fuel' || resource === 'services')
        ? {} // ilişkisel tablolar, userId yok (parent üzerinden)
        : { userId }

      const include: any = {}
      if (resource === 'properties') include.contracts = true
      if (resource === 'contracts') include.property = true
      if (resource === 'vehicles') include._count = { select: { fuelRecords: true, serviceRecords: true } }
      if (resource === 'fuel') include.vehicle = true
      if (resource === 'services') include.vehicle = true

      // Admin tüm kullanıcıların verisini görür
      const finalWhere = userId === 'admin-all' ? {} : where

      if (options?.months && (resource === 'income' || resource === 'expenses')) {
        const since = new Date()
        since.setMonth(since.getMonth() - options.months)
        Object.assign(finalWhere, { date: { gte: since } })
      }

      const model = (db as any)[prismaModel(resource)]
      let items = await model.findMany({
        where: finalWhere,
        include: Object.keys(include).length ? include : undefined,
        orderBy: (resource === 'income' || resource === 'expenses' || resource === 'fuel' || resource === 'services')
          ? { date: 'desc' }
          : { createdAt: 'desc' },
      })

      // Fuel/services için vehicleId filtre
      if (resource === 'fuel' || resource === 'services') {
        if ((finalWhere as any).userId) {
          const userVehicles = await db.vehicle.findMany({ where: { userId: (finalWhere as any).userId }, select: { id: true } })
          const ids = userVehicles.map((v) => v.id)
          items = items.filter((i: any) => ids.includes(i.vehicleId))
        }
      }

      return items
    },
    async get(resource, id, options) {
      const model = (db as any)[prismaModel(resource)]
      if (options?.include === 'records' && resource === 'vehicles') {
        const [fuelRecords, serviceRecords] = await Promise.all([
          db.vehicleFuel.findMany({ where: { vehicleId: id }, orderBy: { date: 'desc' } }),
          db.vehicleService.findMany({ where: { vehicleId: id }, orderBy: { date: 'desc' } }),
        ])
        const vehicle = await model.findUnique({ where: { id } })
        return vehicle ? { ...vehicle, fuelRecords, serviceRecords } : null
      }
      return model.findUnique({ where: { id } })
    },
    async create(resource, userId, data) {
      const model = (db as any)[prismaModel(resource)]
      // İlişkisel tablolara userId ekleme
      const payload = (resource === 'contracts' || resource === 'fuel' || resource === 'services')
        ? data
        : { ...data, userId }
      return model.create({ data: payload })
    },
    async update(resource, id, data) {
      const model = (db as any)[prismaModel(resource)]
      return model.update({ where: { id }, data })
    },
    async delete(resource, id) {
      const model = (db as any)[prismaModel(resource)]
      await model.delete({ where: { id } })
    },
  }
}

function prismaModel(resource: ResourceType): string {
  const map: Record<ResourceType, string> = {
    'bank-accounts': 'bankAccount',
    'credit-cards': 'creditCard',
    loans: 'loan',
    assets: 'asset',
    income: 'income',
    expenses: 'expense',
    properties: 'property',
    contracts: 'rentalContract',
    vehicles: 'vehicle',
    fuel: 'vehicleFuel',
    services: 'vehicleService',
  }
  return map[resource]
}

// ===== Ana getter: session'a göre store seç =====

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'demo' | 'user'
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id: (session.user as any).id,
    email: session.user.email || '',
    name: session.user.name || '',
    role: (session.user as any).role || 'user',
  }
}

export async function getStore(): Promise<{ store: StoreOperations; user: SessionUser }> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  if (user.role === 'demo') {
    // Demo için user.id key olarak kullanılır. signIn'de seed, signOut'ta clear.
    return { store: memoryStore(`demo-${user.id}`), user }
  }
  return { store: prismaStore(), user }
}

// Demo store cleanup hook — NextAuth events ile çağrılır
export { demoStores }
