# Session Learnings

> AI development context — not used at runtime.
> Record insights, gotchas, and decisions discovered during development sessions.

## 2026-03-05 — ai-memory folder setup

- Created `ai-memory/` as a git-tracked, build-excluded folder for AI agent context.
- Excluded from TypeScript compilation via `tsconfig.json` → `exclude`.
- Excluded from Next.js output file tracing via `next.config.js` → `outputFileTracingExcludes`.
- This folder has zero impact on runtime or build — purely for AI consumption.

## 2026-03-06 — AyaKasir NavBar improvements

- Lang button: replaced custom `.ayakasir-lang-btn` pill with `.lang-switch` pill + `EN | ID` text inside, matching petalytix.id style. `.ayakasir-lang-divider` separates the two with a `|`.
- Default locale: middleware now rewrites bare `/` on ayakasir subdomain to `/<product>/id` (was `/en`).
- Simulator button: added `.ayakasir-nav-simulator` CTA using `.button.ghost` in nav-actions (desktop only, hidden <641px); also added as plain link in mobile nav-menu.
- `nav.simulator` copy added to `AyaKasirCopy` type + both EN/ID data objects in `ayakasir-content.ts`.

## 2026-03-05 — AyaKasir App Simulator implementation

- Built a web-based app simulator at `ayakasir.petalytix.id/{locale}/simulator`.
- Separate route (not inline) — keeps landing page fast, simulator loaded only when visited.
- All CSS prefixed `.sim-*` in `simulator.css` — no globals.css pollution.
- State management: React Context + useReducer in `src/components/ayakasir/simulator/`.
- 25 component files total, ~9.4 kB first-load JS.
- 4 dummy datasets: restaurant (Warung Soto Pak Joko), retail (Toko Makmur Jaya), multichannel (Kopi Nusantara), services (Barbershop Keren).
- Hardcoded login: username `ayakasir`, password `cobaduluaja` — visible hint on login screen.
- Screens: Login → ScenarioPicker → POS (with cart drawer + variant picker + payment flow + receipt) → Dashboard (period filters + stats + low stock) → Products (CRUD + form dialog) → Inventory (grouped list) → Settings (payment toggles + categories + logout).
- All data client-side only — no Supabase, no localStorage, resets on close, each tab independent.
- Landing page now has a "Try it now / Coba Sekarang" CTA section linking to simulator.
- Simulator i18n is separate from main content — in `src/components/ayakasir/simulator/i18n.ts`.
- Phone frame: 375×720px CSS mockup with notch, goes borderless on mobile (<480px).

## 2026-03-05 — Simulator v3: Device selector UX + Mobile/Fullscreen

### Device Selector (updated)
- Desktop: 2 chips — "Mobile Phone" (360×640) and "Tab" (800×1280). Default: Tab.
- Mobile browser (<768px): device selector hidden; forced to smartphone size; fullscreen button shown centered.
- Tab 13" preset and rotation toggle removed.
- Fullscreen button (⛶/✕) uses `document.requestFullscreen()` — synced via `fullscreenchange` event.
- CSS fullscreen rules use `:fullscreen` and `:-webkit-full-screen` to hide controls and fill viewport.
- Mobile CSS: phone renders borderless card (rounded top, no bottom border) filling `calc(100dvh - 60px)` below controls bar.

### Owner Feature Parity (gap analysis)
- Missing screens: Purchasing (goods receiving + vendors), User Management, Cash Management.
- Missing POS: UTANG payment, per-item discount, Saldo Kas card.
- Missing Dashboard: cash balance card, unpaid debts, product sales summary, custom date picker.
- Missing Products: raw materials section, BoM/components, clone, search.
- Missing Inventory: adjust dialog, stock value display, variant-level stock.
- Missing Settings: UTANG toggle, QRIS mock, printer mock, initial balance, vendor/user shortcuts, CSV export.
- New types: Vendor, GoodsReceiving, GoodsReceivingItem, ProductComponent, User, DebtStatus, expanded LedgerType.
- NavRail expands to 6 tabs (add Purchasing between Inventory and Settings).
- ~12 new files, ~12 modified files.

## 2026-03-06 — Portfolio & Routing fixes

- Default locale for petalytix.id root: changed `redirect("/en")` → `redirect("/id")` in `src/app/page.tsx`.
- Portfolio cover image cropping: `.project-cover-large` had fixed `height: 360px` which caused `next/image` to clip. Fixed to `height: auto; min-height: 0` — image now renders at natural aspect ratio (1200×640) constrained by container width, fully responsive.

## 2026-03-05 — Simulator v4: BOM + Raw Material Management

### BOM (Bill of Materials)
- New type `ProductComponent { menuItemId, rawMaterialId, qty, unit }` in `types.ts`.
- `productComponents: ProductComponent[]` added to `SimulatorState` and `ScenarioData`.
- `InventoryUnit` expanded: `"pcs" | "g" | "mL" | "kg" | "L"`.
- `SET_PRODUCT_COMPONENTS` reducer action replaces all components for a menu item.
- On `CONFIRM_PAYMENT`: if a menu item has BOM components, raw material inventory is deducted proportionally instead of the menu item's own inventory.
- `DELETE_PRODUCT` cascades to remove related components (as menuItemId or rawMaterialId).
- `CLONE_PRODUCT` duplicates components for the cloned item.

### Products Screen — BOM editor
- When editing an existing MENU_ITEM, a "Raw Material Components (BOM)" section appears.
- Each row: raw material selector + qty + unit (pcs/g/mL/kg/L) + remove button.
- BOM only editable on existing items (not during creation) to keep form simple.
- Component count shown as badge in product list row.

### Settings Screen — Manajemen Barang & Bahan Baku
- "Manajemen Barang" section: description + menu category CRUD + shortcut to Menu tab.
- "Manajemen Bahan Baku" section: description + raw material category CRUD + shortcut to Menu tab.
- Old flat "Categories" section replaced by two distinct sections.

### Purchasing / GoodsReceivingFormDialog
- Product dropdown now filtered to `RAW_MATERIAL` only (purchasing is for ingredients/stock, not menu items).
- Unit selector (pcs/g/kg/mL/L) added per line; auto-populated from inventory unit.
- Current stock shown per line as a hint.
- `GoodsReceivingItem` has optional `unit?: InventoryUnit` field.

### Data files
- `restaurant.ts`: BOM on Soto Ayam, Nasi Goreng, Mie Goreng, Nasi Putih (Beras + Minyak Goreng).
- `multichannel.ts`: BOM on all coffee/non-coffee drinks (Biji Kopi Arabica + Susu Segar).
- `retail.ts`, `services.ts`: `productComponents: []` (no BOM — direct stock deduction).
