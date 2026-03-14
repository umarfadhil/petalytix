# Session Learnings

> AI development context â€” not used at runtime.
> Record insights, gotchas, and decisions discovered during development sessions.

## 2026-03-14 — AyaKasir registration improvements

- Updated `erp-auth-card` to be scrollable with a viewport max-height to avoid overlap on smaller screens.
- Moved Province/City fields to appear immediately after the business name on the registration form.
- Added AyaKasir landing-page metrics section (tenants/provinces/cities/transactions) with count-up animation and live Supabase-backed totals.
- Supabase sign-up now redirects activation to `/<locale>/app/confirm`, which verifies tokens client-side (if present) and then routes to login.
- Added a public `/app/confirm` route with localized activation messaging.
- Added forgot-password + reset-password flow, including reset email requests and password update handling that syncs Supabase Auth with `public.users`.
- Confirm page now supports recovery links delivered as `token_hash`, `access_token`/`refresh_token` hash, or `code` params.
- Replaced the PIN input pattern with `[0-9]{6}` to avoid browser validation failures.
- Register form now includes business name label update (Nama Usaha), required 6-digit PIN, and Province/City dependent dropdowns sourced from `src/data/indonesia-provinces.json`.
- Registration server action now validates pin/province/city and stores tenant `province`/`city`, plus hashed `pin_hash`/`pin_salt` for the owner user.
- Added ERP auth copy keys in `src/components/ayakasir/erp/i18n.ts` to localize the registration page.

## 2026-03-14 — ERP Settings: CSV export field correction

- Removed the CSV profile card from Settings > Unduh Data.
- CSV export fields now match the requested list: `id, reference_id, tenant_name, date, type, description, customer_category, customer_name, product_category, product_name, variant_name, qty, unit_price, discount_type, discount_value, discount_per_unit, amount, payment_method, transaction_notes, person_in_charge`.

## 2026-03-05 â€” ai-memory folder setup

- Created `ai-memory/` as a git-tracked, build-excluded folder for AI agent context.
- Excluded from TypeScript compilation via `tsconfig.json` â†’ `exclude`.
- Excluded from Next.js output file tracing via `next.config.js` â†’ `outputFileTracingExcludes`.
- This folder has zero impact on runtime or build â€” purely for AI consumption.

## 2026-03-06 â€” AyaKasir NavBar improvements

- Lang button: replaced custom `.ayakasir-lang-btn` pill with `.lang-switch` pill + `EN | ID` text inside, matching petalytix.id style. `.ayakasir-lang-divider` separates the two with a `|`.
- Default locale: middleware now rewrites bare `/` on ayakasir subdomain to `/<product>/id` (was `/en`).
- Simulator button: added `.ayakasir-nav-simulator` CTA using `.button.ghost` in nav-actions (desktop only, hidden <641px); also added as plain link in mobile nav-menu.
- `nav.simulator` copy added to `AyaKasirCopy` type + both EN/ID data objects in `ayakasir-content.ts`.

## 2026-03-05 â€” AyaKasir App Simulator implementation

- Built a web-based app simulator at `ayakasir.petalytix.id/{locale}/simulator`.
- Separate route (not inline) â€” keeps landing page fast, simulator loaded only when visited.
- All CSS prefixed `.sim-*` in `simulator.css` â€” no globals.css pollution.
- State management: React Context + useReducer in `src/components/ayakasir/simulator/`.
- 25 component files total, ~9.4 kB first-load JS.
- 4 dummy datasets: restaurant (Warung Soto Pak Joko), retail (Toko Makmur Jaya), multichannel (Kopi Nusantara), services (Barbershop Keren).
- Hardcoded login: username `ayakasir`, password `cobaduluaja` â€” visible hint on login screen.
- Screens: Login â†’ ScenarioPicker â†’ POS (with cart drawer + variant picker + payment flow + receipt) â†’ Dashboard (period filters + stats + low stock) â†’ Products (CRUD + form dialog) â†’ Inventory (grouped list) â†’ Settings (payment toggles + categories + logout).
- All data client-side only â€” no Supabase, no localStorage, resets on close, each tab independent.
- Landing page now has a "Try it now / Coba Sekarang" CTA section linking to simulator.
- Simulator i18n is separate from main content â€” in `src/components/ayakasir/simulator/i18n.ts`.
- Phone frame: 375Ã—720px CSS mockup with notch, goes borderless on mobile (<480px).

## 2026-03-05 â€” Simulator v3: Device selector UX + Mobile/Fullscreen

### Device Selector (updated)
- Desktop: 2 chips â€” "Mobile Phone" (360Ã—640) and "Tab" (800Ã—1280). Default: Tab.
- Mobile browser (<768px): device selector hidden; forced to smartphone size; fullscreen button shown centered.
- Tab 13" preset and rotation toggle removed.
- Fullscreen button (â›¶/âœ•) uses `document.requestFullscreen()` â€” synced via `fullscreenchange` event.
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

## 2026-03-06 â€” Portfolio & Routing fixes

