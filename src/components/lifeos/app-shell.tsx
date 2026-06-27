'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useNav } from '@/lib/nav-store'
import { AnimatePresence, motion } from 'framer-motion'
import { DashboardView } from './views/dashboard-view'
import { BankAccountsView } from './views/bank-accounts-view'
import { CreditCardsView } from './views/credit-cards-view'
import { LoansView } from './views/loans-view'
import { AssetsView } from './views/assets-view'
import { IncomeView } from './views/income-view'
import { ExpensesView } from './views/expenses-view'
import { ReportsView } from './views/reports-view'
import { RentalView } from './views/rental-view'
import { VehiclesView } from './views/vehicles-view'
import { AiInsightsView } from './views/ai-insights-view'
import { SettingsView } from './views/settings-view'
import { AdminView } from './views/admin-view'

export function AppShell() {
  const { active, set } = useNav()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as 'admin' | 'demo' | 'user' | undefined
  const isAdmin = role === 'admin'
  const [mobileOpen, setMobileOpen] = useState(false)

  // Admin her zaman admin panel'de başlar ve başka yere gidemez
  useEffect(() => {
    if (isAdmin && active !== 'admin') {
      set('admin')
    }
  }, [isAdmin, active, set])

  // 10 dakikalık otomatik logout (inaktivite tabanlı)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const resetTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = setTimeout(() => {
        signOut({ callbackUrl: '/' })
      }, 10 * 60 * 1000) // 10 dakika
    }
    // Kullanıcı aktivitesinde timer'ı sıfırla
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — sticky, sayfa ile uzamaz */}
      <aside className="hidden md:flex w-56 shrink-0 border-r bg-sidebar/50 backdrop-blur-sm sticky top-0 h-screen">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderView(active)}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <footer className="mt-auto border-t bg-background/80 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>© 2026 LifeOS — Tüm Hakları Saklıdır</p>
            <p className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tüm sistemler çalışıyor
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

function renderView(active: string) {
  switch (active) {
    case 'dashboard':
      return <DashboardView />
    case 'bank-accounts':
      return <BankAccountsView />
    case 'credit-cards':
      return <CreditCardsView />
    case 'loans':
      return <LoansView />
    case 'assets':
      return <AssetsView />
    case 'income':
      return <IncomeView />
    case 'expenses':
      return <ExpensesView />
    case 'reports':
      return <ReportsView />
    case 'rental':
      return <RentalView />
    case 'vehicles':
      return <VehiclesView />
    case 'ai-insights':
      return <AiInsightsView />
    case 'settings':
      return <SettingsView />
    case 'admin':
      return <AdminView />
    default:
      return <DashboardView />
  }
}
