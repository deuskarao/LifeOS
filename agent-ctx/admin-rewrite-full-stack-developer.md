# Task: admin-rewrite — Rewrite admin view with user CRUD + level management

## Context read
- `worklog.md`: LifeOS projesi, Next.js 16 + Prisma + Supabase + NextAuth. 3 kullanıcı tipi: admin / demo / user. Tüm 22 API rotası `getStore()` pattern'inde.
- `src/app/api/lifeos/admin/route.ts`: mevcut — `GET /api/lifeos/admin` sistem istatistikleri + user listesi döner.
- `src/app/api/lifeos/admin/users/route.ts`: `GET` (tüm kullanıcılar + stats) + `POST` (yeni kullanıcı, bcrypt hash).
- `src/app/api/lifeos/admin/users/[id]/route.ts`: `PUT` (güncelle) + `DELETE` (cascade sil, self-delete engelli).
- `src/app/api/lifeos/users/[id]/level/route.ts`: `PUT` ile `{level}` veya `?action=reset-quota`. Demo kullanıcı engelli.
- `src/components/lifeos/views/admin-view.tsx`: mevcut — tek sayfa, sistem istatistikleri + kullanıcı kart listesi. Overwrite edilecek.
- `src/lib/api-client.ts`: `api.get/post/put/del` + `useCrud`. ApiError sınıfı mevcut.
- Shared components: stat-card, page-header, empty-state, confirm-dialog, form-dialog hepsi mevcut ve kullanımda.
- UI components: tabs, table, switch, select, dropdown-menu, badge, avatar, button, input, label, skeleton, card hepsi `src/components/ui/` altında.
- `ai-insights/route.ts`: premium = 5/gün, standard = 1/gün, demo = sınırsız (kota kontrolü yok).
- `motion.tr` pattern reports-view'da zaten kullanılıyor.

## Plan
1. `src/components/lifeos/views/admin-view.tsx` tamamen yeniden yaz
2. Tabs: "Genel Bakış" (overview, mevcut içerik) + "Kullanıcılar" (yeni CRUD)
3. Users tab: Table, Switch (level toggle), DropdownMenu (edit/reset-quota/delete), FormDialog (create/edit), ConfirmDialog (delete)
4. Mutations: create / update / delete / level / reset-quota — hepsi `['admin-users']` + `['admin']` invalidate
5. useSession → currentUserId → self-delete disable
6. Lint fix
7. worklog.md append

## Output files
- `/home/z/my-project/src/components/lifeos/views/admin-view.tsx` (overwrite)
- `/home/z/my-project/worklog.md` (append)