- Default locale for petalytix.id root: changed `redirect("/en")` â†’ `redirect("/id")` in `src/app/page.tsx`.
- Portfolio cover image cropping: `.project-cover-large` had fixed `height: 360px` which caused `next/image` to clip. Fixed to `height: auto; min-height: 0` â€” image now renders at natural aspect ratio (1200Ã—640) constrained by container width, fully responsive.

## 2026-03-05 â€” Simulator v4: BOM + Raw Material Management

### BOM (Bill of Materials)
- New type `ProductComponent { menuItemId, rawMaterialId, qty, unit }` in `types.ts`.
- `productComponents: ProductComponent[]` added to `SimulatorState` and `ScenarioData`.
- `InventoryUnit` expanded: `"pcs" | "g" | "mL" | "kg" | "L"`.
- `SET_PRODUCT_COMPONENTS` reducer action replaces all components for a menu item.
- On `CONFIRM_PAYMENT`: if a menu item has BOM components, raw material inventory is deducted proportionally instead of the menu item's own inventory.
- `DELETE_PRODUCT` cascades to remove related components (as menuItemId or rawMaterialId).
- `CLONE_PRODUCT` duplicates components for the cloned item.

### Products Screen â€” BOM editor
- When editing an existing MENU_ITEM, a "Raw Material Components (BOM)" section appears.
- Each row: raw material selector + qty + unit (pcs/g/mL/kg/L) + remove button.
- BOM only editable on existing items (not during creation) to keep form simple.
- Component count shown as badge in product list row.

### Settings Screen â€” Manajemen Barang & Bahan Baku
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
- `retail.ts`, `services.ts`: `productComponents: []` (no BOM â€” direct stock deduction).

## 2026-03-10 â€” ERP Dashboard v2: stats, expandable rows, pagination, date filter

### Stats cards
- Added Tunai (CASH), Transfer, and UTANG cards to `erp-stats-grid` alongside existing Cash Balance, Total Sales, Total Transactions, QRIS.
- New i18n keys in `ErpCopy.dashboard`: `cashSales`, `transferSales`, `utangTotal`, `rowsPerPage`.

### Expandable transaction rows
- Click any row in Recent Transactions to toggle an inline detail view showing all `transactionItems` for that transaction.
- Uses `expandedTxId` state; expand row renders `.erp-table-row--expanded` + `.erp-tx-detail` with `.erp-tx-detail-table`.
- Collapse indicator: `â–¶` / `â–¼` in first column.

### Pagination
- `txPage` + `txPageSize` (10 | 25 | 50) state on Recent Transactions table.
- Row-count chips rendered in `.erp-table-header-row` â†’ `.erp-table-controls`.
- Pagination bar (â€¹ / â€º) in `.erp-table-pagination` below the table; hidden when only 1 page.
- Page resets to 0 on period change or page-size change.

### Custom date range filter
- Added `"custom"` as a 4th period chip; shows two `<input type="date">` pickers when active.
- Range: from 00:00:00 on `customFrom` to 23:59:59 on `customTo`.
- CSS: `.erp-dashboard-date-range`, `.erp-dashboard-date-sep`, `.erp-input--date` in `erp.css`.

## 2026-03-10 â€” ERP POS: customers, TRANSFER, payment method gating

### Supabase schema (already existed, no migration needed)
- `tenants.enabled_payment_methods TEXT DEFAULT 'CASH,QRIS,UTANG'` â€” comma-separated string, not booleans
- `transactions.customer_id UUID`, `transactions.customer_name TEXT`, `transactions.debt_status TEXT` â€” already present
- `customers` table already exists: `id, tenant_id, name, phone, email, birthday, gender, category_id, notes, sync_status, updated_at, created_at`

### Customer integration (POS)
- Customer search dialog opens before checkout. Searches `state.customers` locally by name or phone (up to 10 results).
- "+ New Customer" form: name (required) + phone â†’ calls `createCustomer()` â†’ dispatches UPSERT â†’ selects new customer.
- "Skip" button proceeds to checkout without a customer attached.
- Selected customer shown as badge in checkout dialog with an Edit button to re-open search.
- On transaction save: `customer_id` + `customer_name` written to transaction row.
- `customers` added to: `TENANT_TABLES`, `TableTypeMap`, `ErpState`, `tableKeyMap` (realtime), SSR layout fetch.
- New repository: `src/lib/supabase/repositories/customers.ts`.

### TRANSFER payment method
- Added `TRANSFER` to `ALL_METHODS` array in PosScreen; i18n key `pos.transfer`.
- `DbTransaction.payment_method` already supported TRANSFER in types.ts.
- Ledger type for TRANSFER falls through to `"SALE"` (same as CASH).

### Payment method gating
- `tenants.enabled_payment_methods` parsed into a `Set<PaymentMethod>` via useMemo in both PosScreen and SettingsScreen.
- In POS checkout: disabled methods show `.erp-payment-btn--disabled` (greyed, not clickable).
- In Settings (owner only): 4 toggles â€” CASH (always on), QRIS, TRANSFER, UTANG. Toggle writes updated comma-string to `tenants` via Supabase and dispatches `SET_RESTAURANT`.
- New i18n keys: `settings.enableTransfer`, `settings.paymentMethodsHint`, `pos.transfer`, `pos.searchCustomer`, `pos.newCustomer`, `pos.addCustomer`, `pos.customerPhone`.

