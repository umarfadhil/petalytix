# Code Rules

> AI development context — not used at runtime.

## Styling

- **No Tailwind.** All styles live in `src/app/globals.css` using plain CSS.
- CSS class conventions: `.section`, `.reveal`, `.page-top`, `.eyebrow`, `.title`, `.subtitle`, `.feature-card`, `.button.primary`, `.button.ghost`, `.legal`, `.legal-section`, `.contact-form`, `.form-success`, `.form-error`
- Animations: `.reveal` (fadeIn + translateY), delay classes `.delay-1` through `.delay-4`

## Internationalization

- Always use the `getCopy(locale)` pattern — never hardcode user-facing strings.
- Locale is extracted from the `[locale]` route segment.
- Two locales only: `en` and `id`.

## Server Actions

- Use `useFormState` + `useFormStatus` pattern for form handling.
- Server actions live in `actions/` directories co-located with their route.

## Environment Variables

- SMTP config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Recipients: `CONTACT_TO`, `ADMIN_EMAIL`
- Never commit `.env` files.

## AyaKasir Brand

- Primary blue: `#1D72E9`
- Secondary green: `#37A454`
- Logo text uses a CSS gradient of these two colors.

## AyaKasir Desktop ERP Rules

### Supabase Client Usage
- Browser (client components): `import { createBrowserClient } from "@/lib/supabase/client"`
- Server (Server Components, server actions): `import { createServerClient } from "@/lib/supabase/server"`
- Middleware: `import { createMiddlewareClient } from "@/lib/supabase/middleware"`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### ERP Repository Pattern
- One file per table in `src/lib/supabase/repositories/`.
- Functions take `(supabase: SupabaseClient, ...)` as first arg — works in both server and client.
- Always include `sync_status: "SYNCED"` on inserts (matches mobile app convention).
- Always set `updated_at: Date.now()` on updates.

### ERP State Management
- `ErpProvider` (React Context + useReducer) wraps all authenticated ERP pages.
- Server-side `(erp)/layout.tsx` fetches all data and passes as `initialData` to provider.
- Mutations: call repository function → dispatch UPSERT/DELETE to local state → realtime handles cross-device sync.
- Realtime: `useRealtimeSync` hook subscribes to Postgres Changes on all 12 tenant tables + `tenants`.
- All tenant queries MUST filter by `tenant_id`.

### ERP Styling
- All CSS in `src/app/ayakasir/[locale]/app/erp.css` with `.erp-*` prefix.
- Design tokens in CSS variables: `--erp-primary`, `--erp-bg`, `--erp-surface`, etc.
- No Tailwind, no CSS modules — plain CSS only.

### ERP Auth
- ERP login uses `public.users.password_hash/password_salt` as the source of truth, not Supabase Auth sessions.
- ERP access is stored in a signed HTTP-only cookie via `src/lib/erp-auth.ts`.
- Middleware protects `/app/*` routes (except `/app/login`, `/app/register`, `/app/confirm`, `/app/forgot-password`, `/app/reset-password`) by validating the ERP session cookie.
- If user is logged in and visits login/register, redirect to `/app/dashboard`.
- If an owner user is missing `tenant_id`, try to recover it from `tenants.owner_email` before failing login.
- If a legacy user is missing `password_hash/password_salt`, allow one-time fallback to Supabase Auth login and backfill the hash into `public.users`.

### ERP Registration
- Province/City dropdowns are sourced from `src/data/indonesia-provinces.json` — Province is a top-level key, cities are values.
- Registration requires a 6-digit PIN (`[0-9]{6}`), stored as `pin_hash/pin_salt` on the owner `public.users` row.
- Tenant row gets `province` and `city` fields written at registration time.
- After `supabase.auth.signUp()`, redirect to `/<locale>/app/confirm` (not directly to login).

### ERP Password Reset
- Forgot-password sends a reset email via `supabase.auth.resetPasswordForEmail()`.
- Reset-password page reads `token_hash`/`code`/hash params, verifies the OTP, then updates both Supabase Auth password and `public.users.password_hash/password_salt`.
- Confirm page (`/app/confirm`) handles `token_hash`, `access_token`/`refresh_token` (fragment hash), and `code` query params for email verification.

### ERP Role-Based Access
- `state.user?.role === "OWNER"` → full access; `"CASHIER"` → restricted.
- CASHIER sidebar items filtered by `users.feature_access` (comma-string of `UserFeature` enum: `POS,DASHBOARD,MENU,INVENTORY,PURCHASING,CUSTOMERS,SETTINGS`).
- In screens, use `const isOwner = state.user?.role === "OWNER"` to gate delete/category-management actions.
- Feature access default for new CASHIER: `POS,INVENTORY`.

### ERP Inventory / HPP Rules
- `inventory.avg_cogs` (BIGINT) is cost per base unit; 0 when stock is 0.
- All values written to `current_qty` and `avg_cogs` in Supabase must be `Math.round()`ed — column is BIGINT; floats cause `22P02`.
- Unit conversion before arithmetic: kg→g (×1000), L→mL (×1000), pcs unchanged. Convert back to stored unit after.
- `adjustment_in`: `newAvg = (oldAvg × oldQty) / newQty`. `adjustment_out`/`waste`: same formula. Zero stock → `avg_cogs = 0`.
- Goods receiving avg: `newAvg = (existingAvg × existingQty + costPerBase × receivedBase) / newTotalQty`.
- Inventory arithmetic must read fresh DB data (`repo.getInventory()`), not cached React state.

### ERP Inventory Movements
- Stock adjustments write to `inventory_movements` table (not `general_ledger`).
- Movement types: `adjustment_in`, `adjustment_out`, `waste` (matching mobile app).
- Schema: `id, tenant_id, product_id, variant_id (TEXT NOT NULL DEFAULT ''), movement_type, qty_before, qty_after, qty_change, unit (TEXT DEFAULT 'pcs'), reason (TEXT NOT NULL DEFAULT ''), user_id, date (BIGINT), sync_status, updated_at (BIGINT)`. No `reference_id`.

### Adding a New ERP Feature (when mobile app updates)
1. If new Supabase table: add type to `src/lib/supabase/types.ts`, add to `TENANT_TABLES`, create repository in `repositories/`, add to `index.ts`.
2. If new field on existing table: update the corresponding `Db*` interface in `types.ts`.
3. Add state field to `ErpState` in `store.tsx` and fetch it in `(erp)/layout.tsx`.
4. Add realtime handler in the `tableKeyMap` in `store.tsx`.
5. Add new route page in `src/app/ayakasir/[locale]/app/(erp)/` if a new screen is needed.
6. Create or update screen component in `src/components/ayakasir/erp/screens/`.
7. Add nav item to `NAV_ITEMS` in `ErpSidebar.tsx` with appropriate `feature` key.
8. Add i18n strings to `src/components/ayakasir/erp/i18n.ts`.

## General

- Prefer editing existing files over creating new ones.
- Keep responses and code concise — no unnecessary abstractions.
- Commit messages: descriptive, with `Co-Authored-By` footer when AI-assisted.
