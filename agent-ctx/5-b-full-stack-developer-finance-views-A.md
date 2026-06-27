# Task 5-b: Finance Views A (Bank Accounts, Credit Cards, Loans, Assets)

## Agent
full-stack-developer (finance views A)

## Files Modified
- `src/components/lifeos/views/bank-accounts-view.tsx` (overwritten stub → full implementation)
- `src/components/lifeos/views/credit-cards-view.tsx` (overwritten stub → full implementation)
- `src/components/lifeos/views/loans-view.tsx` (overwritten stub → full implementation)
- `src/components/lifeos/views/assets-view.tsx` (overwritten stub → full implementation)
- `worklog.md` (appended Task 5-b section)

## Patterns Established (for future agents)
All 4 views follow a consistent structure that future LifeOS view agents should adopt:

```tsx
'use client'
// 1. State: useCrud<T>(resource), open/editing/form/deleteId/saving useState
// 2. Derived: stats (sum/count/avg), grouped lists (useMemo)
// 3. Loading: Skeleton grid matching layout shape
// 4. Layout: PageHeader → StatCard grid → EmptyState OR content
// 5. Content: motion.div stagger, grouped cards with hover edit/delete
// 6. Mutations: toast.success/error from sonner, optimistic UI via React Query invalidate
// 7. Form: FormDialog + MoneyInput + Select + color preset picker + Textarea
// 8. Confirm: ConfirmDialog for deletes
```

## Key Decisions
1. **Form state**: simple `useState<Partial<T>>({})` (no react-hook-form) for speed and consistency
2. **Color presets**: 8-color picker shown as circular buttons with ring-on-selected
   - Bank: `['#e11d48', '#f59e0b', '#16a34a', '#10b981', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b']`
   - Card: `['#8b5cf6', '#e11d48', '#f59e0b', '#16a34a', '#0ea5e9', '#ec4899', '#6366f1', '#0f172a']`
3. **Money**: always via `MoneyInput` component + displayed via `formatCurrency(amount, currency?)`
4. **Dates**: `dateInputValue()` helper converts ISO string → `yyyy-MM-dd` for `<Input type="date">`
5. **Progress bars**: custom `<div>` with rounded-full overflow hidden (allows color customization per state), not the shadcn Progress component (which only takes a value)
6. **Empty states**: every view has EmptyState with action button for first-time UX
7. **Hover edit/delete**: `opacity-0 group-hover:opacity-100` pattern on top-right of cards
8. **Asset totalValue**: computed client-side as `qty * price` and sent to API (which also computes — defensive)

## API Consumption
- `useCrud<BankAccount>('bank-accounts')` — full CRUD via `/api/lifeos/bank-accounts`
- `useCrud<CreditCard>('credit-cards')` — full CRUD via `/api/lifeos/credit-cards`
- `useCrud<Loan>('loans')` — full CRUD via `/api/lifeos/loans`
- `useCrud<Asset>('assets')` — full CRUD via `/api/lifeos/assets`
- Each `useCrud` invalidates `dashboard` and `reports` query keys on mutation (handled in `api-client.ts`)

## Known Lint State
- My 4 files: clean
- Pre-existing (NOT my scope): `src/lib/api-client.ts:43` react-hooks/preserve-manual-memoization warning on `useCallback` in `useCrud`

## Dev Server Status
- All 4 API routes return 200 (`/api/lifeos/bank-accounts|credit-cards|loans|assets`)
- Compilation successful after fixing the JSX expression parsing issue on line 347 of assets-view (apostrophe inside ternary confused SWC parser — refactored to compute percentage into a local const)
