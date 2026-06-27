# Task: reports-rewrite

**Agent:** full-stack-developer
**Status:** COMPLETED
**Date:** auto

## Task

Completely rewrite `/home/z/my-project/src/components/lifeos/views/reports-view.tsx` to:
1. Match new API response shape (`period` + `summary` with `periodIncome/prevIncome/periodExpense/prevExpense/periodSavings/savingsRate/incomeChange/expenseChange` etc.)
2. Add date range selector (6 preset buttons + custom from/to with Apply)
3. Fix KPI card layout (5 across on lg without overflow)
4. Replace `window.print()` with real jsPDF + jspdf-autotable PDF export
5. Keep CSV export, adapt to new field names
6. Keep existing charts adapted to new data shape

## Previous agents' work visible in this directory
- See `5-b-full-stack-developer-finance-views-A.md`, `5-c-full-stack-developer-finance-views-B.md`, `5-d-full-stack-developer.md`, `6-full-stack-developer.md` for prior view implementations and shared patterns.
- See `/home/z/my-project/worklog.md` for full project context (Tasks 1, 5-b, 5-c, 5-d, 6, 7, 8, 9).

## Files modified
- `src/components/lifeos/views/reports-view.tsx` — full rewrite (~830 lines)
- `worklog.md` — appended stage summary

## Implementation details

### Date range selector
- 6 preset buttons: Bu Ay (1m), Son 3 Ay (3m), Son 6 Ay (6m), Bu Yıl (this-year), Geçen Yıl (last-year), Tümü (all)
- Custom date range: two `<Input type="date">` + "Uygula" button
- State split: `customFrom/customTo` (inputs) vs `appliedFrom/appliedTo` (actually applied) — so user types then commits with Apply
- Validation: both dates required, from ≤ to (else toast error)
- `useQuery` queryKey = `['reports', preset, appliedFrom, appliedTo]` → auto-refetches on change
- `buildQuery()` returns either `?preset=X` or `?from=...&to=...` when preset==='custom'
- Active period indicator: Badge + formatted date range below selector

### Fixed KPI cards
- Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
- Built custom `CompactKpi` component (smaller than StatCard):
  - Title: `text-[10px] uppercase`
  - Value: `text-lg font-bold truncate` (was 2xl before, caused overflow)
  - Icon box: `h-9 w-9` (was h-11)
  - Change badge: `text-[10px]` with TrendingUp/TrendingDown icon
- 5 cards: Dönem Geliri (+incomeChange badge), Dönem Gideri (+expenseChange badge), Dönem Tasarrufu, Tasarruf Oranı %, Net Değer

### Real PDF export (jsPDF + jspdf-autotable)
```ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
```
- Title + period label + creation date in header
- 6 autoTable sections with color-coded headers:
  1. Özet (emerald [16,185,129]) — 10 rows
  2. Gider Kategorileri (rose [244,63,94])
  3. Gelir Kategorileri (sky [14,165,233])
  4. Aylık Trend (violet [139,92,246]) — only if data
  5. Emlak Performansı (violet) — only if data
  6. Araç Yakıt Maliyeti (amber [245,158,11]) + plain totals table — only if data
- Footer page numbers on every page (`Sayfa X/Y`)
- Try/catch with toast.success / toast.error
- Saved as `lifeos-rapor-YYYY-MM-DD.pdf`

### CSV export (kept, adapted)
- New field names: periodIncome/periodExpense/periodSavings/savingsRate/incomeChange/expenseChange/prevIncome/prevExpense
- Added period label + creation date to header row
- UTF-8 BOM for Excel compatibility, ISO date filename

### Charts (adapted)
- Monthly trend grouped BarChart (income/expense/net) — `c.monthlyTrend`
- Income PieChart donut — `c.incomeByCategory`
- Expense PieChart donut — `c.expenseByCategory`
- Net worth horizontal BarChart with ReferenceLine at x=0 — `c.netWorthBreakdown`
- Property performance Table with motion.tr stagger — `data.propertyStats`
- Vehicle cost Card + fuelByVehicle BarChart

## Verification
- `bun run lint` → 0 errors on the rewritten file
- Dev server log confirms end-to-end:
  - `GET /api/lifeos/reports?preset=this-year 200`
  - `GET /api/lifeos/reports?preset=1m 200`
- Both preset and custom date params work via the API route

## Notes
- Removed unused `StatCard` import (replaced with custom `CompactKpi`)
- Kept `SummaryRow` sub-component unchanged from original
- Named export `ReportsView` preserved (no breakage for consumers)
- Loading skeleton matches new layout (date selector + 5 KPI cards + charts)
- framer-motion: CompactKpi cards fade-in y:10, property rows stagger 0.04s
- All Turkish labels; semantic oklch accent colors; dark-theme friendly
