# Project Overview

> AI development context — not used at runtime.

## What is Petalytix?

Petalytix (petalytix.id) is a portfolio and analytics showcase site built with Next.js 14 App Router and TypeScript.

### Subdomains

- **petalytix.id** — Main marketing/portfolio site
- **ayakasir.petalytix.id** — Landing pages + Desktop ERP for AyaKasir, an Android POS merchant app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Pure CSS (`src/app/globals.css`) — no Tailwind |
| Fonts | Oxanium (display), Sora (body) via `next/font` |
| Database | MongoDB (site settings, contact messages) |
| AyaKasir Backend | Supabase |
| Email | Nodemailer (SMTP) |
| Analytics | @vercel/analytics, @vercel/speed-insights |
| Deployment | Vercel |

## Internationalization

- Two locales: `en` (English), `id` (Indonesian)
- Pattern: `[locale]` dynamic route segment + `getCopy(locale)` helper
- Main site copy: `src/lib/content.ts`
- AyaKasir copy: `src/lib/ayakasir-content.ts`

## Subdomain Routing

Middleware (`src/middleware.ts`) intercepts requests:
- `ayakasir.*` hostnames are rewritten to `/ayakasir/[locale]/...`
- Main domain serves from `/[locale]/...`

### Landing Page

- NavBar: Login button linking to `/${locale}/app/login`; Home and Privacy Policy nav links removed.
- Hero: client component with typing animation cycling through feature words (`typingWords` in copy). Hero copy shape: `titlePrefix`, `titleSuffix`, `typingWords`, `ctaPlayStore`, `ctaLogin`.
- Features section: 6-step vertical flow (Purchasing → Inventory → Menu → Customers → Cashier → Dashboard) with inline flat SVG illustrations per step + cross-platform sync illustration.
- Metrics section: live count-up animation for tenants / provinces / cities / transactions, backed by Supabase queries. Renders current totals on each page load.
- CSS in `globals.css`: `.ayakasir-hero-*`, `.ayakasir-typing-word`, `.ayakasir-cursor`, `.ayakasir-features-flow`, `.ayakasir-feature-step`, `.ayakasir-sync-badge`, `.ayakasir-crossplatform`, `.ayakasir-metrics-*`.

### ERP Dashboard

- No page-level scroll: `.erp-shell` is `height: 100vh; overflow: hidden`; `.erp-main` scrolls independently.
- Sidebar collapse: `ErpSidebar` has local `collapsed` state; `.erp-sidebar--collapsed` collapses to icon-only width; collapse toggle button in sidebar header.
- Watermark: `"AyaKasir by Petalytix | 2026"` fixed bottom-right via `.erp-watermark`.
- ERP pages have no marketing NavBar/Footer (separate layout, unchanged).

### App Simulator

- Web-based simulator on ayakasir.petalytix.id mimics the native Android app inside a phone-frame mockup.
- Purely client-side (React state) — no Supabase interaction, no data persistence.
- 4 scenario datasets (restaurant, retail, multi-channel, services) chosen after login.
- Hardcoded credentials: username `ayakasir`, password `cobaduluaja`.
- Files under `src/app/ayakasir/[locale]/simulator/`.

### Desktop ERP

- Full-featured web ERP at `ayakasir.petalytix.id/{locale}/app/` with real Supabase data.
- Auth: ERP access uses `public.users.password_hash/password_salt` as source of truth, with a signed HTTP-only ERP session cookie. Supabase Auth is used only as a best-effort enrollment/confirmation fallback for registration and password sync. Legacy recovery: if `tenant_id` is missing, recover from `tenants.owner_email`; if hash is missing, fallback to Supabase Auth login and backfill.
- Auth routes (public): `/app/login`, `/app/register` (Province/City dropdowns from `indonesia-provinces.json`, required 6-digit PIN, stores `pin_hash/pin_salt`), `/app/confirm` (email activation — handles `token_hash`, `access_token`/`refresh_token` hash, `code` params), `/app/forgot-password` (sends reset email via Supabase Auth), `/app/reset-password` (updates Supabase Auth + backfills `public.users` hash).
- `erp-auth-card` is scrollable with viewport max-height for small screens.
- Two-way realtime sync with mobile app via Supabase Realtime (Postgres Changes) on all tenant tables + `tenants`.
- Screens:
  - **Dashboard**: cash balance, Tunai/Transfer/UTANG/QRIS stat cards, period filter (today/month/year/custom date range), expandable transaction rows, pagination (10/25/50), top products table.
  - **POS**: product grid with category grouping (flat when filtered/searching), variant picker, customer search/create dialog, CASH/QRIS/TRANSFER/UTANG payment methods (gated by `tenants.enabled_payment_methods`), clear cart, receipt dialog. BOM-aware inventory deduction on checkout (unit conversion: kg↔g, L↔mL).
  - **Products**: menu items only (MENU_ITEM type) with BOM editor (variants + components per product), category CRUD, clone, search.
  - **Inventory**: stock table, adjust stock dialog (movement type selector + optional notes) → writes to `inventory_movements` table + updates `avg_cogs`.
  - **Purchasing**: goods receiving (decimal qty, auto inventory apply/reversal on edit/delete, avg_cogs weighted-average, in-form quick-create vendor/raw material) + vendor CRUD. Raw Materials tab: full CRUD for RAW_MATERIAL products + categories.
  - **Customers**: customer table (category filter + text search), category management panel, customer detail panel (stats + tx history). CRUD for customers and customer categories.
  - **Settings**: profile, change password (hash update + best-effort Supabase Auth sync), initial balance, QRIS config (merchant name + image URL), User Management (add/edit/delete tenant users with role + Feature Access checkboxes for CASHIER), CSV export (date range picker; columns: `id, reference_id, tenant_name, date, type, description, customer_category, customer_name, product_category, product_name, variant_name, qty, unit_price, discount_type, discount_value, discount_per_unit, amount, payment_method, transaction_notes, person_in_charge`).
- Role-based access: OWNER sees all; CASHIER sees only features in `users.feature_access` (sidebar filtered); CASHIER restricted from delete/category-management in Purchasing, Products, Customers.
- Repository layer in `src/lib/supabase/repositories/` — 14 files, function-based, mirrors mobile's Kotlin repositories.
- State: React Context + useReducer in `src/components/ayakasir/erp/store.tsx`, server-side initial data load in `(erp)/layout.tsx`.
- CSS: `.erp-*` prefix in `src/app/ayakasir/[locale]/app/erp.css`. Sidebar collapsible to icon-only mode. Watermark fixed bottom-right.
- i18n: `src/components/ayakasir/erp/i18n.ts` (EN/ID).
- Middleware protects `/app/*` routes, redirects unauthenticated to `/app/login`.
- Supabase tables: `inventory_movements` (stock adjustment audit trail); `avg_cogs` BIGINT on `inventory` for HPP tracking.
