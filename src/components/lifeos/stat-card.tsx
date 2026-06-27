'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  change?: number
  changeLabel?: string
  accent?: 'emerald' | 'violet' | 'amber' | 'rose' | 'sky'
  subtitle?: string
}

const ACCENTS = {
  emerald: { bg: 'oklch(0.68 0.17 155 / 0.12)', text: 'oklch(0.7 0.17 155)', ring: 'oklch(0.68 0.17 155 / 0.2)' },
  violet: { bg: 'oklch(0.65 0.18 280 / 0.12)', text: 'oklch(0.7 0.18 280)', ring: 'oklch(0.65 0.18 280 / 0.2)' },
  amber: { bg: 'oklch(0.75 0.18 65 / 0.12)', text: 'oklch(0.78 0.18 65)', ring: 'oklch(0.75 0.18 65 / 0.2)' },
  rose: { bg: 'oklch(0.65 0.2 25 / 0.12)', text: 'oklch(0.7 0.2 25)', ring: 'oklch(0.65 0.2 25 / 0.2)' },
  sky: { bg: 'oklch(0.6 0.15 200 / 0.12)', text: 'oklch(0.65 0.15 200)', ring: 'oklch(0.6 0.15 200 / 0.2)' },
}

export function StatCard({ title, value, icon: Icon, change, changeLabel, accent = 'emerald', subtitle }: StatCardProps) {
  const a = ACCENTS[accent]
  const positive = (change ?? 0) >= 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden p-5 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight truncate">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground truncate">{subtitle}</p>}
            {typeof change === 'number' && (
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold',
                    positive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  )}
                >
                  {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(change).toFixed(1)}%
                </span>
                {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
              </div>
            )}
          </div>
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: a.bg, color: a.text, boxShadow: `inset 0 0 0 1px ${a.ring}` }}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
