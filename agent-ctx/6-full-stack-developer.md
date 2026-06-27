# Task ID: 6 — full-stack-developer (AI insights + settings)

## Summary
Built 2 production-ready React views for LifeOS dashboard:
1. **AiInsightsView** — AI-powered financial assistant
2. **SettingsView** — Tabbed settings page (Profile / Appearance / Currency / Notifications / Data)

## Files Modified
- `src/components/lifeos/views/ai-insights-view.tsx` (459 lines)
- `src/components/lifeos/views/settings-view.tsx` (693 lines)
- `worklog.md` (appended task 6 entry)

## AI Insights View Features
- `PageHeader` with Sparkles icon, Turkish title "AI Finansal Asistan"
- **Hero card**: gradient-emerald background, white text, badge "Yapay Zeka Destekli Analiz", 4 capability chips, decorative Wand2 icon
- **Question input**: Textarea + 4 suggested-question chips (one-click fills textarea)
- **CTA**: large primary "Analiz Et" button with Sparkles icon; spinner + "Analiz Ediliyor…" when pending
- **useMutation** from TanStack Query:
  ```tsx
  mutationFn: (q?: string) => api.post<InsightsResponse>('/api/lifeos/ai-insights', { question: q || undefined })
  ```
  onError → sonner toast.error
- **Loading state**: animated Sparkles pulse + ping ring + 3-dot wave + skeleton grid
- **Error state**: rose-tinted AlertOctagon card + "Tekrar Dene" button → mutation.mutate(question)
- **Results**:
  - Summary card (left primary stripe, Sparkles icon, "AI Özeti" badge, large text)
  - Insights grid (md:2 cols), color-coded by type:
    - success → emerald (CheckCircle2)
    - warning → amber (AlertTriangle)
    - info → sky (Info)
    - danger → rose (AlertOctagon)
  - Each card: icon box, bold title, type label badge, description, category badge (Bütçe/Borç/Tasarruf/Yatırım/Harcama)
  - Recommendations: numbered list (1, 2, 3…) with primary circle badges + Lightbulb header
- **framer-motion**: staggered reveal (insights 80ms apart, recommendations 70ms apart)

## Settings View Features (5 Tabs)
- **Profil**: Avatar (AY fallback), Ad Soyad Input, E-posta Input (disabled, Mail icon), Telefon Input (Phone icon), Pro plan badge, Kaydet button (sonner toast.success, 600ms simulated save + spinner)
- **Görünüm**: 3 large cards (Açık Tema / Koyu Tema / Sistem) with Sun/Moon/Monitor icons; uses `useTheme()`; active card shows primary border + Check badge (motion layoutId "theme-active-badge"); `useMounted` via `useSyncExternalStore` (lint-safe alternative to setState-in-effect)
- **Para Birimi**: RadioGroup with 4 currencies (TRY ₺, USD $, EUR €, GBP £) using `CURRENCIES` from lifeos.ts; lazy `useState` reads from `localStorage['lifeos_currency']`; Kaydet → toast + localStorage write
- **Bildirimler**: 4 shadcn Switch components (rentReminder, cardDebtAlert, budgetLimit, aiWeeklyReport); lazy `useState` reads from `localStorage['lifeos_notifications']`; toggle writes back immediately
- **Veri**:
  - "Tüm Verileri Dışa Aktar": fetches all 11 resources in parallel (`bank-accounts`, `credit-cards`, `loans`, `assets`, `income`, `expenses`, `properties`, `contracts`, `vehicles`, `fuel`, `services`), builds `{exportedAt, app, version, data: {...}}` object, creates Blob, triggers download as `lifeos-export-{YYYY-MM-DD}.json`; per-resource error capture; spinner state
  - "Demo Verilerini Sıfırla": toast.info + 800ms delay → `window.location.reload()`
  - "Hesabı Sil" (danger zone, rose-bordered card): AlertDialog confirm with destructive action button → toast.warning (demo mode)

## Tech & Conventions
- Next.js 16 App Router, TypeScript, `'use client'` directive
- TanStack Query `useMutation`, custom `api.post` + `ApiError`
- shadcn/ui: Card, Tabs, Switch, RadioGroup, Avatar, AlertDialog, Input, Label, Textarea, Badge, Button
- framer-motion: `motion.div` initial/animate for staggered reveals, `layoutId` for active theme badge
- lucide-react: Sparkles, Lightbulb, CheckCircle2, AlertTriangle, Info, AlertOctagon, RefreshCw, Wand2, TrendingUp, Settings, User, Mail, Phone, Sun, Moon, Monitor, Coins, Bell, Database, Save, Download, Trash2, Loader2, Check
- sonner toasts (already wired via `<SonnerToaster />` in providers.tsx)
- next-themes for theme switching
- All Turkish labels, responsive (sm:/lg: breakpoints), mobile-first

## Lint Status
- ✅ Both view files: 0 errors
- ⚠️ Pre-existing error in `src/lib/api-client.ts` (useCallback memoization warning from React Compiler) — out of scope for task 6

## Dev Server Verification
- `POST /api/lifeos/ai-insights` with `{}` → 200, returns `{ok:true, data:{summary, insights[], recommendations[]}}`
- `POST /api/lifeos/ai-insights` with `{"question":"test"}` → 200
- All 11 export resources (bank-accounts, credit-cards, …, services) return 200
- `GET /` → 200 (AppShell compiles cleanly with both new views)
- `✓ Compiled in 225ms` in dev.log after edits

## Coordination Notes for Subsequent Agents
- Currency pref key: `lifeos_currency` (string: 'TRY'|'USD'|'EUR'|'GBP')
- Notification prefs key: `lifeos_notifications` (JSON: {rentReminder, cardDebtAlert, budgetLimit, aiWeeklyReport})
- Export download filename format: `lifeos-export-YYYY-MM-DD.json`
- AI insights may return unknown `category` values (e.g. "asset") — UI falls back to raw string via `CATEGORY_LABELS[ins.category] || ins.category`
