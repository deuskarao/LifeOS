'use client'

import { useTheme } from 'next-themes'
import { Menu, Moon, Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NotificationsBell } from './notifications-bell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNav, type SectionId } from '@/lib/nav-store'
import { useState } from 'react'

const SEARCH_INDEX: { label: string; section: SectionId; keywords: string[] }[] = [
  { label: 'Gösterge Paneli', section: 'dashboard', keywords: ['dashboard', 'panel', 'ana sayfa', 'gösterge'] },
  { label: 'Banka Hesapları', section: 'bank-accounts', keywords: ['banka', 'hesap', 'iban', 'vadesiz', 'vadeli'] },
  { label: 'Kredi Kartları', section: 'credit-cards', keywords: ['kredi kart', 'kart', 'limit', 'visa', 'mastercard'] },
  { label: 'Krediler', section: 'loans', keywords: ['kredi', 'borç', 'taksit', 'konut', 'ihtiyaç', 'taşıt'] },
  { label: 'Varlıklar', section: 'assets', keywords: ['varlık', 'altın', 'döviz', 'hisse', 'kripto', 'fon'] },
  { label: 'Gelirler', section: 'income', keywords: ['gelir', 'maaş', 'kira geliri', 'freelance'] },
  { label: 'Giderler', section: 'expenses', keywords: ['gider', 'harcama', 'fatura', 'market', 'yakıt'] },
  { label: 'Emlak & Kira', section: 'rental', keywords: ['emlak', 'mülk', 'konut', 'daire', 'kira', 'kiracı'] },
  { label: 'Araçlar', section: 'vehicles', keywords: ['araç', 'araba', 'yakıt', 'servis', 'muayene'] },
  { label: 'Raporlar', section: 'reports', keywords: ['rapor', 'analiz', 'istatistik'] },
  { label: 'AI Asistan', section: 'ai-insights', keywords: ['ai', 'asistan', 'yapay zeka', 'öneri'] },
  { label: 'Ayarlar', section: 'settings', keywords: ['ayar', 'profil', 'tema'] },
]

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, setTheme } = useTheme()
  const { set } = useNav()
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)

  const results = q
    ? SEARCH_INDEX.filter((s) => {
        const term = q.toLowerCase()
        return s.label.toLowerCase().includes(term) || s.keywords.some((k) => k.includes(term))
      }).slice(0, 6)
    : []

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Ara… (banka, kredi, mülk, araç)"
          className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:border-border"
        />
        {focused && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-lg border bg-popover shadow-xl z-50">
            {results.map((r) => (
              <button
                key={r.section}
                onMouseDown={() => {
                  set(r.section)
                  setQ('')
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Tema değiştir"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <NotificationsBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">AY</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium">Ahmet Y.</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">Ahmet Yılmaz</p>
              <p className="text-xs font-normal text-muted-foreground">ahmet@lifeos.app</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => set('settings')}>Profil & Ayarlar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => set('ai-insights')}>AI Asistan</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground">
              <Badge variant="secondary" className="mr-auto">v2.0 Pro</Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