## 2026-03-10 â€” ERP POS improvements

- **Category grouping**: When "Semua/All" chip is active (no category filter, no search), products are grouped by category with a heading label + horizontal rule. Uses `groupedProducts` useMemo + `.erp-pos-category-group` / `.erp-pos-category-label` / `.erp-pos-category-items` (inner grid). When a specific category or search is active, reverts to flat grid (`.erp-pos-grid--flat`).
- **Card fixed height**: `.erp-pos-card` now has `height: 80px; display: flex; flex-direction: column; justify-content: center` â€” no more stretch-to-fill-row behavior.
- **Clear cart**: "Hapus/Clear" danger button in `.erp-pos-cart-header` appears only when cart has items; calls `setCart([])`.
- **Customer name dialog**: Checkout button now opens a customer name dialog first (`showCustomerDialog` state). User enters name (optional), then clicks Confirm â†’ checkout payment dialog opens. Customer name is shown as a read-only label in the checkout dialog if provided.
- **UTANG note field**: In the checkout dialog when UTANG is selected, the label is `copy.pos.utangNote` ("Catatan (Opsional)" / "Note (Optional)") instead of `customerName`. The field still binds to `customerName` state and is no longer required (disabled check removed).
- New i18n keys added: `clearCart`, `customerNamePlaceholder`, `utangNote` in both EN and ID.

## 2026-03-10 â€” AyaKasir Landing Page & ERP Dashboard improvements

### Landing Page
- NavBar: removed Home and Privacy Policy links; added Login button (`copy.nav.login`) linking to `/${locale}/app/login` styled as `.ayakasir-nav-login`.
- Hero: converted to client component `src/components/ayakasir/Hero.tsx` â€” typing animation cycles through feature words using useEffect + phase state machine (typing â†’ pause â†’ deleting). Words are in `copy.hero.typingWords`.
- Hero copy shape changed: `title` split into `titlePrefix` / `titleSuffix` / `typingWords`; `ctaLearnMore` replaced with `ctaLogin`.
- Feature items updated to 6-step flow: Purchasing â†’ Inventory â†’ Menu & Products â†’ Customers & Debt â†’ Cashier (POS) â†’ Dashboard & Reports.
- Landing page (`page.tsx`) is now a server component that passes `copy` + `locale` to `AyaKasirHero` client component.
- Flat vector SVG illustrations: inline SVGs in `page.tsx` for each feature step + cross-platform illustration + hero phone mockup.
- CSS: `.ayakasir-hero-inner` flex row, `.ayakasir-typing-word` blue italic, `.ayakasir-cursor` blink animation, `.ayakasir-features-flow` vertical steps grid, `.ayakasir-sync-badge` pill, `.ayakasir-crossplatform` block â€” all in `globals.css`.

### ERP Dashboard
- ERP shell: `height: 100vh; overflow: hidden` â€” no page scroll; `.erp-main` is the scrollable zone.
- Sidebar collapse: ErpSidebar has local `collapsed` state; toggles `.erp-sidebar--collapsed` class; collapse button in header; icon-only mode hides labels; CSS uses `.erp-sidebar--collapsed ~ .erp-main` to shift main.
- Watermark: `<div class="erp-watermark">AyaKasir by Petalytix | 2026</div>` â€” fixed bottom-right, muted, pointer-events none.
- NavBar and Footer of the marketing site are not shown in ERP (separate layout with no nav/footer â€” unchanged, already was so).

## 2026-03-11 â€” ERP Products/Purchasing restructure

- **ProductsScreen** now MENU_ITEM only â€” Raw Materials tab removed. Category CRUD locked to `"MENU"` type. No tab selector.
- **PurchasingScreen** gains a 3rd tab "Raw Materials" â€” full CRUD for RAW_MATERIAL products + RAW_MATERIAL categories.
  - Creating a new raw material also upserts an inventory row with `current_qty: 0` and the chosen unit (set on creation, read-only after).
  - New i18n keys in `purchasing`: `rawMaterials`, `addRawMaterial`, `editRawMaterial`, `addRawCategory`, `noRawMaterials`.
- **BOM unit** (ProductsScreen) and **Goods Receiving unit** (PurchasingScreen) are now read-only `<span class="erp-bom-unit-label">` â€” auto-filled from inventory on product select.
- New CSS: `.erp-bom-unit-label` in `erp.css`.

## 2026-03-11 â€” ERP Products: Variants + BOM in product form

