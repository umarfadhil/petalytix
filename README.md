# Petalytix Portfolio

## Changelog

### v1.1.1

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
