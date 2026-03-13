# Petalytix Portfolio

## Changelog

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
