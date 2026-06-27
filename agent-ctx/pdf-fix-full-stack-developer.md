# Task: pdf-fix — Fix PDF Turkish characters and improve formatting

## Agent
full-stack-developer

## File Modified
- `src/components/lifeos/views/reports-view.tsx` (only)

## Problem
jsPDF's default Helvetica font does NOT support Turkish characters (ş, ğ, ı, İ, ö, ü, ç).
The existing `tr()` transliterator handled the basic Turkish alphabet + ₺, but:
1. It missed smart quotes, em-dashes, currency symbols (€, £, ¥), bullets, etc.
2. `formatCurrency()` returns strings prefixed with ₺ which sometimes reached the PDF unconverted.
3. The PDF layout was plain (grid theme, no header bar, basic footer).

## Solution

### 1. Thorough `tr()` ASCII normalizer
Rewrote `tr()` to handle, in order:
- Currency symbols: ₺→TL, €→EUR, £→GBP, ¥→JPY
- All Turkish lowercase + uppercase letters
- Smart quotes / apostrophes → ASCII quotes
- Em-dash / en-dash → hyphen, ellipsis → ...
- Bullets → *, ©→(c), ®→(r), ™→(TM), °→ derece
- Various Unicode spaces (NBSP, thin, hair, etc.) → regular space
- **Final defensive strip**: `[^\x20-\x7E]` removes ANY remaining non-ASCII
  → guarantees zero broken characters can reach jsPDF

### 2. Professional `exportPdf()` layout
- A4 / mm units, margin { top:50, bottom:30, left:14, right:14 } on all tables
- Page 1 cover: 22pt bold title, 11pt period subtitle wrapped via `splitTextToSize()`, 9pt timestamp, separator
- Section titles: 14pt bold + colored emerald sidebar rectangle (3×7mm) + page-break guard (y > pageHeight-80 → addPage)
- All tables: `theme:'striped'` + `alternateRowStyles` (slate-50) + right-aligned numeric columns (`halign:'right'`)
- Font sizes per spec: title 22, section 14, table head 10, body 9
- Per-section colors (NO blue/indigo): Özet=emerald, Gelir=teal, Gider=rose, Trend=violet, Emlak=violet, Araç=amber
- Property table: explicit `columnStyles` with `cellWidth` + `halign` for all 6 columns
- **Every page**: colored header bar (full-width emerald rect 0-14mm) + footer (separator line, timestamp left, "Sayfa X / Y" right)
- `tr()` applied to EVERY string: title, period label, timestamp, section titles, table headers, body labels, all `formatCurrency()` values (₺→TL before render), percentages, category/property names

## Verification
- `npx eslint src/components/lifeos/views/reports-view.tsx` → 0 errors
- `npx tsc --noEmit` → 0 errors in reports-view.tsx (pre-existing errors in other files unchanged)
- `ReportsView` named export preserved
- Dev server compiles successfully

## Notes for Future Agents
- The `tr()` function is the single source of truth for PDF text safety. Any new string added to `exportPdf()` MUST be wrapped in `tr()`.
- If a Unicode TTF font is ever embedded (jsPDF `addFont`), the `tr()` defensive strip can be relaxed — but the ~300KB font cost makes the transliteration approach preferable for now.
- Colors are typed as `[number, number, number]` tuples so they can be spread into `doc.setFillColor(...BRAND)` and assigned to autoTable's `fillColor` without TS errors.
