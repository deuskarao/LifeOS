'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useNav, type SectionId } from '@/lib/nav-store'
import { useNotificationPrefs, useReadNotifications } from '@/lib/notification-prefs'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useNav as _useNav } from '@/lib/nav-store'
import {
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  AlertTriangle,
  TrendingDown,
  Wallet,
  Home,
  Car,
  Calendar,
  type LucideIcon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/lifeos'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: 'payment' | 'debt' | 'rental' | 'budget' | 'balance' | 'vehicle' | 'card'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  amount?: number
  dueDate?: string
  daysLeft?: number
  action?: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
  totalCount: number
}

const TYPE_META: Record<Notification['type'], { icon: LucideIcon; color: string; bg: string; label: string }> = {
  payment: { icon: Calendar, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Ödeme' },
  card: { icon: CreditCard, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Kart' },
  debt: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Borç' },
  rental: { icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Kira' },
  budget: { icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Bütçe' },
  balance: { icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Bakiye' },
  vehicle: { icon: Car, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Araç' },
}

const SEVERITY_DOT = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-sky-500',
}

const ACTION_MAP: Record<string, SectionId> = {
  'credit-cards': 'credit-cards',
  loans: 'loans',
  rental: 'rental',
  expenses: 'expenses',
  'bank-accounts': 'bank-accounts',
  vehicles: 'vehicles',
  reports: 'reports',
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const { set: setSection } = useNav()
  const { prefs } = useNotificationPrefs()
  const { readIds, markRead } = useReadNotifications()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotificationsResponse>('/api/lifeos/notifications'),
    refetchInterval: 60_000, // her dakika yenile
  })

  // Bildirim tercihlerine göre filtrele
  const filtered = (data?.notifications ?? []).filter((n) => {
    if (n.type === 'payment' && !prefs.paymentReminders) return false
    if ((n.type === 'card' || n.type === 'debt') && !prefs.cardDebtAlerts) return false
    if (n.type === 'budget' && !prefs.budgetLimits) return false
    return true
  })

  const unread = filtered.filter((n) => !readIds.has(n.id))
  const hasUnread = unread.length > 0

  // Panel açılınca tümünü okundu işaretle (kısa gecikme ile)
  useEffect(() => {
    if (open && filtered.length > 0) {
      const t = setTimeout(() => {
        markRead(filtered.map((n) => n.id))
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [open, filtered.length])

  const handleClick = (n: Notification) => {
    markRead([n.id])
    if (n.action && ACTION_MAP[n.action]) {
      setSection(ACTION_MAP[n.action])
      setOpen(false)
    }
  }

  const markAllReadNow = () => {
    markRead(filtered.map((n) => n.id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Bildirimler">
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {hasUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-background"
              >
                {unread.length > 9 ? '9+' : unread.length}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Bildirimler</h3>
            {hasUnread && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {unread.length} yeni
              </Badge>
            )}
          </div>
          {hasUnread && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllReadNow}>
              <CheckCheck className="h-3 w-3" />
              Tümünü okundu işaretle
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 h-5 w-5 animate-pulse" />
              Bildirimler yükleniyor…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <Check className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Her şey yolunda!</p>
              <p className="mt-1 text-xs text-muted-foreground">Okunmamış bildiriminiz yok.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((n, i) => {
                const meta = TYPE_META[n.type]
                const Icon = meta.icon
                const isUnread = !readIds.has(n.id)
                return (
                  <motion.button
                    key={n.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                      isUnread && 'bg-primary/5'
                    )}
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.bg)}>
                      <Icon className={cn('h-4 w-4', meta.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {isUnread && <span className={cn('h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[n.severity])} />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.description}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {meta.label}
                        </Badge>
                        {n.amount !== undefined && n.amount > 0 && (
                          <span className="text-[11px] font-semibold">{formatCurrency(n.amount)}</span>
                        )}
                        {n.daysLeft !== undefined && n.daysLeft > 0 && (
                          <span className="text-[11px] text-muted-foreground">{n.daysLeft} gün kaldı</span>
                        )}
                        {n.daysLeft !== undefined && n.daysLeft < 0 && (
                          <span className="text-[11px] font-medium text-rose-500">{Math.abs(n.daysLeft)} gün gecikti</span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {filtered.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => {
                setSection('settings')
                setOpen(false)
              }}
            >
              Bildirim ayarları
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
