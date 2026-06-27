'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'

interface ChartCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ChartCard({ title, description, icon: Icon, actions, children, className }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export const CHART_COLORS = {
  emerald: 'oklch(0.68 0.17 155)',
  violet: 'oklch(0.65 0.18 280)',
  amber: 'oklch(0.75 0.18 65)',
  rose: 'oklch(0.65 0.2 25)',
  sky: 'oklch(0.6 0.15 200)',
  teal: 'oklch(0.6 0.13 180)',
  pink: 'oklch(0.65 0.2 350)',
}

export const CHART_COLOR_ARRAY = [
  CHART_COLORS.emerald,
  CHART_COLORS.violet,
  CHART_COLORS.amber,
  CHART_COLORS.rose,
  CHART_COLORS.sky,
  CHART_COLORS.teal,
  CHART_COLORS.pink,
]

export const chartTooltipStyle = {
  backgroundColor: 'rgb(30 41 59)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'rgb(241 245 249)',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
}

export const chartLabelStyle = {
  fontSize: '12px',
  fill: 'rgb(100 116 139)',
}

export const gridStroke = 'oklch(0.5 0.01 240 / 0.15)'
