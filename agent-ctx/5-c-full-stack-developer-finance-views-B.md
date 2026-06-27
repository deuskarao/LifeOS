# Task 5-c — Finance Views B (Income, Expenses, Reports)

**Agent:** full-stack-developer (finance views B)
**Task ID:** 5-c
**Date:** Auto

## What I built

Three production-ready React views for the LifeOS dashboard:

1. **`src/components/lifeos/views/income-view.tsx`** — `IncomeView` + `IncomeFormDialog`
2. **`src/components/lifeos/views/expenses-view.tsx`** — `ExpensesView` + `ExpenseFormDialog`
3. **`src/components/lifeos/views/reports-view.tsx`** — `ReportsView` (read-only) + `exportCsv` helper + `SummaryRow` sub-component

## Architecture

### IncomeView
- `useCrud<Income>('income')` for create/update/remove mutations
- Separate `useQuery<Income[]>({ queryKey: ['income', months] })` for the month-filtered list (TanStack Query prefix-invalidation ensures mutations refresh the filtered list)
- Month filter Select (Bu Ay/Son 3 Ay/Son 6 Ay) controls the `?months=` query param
- 4 StatCards: Bu Ay Gelir, Dönem Toplam (dynamic label), Tekrarlı Gelir sayısı, En Büyük Kaynak (top source by aggregated amount)
- BarChart for category breakdown (ChartCard + Recharts)
- List grouped by month (Turkish month names) with section header totals
- Each item is a card showing: emerald icon, category badge (color-coded `INCOME_CATEGORY_COLORS` map), recurring badge with RefreshCw icon, source name, date+notes, green +amount, hover-revealed edit/delete buttons
- FormDialog with: source (Input), amount (MoneyInput), currency (Select TRY/USD/EUR), category (Select INCOME_CATEGORIES), date (Input type=date), recurring (Switch with description), notes (Textarea)
- ConfirmDialog for delete. Toast feedback. framer-motion stagger.

### ExpensesView
- Same `useCrud` + month-filtered `useQuery` pattern, resource `'expenses'`
- 4 StatCards: Bu Ay Gider, Dönem Toplam, Günlük Ortalama (last 30 days), En Büyük Kategori
- Vertical (horizontal-bars) BarChart for category breakdown (top 8) with per-category colors via `EXPENSE_CHART_COLORS` map matching the badge tones
- List grouped by month. Each item: rose icon, category badge (color-coded `EXPENSE_CATEGORY_COLORS` map), paymentMethod badge (Nakit/Kart/Havale via `PAYMENT_METHOD_COLORS`), date+notes, red -amount, hover edit/delete
- FormDialog with: category (Select EXPENSE_CATEGORIES), amount (MoneyInput), currency (Select), date (Input type=date), paymentMethod (Select), notes (Textarea)

### ReportsView (read-only, no CRUD)
- `useQuery<ReportsData>({ queryKey: ['reports'] })` — defined interface matches the API route exactly (summary, charts.monthlyTrend/incomeByCategory/expenseByCategory/fuelByVehicle/netWorthBreakdown, propertyStats)
- Two action buttons:
  - **Excel'e Aktar** — `exportCsv(data)` builds a multi-section CSV string with UTF-8 BOM, Blob + URL.createObjectURL + auto-download. Sections: Özet, Aylık Trend, Gelir Kategorileri, Gider Kategorileri, Araç Yakıt Maliyeti, Emlak Performansı
  - **PDF İndir** — `window.print()`
- 5 StatCards: Bu Yıl Gelir, Bu Yıl Gider, Yıllık Tasarruf, Tasarruf Oranı %, Geçen Yıla Göre (with year-over-year net change badge)
- 4 charts (all use ChartCard + Recharts):
  1. Monthly trend BarChart (12 months × income/expense/net grouped bars + Legend)
  2. Income by category PieChart donut (with color legend below)
  3. Expense by category PieChart donut (with scrollable color legend below)
  4. Net worth breakdown horizontal BarChart (positive bars for Banka/Varlıklar/Emlak; negative bars for Kredi Borcu/Kart Borcu; ReferenceLine at x=0; per-bar color via `NET_WORTH_COLORS` map)
- Property performance Table with: name, type badge, currentValue, monthlyRent, annualRent, yieldRate% (green/red), appreciation% (green/red), status badge. Animations on rows.
- Vehicle cost Card (left 1/3): fuelTotal, serviceTotal, total cost (highlighted). Plus BarChart for fuelByVehicle (right 2/3).

## Patterns followed (consistent with dashboard-view.tsx reference)
- `<PageHeader ...>` at top with action buttons
- `useCrud<T>(resource)` for income & expenses mutations
- `FormDialog` for forms, `ConfirmDialog` for delete, `EmptyState` when empty
- `toast` from `sonner` for notifications
- framer-motion stagger on list items (delay `i * 0.03`)
- Skeleton for loading states
- Semantic colors (emerald for income, rose for expense, violet/amber/teal/pink for variety)
- Turkish labels throughout
- `formatCurrency`, `formatDate`, `formatCompact` from `@/lib/lifeos`
- `dateInput` helper for ISO → YYYY-MM-DD conversion
- Form sync uses `useRef` + `useEffect` pattern to detect new `initial` prop values when dialog opens

## Color policy
Avoided indigo/pure blue. Used emerald/teal/violet/amber/rose/pink/fuchsia/orange palette. Category color maps defined for both Tailwind badges (bg/text/border) and Recharts cells (oklch hex strings matching CHART_COLORS).

## Lint status
- No errors on the 3 view files (verified with `npx eslint` on the three files)
- 1 pre-existing error in `src/lib/api-client.ts` (useCallback memoization warning from React Compiler) — not my file, not my concern

## Dev server verification
Dev server logs confirm:
- `GET /api/lifeos/income?months=6` → 200
- `GET /api/lifeos/income?months=3` → 200
- `GET /api/lifeos/income?months=1` → 200
- `GET /api/lifeos/expenses?months=6` → 200

All filter values work. /api/lifeos/reports route exists and returns ok(...).

## Files touched
- `src/components/lifeos/views/income-view.tsx` (full overwrite, ~500 lines)
- `src/components/lifeos/views/expenses-view.tsx` (full overwrite, ~500 lines)
- `src/components/lifeos/views/reports-view.tsx` (full overwrite, ~520 lines)
- `worklog.md` (append-only)
