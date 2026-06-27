'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSyncExternalStore } from 'react'

function subscribe() { return () => {} }
function getSnapshot() { return true }
function getServerSnapshot() { return false }

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // Mount kontrolü — hydration mismatch önlemek için
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
