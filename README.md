# Petalytix Portfolio

## Changelog

### v1.2.0

- Owner Office — Multi-Branch Dashboard: new route at `/{locale}/app/office/` accessible to OWNER with Tumbuh+ plan (`maxBranches > 1`); protected by ERP session + plan guard in `office/layout.tsx`.
- Owner Office — Overview Screen: branch summary cards showing today's revenue, transaction count, active cashier session status, and low-stock alert count per branch.
- Owner Office — Branches Screen: list and manage all branches belonging to the organization.
- Owner Office — Staff Screen: view and manage users across all branches in the organization; deduplicates legacy staff (those with `organization_id = null` backfilled from `tenant_id`).
- Owner Office — Reports Screen: consolidated KPI dashboard with period filter (Today/Week/Month/Year/Custom date range); KPI cards (total revenue with % change vs previous period, total transactions, avg transaction value, unique customers, unpaid debts); payment method breakdown with visual bars; revenue-by-branch table; top 10 products. CSV export gated to Tumbuh+ plan.
- Owner Office — Inventory Screen: advanced inventory analytics with period filter; snapshot KPIs (total stock value by avg COGS, total SKUs, low stock count, out-of-stock count); period-filtered KPIs (purchasing spend, stock movements, stock-in qty, waste qty); low stock alerts table; per-branch inventory breakdown with expandable rows; top wasted products; top purchased raw materials; paginated stock movement history.
- Owner Office — Master Data Screen: card-based linking dashboard for 7 data sets (Customers, Vendors, Raw Materials, Category Raw, Variant Groups, Menu Items, Category Menu); per-branch toggle switches; Link copies from primary branch (skip-by-name); Unlink deletes name-matched rows from target (with confirm dialog); config stored in `master_data_links` table; API at `POST /api/office/master-data-links` and `POST /api/office/sync-products`.
- Owner Office — Customers Screen: org-scoped customer view across all branches.
- Owner Office — Settings Screen: org-level settings.
- Owner Office — State: `OfficeProvider` (Context + useReducer) in `src/components/ayakasir/erp/office/store.tsx`; consolidated types: `BranchSummary`, `ConsolidatedTx`, `ConsolidatedTxItem`, `ConsolidatedInventoryRow`, `ConsolidatedMovement`, `ConsolidatedGoodsReceivingItem`, `ConsolidatedProduct`, `PrimaryDataCounts`.
- Owner Office — SSR Data: `office/layout.tsx` fetches org, branches, org-scoped users (with legacy union fallback), customers, customer categories, branch summaries, current-year consolidated transactions + items, inventory snapshot, movements, goods-receiving items, product components, vendors, categories, master data links, and primary branch data counts.
- Owner Office — CSS: `.office-*`, `.office-report-*`, `.office-inv-*`, `.office-md-*` prefixes in `erp.css`; `OfficeSidebar` with "Back to Cashier" link.
- ERP — Data Windowing: initial SSR load in `(erp)/layout.tsx` now fetches only the last 90 days (`DATA_WINDOW_DAYS = 90`) for time-based tables (`transactions`, `general_ledger`, `cash_withdrawals`, `goods_receiving`, `inventory_movements`, `cashier_sessions`); static tables (`products`, `inventory`, `customers`, etc.) still loaded in full; `transaction_items` and `goods_receiving_items` fetched by parent IDs within the window.
- ERP — Older Data Fetch: new server action `src/app/ayakasir/actions/fetch-older-data.ts` (`fetchOlderErpData(tenantId, fromMs, toMs)`); fetches time-windowed tables for a given date range and returns child records by parent ID joins; `MERGE_OLDER` reducer action deduplicates by ID (realtime-new rows take precedence); `ErpState.dataWindowStart` and `olderDataLoaded` track window state; screens show a banner to load older data.
- ERP — Products BOM: per-variant BOM support via `product_components.parent_variant_id` (`TEXT NOT NULL DEFAULT ''`); empty = shared (all variants); non-empty = variant-specific; products form groups BOM rows by variant with "Copy to all variants" helper; POS deduction matches by `parent_variant_id` directly; clone remaps variant IDs via `cloneVarMap`; CSV import defaults to `""` (shared).
- ERP — Inventory CSS: new `.erp-bom-variant-groups`, `.erp-bom-variant-group`, `.erp-bom-variant-group-header`, `.erp-bom-variant-group-title`, `.erp-bom-empty`, `.erp-older-data-banner`, `.erp-text--error`, `.erp-unit-toggle` classes.
- ERP — Realtime Status: `useRealtimeSync` accepts optional `onStatusChange(status: RealtimeStatus)` callback; `ErpState.realtimeStatus` tracks `"CONNECTING" | "SUBSCRIBED" | "DISCONNECTED"`; `ErpProvider` re-fetches on window focus (always) and every 5 min when `DISCONNECTED` using `reconcileRef` + `realtimeStatusRef` stale-closure guards.
- DB Types — `DbGoodsReceivingItem`: added `variant_name: string` (NOT NULL in DB) and corrected `qty`/`cost_per_unit` to `number` with integer-safe write requirement; `DbProductComponent` gained `parent_variant_id: string`.
- Plan — `maxBranches` limit: added to `PlanLimits` interface; PERINTIS = 1 (no Office), TUMBUH = 3, MAPAN = Infinity; `APP_VERSION` bumped to `1.3.5`.

