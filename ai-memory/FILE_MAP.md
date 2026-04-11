# File Map

> AI development context — not used at runtime.

## Root

```
├── ai-memory/            # AI context files (this folder)
├── repos/                # Git submodules (e.g. ayakasir Android source)
├── src/                  # Application source
├── public/               # Static assets
├── next.config.js        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── middleware.ts          # Root middleware (subdomain routing) — NOTE: located in src/
└── package.json
```

## src/ Structure

```
src/
├── app/
│   ├── globals.css                  # All CSS (~1540 lines, no Tailwind)
│   ├── layout.tsx                   # Root layout
│   ├── [locale]/                    # Main site pages (en/id)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── ayakasir/
│   │   └── [locale]/                # AyaKasir subdomain pages
│   │       ├── layout.tsx           # Minimal locale validator only (no nav/footer)
│   │       ├── (marketing)/         # Route group: NavBar + Footer
│   │       │   ├── layout.tsx       # Marketing layout (NavBar + Footer)
│   │       │   ├── page.tsx         # Landing page
│   │       │   ├── privacy-policy/page.tsx
│   │       │   ├── delete-account-request/page.tsx
│   │       │   └── simulator/       # App simulator
│   │       │       ├── page.tsx
│   │       │       ├── SimulatorShell.tsx
│   │       │       └── simulator.css
│   │       └── app/                 # Desktop ERP (no nav/footer)
│   │           ├── layout.tsx       # ERP root layout (imports erp.css)
│   │           ├── erp.css          # All .erp-* scoped CSS
│   │           ├── login/page.tsx
│   │           ├── register/page.tsx
│   │           ├── confirm/page.tsx         # Email activation (token_hash / code / hash params)
│   │           ├── forgot-password/page.tsx # Send reset email
│   │           ├── reset-password/page.tsx  # Update password + backfill public.users hash
│   │           ├── (erp)/           # Authenticated route group
│   │           │   ├── layout.tsx   # Sidebar + ErpProvider (fetches data SSR)
│   │           │   ├── page.tsx     # Redirect to dashboard
│   │           │   ├── dashboard/page.tsx
│   │           │   ├── pos/page.tsx
│   │           │   ├── products/page.tsx
│   │           │   ├── inventory/page.tsx
│   │           │   ├── purchasing/page.tsx
│   │           │   ├── customers/page.tsx
│   │           │   └── settings/page.tsx
│   │           └── office/              # Owner Office (multi-branch, Tumbuh+)
│   │               ├── layout.tsx       # OfficeProvider + OfficeSidebar (SSR data fetch)
│   │               ├── page.tsx         # Redirect to overview
│   │               ├── overview/page.tsx
│   │               ├── branches/page.tsx
│   │               ├── staff/page.tsx
│   │               ├── reports/page.tsx       # Consolidated KPI dashboard
│   │               ├── master-data/page.tsx   # Master data linking dashboard
│   │               ├── inventory/page.tsx
│   │               ├── customers/page.tsx
│   │               └── settings/page.tsx
│   ├── api/                         # Next.js API routes
│   │   └── office/
│   │       ├── master-data-links/route.ts  # POST — write master_data_links config
│   │       └── sync-products/route.ts      # POST — copy master data from primary to target branch
│   └── actions/
│       └── contact.ts               # Contact form server action
├── lib/
│   ├── content.ts                   # Main site i18n copy (EN/ID)
│   ├── ayakasir-content.ts          # AyaKasir i18n copy (EN/ID) + simulator CTA copy
│   ├── site-settings.ts             # MongoDB-backed dynamic settings
│   ├── privacy-policy.ts            # Petalytix privacy policy content
│   ├── erp-auth.ts                  # ERP signed-cookie session helpers
│   ├── erp-auth-token.ts            # ERP JWT token helpers
│   ├── ayakasir-password.ts         # ERP password hash helpers
│   ├── ayakasir-plan.ts             # Plan constants, limits, getPlanLimits()
│   └── supabase/                    # Supabase integration (AyaKasir ERP)
│       ├── client.ts                # Browser client (@supabase/ssr)
│       ├── server.ts                # Server client (cookies-based)
│       ├── middleware.ts            # Middleware client (request/response cookies)
│       ├── types.ts                 # DB row types + table constants
│       ├── realtime.ts              # useRealtimeSync hook
│       └── repositories/            # CRUD per table (16 files + index)
│           ├── categories.ts
│           ├── products.ts
│           ├── variants.ts
│           ├── inventory.ts
│           ├── inventory-movements.ts  # Stock adjustment audit trail
│           ├── product-components.ts
│           ├── vendors.ts
│           ├── goods-receiving.ts
│           ├── transactions.ts
│           ├── cash-withdrawals.ts
│           ├── general-ledger.ts
│           ├── customers.ts
│           ├── customer-categories.ts
│           ├── cashier-sessions.ts  # Open/close cashier session lifecycle
│           ├── variant-groups.ts    # Variant preset groups + values CRUD
│           └── index.ts
├── data/
│   └── indonesia-provinces.json     # Province → cities lookup for register form
├── middleware.ts                     # Subdomain routing + ERP auth protection
└── components/
    ├── ayakasir/
    │   ├── NavBar.tsx               # AyaKasir nav (login btn desktop-only; mobile inside menu)
    │   ├── Hero.tsx                 # Hero client component (typing animation + SVG illustrations)
    │   ├── Footer.tsx               # AyaKasir footer
    │   ├── DeleteAccountForm.tsx    # Delete account form
    │   ├── erp/                     # Desktop ERP components
    │   │   ├── store.tsx            # ErpProvider context + reducer
    │   │   ├── i18n.ts              # EN/ID copy for ERP UI
    │   │   ├── utils.ts             # formatRupiah, formatDate, date ranges
    │   │   ├── usePlanLimits.ts     # Plan limits hook (counts, can* booleans); CSV export gated for PERINTIS
    │   │   ├── ErpSidebar.tsx       # Sidebar navigation (feature-gated per user role)
    │   │   └── screens/
    │   │       ├── DashboardScreen.tsx
    │   │       ├── PosScreen.tsx
    │   │       ├── ProductsScreen.tsx
    │   │       ├── InventoryScreen.tsx
    │   │       ├── PurchasingScreen.tsx
    │   │       ├── CustomersScreen.tsx
    │   │       └── SettingsScreen.tsx
    │   │   └── office/              # Owner Office components
    │   │       ├── store.tsx        # OfficeProvider context + reducer (ConsolidatedTx/TxItem types)
    │   │       ├── OfficeSidebar.tsx # Office navigation sidebar
    │   │       └── screens/
    │   │           ├── OverviewScreen.tsx
    │   │           ├── BranchesScreen.tsx
    │   │           ├── StaffScreen.tsx
    │   │           ├── ReportsScreen.tsx     # Consolidated KPI dashboard
    │   │           ├── MasterDataScreen.tsx  # Master data linking (card grid + toggles)
    │   │           ├── InventoryScreen.tsx
    │   │           ├── CustomersScreen.tsx
    │   │           └── SettingsScreen.tsx
    │   └── simulator/               # Simulator components (25 files)
    │       ├── types.ts             # All TS interfaces & state types
    │       ├── constants.ts         # Credentials, formatRupiah, genId
    │       ├── i18n.ts              # Simulator-specific EN/ID copy
    │       ├── context.tsx          # SimulatorProvider + useSimulator
    │       ├── reducer.ts           # All state transitions
    │       ├── PhoneFrame.tsx       # CSS phone mockup wrapper
    │       ├── data/
    │       │   ├── index.ts         # Scenario map
    │       │   ├── restaurant.ts    # Warung Soto Pak Joko
    │       │   ├── retail.ts        # Toko Makmur Jaya
    │       │   ├── multichannel.ts  # Kopi Nusantara
    │       │   └── services.ts      # Barbershop Keren
    │       ├── screens/
    │       │   ├── LoginScreen.tsx
    │       │   ├── ScenarioPickerScreen.tsx
    │       │   ├── PosScreen.tsx
    │       │   ├── DashboardScreen.tsx
    │       │   ├── ProductsScreen.tsx
    │       │   ├── InventoryScreen.tsx
    │       │   └── SettingsScreen.tsx
    │       └── shared/
    │           ├── NavRail.tsx
    │           ├── TopBar.tsx
    │           ├── ReceiptDialog.tsx
    │           └── ConfirmDialog.tsx
    └── ...                          # Main site components
```