- Product form dialog now includes **Variants** section (all product types) and **BOM** section (MENU_ITEM only), matching mobile app behavior.
- `FormVariant` shape: `{ id, name, price_adjustment }` â€” `price_adjustment` maps to `DbVariant.price_adjustment`.
- `FormComponent` shape: `{ id, component_product_id, required_qty, unit }` â€” unit auto-filled from inventory when a raw material is selected.
- On save: old variants/components deleted first, new ones inserted (same pattern as mobile app).
- Components dispatch uses `"productComponents"` (camelCase ErpState key), not `"product_components"`.
- No-duplicate enforcement: each BOM row filters out raw material IDs already selected in other rows.
- New CSS: `.erp-form-section`, `.erp-form-section-header`, `.erp-form-section-title`, `.erp-variant-row`, `.erp-bom-row`, `.erp-btn--icon` in `erp.css`.

## 2026-03-11 â€” ERP Purchasing page improvements

- **Raw Materials tab**: vendor table no longer shown â€” fixed a `ternary â†’ rawMaterials tab` fallthrough by replacing `tab === "receiving" ? ... : <vendors>` with two separate `&&` blocks.
- **Receiving form â€” vendor select**: added `"__NEW__"` sentinel option at the bottom of the dropdown. Selecting it opens the Vendor form dialog; on save the new vendor is auto-selected in the receiving form.
- **Receiving form â€” raw material select**: default changed from first raw material to `""` (â€”). Added `"__NEW__"` sentinel option; selecting it opens the Raw Material form; on save the new raw material is auto-selected in the triggering row via `pendingRawItemIdx` state.
- **Duplicate name prevention**: case-insensitive check (`toLowerCase()`) on vendor save and raw material save â€” alerts and aborts if a name collision exists (excluding the record being edited).
- New i18n keys in `purchasing`: `newVendorOption`, `newRawMaterialOption`, `duplicateVendor`, `duplicateRawMaterial`.

## 2026-03-11 â€” ERP POS: BOM-aware inventory deduction on sale

- `handleCheckout` in `PosScreen.tsx` now deducts inventory after a successful transaction.
- Logic mirrors mobile app: if a cart item has BOM components (`state.productComponents`), deduct each raw material's stock by `required_qty Ã— item.qty`; otherwise deduct the menu item's own inventory.
- Deductions are accumulated in a `Map` before writing to Supabase â€” prevents duplicate calls when the same raw material appears in multiple cart item BOMs.
- Uses existing `adjustInventory(supabase, productId, variantId, newQty)` repository function.
- **Unit conversion (follow-up)**: BOM qty and inventory qty normalized to base unit before arithmetic: `kgâ†’g` (Ã—1000), `Lâ†’mL` (Ã—1000), `pcs` unchanged. Result converted back to inventory's stored unit before writing. e.g. BOM: 50 mL, inventory stored as L â†’ deduct 0.05 L â†’ 2 L becomes 1.95 L.
- Accumulation in base units â€” multiple cart items using same raw material combined into one write.
- **Bug fix**: Raw material inventory rows may have `variant_id = NULL` in DB (mobile app) vs `""` (web). Fixed: `adjustInventory` repo uses `.or("variant_id.is.null,variant_id.eq.")` when variantId is empty; `findInv` helper in PosScreen uses `!i.variant_id || i.variant_id === variantId`. Map key changed from `"productId|"` (split-unsafe on `|`) to bare `productId` for BOM rows.
- Inventory floor `Math.max(0, current - deduction)` â€” never negative.
- Each adjusted row dispatched as `UPSERT` to inventory state for instant UI refresh.
- Per-row errors logged but don't abort the transaction.
- `ProductsScreen.tsx` BOM unit field: when g/kg or mL/L pair, shows a `<select>` (editable); otherwise read-only `<span>`.

## 2026-03-12 â€” ERP Purchasing: inventory reversal on delete

- `handleDeleteReceiving` in `PurchasingScreen.tsx` now reverses inventory when a goods receiving record is deleted.
- Mirrors the same `toBaseQty` (kgâ†’g, Lâ†’mL) + `Math.max(0, current - received)` logic used in the edit-reversal path.
- Iterates `state.goodsReceivingItems` filtered by `receiving_id` before the DB delete â€” uses local state so no extra Supabase fetch needed.
- Each adjusted inventory row dispatched as `UPSERT` for instant UI refresh.
- `goodsReceivingItems` state entries for the deleted receiving are also cleaned up via `DELETE` dispatch.
- Order of operations: reverse inventory â†’ delete header (cascades items in DB) â†’ dispatch state cleanup â†’ delete COGS ledger entry.

## 2026-03-12 â€” ERP Inventory: stock adjustments now recorded in inventory_movements

