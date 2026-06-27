# Task: cc-loans-fix — Credit Cards Grouped by Bank + Loans Auto-Calculate Remaining Debt

**Agent:** full-stack-developer
**Task ID:** cc-loans-fix

## Context
Previous agents (see `5-b-full-stack-developer-finance-views-A.md`, `5-c-full-stack-developer-finance-views-B.md`) built the original CreditCardsView (flat grid) and LoansView (DB-only remaining). The user requested:
1. Credit cards grouped by bank (same pattern as bank-accounts-view).
2. Loans auto-calculate remaining debt when DB value is 0/stale.

## Files Modified
- `src/components/lifeos/views/credit-cards-view.tsx`
- `src/components/lifeos/views/loans-view.tsx`

## Implementation Details

### Credit Cards — Group by Bank
Mirrored bank-accounts-view's reduce pattern:
```ts
const grouped = cards.reduce<Record<string, CreditCard[]>>((acc, c) => {
  ;(acc[c.bankName] = acc[c.bankName] || []).push(c)
  return acc
}, {})
const bankNames = Object.keys(grouped).sort()
```
Rendered each bank group with a section header containing:
- Colored dot (accentColor from first card)
- Bank name (`h3`)
- Badge "{n} kart"
- Right-aligned: "Borç: ₺X" in rose + total limit

PageHeader description updated to include bank count.

### Loans — Auto-Calculate Remaining
Added a `loansWithCalc` mapping that computes for each loan:
```ts
const installmentsLeft = Math.max(0, installmentsTotal - installmentsPaid)
const calculatedRemaining = installmentsLeft * monthlyPayment
const isAutoCalculated = remainingAmount <= 0 && calculatedRemaining > 0
const displayRemaining = remainingAmount > 0 ? remainingAmount : calculatedRemaining
```

Display logic per card:
- Main "Kalan Borç" → `displayRemaining`
- If `differs` (DB > 0 and DB ≠ calculated): show "(Hesaplanan: ₺X)" amber note
- If `isAutoCalculated`: amber "Otomatik hesaplandı" badge + "DB: ₺X" caption
- Stats (totalDebt, activeCount) use `displayRemaining`

## Verification
- `bun run lint` — passed (no errors)
- Dev server compiled successfully (`✓ Compiled in 150ms`)
- Named exports `CreditCardsView` and `LoansView` preserved
- Turkish labels, dark theme compatible
- No test files written
