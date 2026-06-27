'use client'

import { create } from 'zustand'

export type SectionId =
  | 'dashboard'
  | 'bank-accounts'
  | 'credit-cards'
  | 'loans'
  | 'assets'
  | 'income'
  | 'expenses'
  | 'reports'
  | 'rental'
  | 'vehicles'
  | 'ai-insights'
  | 'settings'
  | 'admin'

interface NavState {
  active: SectionId
  set: (s: SectionId) => void
}

export const useNav = create<NavState>((set) => ({
  active: 'dashboard',
  set: (s) => set({ active: s }),
}))