- Created new Supabase table `inventory_movements`. Actual schema: `id (UUID), tenant_id (UUID), product_id (UUID), variant_id (TEXT NOT NULL DEFAULT ''), movement_type (TEXT), qty_before (INT), qty_change (INT), qty_after (INT), unit (TEXT DEFAULT 'pcs'), reason (TEXT NOT NULL DEFAULT ''), user_id (TEXT), date (BIGINT), sync_status (TEXT), updated_at (BIGINT)`. No `reference_id` column.
- `movement_type` values align with mobile app: `"adjustment_in"` (Stok Berlebih / Stock Surplus), `"adjustment_out"` (Stok Berkurang / Stock Shortage), `"waste"` (Kadaluwarsa / Rusak â€” Expired / Damaged). Other types from mobile (e.g. `sale`, `purchase`) may also appear.
- RLS policy: tenant isolation via `public.users.tenant_id`.
- Stock adjustments from InventoryScreen no longer write to `general_ledger`; they write to `inventory_movements` instead.
- `DbInventoryMovement` type in `src/lib/supabase/types.ts`: `variant_id` is `string` (not nullable), `reason` is `string` (not nullable) â€” matches DB defaults.
- Adjust dialog: replaced free-text reason field with a `<select>` for movement type (3 options matching mobile app labels) + optional notes input. Default is `adjustment_in`.
- `DbInventoryMovement` added to `TENANT_TABLES` and `TableTypeMap`; new repository `inventory-movements.ts`; `ErpState` + layout updated.
- `ADJUSTMENT` type remains in `DbGeneralLedger` union â€” still used by mobile app; only web ERP adjustment path changed.

## 2026-03-13 â€” ERP Inventory: avg_cogs HPP tracking on stock adjustments

- `DbInventory` now has `avg_cogs: number` field (cost per base unit; 0 when stock is 0).
- `adjustInventory` repo accepts optional `avgCogs` param and writes it to DB.
- **InventoryScreen**: replaced the client-side `avgCogsMap` (computed from goods receiving history) with `inv.avg_cogs` directly from the DB row â€” single source of truth.
- **HPP rules on stock adjustment:**
  - `adjustment_in` (bonus units, no cost): `newAvg = (oldAvg Ã— oldQty) / newQty` â€” existing cost spread over more units â†’ lower HPP.
  - `adjustment_out` / `waste` (shrinkage/spoilage): same formula â€” existing cost / fewer remaining units â†’ higher HPP.
  - Stock = 0 after adjustment: `avg_cogs` reset to 0.
- **PurchasingScreen goods receiving (apply):** weighted-average formula: `newAvg = (existingAvg Ã— existingQty + costPerBase Ã— receivedBase) / newTotalQty`.
- **PurchasingScreen goods receiving (reversal on edit/delete):** back-calculates pre-purchase avg: `recoveredAvg = (currentAvg Ã— currentQty âˆ’ costPerBase Ã— oldBase) / newQtyBase`; 0 if result â‰¤ 0 or newQtyBase = 0.
- New raw material creation: `avg_cogs: 0` in initial inventory row.

## 2026-03-12 â€” ERP Purchasing: decimal qty in goods receiving

- Qty input now supports decimals for kg/L items (e.g. 1.5 kg, 0.75 L).
- `qty` in `updateRecItem` no longer passes through `parseNum` (which stripped non-digits) â€” stored as raw string.
- Qty input: `inputMode="decimal"`, `value={item.qty}` (no `fmtNum` formatting). `costPerUnit` formatting unchanged.
- `handleSaveReceiving`: form qty parsed with `parseFloat(i.qty.replace(",", "."))`, then immediately converted to base unit via `toBaseQty` before building the DB row â€” `Math.round(baseQty)` ensures integer stored in DB.
- `unit` stored in DB is always the base unit (g/mL/pcs), never kg/L â€” avoids `22P02 invalid input syntax for type integer` error.
- `cost_per_unit` divided by `baseQty` (not raw display qty) for correct per-unit cost.
- `openEditReceiving`: baseâ†’display conversion on load (gÃ·1000â†’kg, mLÃ·1000â†’L) so edit form shows human-friendly values.
- Downstream `toBaseQty` calls in inventory apply/reversal loops receive already-base values and pass through unchanged.

## 2026-03-09 â€” AyaKasir Desktop ERP implementation

### Infrastructure
- Installed `@supabase/supabase-js` + `@supabase/ssr` for Next.js Supabase integration.
- Created 3 Supabase client helpers: `client.ts` (browser), `server.ts` (Server Components), `middleware.ts` (middleware).
- DB types in `src/lib/supabase/types.ts` â€” matches Supabase schema exactly (snake_case, BIGINT timestamps).
- 10 repository files in `src/lib/supabase/repositories/` â€” one per entity, function-based (not classes).
- Realtime hook in `src/lib/supabase/realtime.ts` â€” subscribes to all 12 tenant tables + `tenants` via single channel.

### Auth
- ERP web auth uses `public.users.password_hash/password_salt` as the login source of truth, stored in a signed HTTP-only ERP cookie.
- Middleware updated: protects `/app/*` routes via ERP cookie session, redirects unauthenticated to `/app/login`, redirects logged-in users away from login/register.
- Login page calls a server action that verifies the local password hash and creates the ERP session cookie.
- Register page hashes the password into `public.users` and still performs best-effort `supabase.auth.signUp()` to keep confirmation/password-reset support available.
- Legacy-account recovery added:
  - If `tenant_id` is missing for an owner, recover it from `tenants.owner_email` and backfill `users.tenant_id`.
  - If `password_hash/password_salt` is missing, allow one-time fallback to Supabase Auth login and backfill the local hash.