## Key Entry Points

| Path | Purpose |
|------|---------|
| `src/middleware.ts` | Subdomain detection and rewriting |
| `src/app/[locale]/page.tsx` | Main site homepage |
| `src/app/ayakasir/[locale]/(marketing)/page.tsx` | AyaKasir landing page |
| `src/app/ayakasir/[locale]/(marketing)/simulator/page.tsx` | App simulator |
| `src/app/ayakasir/[locale]/app/login/page.tsx` | ERP login page (server-action backed custom auth) |
| `src/app/ayakasir/[locale]/app/(erp)/layout.tsx` | ERP authenticated layout (data fetch + provider) |
| `src/app/ayakasir/actions/auth.ts` | ERP auth server actions (login/register/logout/change password/upsert user/QRIS settings) |
| `src/app/ayakasir/actions/fetch-older-data.ts` | Server action to fetch time-windowed ERP rows older than the initial 90-day SSR window |
| `src/app/api/office/master-data-links/route.ts` | API: write master_data_links config for Office master data linking |
| `src/app/api/office/sync-products/route.ts` | API: copy master data (products, categories, etc.) from primary branch to targets |
| `src/lib/erp-auth.ts` | ERP signed-cookie session helpers |
| `src/lib/erp-auth-token.ts` | ERP JWT token helpers |
| `src/lib/ayakasir-password.ts` | ERP password hash helpers |
| `src/lib/supabase/types.ts` | Supabase DB row types (source of truth) |
| `src/components/ayakasir/erp/store.tsx` | ERP state context + realtime sync |
| `src/components/ayakasir/erp/screens/CustomersScreen.tsx` | Customers screen (table, categories, detail panel) |
| `src/app/actions/contact.ts` | Contact form server action |
| `src/app/ayakasir/actions/delete-account.ts` | Account deletion server action |
