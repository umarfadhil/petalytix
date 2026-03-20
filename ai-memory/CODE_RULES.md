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

### ERP Cashier Session Rules
- `cashier_sessions` table: `id, tenant_id, user_id, opened_at (BIGINT), closed_at (BIGINT nullable), initial_balance, closing_balance, withdrawal_amount, match_status, mismatch_note, sync_status, updated_at`.
- `currentSession` is derived: `state.cashierSessions.find(s => s.closed_at === null)`. No extra state.
- POS is locked when `currentSession === null`; shows Open Cashier overlay (initial balance + PIN).
- PIN verified via `verifyErpPinAction` server action in `auth.ts`. Imported via dynamic import in PosScreen (client component).
- Saldo Kas (Dashboard + POS Tarik Tunai) filters generalLedger to `date >= currentSession.opened_at`. Falls back to all-time when no session.
- UTANG total is always all-time (mirrors mobile `TransactionDao.getTotalUnpaidDebt`).
- Dashboard "Shift Aktif" chip is the 5th period type; only rendered when `activeSession !== null`.
- Settle debt: Lunasi button disabled when `activeSession === null`.
- Close Cashier: writes closed_at, closing_balance, withdrawal_amount, match_status, mismatch_note to `cashier_sessions`. Then performs cash-reset. After close, POS auto-locks.
- Empty cash ledger flow (3 steps): (1) `cash_withdrawals` row with full `closingBalance`; (2) reset INITIAL_BALANCE to 0; (3) WITHDRAWAL ledger entry with `amount = -(closingBalance - initialBalance)` (sales-only). Edge: skip step 3 if salesPortion ≤ 0.
- Saldo Awal is no longer in Settings — set exclusively via Open Cashier in PosScreen.

### ERP Variant Preset Groups Rules
- `variant_groups` table: `id, tenant_id, name, sync_status, updated_at`.
- `variant_group_values` table: `id, group_id, tenant_id, name, sort_order, sync_status, updated_at`. `group_id` → `variant_groups(id) ON DELETE CASCADE`.
- Repository: `src/lib/supabase/repositories/variant-groups.ts`.
- Variants tab (5th tab in Purchasing): manage reusable preset groups. Shows Group Name | Values (pill badges) | Applied To | Actions (Apply/Edit/Delete).
- Apply preset: opens dialog → select raw material → creates `DbVariant` rows per value (skip if name exists) + `DbInventory` row per new variant.
- Delete group: removes affected DbVariant + DbInventory rows for products using those variant names, then deletes group (cascade deletes values).
- Goods receiving "Use Variants" toggle: expands product row into per-variant sub-rows (variantId, variantName, qty, costPerUnit). Save produces one `DbGoodsReceivingItem` per variant row with non-zero qty.
- `FormItem` extended with `useVariants: boolean` and `variantRows: VariantRow[]`.

### ERP Plan / Subscription Rules
- `tenants.plan` is `TenantPlan` = `"PERINTIS" | "TUMBUH" | "MAPAN"`. Default for new tenants: `PERINTIS`.
- Plan limits defined in `src/lib/ayakasir-plan.ts` (`PLAN_LIMITS` record). Use `getPlanLimits(plan)` to get limits.
- `APP_VERSION` constant in `src/lib/ayakasir-plan.ts` — keep in sync with `repos/ayakasir/app/build.gradle.kts → versionName`. Displayed in Settings footer as `© 2026 AyaKasir by Petalytix | v{APP_VERSION}`.
- `usePlanLimits()` hook (in `src/components/ayakasir/erp/usePlanLimits.ts`) returns current counts and `can*` booleans for all screens.
- Plan expiry: if `plan_expires_at` is set and past, effective plan falls back to `PERINTIS`.
- Enforcement is client-side only (no server-side RPC yet). Check `can*` booleans before creating new entities.
- CSV export (Unduh Data) is disabled for PERINTIS plan — button disabled + warning hint shown.
- UTANG payment method is available on all plans. Visibility in POS and Settings is controlled by `tenants.enabled_payment_methods`.
- When adding a new plan-gated feature: add the limit to `PlanLimits` interface + `PLAN_LIMITS`, add the `can*` boolean to `usePlanLimits`, enforce in the relevant screen.

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