### ERP State
- `ErpProvider` in `store.tsx`: React Context + useReducer, same pattern as simulator.
- Server-side initial data load in `(erp)/layout.tsx` â€” fetches all 12 tables + restaurant + user via Supabase server client.
- Realtime sync via `useRealtimeSync` â€” on INSERT/UPDATE dispatches UPSERT, on DELETE dispatches DELETE.
- Inventory uses composite key (product_id + variant_id) â€” special handling in reducer.

### ERP Layout
- Route: `src/app/ayakasir/[locale]/app/` â€” separate from marketing site (no NavBar/Footer).
- Route group `(erp)` for authenticated pages with sidebar layout.
- Sidebar: 6 nav items (Dashboard, POS, Products, Inventory, Purchasing, Settings) + restaurant name + logout.
- CSS: `erp.css` with `.erp-*` prefix, CSS variables for design tokens, responsive (sidebar collapses at 1024px).

### Screens built
- **Dashboard**: cash balance, sales stats, period filter (today/month/year), recent transactions table, top products table.
- **POS**: product grid (category filter + search), cart with qty controls, variant picker dialog, checkout dialog (CASH/QRIS/UTANG), receipt dialog (printable).
- **Products**: menu/raw material tabs, product table with CRUD, category CRUD, clone action, search.
- **Inventory**: stock table with low-stock highlighting, adjust stock dialog with ledger entry.
- **Purchasing**: goods receiving (create with line items, auto inventory update, COGS ledger entry) + vendor CRUD.
- **Settings**: profile display, change password (updates `public.users.password_hash`, best-effort sync to Supabase Auth), initial balance, CSV export (owner only).

### Design decisions
- Fresh types (not reusing simulator types) â€” simulator uses camelCase + genId, ERP uses snake_case matching Supabase schema.
- Server-side initial data load avoids loading spinners on first paint.
- Repositories are function-based (not class-based) so they work in both server and client contexts.
- Middleware handles session refresh + auth check BEFORE subdomain rewrite propagates.

## 2026-03-13 â€” ERP Purchasing: float qty bug fix in goods receiving

- `current_qty` written to Supabase `inventory` must always be an integer (BIGINT column).
- Bug: `newTotalQty = currentBase + receivedBase` could be a float when the inventory snapshot already held a float `current_qty` from a prior iteration (or weighted-avg math leaked floats), causing `22P02 invalid input syntax for type bigint`.
- Fix: wrap all `newTotalQty` and `newQtyBase` computations in `Math.round()` in both the apply path (create/edit) and the reversal paths (edit + delete) in `PurchasingScreen.tsx`.
- Pattern: **any value going into `upsertInventory` or `adjustInventory`** â€” both `current_qty` and `avg_cogs` â€” must pass through `Math.round()`. Both are BIGINT in Supabase; floats cause `22P02`.
- Follow-up fix (same session): `avg_cogs` from weighted-average formula was also a float. Fixed in all 3 paths in `PurchasingScreen.tsx` + `InventoryScreen.tsx`'s `computeNewAvgCogs` result.

## 2026-03-13 â€” ERP Purchasing: stale inventory snapshot bug fix

- **Bug**: `inventorySnapshot` in `handleSaveReceiving` was built from `state.inventory` (React state), which can be stale if the mobile app updated stock (sales, adjustments) since the last realtime event landed in the browser. Result: when stock was 0 in DB but ERP state still showed `current_qty = 1`, adding 2 pcs would produce `current_qty = 3` instead of `2`.
- **Fix**: replace the React-state snapshot with a fresh `repo.getInventory(supabase, tenantId)` fetch at the start of `handleSaveReceiving`. The snapshot is now always in sync with the actual DB before any apply/reversal math runs.
- **Pattern**: any inventory arithmetic that depends on `current_qty` being accurate must read from DB, not from cached React state.

## 2026-03-13 â€” ERP Inventory: direct DB correction for corrupted Baterai stock

- Tenant `6290e549-7823-48bc-a700-9c66c5ddf5a5`, product Baterai had `current_qty = 7, avg_cogs = 29` due to accumulated test/retry receiving records from the `22P02` bug era (each failed save still wrote to inventory before throwing).
- Correct state per user: `current_qty = 1, avg_cogs = 31` (6 pcs sold out â†’ 0, then 1 pcs received @ Rp31).
- Fixed via direct SQL UPDATE on `inventory` table. The code bugs causing this are already fixed.
- Lesson: when `handleSaveReceiving` throws mid-way (e.g. after inventory upsert but before form closes), the inventory row is already updated in DB. The fix is to handle this via a DB transaction or idempotent re-saves. For now, direct SQL correction is the recovery path.

## 2026-03-13 â€” ERP Purchasing: vendor required validation on goods receiving

- Vendor is now required before saving a goods receiving record.
- Save button (`erp-btn--primary`) in the receiving form is disabled when `recVendor` is empty.
- `handleSaveReceiving` also has an early-return guard: `if (!recVendor) { alert(copy.purchasing.vendorRequired); return; }`.
- New i18n key `purchasing.vendorRequired` added to `ErpCopy` interface + EN/ID data objects in `i18n.ts`.

