'use client'

import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'

interface MoneyInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
  value?: number
  onValueChange?: (v: number) => void
}

/** Para girişi — kullanıcı 1234.56 yazar, biz number tutarız. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => onValueChange?.(e.target.value === '' ? 0 : parseFloat(e.target.value))}
        {...props}
      />
    )
  }
)
MoneyInput.displayName = 'MoneyInput'