### v1.1.6

- Cashier Session — Stale-Session Rule Removed: any unclosed session (`closed_at === null`) is now treated as active regardless of when it was opened; the previous day-boundary rule that locked POS for sessions opened before midnight has been removed to match mobile app behavior and support stores that carry sessions across days.
- Settings — CSV Export Multi-Item Transactions: fixed a bug where only the first item of a multi-item transaction was emitted in the CSV; SALE/SALE_DEBT/SALE_QRIS/SALE_TRANSFER entries now expand into one row per transaction item, matching the existing COGS expansion behavior.
- Settings — CSV Export `person_in_charge` Fix: column now always resolves from `e.user_id` (the ledger entry's own user field) instead of `tx.user_id`; previously, entries like DEBT_SETTLED written by an Owner that referenced a Cashier's transaction would incorrectly show the Owner's name for the Cashier's ledger action.

### v1.1.5

- Inventory/Purchasing — Value Gap Clarification: documented that Purchasing total (`SUM(qty × cost_per_unit)`) and Inventory value (`SUM(current_qty × avg_cogs)`) can diverge when weighted average HPP is fractional and persisted as integer `avg_cogs`; this is expected by design and matches Android behavior.
- Inventory — Stock Adjustment Precision + Valuation Rule: quantity conversion in adjustment flow now preserves decimals (`kg↔g`, `L↔mL`) instead of rounding away precision; `adjustment_out` now follows the same value-preserving HPP behavior as `waste` so total historical stock cost stays in remaining units.
- Purchasing — Receiving DB Compatibility Hardening: receiving items are persisted in base units (`g`/`mL`/`pcs`), `qty` and `cost_per_unit` are integer-safe for current schema, and `variant_name` is now always populated to satisfy DB `NOT NULL`.
- Purchasing — Inventory Upsert Reliability: fixed `variant_id null` vs `""` conflict during receiving save/edit by preserving the actual DB `variant_id` from fetched inventory rows when upserting.
- Purchasing — Preset Variant Removal from Raw Material: clearing a raw material’s preset variant group now correctly deletes related generated variant + inventory rows for that material.
- Purchasing — Receiving UX + Mixed-Unit HPP Safety: receiving qty unit label is now a quick toggle (`g↔kg`, `mL↔L`) that converts entered quantities in-place, and weighted-average/reversal math now converts both qty and unit cost to stored units to prevent x1000 valuation drift.
- Purchasing — Raw Material Unit Normalization: manual create and CSV import now normalize storage units to base units (`kg→g`, `L→mL`) including preset-generated variant inventory rows.
- Products/POS — Per-Variant BOM: `product_components.parent_variant_id` added to support shared BOM + variant-specific BOM in product form; POS deduction now matches by variant ID directly; clone/copy/import flows preserve compatibility (`""` = shared).
- Products — Form Flow: "Tambah Produk" field order updated to `Nama → Kategori → Harga`.

### v1.1.4

- Realtime — Status Handling + Fallback Reconcile: `useRealtimeSync` now accepts an optional `onStatusChange(status: RealtimeStatus)` callback; maps Supabase channel states to `"CONNECTING" | "SUBSCRIBED" | "DISCONNECTED"`. `ErpState.realtimeStatus` tracks current channel health. `ErpProvider` re-fetches all data on `window focus` (always) and every 5 min when `DISCONNECTED`; uses `reconcileRef` + `realtimeStatusRef` to avoid stale closures.
- Landing Page — ISR Revalidation: Metrics section revalidation reduced from 1 hour to 5 minutes (`revalidate = 300`); Supabase count queries only run on ISR revalidation, not per-request.
- Database — Indexes: Added `tenant_id` indexes on 4 previously unindexed tables (`cashier_sessions`, `users`, `variant_groups`, `variant_group_values`) and compound `(tenant_id, date)` indexes on 5 time-range-queried tables (`transactions`, `general_ledger`, `cash_withdrawals`, `inventory_movements`, `goods_receiving`); eliminates full-table scans on tenant queries and period filters.
- Deployment — Login 500 Fix: ERP login was failing on Vercel with `supabaseKey is required` because `SUPABASE_SERVICE_ROLE_KEY` was missing from production env vars; `createAdminClient()` now correctly reads the key. Lesson: verify all new env vars in Vercel before deploying.

### v1.1.3

- Realtime Sync — Cross-Device Lag Diagnosis: Identified that web-to-mobile sync lag is caused by Supabase Realtime subscription silently degrading; both web (`realtime.ts`) and mobile (`RealtimeManager.kt`) lack status/error callback handling, so stale state persists until manual refresh.
- Supabase Realtime — Backend Health Check: Direct websocket handshake to project `tlkykpcznaieulbwkapc` initially returned `UnableToConnectToProject`; later retests succeeded with `Subscribed to PostgreSQL`, confirming intermittent Realtime-to-DB connectivity.
- Supabase Realtime — Publication Gap: `supabase_realtime` publication is missing 6 tables: `cashier_sessions`, `customer_categories`, `customers`, `inventory_movements`, `variant_groups`, `variant_group_values`; changes to these tables do not trigger realtime events.
- RLS Security Audit (P0): All 20 public tables have RLS enabled but use `USING (true)` / role `public` policies — effectively no tenant isolation. The anon key (visible in browser bundle) grants unrestricted read/write on all tables, including `users` (password hashes, PINs, emails exposed). Requires auth architecture decision to fix: Supabase Auth sessions, server-side proxy, or hybrid approach.
- Scalability Analysis — 1000 Concurrent Users: SSR loads ALL data via 19 parallel unfiltered `SELECT *` per page load; Realtime free/pro tier supports 200–500 connections (insufficient); no data pagination in React state; no caching layer; no documented DB indexes on `tenant_id`. Recommendations: paginate SSR data, upgrade Supabase plan, add compound indexes, cache landing metrics with ISR, deploy to `sin1` region.

### v1.1.2

- Landing Page — Play Store Badge: Replaced the text CTA button with the official Google Play Store badge image (`Google_Play_Store_Badge.png`); hover effect lifts the badge.
- Settings — Tutup Kasir Button: "Tutup Kasir / Close Cashier" button is disabled when no cashier session is active; tooltip explains the reason.
- Settings — CSV Date Format: `date` column now exports as `DD/MM/YYYY HH:MM:SS` in GMT+7 (was ISO UTC); uses `e.date` (record creation timestamp) as intended.
- Settings — CSV COGS Rows: COGS ledger entries now expand into one row per goods-receiving item; product name, variant name, qty, unit price, and per-item amount filled from `goods_receiving_items`.
- POS/Settings — INITIAL_BALANCE History: Closing a cashier session no longer deletes the session's INITIAL_BALANCE ledger entry; the historical record is preserved with its original `date` and `reference_id` (session ID). Close cashier only creates a zero-balance unlinked placeholder (`reference_id: null`); open cashier removes that placeholder before writing the new session's entry.
- Settings — Close Cashier Saldo Akhir: Closing balance (Saldo Akhir) in the End of Day report is now session-scoped (`date >= activeSession.opened_at`), matching Dashboard/POS behavior; previously it summed all-time ledger entries, double-counting historical INITIAL_BALANCE records. Saldo Akhir now shows the real computed balance (Saldo Awal + Penjualan Tunai + Pelunasan Utang − Tarik Tunai) regardless of cash-reset choice; when "empty cash" is chosen, a note "Kas dikosongkan / Cash emptied at session close" is appended below Saldo Akhir in both the dialog and downloaded report.
- Settings — Close Cashier Cash Reset: "Empty cash" WITHDRAWAL ledger entry now records the full closing balance (e.g. Rp100,000), not just the sales portion; since the session's INITIAL_BALANCE is preserved, the WITHDRAWAL must offset the entire Saldo Kas to bring it to zero.
- POS — Open Cashier Remaining Cash Guard: if cash remains from the previous session, the Buka Sesi Kasir dialog shows a warning banner with the remaining amount; the Saldo Kas Awal field rejects any value lower than the remaining balance.
- Dashboard/POS — Stale Session Guard: a cashier session opened before today midnight is treated as stale; the Dashboard shift chip is hidden for stale sessions (preventing inflated transaction counts), and PosScreen shows the lock overlay so the user opens a fresh session; opening a new session auto-closes any stale unclosed session in the background.
- Settings — Close Cashier Keep-Cash WITHDRAWAL: Closing a cashier session with "keep cash" now records a zero-amount WITHDRAWAL ledger entry (was skipped entirely); `withdrawal_amount` on `cashier_sessions` is stored as `0` instead of `null`. Every close-cashier action now produces an auditable WITHDRAWAL record regardless of the cash-reset choice.
- Dashboard/POS — Saldo Kas After Session Close: When no active cashier session exists, Saldo Kas is now scoped to the last closed session (was all-time sum). Fixes double-counting of INITIAL_BALANCE entries across sessions — e.g., withdrawing all cash in Session B now correctly shows Rp0 instead of carrying over Session A's balance. `prevCashBalance` (Open Cashier remaining-cash guard) uses the same scoping.

### v1.1.1

- Purchasing — Raw Materials Unit Display: Unit column now shows `kg`/`L` instead of `—` for raw materials synced from the mobile app. Root cause: mobile app stores `variant_id` as `NULL` (not `""`) on inventory rows with no variant; the lookup now matches both. Base units (`g`/`mL`) are also converted back to display units (`kg`/`L`) for consistency.
- POS — Open Cashier Description: INITIAL_BALANCE `general_ledger` description now includes the session open date — "Saldo awal — buka kasir (DD/MM/YYYY)" / "Opening balance — open cashier (DD/MM/YYYY)".
- Settings — Close Cashier Empty Cash: Removed the redundant zero-balance INITIAL_BALANCE placeholder entry that was created on session close; the WITHDRAWAL entry already brings Saldo Kas to zero, and session-scoped balance calculation makes the placeholder unnecessary.
- POS — Sale Ledger Descriptions: CASH sale → "Penjualan tunai" / "Cash sale"; QRIS sale → "Penjualan QRIS" / "QRIS sale"; TRANSFER sale → "Penjualan transfer" / "Transfer sale"; UTANG sale → "Penjualan (utang)" / "Sale (debt)". Previously all were generic `"${paymentMethod} sale"`.
- Settings — QRIS Image Upload: Pengaturan QRIS now has a file upload button (max 1 MB, JPG/PNG/WebP) instead of a URL text input; file is uploaded to the `qris-images` Supabase Storage bucket at `{tenantId}/qris.{ext}` with `upsert: true`; public URL (with cache-busting `?t=` param) is saved to `tenants.qris_image_url`; 1 MB size guard shown inline; Save button disabled during upload.

### v1.1.0

- Registration — TUMBUH Promo: New tenants are automatically assigned the TUMBUH plan with a free 3-month trial (`plan_started_at` = registration date, `plan_expires_at` = 3 months later).
- Registration — Activation Flow: Clicking the email confirmation link now lands on a static "Account activated!" page instead of silently redirecting to login; `activateAccountAction` sets `is_active: true` on both `users` and `tenants` rows; a prominent "Sign in now" button guides the user.
- Settings — Days Remaining: Plan section shows a "Days remaining" row; highlighted orange when ≤7 days left, red when expired.
- Settings — App Info: Footer shows `© 2026 AyaKasir by Petalytix | v{APP_VERSION}`; `APP_VERSION` constant in `src/lib/ayakasir-plan.ts` kept in sync with Android `build.gradle.kts → versionName`.
- Settings — CSV Export: Unduh Data button disabled for PERINTIS plan; warning hint shown above button requiring Tumbuh/Mapan.
- POS — Cashier Session Flow: POS locked until cashier session is opened; initial balance (Saldo Kas Awal) set at session open via PIN confirmation; auto-locks when session closes. Saldo Awal removed from Settings (now session-driven only).
- POS — Session-Scoped Saldo Kas: Saldo Kas in Tarik Tunai and Dashboard reset per session (filter ledger to `opened_at`). Other stat cards remain period-filter-driven.
- POS — Allow Zero Initial Balance: Opening session with Rp0 works correctly (no display reset bug).
- POS — QRIS Disabled When Unconfigured: QRIS button greyed out if `qris_image_url` or `qris_merchant_name` is missing; distinct tooltip per reason.
- POS — Variant Picker: Removed "None" fallback option; picker shows only defined variants.
- Dashboard — Session-Scoped Saldo Kas + Shift Chip: cash balance always session-scoped; "Shift Aktif" period chip filters all stats to `opened_at → now`; UTANG total remains all-time.
- Dashboard — Settle Debt Session Gate: Lunasi button disabled when no active cashier session.
- Inventory — Delete Zero-Stock Row: OWNER can delete an inventory row when `current_qty === 0`; confirm dialog + in-flight guard.
- Inventory — Hide Base Row When Variants Exist: base (`variant_id: ""`) row hidden if product has variants and base row has `current_qty === 0`.
- Purchasing — Variant Preset Groups: new `variant_groups` + `variant_group_values` DB tables; Variants tab redesigned — manage reusable presets (e.g. "Size → S/M/L/XL"); Apply to raw material creates `DbVariant` + `DbInventory` rows per value; Edit dialog now includes "Applied To" management — add new raw materials or remove existing ones (removes corresponding variant+inventory rows).
- Purchasing — Goods Receiving Variant Expand: "Use Variants" toggle per item expands product row into per-variant sub-rows; save produces one receiving item per variant; edit restores correctly.
- Purchasing — Add Receiving Dialog: redesigned to card-based layout (`.erp-rec-item-card`) with labeled fields, grand total display, clean variant sub-rows.
- Products — Inline Add Category: `+ Add Category` sentinel option in product form's category select creates category without leaving the dialog; auto-selects new category on save.
- Settings — Close Cashier: writes `closed_at`, `closing_balance`, `withdrawal_amount`, `match_status`, `mismatch_note` to `cashier_sessions` row; Tarik Tunai row in end-of-day report; correct ledger flow for "empty cash" (3-step: cash_withdrawal + reset INITIAL_BALANCE + WITHDRAWAL entry for sales-only portion).

### v1.0.8

- Settings — Close Cashier: new section visible to all roles; confirm dialog shows summary (close time, cashier, total transactions, opening/closing balance, payment breakdown, match/mismatch toggle with optional note); cash reset dialog lets cashier empty or keep balance (`cash_withdrawals` + `WITHDRAWAL` ledger entry); printable report dialog with Download (standalone HTML) and Print actions.
- Settings — Language switcher: new section (all roles) with Indonesia/English buttons; navigates via `router.push()` replacing `/{locale}/` in the current URL.
- Settings — Payment methods: CASH can now be disabled; constraint = at least 1 non-UTANG method must remain enabled; last active non-UTANG toggle is greyed out with a `(min. 1 aktif)` hint.
- POS — Cash calculator dialog: numpad + quick-amount chips (smart round-up) shown after CASH payment selection; displays Total / Cash Paid / Change live; confirm disabled if paid < total; defaults to exact change if left blank.
- POS — Change dialog: appears after CASH checkout showing paid amount and change; buttons for Print Receipt or New Transaction.
- Products — CSV import: two-step parse→preview→confirm flow; header-name-based column mapping; duplicate detection (case-insensitive) vs existing products and within batch; auto-creates new categories on confirm; BOM unit normalization (kg↔g, L↔mL) and mismatch guard.
- Products — Bulk delete (owner only), pagination (10/25/50 rows), alphabetical sort (category then product name), Download Template button.
- Products — Duplicate prevention on manual save; pre-save warnings for uncategorized product or empty BOM.
- Purchasing — Raw Materials: CSV import with preview, bulk delete, pagination, alphabetical sort, unit normalization, auto-create category on import, pre-save warning for uncategorized raw material.
- Purchasing — Categories: CSV import with preview, bulk delete, pagination, alphabetical sort; delete with options (delete category + all raw materials, or delete category only keeping raw materials).
- Purchasing — Vendors: CSV import with preview, bulk delete, pagination, alphabetical sort; phone normalization (prepend `0` if missing).
- Inventory — `avg_cogs` formula differentiated by movement type: `adjustment_in` dilutes cost (floor), `adjustment_out` preserves per-unit avg, `waste` absorbs cost into remaining units (ceil) — mirrors Android `InventoryRepository.kt`.
- Customers — CSV import with preview, bulk delete (owner only), pagination, alphabetical sort; category delete with options (delete with customers or keep customers, patch `category_id → null`).

### v1.0.7

- Registration: Province/City dependent dropdowns sourced from `src/data/indonesia-provinces.json`; fields appear immediately after business name. Required 6-digit PIN stored as `pin_hash/pin_salt` on the owner user row. Tenant `province`/`city` written on register.
- Auth flows: Supabase sign-up now redirects to `/<locale>/app/confirm` (new public route) for email activation. Added forgot-password (`/app/forgot-password`) and reset-password (`/app/reset-password`) flows; reset syncs Supabase Auth with `public.users` password hash. Confirm page handles `token_hash`, `access_token`/`refresh_token` hash, and `code` params.
- Auth card: `erp-auth-card` is now scrollable with viewport max-height to avoid overlap on smaller screens.
- Landing page: Added metrics section (tenants / provinces / cities / transactions) with count-up animation and live Supabase-backed totals.
- Settings CSV export: Column order updated to match Android app export exactly — `id, reference_id, tenant_name, date, type, description, customer_category, customer_name, product_category, product_name, variant_name, qty, unit_price, discount_type, discount_value, discount_per_unit, amount, payment_method, transaction_notes, person_in_charge`. CSV profile card removed from the Unduh Data section.

### v1.0.6

- ERP Desktop: Full-featured web ERP at `ayakasir.petalytix.id/{locale}/app/` backed by Supabase.
- ERP Auth: Custom password hash (`public.users.password_hash/password_salt`) with signed HTTP-only cookie session. Supabase Auth used only as best-effort fallback for registration/password sync.
- ERP Screens: Dashboard (stats, period filter, expandable transactions, pagination, custom date range), POS (category grouping, variant picker, customer search/create, TRANSFER payment, BOM-aware inventory deduction), Products (menu items + BOM editor per product), Inventory (stock adjust dialog with `inventory_movements` recording + avg_cogs HPP tracking), Purchasing (goods receiving with decimal qty, auto inventory apply/reversal, avg_cogs weighted-average, vendor/raw material CRUD with in-form quick-create), Customers (customer table, category management, detail panel with tx history), Settings (profile, change password, initial balance, QRIS config, User Management with Feature Access, CSV export with date range picker and enriched columns).
- ERP State: React Context + useReducer (`store.tsx`); server-side initial data load in `(erp)/layout.tsx`; Supabase Realtime sync on all tenant tables.
- ERP Sidebar: 7 nav items (Dashboard, POS, Products, Inventory, Purchasing, Customers, Settings); feature-gated per CASHIER `feature_access`; collapsible to icon-only mode.
- ERP Cashier restrictions: CASHIER role sees restricted UI in Purchasing, Products, and Customers screens (no delete, no category management).
- Supabase: New `inventory_movements` table for stock adjustment audit trail; `avg_cogs` field on inventory for HPP tracking.
- Landing page: Hero converted to client component with typing animation (`typingWords`); 6-step feature flow (Purchasing → Inventory → Menu → Customers → Cashier → Dashboard) with flat SVG illustrations; NavBar Login button replaces Home/Privacy Policy links.

### v1.0.5

- AyaKasir Simulator: Interactive POS simulator at `/[locale]/simulator` — full phone-frame UI with 6 screens (POS, Dashboard, Products, Inventory, Purchasing, Settings), 4 demo datasets (retail, restaurant, services, multichannel), per-item discounts, UTANG payment, BOM-based inventory deduction, vendor/goods-receiving management, and CSV export.
- Simulator nav: Added Simulator link to AyaKasir NavBar (desktop + mobile drawer) and a CTA section on the AyaKasir landing page.
- NavBar polish: Language switcher redesigned (pill → text with divider), larger AyaKasir logo text (35px), language switch added to mobile nav CTA area.
- Submodule: AyaKasir Android source added as a git submodule at `repos/ayakasir`.
- Build config: `outputFileTracingExcludes` added to `next.config.js` to exclude `repos/` and `ai-memory/` from Vercel deploy bundle; `tsconfig.json` excludes same dirs.
- Middleware fix: `middleware.ts` moved to `src/` (required by Next.js when `src/` directory is used); subdomain root rewrite and root page `force-dynamic` corrected.

### v1.0.4

- AyaKasir subdomain: New `ayakasir.petalytix.id` with landing page, privacy policy, and account deletion request form.
- Middleware routing: Subdomain detection and rewrite via `middleware.ts`.
- Bilingual pages: All AyaKasir pages support EN/ID locales.
- Responsive forms: Delete account form with properly stacked label+input fields.

### v1.0.3

- Analytics: Vercel Web Analytics enabled via `@vercel/analytics`.

### v1.0.2

- Performance: public pages use ISR with hourly revalidation; portfolio changes trigger immediate refresh.
- Sitemap: `/sitemap.xml` is dynamic with hourly cache and revalidation on portfolio updates.
- Images: responsive `sizes` hints for portfolio cards and galleries.

### v1.0.1

- Initial release.

## Setup

1. Install dependencies:

```
npm install
```

2. Create a `.env.local` file based on `.env.example` and fill in values.

3. Run the dev server:

```
npm run dev
```

## Seed portfolio items

```
npm run seed
```

## Admin

- Login at `/admin` using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Use the `Site settings` tab to update home, about, and contact page content.
- Portfolio detail descriptions preserve line breaks, so new lines in the admin description render as new lines on the public page.

## Environment variables

Core
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: Optional database name (default: `petalytix`)
- `AUTH_SECRET`: Secret used to sign admin sessions

Admin
- `ADMIN_EMAIL`: Admin login email
- `ADMIN_PASSWORD`: Admin login password

Public
- `NEXT_PUBLIC_SITE_URL`: Base URL for metadata and canonical links

Email (contact form)
- `SMTP_HOST`: SMTP host
- `SMTP_PORT`: SMTP port (number)
- `SMTP_SECURE`: Use TLS (`true` or `false`)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: From address (defaults to `SMTP_USER` if omitted)
- `CONTACT_TO`: Optional recipient for contact form emails (falls back to `ADMIN_EMAIL` or site settings)

## Deployment (Vercel)

1. Push the repo to GitHub.
2. Create a new project in Vercel and select the repository (framework preset: Next.js).
3. Add the environment variables in Vercel using the keys from `.env.example`.
4. Set `NEXT_PUBLIC_SITE_URL` to your production domain (Vercel domain or custom domain).
5. Deploy.

Optional:
- Run `npm run seed` locally against the production MongoDB to preload portfolio items.
- Enable Web Analytics in the Vercel project settings to start collecting page views.

## Sitemap

- The sitemap is generated at `/sitemap.xml` from `src/app/sitemap.ts`.
- It uses `NEXT_PUBLIC_SITE_URL` as the base domain and includes locale + portfolio detail pages.
- It is cached hourly; portfolio create/update/delete actions revalidate `/sitemap.xml` immediately.

## AyaKasir Subdomain (`ayakasir.petalytix.id`)

### Pages
- **Landing page** (`/en`, `/id`) — AyaKasir app overview with features and Google Play Store link
- **Privacy Policy** (`/en/privacy-policy`, `/id/privacy-policy`) — Google Play Store compliant
- **Delete Account Request** (`/en/delete-account-request`, `/id/delete-account-request`) — Account deletion form

### Implementation
- **Routing:** Middleware-based subdomain detection and rewrite (`middleware.ts`)
- **Structure:** `src/app/ayakasir/[locale]/` with dedicated layout, pages, and actions
- **Content:** `src/lib/ayakasir-content.ts` — all EN/ID copy and privacy policy text
- **Components:** `src/components/ayakasir/` — NavBar, Footer, DeleteAccountForm
- **Email:** Deletion requests sent via existing Nodemailer SMTP config to `CONTACT_TO`
- **Styling:** Responsive design with AyaKasir brand colors (#1D72E9 primary, #37A454 secondary)