## 2026-03-13 â€” ERP Settings: Business rename + Manajemen User + Pengaturan QRIS

### Change password fix
- The best-effort Supabase Auth sync in `changeErpPasswordAction` now uses a fresh `createServerClient()` instance (separate from the main one that already did the hash update), preventing any cookie-conflict from masking errors.
- Error messages from the server action are now shown inline inside the Change Password dialog (not just at page level).

### Business section rename
- "Restaurant" / "Restoran" section in SettingsScreen renamed to "Business" (EN) / "Usaha" (ID) via new `copy.settings.businessSection` i18n key.
- QRIS merchant name no longer shown in the Business section (moved to the dedicated QRIS section).

### Pengaturan QRIS (owner only)
- New section in SettingsScreen: shows current `qris_merchant_name` + `qris_image_url` (thumbnail preview).
- "Configure QRIS" / "Atur QRIS" button opens a dialog to edit merchant name + image URL (paste public URL â€” no upload from web).
- Saves via new `updateQrisSettingsAction` server action in `auth.ts` â†’ updates `tenants` table, dispatches `SET_RESTAURANT`.
- Image preview in dialog uses `<img onError>` to hide gracefully if URL is broken.
- New i18n keys: `settings.qrisMerchantName`, `settings.qrisImageUrl`, `settings.qrisImageUrlHint`, `settings.qrisSaved`.

### Manajemen User (owner only)
- New section in SettingsScreen: table of all tenant users (name, email, role, active status) + Add / Edit / Delete.
- `tenantUsers: DbUser[]` added to `ErpState` + `EMPTY_STATE`.
- `users` added to `tableKeyMap` in `store.tsx` (realtime key `"users"` â†’ state key `"tenantUsers"`).
- `(erp)/layout.tsx` fetches `users` filtered by `tenant_id` and passes as `tenantUsers` initial data.
- Two new server actions in `auth.ts`: `upsertTenantUserAction` (create/edit with password hashing) + `deleteTenantUserAction` (guards against self-delete).
- After save/delete, re-fetches all tenant users from Supabase for instant UI refresh (dispatches `SET_ALL`).
- Cannot delete yourself (guarded by `session.userId === userId` check in server action).
- New i18n keys: `settings.addUser`, `settings.editUser`, `settings.userName`, `settings.userEmail`, `settings.userPhone`, `settings.userRole`, `settings.userPassword`, `settings.userPasswordHint`, `settings.userActive`, `settings.noUsers`.
- New CSS: `.erp-badge--muted` (grey badge), `.erp-dialog--sm` (max-width 400px) added to `erp.css`.

## 2026-03-13 â€” ERP Settings: User email validation + Feature Access per Cashier

### Email validation
- `handleSaveUser` in `SettingsScreen.tsx` now checks `email.includes("@")` before calling the server action â€” shows inline error if invalid, never calls the action.

### Feature Access (Akses Fitur) for CASHIER users
- User form now includes `featureAccess: UserFeature[]` state field.
- Features mirror `UserFeature` enum in the Android app: `POS`, `DASHBOARD`, `MENU`, `INVENTORY`, `PURCHASING`, `CUSTOMERS`, `SETTINGS` â€” stored as comma-separated string in `users.feature_access`.
- Default for new CASHIER: `POS,INVENTORY` (mirrors `UserFeatureAccess.defaultCashierFeatures`).
- In the Add/Edit User dialog, a checkboxes section appears when role = CASHIER; hidden for OWNER (owner always gets `null` = full access).
- When role selector switches CASHIER â†’ OWNER (or back), `featureAccess` is reset appropriately.
- `upsertTenantUserAction` in `auth.ts` now accepts `featureAccess?: string | null` and writes it to `users.feature_access` (null for OWNER, comma-string for CASHIER).
- `ErpSidebar.tsx`: `NAV_ITEMS` now has a `feature` property per item. For CASHIER users, sidebar nav items are filtered to only those whose `feature` is in `feature_access`. OWNER sees all items.
- New i18n keys: `settings.featureAccess`, `settings.featureAccessHint`, `settings.featurePOS/Dashboard/Menu/Inventory/Purchasing/Customers/Settings`.

## 2026-03-13 â€” ERP Customers page

### New screen: `CustomersScreen.tsx`
- Route: `src/app/ayakasir/[locale]/app/(erp)/customers/page.tsx`
- Component: `src/components/ayakasir/erp/screens/CustomersScreen.tsx`
- Feature gate: `CUSTOMERS` (cashier access controlled via sidebar feature filter)

### Data model
- `DbCustomerCategory { id, tenant_id, name, sync_status, updated_at }` added to `src/lib/supabase/types.ts`.
- `customer_categories` added to `TENANT_TABLES` and `TableTypeMap`.
- `customerCategories: DbCustomerCategory[]` added to `ErpState` + realtime via `tableKeyMap`.
- `customer_categories` fetched in `(erp)/layout.tsx` SSR alongside other tables.

