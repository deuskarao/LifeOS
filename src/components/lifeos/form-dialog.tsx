'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type LucideIcon } from 'lucide-react'

interface FormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

export function FormDialog({ open, onOpenChange, title, description, icon: Icon, children, size = 'md' }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${SIZES[size]} max-h-[90vh] gap-0 p-0`}>
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription className="text-xs">{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-5 py-4">{children}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
