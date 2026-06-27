'use client'

import { useSession } from 'next-auth/react'
import { useNav, type SectionId } from '@/lib/nav-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Landmark,
  Shield,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  PieChart,
  Home,
  Car,
  Settings,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface NavItem {
  id: SectionId
  label: string
  icon: typeof LayoutDashboard
  badge?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Genel',
    items: [{ id: 'dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard }],
  },
  {
    label: 'Finans',
    items: [
      { id: 'bank-accounts', label: 'Banka Hesapları', icon: Building2 },
      { id: 'credit-cards', label: 'Kredi Kartları', icon: CreditCard },
      { id: 'loans', label: 'Krediler', icon: Landmark },
      { id: 'assets', label: 'Varlıklar', icon: Shield },
      { id: 'income', label: 'Gelirler', icon: TrendingUp },
      { id: 'expenses', label: 'Giderler', icon: TrendingDown },
    ],
  },
  {
    label: 'Yaşam',
    items: [
      { id: 'rental', label: 'Emlak & Kira', icon: Home },
      { id: 'vehicles', label: 'Araçlar', icon: Car },
    ],
  },
  {
    label: 'Analiz',
    items: [
      { id: 'reports', label: 'Raporlar', icon: PieChart },
      { id: 'ai-insights', label: 'AI Asistan', icon: Sparkles, badge: 'AI' },
    ],
  },
  {
    label: 'Sistem',
    items: [{ id: 'settings', label: 'Ayarlar', icon: Settings }],
  },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { active, set } = useNav()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as 'admin' | 'demo' | 'user' | undefined
  const level = (session?.user as any)?.level as 'standard' | 'premium' | undefined
  const isAdmin = role === 'admin'
  const isPremiumOrDemo = role === 'admin' || role === 'demo' || level === 'premium'

  // AI Asistan sadece premium/demo/admin için görünür
  const filteredGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (item.id === 'ai-insights' && !isPremiumOrDemo) return false
      return true
    }),
  })).filter((g) => g.items.length > 0)

  const groups = isAdmin
    ? [
        ...filteredGroups,
        {
          label: 'Yönetim',
          items: [{ id: 'admin' as SectionId, label: 'Admin Panel', icon: ShieldCheck, badge: 'ADMIN' }],
        },
      ]
    : filteredGroups

  return (
    <div className="flex h-full flex-col">
      {/* Brand — tıklayınca dashboard'a gider */}
      <button
        onClick={() => { set('dashboard'); onNavigate?.() }}
        className="flex h-16 items-center gap-2.5 border-b px-5 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-emerald text-white shadow-lg shadow-emerald-500/20">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">LifeOS</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Yaşam Yönetimi</p>
        </div>
      </button>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = active === item.id
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      set(item.id)
                      onNavigate?.()
                    }}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'group-hover:text-foreground')} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Premium upgrade banner for standard users */}
      {!isPremiumOrDemo && (
        <div className="border-t p-3">
          <div className="rounded-lg bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-500/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">Premium'a Yükselt</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              AI Asistan, sınırsız analiz ve daha fazlası.
            </p>
            <button
              onClick={() => { set('settings'); onNavigate?.() }}
              className="w-full rounded-md bg-violet-500 hover:bg-violet-600 text-white text-[11px] font-medium py-1.5 transition-colors"
            >
              Yükselt
            </button>
          </div>
        </div>
      )}
      {isPremiumOrDemo && (
        <div className="border-t p-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {role === 'demo' ? 'Demo Modu' : 'Premium Üyelik'}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
              {role === 'demo' ? 'Veriler çıkışta sıfırlanır' : 'Tüm özellikler aktif'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