### New repository: `src/lib/supabase/repositories/customer-categories.ts`
- `getCustomerCategories`, `createCustomerCategory`, `updateCustomerCategory`, `deleteCustomerCategory`.
- `customers.ts` extended: `updateCustomer` patch now includes `birthday`, `gender`, `category_id`; `deleteCustomer` added.

### UI layout
- Two-column grid: left = filters + customer table; right = sticky side panel.
- Side panel shows **category management** by default; switches to **customer detail** when a row is clicked.
- Category filter chips across the top; text search by name or phone below.
- Customer table: name/notes, phone, category badge, transaction count, total spent, edit/delete actions.

### Customer detail panel
- Shows: phone, email, birthday, gender, category badge, notes.
- Stats summary: transaction count + total spent (computed from `state.transactions`).
- Transaction history list (date/time, payment method badge, debt status badge, total) â€” filtered to `COMPLETED` status, sorted newest first.

### Category management
- CRUD for `customer_categories` with duplicate name check (case-insensitive).
- Delete category does NOT delete customers â€” `ON DELETE SET NULL` on FK (mirrors Android app).

### CSS additions (erp.css)
- `.erp-customers-layout`, `.erp-customers-main`, `.erp-customers-side`, `.erp-customers-detail`, `.erp-customers-info-grid`, `.erp-customers-stats`, `.erp-customers-tx-list`, `.erp-customers-categories-panel`, `.erp-customers-cat-list`, `.erp-customers-cat-row`
- `.erp-chip` / `.erp-chip--active` â€” pill filter chips (reusable)
- `.erp-badge--sm`, `.erp-badge--warning`, `.erp-badge--success` â€” badge variants
- `.erp-table-row--clickable`, `.erp-table-row--selected` â€” interactive table rows
- `.erp-text-muted`, `.erp-search-bar`
- Responsive: single column below 1100px

### i18n
- New `customers` section in `ErpCopy` interface + EN/ID data objects.
- New `nav.customers` key in both locales.
- `ErpSidebar.tsx`: added `{ key: "customers", icon: CustomersIcon, path: "/app/customers", feature: "CUSTOMERS" }` between purchasing and settings.

## 2026-03-13 â€” ERP Cashier role restrictions (Purchasing, Products, Customers)

- CASHIER users see restricted UI in three screens â€” determined by `const isOwner = state.user?.role === "OWNER"` at the top of each screen.

### PurchasingScreen
- Goods receiving: Delete button hidden for CASHIER (table row + no Delete in edit dialog since there's no edit footer delete on receiving).
- Vendors: Delete button hidden in table row; Delete button in Vendor edit dialog footer hidden (`{editVendorId && isOwner && ...}`).
- Raw materials: Delete button hidden in table row; Delete button in Raw Material edit dialog footer hidden.
- Raw material categories: Edit AND Delete buttons in table hidden; Delete button in Raw Category edit dialog footer hidden.

### ProductsScreen
- Products: Clone and Delete buttons hidden for CASHIER (Edit remains).
- Categories: Edit AND Delete buttons in table hidden; Delete button in category edit dialog footer hidden; "Add Category" header button hidden.

### CustomersScreen
- Customers: Delete button hidden in table row for CASHIER (Edit remains).
- Customer categories: Edit AND Delete buttons hidden in categories panel; "Add Category" button in categories panel header hidden.

## 2026-03-13 â€” ERP Settings: CSV Export â€” date range picker + enriched columns

### Date Range Dialog
- Clicking "Download CSV" now opens a date-range dialog (two `<input type="date">` fields: From / To).
- Default both fields to today. `From` has `max={csvTo}`; `To` has `min={csvFrom}` and `max={todayStr}`.
- On confirm, filter `state.generalLedger` by `e.date >= fromMs && e.date <= toMs` (To expanded to 23:59:59.999).
- New i18n keys in `settings`: `csvDateFrom` (EN: "From", ID: "Dari"), `csvDateTo` (EN: "To", ID: "Sampai").

### Enriched CSV Columns
- Matches Android app's `GeneralLedgerExportRow` column order (from `repos/ayakasir` `2026-03-11: Unduh Data`).
- Column order: `date, type, reference_id, payment_method, customer_name, customer_category, category_name, product_name, variant_name, qty, unit_price, discount_type, discount_value, discount_per_unit, amount, transaction_notes, description, id, updated_at`
- Enrichment is client-side JOIN using existing `state.*` maps: `transactions`, `customers`, `customerCategories`, `products`, `categories`, `transactionItems`.
- For SALE/COGS-type entries with a `reference_id`, the first `transactionItem` is used for product/category/discount columns.
- `customer_name` pulled from `transactions.customer_id â†’ customers.name`; falls back to `tx.notes` if no linked customer (for UTANG).
- CSV includes BOM (UTF-8 with BOM `\uFEFF`) for Excel compatibility.
- Filename: `ayakasir_{restaurant}_{from}_{to}.csv` (date range in filename, not today's date).


- Updated erp-auth-card to be scrollable with a viewport max-height to avoid overlap on smaller screens.

- Updated erp-auth-card to be scrollable with a viewport max-height to avoid overlap on smaller screens.

