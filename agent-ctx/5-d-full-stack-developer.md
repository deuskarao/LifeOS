# Task 5-d — Rental & Vehicles Views

## Scope
Overwrite two stub view files for the LifeOS dashboard:
- `src/components/lifeos/views/rental-view.tsx` → `RentalView`
- `src/components/lifeos/views/vehicles-view.tsx` → `VehiclesView`

## Reference Files Read
- `/home/z/my-project/worklog.md` — project context (LifeOS infrastructure by Task 1)
- `/home/z/my-project/src/lib/lifeos.ts` — utilities (formatCurrency, formatDate, formatCompact, PROPERTY_TYPES, VEHICLE_FUEL_TYPES, SERVICE_TYPES, etc.)
- `/home/z/my-project/src/lib/api-client.ts` — `api` client + `useCrud<T>(resource)` hook
- `/home/z/my-project/src/components/lifeos/views/dashboard-view.tsx` — style reference
- `/home/z/my-project/src/components/lifeos/views/chart-card.tsx`
- `/home/z/my-project/src/components/lifeos/{stat-card,page-header,empty-state,confirm-dialog,form-dialog,money-input}.tsx`
- API routes: properties, contracts, vehicles (+[id]?include=records), fuel, services — all confirm REST shape and fields

## API Shape Notes
- `GET /api/lifeos/properties` returns `Property[]` with nested `contracts: RentalContract[]`
- `GET /api/lifeos/contracts` returns `RentalContract[]` with nested `property: Property`
- `GET /api/lifeos/vehicles` returns `Vehicle[]` with `_count: { fuelRecords, serviceRecords }`
- `GET /api/lifeos/vehicles/[id]?include=records` returns `{ fuelRecords: VehicleFuel[], serviceRecords: VehicleService[] }`
- `GET /api/lifeos/fuel` and `/api/lifeos/services` both support `?vehicleId=` filter and include `vehicle`

## Conventions Used
- Dark-theme friendly oklch colors (matching dashboard-view)
- `useCrud<T>('resource')` for all CRUD
- `useState` for form state; mutateAsync + toast + close dialog on success
- `dateInput(d)` helper to convert Date to YYYY-MM-DD for `<input type="date">`
- framer-motion stagger for grids
- Turkish labels everywhere
- shadcn/ui: Tabs, Sheet, Table, Select, Badge, Card, Button, Input, Textarea, DropdownMenu, ScrollArea
