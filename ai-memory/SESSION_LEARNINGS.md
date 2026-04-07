# Session Learnings

## 2026-03-25 — Inventory: Purchasing total vs Inventory value discrepancy (Rp7,500 gap)

- **Root cause:** `avg_cogs` (BIGINT) is stored as `Math.round(weightedAvg)`. When a raw material has **multiple receivings**, the weighted-average produces a fractional per-unit cost that gets truncated by rounding. The cumulative stock value (`current_qty × avg_cogs`) then diverges from the true total cost (sum of all `qty × cost_per_unit` from goods_receiving_items).
- **Affected items (tenant `1adc04d9`):**
  - *Kopi Ethiopia Yirgacheffe Premium*: 2 receivings (2500g@160 + 5000g@180). Exact avg = 173.33 → stored 173. Inventory: 7500×173 = 1,297,500 vs true 1,300,000. **−2,500**
  - *Kopi Ethiopia Yirgacheffe Specialty*: 2 receivings (2000g@225 + 5000g@240). Exact avg = 235.71 → stored 235. Inventory: 7000×235 = 1,645,000 vs true 1,650,000. **−5,000**
  - Total gap: **−7,500** (matches Rp13,160,500 − Rp13,153,000)
- **This is expected behavior** — the mobile app uses the same `Math.round()` weighted-average formula, so both apps agree. The gap is not a bug but a structural consequence of storing integer HPP per base unit.
- **Purchasing page** shows `SUM(qty × cost_per_unit)` from `goods_receiving_items` (raw purchase cost). **Inventory page** shows `SUM(current_qty × avg_cogs)` (rounded integer weighted avg). These will always diverge when weighted avg is fractional — by design.
- **Key rule:** `avg_cogs` is an approximation for HPP tracking. The "true" purchase cost is always the Purchasing page total. The difference grows with multiple receivings at different prices.

## 2026-03-25 — Purchasing: goods_receiving_items DB schema mismatches

- **Bugs found (via Supabase SQL inspection):**
  1. `qty` is `integer` in DB — sending float (e.g. 1.5 for "L") throws Postgres error
  2. `cost_per_unit` is `bigint` — sending float (e.g. 13066.67) throws Postgres error
  3. `variant_name` column is `text NOT NULL` — not present in `DbGoodsReceivingItem` type or insert payload → throws NOT NULL violation
- **Fix:** Items are now stored in **base units** (mL/g/pcs). Added `toBaseUnit()` helper to convert display unit → base unit. `qty = Math.round(convertQtyBetweenUnits(displayQty, displayUnit, baseUnit))`. `cost_per_unit = Math.round(totalCost / baseQty)` per base unit. `variant_name` added to `DbGoodsReceivingItem` type and populated from `state.variants` lookup.
- **Edit restore:** `openEditReceiving` already converted base units back to display (g→kg, mL→L) — this remains correct.
- **File changed:** `src/lib/supabase/types.ts`, `src/components/ayakasir/erp/screens/PurchasingScreen.tsx`

## 2026-03-25 — Purchasing: upsertInventory variant_id null vs "" mismatch

- **Bug:** Saving a goods receiving showed "Terjadi Kesalahan" even though the receiving header + items were saved. Data appeared in list but error was thrown.
- **Root cause:** `upsertInventory` uses `onConflict: "product_id,variant_id"`. Mobile app stores `variant_id = null` for no-variant rows. The web ERP normalized `null → ""` in `inventorySnapshot` keys (`i.variant_id ?? ""`), but then passed `variant_id: ""` to `upsertInventory`. The conflict key `("product_id", "")` doesn't match the DB row `("product_id", null)`, so Supabase tried to INSERT a duplicate row, throwing a constraint error.
- **Fix:** In `handleSaveReceiving`, when calling `upsertInventory`, use `existing.variant_id` (the actual DB value, which may be `null`) instead of `item.variant_id` (`""`). Applied to both the add path and the edit reversal path.
- **Pattern to remember:** Always use the fetched DB row's `variant_id` (not the form value) when upserting inventory. The snapshot keys use `?? ""` for JS Map lookups only — the actual DB value must be preserved.
- **File changed:** `src/components/ayakasir/erp/screens/PurchasingScreen.tsx`

## 2026-03-25 — Purchasing: Remove Preset Varian from Raw Material

- **Bug:** Changing Preset Varian dropdown to "— Belum ada preset varian —" in the Bahan Baku edit form had no effect — the old variants were not removed.
- **Fix:** In `handleSaveRawMaterial` (PurchasingScreen.tsx ~line 1020), added a removal branch: when `rawPresetGroupId` is cleared (`""`) and `prevGroupId` exists, delete variants and their inventory rows for that specific `productId` whose names match the old group's values.
- **Logic:** Filters `state.variants` by `product_id === productId` AND name in `prevValueNames` set, then calls `repo.deleteInventoryByProductVariant` + `repo.deleteVariant` per affected variant and dispatches local DELETE actions.
- **File changed:** `src/components/ayakasir/erp/screens/PurchasingScreen.tsx`

## 2026-03-25 — Products: Per-Variant BOM (Bill of Materials)

- **Schema change:** Added `parent_variant_id TEXT NOT NULL DEFAULT ''` column to `product_components` table. Needs Supabase migration: `ALTER TABLE product_components ADD COLUMN parent_variant_id TEXT NOT NULL DEFAULT '';`
- **Type:** `DbProductComponent` in `src/lib/supabase/types.ts` gained `parent_variant_id: string` field.
- **Products form UI:** When a product has variants, BOM section shows grouped sections per variant (e.g., Small / Medium / Large), each with its own "+ Add Component" button. A "Shared (all variants)" section holds components deducted for any variant. "Copy to all variants" button duplicates one variant's BOM to all others.
- **POS deduction logic:** Changed from variant-name-matching to direct `parent_variant_id` matching. Components with empty `parent_variant_id` (shared) always deducted; variant-specific components deducted only when `parent_variant_id === item.variantId`.
- **Clone:** Variant ID mapping tracks old→new variant IDs so cloned BOM rows reference correct new variant IDs.
- **CSV import:** Components imported via CSV get `parent_variant_id: ""` (shared) by default.
- **Files changed:** `types.ts`, `ProductsScreen.tsx`, `PosScreen.tsx`, `i18n.ts`, `erp.css`
- **No repo changes needed:** `setProductComponents` uses object spread, naturally includes new field.
- **Backward compatible:** Existing components with empty `parent_variant_id` treated as shared (all variants).

## v1.1.4 (2026-03-23)

## 2026-03-23 — ERP Realtime: Status Handling + Fallback Reconcile

- **Files:** `src/lib/supabase/realtime.ts`, `src/components/ayakasir/erp/store.tsx`
- **Changes:**
  - `useRealtimeSync` now accepts an optional `onStatusChange(status: RealtimeStatus)` callback; passes it to `channel.subscribe()` — maps `SUBSCRIBED` → `"SUBSCRIBED"`, `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` → `"DISCONNECTED"`, initial call → `"CONNECTING"`.
  - `RealtimeStatus = "CONNECTING" | "SUBSCRIBED" | "DISCONNECTED"` exported from `realtime.ts`, re-exported from `store.tsx`.
  - `ErpState.realtimeStatus` field added (default `"CONNECTING"`); `SET_REALTIME_STATUS` action + reducer case added.
  - `ErpProvider` wires `onStatusChange` → dispatches `SET_REALTIME_STATUS`.
  - **Focus reconcile:** `window.addEventListener("focus", reconcile)` — always re-fetches on tab focus regardless of status.
  - **Interval reconcile:** `setInterval(5 min)` — only fires when `realtimeStatus === "DISCONNECTED"`.
  - Reconcile fetches same shape as SSR layout (static tables all + windowed 90-day tables), then dispatches `SET_ALL` to overwrite state. Uses `reconcileRef` pattern to avoid stale closures.
  - `realtimeStatusRef` kept in sync via `useEffect` for use inside the interval without re-creating it.

## 2026-03-23 — Landing Page: Reduced ISR Revalidation from 1 hour to 5 minutes

- **File:** `src/app/ayakasir/[locale]/(marketing)/page.tsx`
- **Change:** `export const revalidate = 3600` → `export const revalidate = 300`
- **Why:** Metrics section (tenant count, provinces, cities, transactions) now refreshes every 5 minutes instead of every hour — better balance between Supabase query load and data freshness.
- The 3 Supabase count queries in `getAyaKasirMetrics()` run only on ISR revalidation, not on every request.

## 2026-03-23 — Supabase: Added tenant_id and Compound Date Indexes

- **Migration:** `add_tenant_id_and_compound_date_indexes` applied to the `ayakasir` Supabase project.
- **New `tenant_id` indexes (4 tables previously missing):**
  - `cashier_sessions`, `users`, `variant_groups`, `variant_group_values`
- **New `(tenant_id, date)` compound indexes (5 tables with both columns):**
  - `transactions`, `general_ledger`, `cash_withdrawals`, `inventory_movements`, `goods_receiving`
- **Rationale:** All tenant queries filter by `tenant_id`; time-range queries (Dashboard periods, CSV export date range) additionally filter by `date`. Compound indexes let Postgres satisfy both predicates from one index scan, avoiding full-table scans as tenant data grows.
- **All other tables** already had `tenant_id` indexes or don't have a `date` column (`categories`, `variants`, `products`, etc.).

## 2026-03-23 — Vercel Deployment: Login 500 Error (Missing SUPABASE_SERVICE_ROLE_KEY)

- **Symptom:** After deploying to Vercel, ERP login fails with generic Server Components error. Runtime logs show `Error: supabaseKey is required` on `POST /id/app/login` (500).
- **Root cause:** `SUPABASE_SERVICE_ROLE_KEY` env var was missing from Vercel production environment. `createAdminClient()` in `src/lib/supabase/server-admin.ts` passes `undefined` to `createClient()` due to `!` non-null assertion.
- **Secondary issue:** `MongoNetworkTimeoutError` on main site routes (`GET /id`, `/favicon.ico`) — MongoDB Atlas connection timing out (likely IP allowlist or `MONGODB_URI` env var issue).
- **Fix:** Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env vars. Verify `NEXT_PUBLIC_SUPABASE_URL`, `AUTH_SECRET`, and `MONGODB_URI` are also set.
- **Lesson:** When deploying new features that introduce new env vars (e.g., `SUPABASE_SERVICE_ROLE_KEY` for `server-admin.ts`, `AUTH_SECRET` for JWT signing), always verify they are configured in Vercel before deploying.

## 2026-03-22 — Settings: QRIS Image Upload via Supabase Storage

- **Change:** Pengaturan QRIS now has a file upload button (max 1 MB, JPG/PNG/WebP) instead of a URL text input.
- Upload uses `createBrowserClient` → `supabase.storage.from("qris-images").upload(...)` with `upsert: true`.
- Path: `{tenantId}/qris.{ext}` in the `qris-images` bucket. Public URL with `?t={timestamp}` cache buster stored in `tenants.qris_image_url`.
- Client-side 1 MB guard before upload; error shown inline in dialog.
- Save button disabled while upload is in progress.
- **Requires:** A public `qris-images` Supabase Storage bucket with RLS policy allowing authenticated users to upload.
- **Files:** `SettingsScreen.tsx` (state + handler + dialog UI), `i18n.ts` (4 new keys: `qrisImageTooLarge`, `qrisUploadError`, `qrisUploading`, `qrisImageHint`).

## 2026-03-22 — POS: Sale Ledger Entry Descriptions Localized by Payment Method

- **Change:** `general_ledger` description for sale entries is now localized and payment-method-specific instead of generic `"${paymentMethod} sale"`.
- CASH → ID: "Penjualan tunai" / EN: "Cash sale"
- QRIS → ID: "Penjualan QRIS" / EN: "QRIS sale"
- TRANSFER → ID: "Penjualan transfer" / EN: "Transfer sale"
- UTANG → ID: "Penjualan (utang)" / EN: "Sale (debt)"
- **Location:** `PosScreen.tsx` checkout flow, `description` field on `DbGeneralLedger` insert.

## 2026-03-22 — Settings: Removed Zero-Balance INITIAL_BALANCE Placeholder on Session Close

- **Change:** When closing a cashier session with "empty cash", no zero-balance `INITIAL_BALANCE` (`reference_id: null`) entry is created anymore.
- **Why removed:** The placeholder's only purpose was to be deleted on the next session open (`deleteUnlinkedInitialBalance`). With session-scoped Saldo Kas, the WITHDRAWAL entry already brings the balance to zero — the placeholder added DB write noise with no functional benefit.
- **Cascading cleanup:** Removed `deleteUnlinkedInitialBalance` call + local dispatch loop from `PosScreen.tsx` open-session flow; removed `deleteUnlinkedInitialBalance` export from `general-ledger.ts` repository.
- **Rule:** Do not create zero-amount INITIAL_BALANCE entries as placeholders. Saldo Kas is always session-scoped; the WITHDRAWAL entry is sufficient to represent an emptied session.

## 2026-03-22 — POS: Open Cashier INITIAL_BALANCE Description Includes Date

- **Change:** INITIAL_BALANCE `general_ledger` description now appends the session open date: "Saldo awal — buka kasir (DD/MM/YYYY)" / "Opening balance — open cashier (DD/MM/YYYY)".
- **Location:** `PosScreen.tsx` — inline IIFE formats `now` (ms timestamp) to `DD/MM/YYYY` using local time.
- **Pattern:** Date formatted inline with `new Date(now)` → `padStart` dd/mm/yyyy — no extra import needed.

## 2026-03-22 — Purchasing: Raw Materials Unit Shows "—" for Mobile-Synced Items

- **Bug:** Raw Materials tab showed "—" in the Unit column for raw materials created on the mobile app.
- **Root cause:** `getRawInventoryUnit` filtered `inventory` with `i.variant_id === ""`. The mobile app stores `variant_id` as `NULL` (not `""`) for products with no variants, so the lookup never matched.
- **Fix:** Changed the filter to `(!i.variant_id || i.variant_id === "")` — matching both `null` and `""`. Also added `g→kg` / `mL→L` display conversion to be consistent with other unit displays.
- **Rule:** Any inventory lookup for a "no-variant" row must use `(!i.variant_id || i.variant_id === "")` — the mobile app uses `NULL`, the web uses `""`, both must be handled.

## 2026-03-22 — Dashboard/POS: Saldo Kas Scoped to Last Closed Session

- **Bug:** When no active cashier session exists (e.g., after closing Session B), `cashBalance` and `prevCashBalance` summed ALL general_ledger entries of CASH_TYPES across all sessions. INITIAL_BALANCE entries from each session stacked on top of each other, double-counting carried-over cash. Example: Session A (100k initial + 50k sale + 0 withdrawal) + Session B (150k initial + 50k sale − 200k withdrawal) = all-time sum 150k instead of 0.
- **Root cause:** The fallback when `activeSession === null` was `state.generalLedger.filter(e => CASH_TYPES.includes(e.type))` — no session scoping at all.
- **Fix:** Introduced `lastClosedSession` (most recently closed session by `closed_at`). When no active session exists, `cashBalance` and `prevCashBalance` scope to `date >= lastClosedSession.opened_at` instead of all-time. Applied to both DashboardScreen and PosScreen.
- **Rule:** Saldo Kas must always be session-scoped — either to the active session or the last closed session. All-time sum is only used as a final fallback when no sessions exist at all.

## 2026-03-22 — Settings: Close Cashier Keep-Cash WITHDRAWAL

- **Bug:** When closing a cashier session with "keep cash" (not emptying), no WITHDRAWAL ledger entry was created. The `if (resetToZero && currentBalance !== 0)` guard skipped the entire ledger block, and `withdrawal_amount` on `cashier_sessions` was stored as `null`. This left a gap in the ledger audit trail — no record of the close-cashier event existed for keep-cash sessions.
- **Fix:** Added an `else` branch that creates a WITHDRAWAL ledger entry with `amount: 0` and description "Simpan kas — tutup kasir" / "Cash kept — cashier close". `withdrawal_amount` on the session record is now always a number (`0` for keep-cash, positive for empty-cash) instead of conditionally `null`.
- **Rule:** Every close-cashier action must produce a WITHDRAWAL general_ledger entry, even if the amount is zero. This ensures consistent audit trail and CSV export data.

## 2026-03-22 — Dashboard/POS: Stale Session Guard

- **Root cause:** `cashier_sessions` rows are only created by the web ERP (mobile app has no cashier session table). If a session was opened in a prior web session and never closed, `cashierSessions.find(s => s.closed_at === null)` returns that old session. The Dashboard shift filter `t.date >= opened_at` then includes all historical transactions since that stale open time — inflating the shift transaction count.
- **Fix — DashboardScreen:** compute `todayMidnight` via `useMemo`; `activeSession` = unclosed session only if `opened_at >= todayMidnight`, otherwise null. Stale sessions don't drive the shift chip.
- **Fix — PosScreen:** same `todayMidnight` check → `currentSession` is null for stale sessions, so the lock overlay shows. `staleSession` holds the stale row. On new session open, `closeCashierSession` is called for `staleSession` (if any) before writing the new row.
- **SettingsScreen:** intentionally NOT changed — users can still manually close a stale session via Close Cashier in Settings.
- **Rule:** a cashier session opened before today midnight (`opened_at < todayMidnight`) is "stale" and must be treated as inactive by Dashboard and POS.

## 2026-03-22 — POS: Open Cashier Dialog — Remaining Cash Guard

- When no cashier session is active, `prevCashBalance` is derived from all-time general ledger (INITIAL_BALANCE + SALE + WITHDRAWAL + ADJUSTMENT entries).
- If `prevCashBalance > 0` (cash left from previous session), the Open Cashier dialog shows a warning banner with the amount.
- Validation in `handleOpenCashierSession`: entered `amount < prevCashBalance` → error shown, submit blocked.
- i18n keys added: `pos.prevCashBalanceInfo`, `pos.initialBalanceTooLow` (both EN/ID); use `{amount}` placeholder replaced at runtime with `formatRupiah(prevCashBalance)`.
- CSS: `erp-alert--warning` added to `erp.css` (uses `--erp-warning-light` bg, `--erp-warning` text).

## 2026-03-22 — POS/Settings: INITIAL_BALANCE Scoped to Session

- Bug (v1): open cashier and close cashier both called `deleteInitialBalanceEntries` (deletes ALL INITIAL_BALANCE rows for tenant) then wrote a fresh one — so opening a second session always erased the first session's history.
- Fix (v1): `reference_id` on INITIAL_BALANCE now stores the cashier session ID.
- Bug (v2): close cashier (`resetToZero`) still deleted the current session's INITIAL_BALANCE entry (`reference_id = activeSession.id`) and replaced it with a zero-balance placeholder — this changed the `date` from open time to close time and destroyed the historical record.
- Fix (v2): close cashier no longer deletes the session-linked INITIAL_BALANCE. It only creates a zero-balance unlinked placeholder (`reference_id: null`, `amount: 0`). The session's original INITIAL_BALANCE is preserved with its original `date` and `reference_id`.
- **Open cashier (PosScreen):** generate `sessionId` upfront → delete unlinked placeholders (`reference_id IS NULL`) via `deleteUnlinkedInitialBalance` → write INITIAL_BALANCE with `reference_id = sessionId`.
- **Close cashier (SettingsScreen, resetToZero):** keep session's INITIAL_BALANCE intact → write zero INITIAL_BALANCE with `reference_id = null` (placeholder for next open) → write WITHDRAWAL for full closing balance.
- Bug (v4): WITHDRAWAL ledger entry on cash reset recorded only the sales portion (`closingBalance - initialBalance`), not the full closing balance. Since the session's INITIAL_BALANCE is now preserved, the WITHDRAWAL must offset the entire Saldo Kas (e.g., 75k initial + 25k sale = 100k WITHDRAWAL, not just 25k).
- Fix (v4): WITHDRAWAL `amount` changed from `-salesPortion` to `-currentBalance` (full closing balance).
- Cash balance is session-scoped (`date >= currentSession.opened_at`), so historical INITIAL_BALANCE entries from prior sessions don't affect the current session's balance.
- Bug (v3): `closeCashierSummary.closingBalance` used `calculateCashBalance(state.generalLedger)` which sums ALL ledger entries (no session scoping). With historical INITIAL_BALANCE entries now preserved, this double-counted prior sessions' balances (e.g., 75k + 75k + 25k sale = 175k instead of 100k).
- Fix (v3): closing balance now session-scoped inline — filters `CASH_TYPES` entries to `date >= activeSession.opened_at`, matching Dashboard/POS behavior. `calculateCashBalance` removed from SettingsScreen import.
- `deleteLedgerById` and `calculateCashBalance` removed from SettingsScreen imports (no longer used there).

## 2026-03-22 — Settings: CSV COGS Row Expansion

- COGS ledger entries have `reference_id` → goods receiving ID (not a transaction ID).
- `txItemsByTx` only covers transaction items; COGS entries never matched via that map.
- Fix: added `grItemsByReceiving` (Map<receiving_id, DbGoodsReceivingItem[]>) and `variantMap` to `exportLookups`.
- For COGS entries, the export loop expands into one row per `DbGoodsReceivingItem`; product/variant names resolved via `productMap`/`variantMap`; per-item amount = `-(qty * cost_per_unit)`.
- `DbGoodsReceivingItem` has no `product_name`/`variant_name` — must look up from `productMap`/`variantMap`.
- Refactored the `filtered.map()` into a `for...of` loop with `continue` so COGS expansion can emit multiple rows cleanly.

## 2026-03-22 — Settings: CSV Export Date Format GMT+7

- `date` column in CSV export was `toISOString()` (UTC); changed to `DD/MM/YYYY HH:MM:SS` in GMT+7.
- Approach: offset the BIGINT timestamp by `+7 * 3600000` ms, then format using UTC getters — avoids `Intl`/timezone API complexity.
- `e.date` is the record creation timestamp (BIGINT ms); `e.updated_at` is the mutation timestamp. CSV should always use `e.date`.

## 2026-03-22 — Settings: Close Cashier Saldo Akhir Shows Real Balance + Emptied Note

- Saldo Akhir = Saldo Awal + Penjualan Tunai + Pelunasan Utang − Tarik Tunai (real computed balance).
- When "empty cash" chosen: `cashEmptied: true` in `frozenSummary`; note row "Kas dikosongkan saat tutup kasir / Cash emptied at session close" appended below Saldo Akhir.
- `closingBalance` and `withdrawalAmount` both reflect only in-session activities (actual Tarik Kas by user). The close-time emptying WITHDRAWAL is NOT added to `withdrawalAmount` in the report — it is a session-close bookkeeping entry, communicated solely via the `cashEmptied` note.
- `closeTimeWithdrawal` is still written to `cashier_sessions.withdrawal_amount` (DB audit) but excluded from report display.
- i18n key added: `settings.cashEmptiedNote` (EN/ID).

## 2026-03-22 — Settings: Tutup Kasir Button Disabled When No Active Session

- Added `disabled={!activeSession}` to the "Tutup Kasir / Close Cashier" button in `SettingsScreen.tsx`.
- Added a `title` tooltip: `"Tidak ada sesi kasir aktif"` (ID) / `"No active cashier session"` (EN) when disabled.
- `activeSession` is already derived at the top of the component: `state.cashierSessions.find((s) => s.closed_at === null) ?? null`.
- No new i18n strings needed — tooltip is hardcoded inline (consistent with similar inline hints elsewhere).

## 2026-03-22 — Landing Page: Google Play Store Badge

- Replaced `<a className="button primary ayakasir-btn-primary">` CTA in `Hero.tsx` with a `next/image` `<Image>` badge.
- Badge image copied to `public/images/Google_Play_Store_Badge.png`.
- New CSS classes: `.ayakasir-play-badge-link` (inline-flex wrapper) + `.ayakasir-play-badge` (height 52px, hover lift).
- The `alt` text reuses `copy.hero.ctaPlayStore` for i18n accessibility.
- `.ayakasir-btn-primary` CSS retained (may be used elsewhere).

## 2026-03-22 — Purchasing: Variant Preset Edit — "Applied To" Management

- Edit dialog for variant preset groups now includes an "Applied To" section.
- Users can remove a raw material from the preset (deletes its variant+inventory rows matching group value names).
- Users can add a new raw material to the preset (creates variant+inventory rows for each group value).
- Apply/remove logic runs inside `handleSaveGroup` after syncing group name + values.
- `DbInventory` has no `id` field — composite key `{ product_id, variant_id }`. Delete dispatch uses `compositeKey`, not `id`. Pattern: `dispatch({ type: "DELETE", table: "inventory", id: "", compositeKey: { product_id, variant_id } })`.
- `deleteInventoryByProductVariant(supabase, productId, variantId)` is the correct repo function (not `deleteInventory`).

## 2026-03-21 — Build Fix: Type Errors in DashboardScreen + SettingsScreen

- **DashboardScreen.tsx:529** — `copy.settings.openCashier` does not exist; `openCashier` lives in `copy.pos`. Fixed to `copy.pos.openCashier`.
- **SettingsScreen.tsx:680** — Dynamic key lookup `copy.plan[\`plan${...}\`]` widened to `string | ((days: number) => string)`, which is not assignable to `ReactNode`. Replaced with explicit ternary: `planLimits.plan === "TUMBUH" ? copy.plan.planTumbuh : planLimits.plan === "MAPAN" ? copy.plan.planMapan : copy.plan.planPerintis`.
- **Lesson:** Avoid dynamic `copy[section][key as keyof ...]` lookups when the section's type contains mixed `string | function` values — TypeScript infers the union and rejects JSX rendering.

## 2026-03-20 — Registration: TUMBUH Promo + Activation Flow + Days Remaining

- **Register defaults to TUMBUH:** `registerErpAction` in `auth.ts` now inserts tenant with `plan: "TUMBUH"`, `plan_started_at: now`, `plan_expires_at: now + 3 months` (free promo). Previously defaulted to PERINTIS.
- **activateAccountAction:** New server action in `auth.ts`. Sets `is_active: true` on both `users` and `tenants` rows matching the confirmed email. Called from `confirm/page.tsx` on successful signup OTP verification.
- **Confirm page — static success:** On signup confirmation, page no longer auto-redirects to login. Instead shows a static "Account activated!" message with a manual "Sign in now" button. Recovery (reset-password) still auto-redirects as before.
- **Days remaining in Settings:** `usePlanLimits` now exposes `daysUntilExpiry: number` (Infinity when no expiry). `SettingsScreen` plan section shows a new row "Days remaining" / "Sisa hari" — orange when ≤7 days, red when expired. i18n strings `daysRemaining` + `daysRemainingValue(days)` added to both EN and ID.
- **Files changed:** `src/app/ayakasir/actions/auth.ts`, `src/app/ayakasir/[locale]/app/confirm/page.tsx`, `src/components/ayakasir/erp/i18n.ts`, `src/components/ayakasir/erp/usePlanLimits.ts`, `src/components/ayakasir/erp/screens/SettingsScreen.tsx`.

## 2026-03-20 — Settings: App Info Footer + CSV Export Plan Gate

- **App version:** Added `APP_VERSION = "1.2.3"` constant to `src/lib/ayakasir-plan.ts`. Comment instructs to keep in sync with `repos/ayakasir/app/build.gradle.kts → versionName`. Imported in `SettingsScreen.tsx` and rendered as `© 2026 AyaKasir by Petalytix | v{APP_VERSION}` at the bottom of the settings page.
- **CSV Export gate:** Unduh Data button is now `disabled` when `planLimits.plan === "PERINTIS"`. A warning hint is shown above the button explaining the feature requires Tumbuh/Mapan plan.
- **Files changed:** `src/lib/ayakasir-plan.ts`, `src/components/ayakasir/erp/screens/SettingsScreen.tsx`.

## 2026-03-20 — POS: Tarik Tunai Cash Balance Uses Session-Scoped Ledger

- **Bug:** Saldo Kas in Tarik Tunai dialog showed wrong (e.g. −Rp50.000) while Dashboard showed correct value (e.g. +Rp50.000) for the same period.
- **Root cause:** PosScreen used `calculateCashBalance(state.generalLedger)` — all-time sum including `WITHDRAWAL` entries from previous session closes. Dashboard correctly scoped to `activeSession.opened_at`.
- **Fix:** Replaced `calculateCashBalance` call in PosScreen with the same session-scoped formula as Dashboard: filter ledger entries to `e.date >= currentSession.opened_at` when a session is active.
- **Files changed:** `PosScreen.tsx` only (~line 474).

## 2026-03-20 — POS: Allow Zero Initial Balance When Opening Cashier Session

- **Goal:** Allow `Saldo Kas Awal` to be submitted as 0 (empty field was treated as 0, but typing "0" reset the field back to empty).
- **Root cause:** `onChange` used `num === 0 ? "" : num.toLocaleString(...)` — typing "0" cleared the input.
- **Fix:** Separated empty-string case from zero-value case; now `"0"` displays as `"0"` and submits as `0`.
- **Files changed:** `PosScreen.tsx` only (line ~642).

## 2026-03-20 — POS: Disable QRIS When Not Configured

- **Goal:** QRIS payment button is disabled (greyed out) when the tenant has not configured QRIS (missing `qris_image_url` or `qris_merchant_name`).
- **Logic:** `qrisReady = !!(qris_image_url?.trim() && qris_merchant_name?.trim())` — both fields must be non-empty.
- **`enabled` check:** `enabledMethods.has(key) && (key !== "QRIS" || qrisReady)` — QRIS in `enabled_payment_methods` is no longer sufficient alone.
- **Tooltip:** Shows `"QRIS belum dikonfigurasi"` / `"QRIS not configured"` when disabled due to missing config (distinct from `"Metode tidak aktif"` when toggled off in Settings).
- **Files changed:** `PosScreen.tsx` only.

## 2026-03-20 — Inventory: Delete Zero-Stock Row

- **Goal:** Allow OWNER to delete an inventory row when `current_qty === 0`.
- **Delete button:** Rendered in actions cell only when `isOwner && inv.current_qty === 0`. Calls `deleteInventoryByProductVariant` then dispatches `{ type: "DELETE", table: "inventory", compositeKey }`.
- **Guard:** `confirm()` dialog before deletion. Button disabled while deletion is in-flight (`deleting` state keyed by `"productId|variantId"`).
- **i18n:** Added `deleteInventory` + `confirmDeleteInventory` to EN/ID sections + `ErpCopy` interface.
- **Files changed:** `InventoryScreen.tsx`, `i18n.ts`.

> AI development context â€” not used at runtime.
> Record insights, gotchas, and decisions discovered during development sessions.

## 2026-03-20 — Dashboard: Session-Scoped Saldo Kas & Stat Cards

- **Goal:** Saldo Kas (cash balance) and payment method stat cards (Penjualan Tunai, Transfer, QRIS) should reset per cashier session, not accumulate across sessions.
- **Problem:** Previously `cashBalance` used `calculateCashBalance(state.generalLedger)` which summed all-time ledger entries. After closing a session and opening a new one on the same day, old session's sales still appeared in “today” period stats.
- **Changes in `DashboardScreen.tsx`:**
  - **Saldo Kas**: Now filters `generalLedger` to entries with `date >= activeSession.opened_at` when a session is active. When no session, falls back to all-time sum. This is the only card that is always session-scoped.
  - **Stat cards & transactions**: Follow the period filter (today/month/year/custom/shift) without session clamping, so historical data is visible when selecting broader periods.
  - **Cash flow modal**: Follows the period filter normally.
  - **UTANG total**: Unchanged — remains all-time unpaid debt (mirrors mobile `TransactionDao.getTotalUnpaidDebt`).
- **Removed** `calculateCashBalance` import (no longer needed; logic inlined with session filter).
- **Key design decision**: Only Saldo Kas is permanently session-scoped. All other cards respect the selected period chip so users can view historical data across sessions.
- TypeScript passes clean.

## 2026-03-20 — POS Variant Picker: Remove “None” Option

- **Goal:** When a product has variants, the picker should show only those variants — no “None” fallback button.
- **Key insight:** `inventory` table only tracks raw materials, NOT menu items. Menu item variants have no inventory rows, so filtering by `state.inventory` would always exclude all menu item variants — wrong approach.
- **Change:** Removed the “None” button from the variant picker dialog. Picker shows all variants from `state.variants` for the product (same as before), just without the no-variant fallback.
- **`handleProductClick`:** Unchanged — opens picker if any variants exist, adds directly otherwise.
- **Files affected:** `PosScreen.tsx` only.

## 2026-03-19 — Products: Inline "Add Category" from Tambah Produk dialog

- **Goal:** Allow creating a new MENU category directly from the product form without leaving the dialog.
- **Pattern:** Added `+ {copy.products.addCategory}` as a `__NEW_CAT__` sentinel `<option>` at the bottom of the category `<select>` in the product form dialog. When selected, opens the existing category form dialog.
- **`catFromProductForm` flag:** New boolean state tracks whether the category form was triggered from the product form. When `true`, `handleSaveCategory` auto-selects the new category ID in `formCategory` after saving.
- **Auto-select:** Uses the `newCatId = crypto.randomUUID()` pre-generated before `repo.createCategory` so the ID is available for `setFormCategory(newCatId)` immediately after dispatch.
- **Cancel/close:** All close paths (overlay click, close button, cancel button) also reset `catFromProductForm` to `false`.
- **`openCreateCategory(fromProductForm = false)`:** Param added; call site in categories tab header updated to `() => openCreateCategory()` (arrow wrapper) to avoid TS `MouseEvent` type conflict.
- **No new i18n keys:** Reuses existing `copy.products.addCategory`.
- **Files affected:** `ProductsScreen.tsx`. TypeScript passes clean.

## 2026-03-19 — Inventory: Hide base row when product has variants

- **Bug:** When a raw material has a preset variant applied (e.g., Sendal Bakiak → sizes 40/41/42), the base inventory row (`variant_id: ""`) was still shown alongside the variant rows in InventoryScreen.
- **Root cause:** `handleSaveRaw` always creates a base inventory row (`variant_id: ""`). Applying a variant preset adds variant-specific rows but does not remove the base row.
- **Fix:** In `InventoryScreen.tsx`, added a `productsWithVariants` Set (derived from `state.variants`) and filtered out base rows (`!inv.variant_id && current_qty === 0`) for any product that has at least one variant. Display-only change — no DB writes.
- **Rule:** Inventory screen hides the no-variant row for a product only if (a) the product has variants AND (b) the base row has `current_qty === 0` (auto-created placeholder, never received stock). If a receiving is explicitly added without a variant, `current_qty > 0` and the base row remains visible alongside the variant rows.

## 2026-03-19 — Purchasing: Add Receiving Dialog UI Redesign

- **Goal:** Improve visual structure of the Add/Edit Receiving dialog in `PurchasingScreen.tsx`.
- **Vendor + Notes:** Now rendered in a 2-column grid (`erp-rec-form-section`) side by side instead of stacked.
- **Items section header:** Replaced raw `div` with `.erp-rec-items-header` — uppercase label + "Add Item" button, separated by a bottom border.
- **Item rows:** Each row is now a `.erp-rec-item-card` (light bg, border, border-radius) instead of a flat `div`. Remove button is absolutely positioned top-right (`.erp-rec-item-remove`).
- **Card layout:** Category + raw material in a 3-column header row (`erp-rec-item-card-header`: category | product | spacer). Qty + Total in a 2-column row (`erp-rec-item-card-row`). Each field has a small label above it via `.erp-rec-item-label`.
- **Qty display:** `erp-rec-item-qty-group` flex row aligns qty input + unit label cleanly.
- **Preset select:** Moved below qty/total row with its own label — no longer crammed into the main grid column.
- **Variant sub-rows:** Use `.erp-rec-variant-row` 4-column grid (variant name | spacer | qty | total) with a subtle bordered card treatment.
- **Grand Total:** Displayed below all items when at least one product is selected — shows `copy.purchasing.totalCost` label + formatted `formatRupiah(grandTotal)` in primary blue.
- **New CSS classes** in `erp.css`: `.erp-rec-form-section`, `.erp-rec-items-header`, `.erp-rec-item-card`, `.erp-rec-item-card-header`, `.erp-rec-item-card-row`, `.erp-rec-item-qty-group`, `.erp-rec-item-remove`, `.erp-rec-item-label`, `.erp-rec-variant-row`, `.erp-rec-variant-name`, `.erp-rec-total-row`, `.erp-rec-total-amount`.
- **No logic changes** — all existing state, handlers, and variant behavior untouched. TypeScript passes clean.

## 2026-03-19 — Purchasing: Variant Preset Groups + Goods Receiving Expand-by-Preset

- **Goal:** Replace per-product variant management with reusable preset groups (e.g., "Size" → S/M/L/XL). Apply preset to raw material creates `DbVariant` rows. In goods receiving, toggle "Use Variants" to expand a product row into sub-rows per variant.
- **New DB tables:** `variant_groups` (id, tenant_id, name, sync_status, updated_at) and `variant_group_values` (id, group_id, tenant_id, name, sort_order, sync_status, updated_at). RLS via `public.users.tenant_id`. `variant_group_values.group_id` references `variant_groups(id) ON DELETE CASCADE`.
- **Variants tab redesign:** Table shows Group Name | Values (pill badges) | Applied To (product names) | Actions (Apply / Edit / Delete). No more per-product variant list.
- **Apply preset flow:** "Apply" button opens dialog → select raw material → creates `DbVariant` rows (one per value, skip if already exists by name) + `DbInventory` rows for each new variant.
- **Delete group:** Removes affected `DbVariant` + `DbInventory` rows for any raw material that had variants matching the group's value names, then deletes group (cascade deletes values).
- **Edit group values:** Delete all existing values then re-insert — simpler than diffing.
- **Price adjustment removed from UI** (kept in DB for Android parity).
- **FormItem extended:** Added `useVariants: boolean` and `variantRows: VariantRow[]`. `VariantRow` = `{variantId, variantName, qty, costPerUnit}`.
- **Goods receiving toggle:** If product has variants, a "Use Variants" button appears. When active: product row hides qty/cost; variant sub-rows appear (indented with `↳ variantName` label + qty + total cost each). Toggle reseeds sub-rows from current product's variants.
- **Save receiving:** `useVariants=true` items produce one `DbGoodsReceivingItem` per variant row (skip empty qty rows). Each gets its own inventory effect.
- **Edit receiving restore:** Items grouped by `product_id`. If any item in the group has a non-empty `variant_id`, the group restores as `useVariants=true` with populated `variantRows`. Recomputes total cost from `qty × cost_per_unit × (1000 if g/mL)`.
- **New repo file:** `variant-groups.ts` — CRUD for both tables.
- **New i18n keys:** `addVariantGroup`, `editVariantGroup`, `variantGroupName`, `groupValues`, `addValue`, `noGroups`, `deleteGroupConfirm`, `groupBulkDelete`, `groupBulkDeleteConfirm`, `duplicateGroup`, `duplicateGroupValue`, `applyToProduct`, `applyPreset`, `appliedTo`, `variantGroupRowsPerPage`, `useVariants`, `noGroupValues`.
- **Files affected:** Supabase DB (migration), `types.ts`, `variant-groups.ts` (new repo), `repositories/index.ts`, `store.tsx`, `(erp)/layout.tsx`, `i18n.ts`, `PurchasingScreen.tsx`. TypeScript passes clean.

## 2026-03-19 — Purchasing: Raw Material Variants Tab + Goods Receiving Integration

- **Goal:** Manage variant presets for raw materials (e.g., T-Shirt sizes S/M/L/XL) and select variants when receiving goods. Each variant gets its own inventory row.
- **New Purchasing tab:** "Variants" — 5th tab alongside Goods Receiving, Vendors, Raw Materials, Categories.
- **Variant CRUD:** Add/Edit/Delete variants for raw materials. Form: parent product (select raw material) + variant name + price adjustment (default 0). Duplicate check: same name + same product.
- **Auto inventory row:** On variant creation, an inventory row `(product_id, variant_id)` with `current_qty: 0` is auto-created, inheriting the parent product's base unit.
- **Inventory cleanup:** On variant delete, the corresponding inventory row is removed via `deleteInventoryByProductVariant()`.
- **Bulk delete (OWNER only):** Checkbox column + select-all for current page. Each variant's inventory row cleaned up on delete.
- **Pagination/search/filter:** Same pattern as other tabs — page size chips (10/25/50), filter by raw material, search by variant name.
- **Goods receiving integration:** After selecting a raw material in the receiving form, if it has variants, a variant dropdown appears below the product select. `variantId` populates the form item. Resets on product change.
- **Variant name in receiving detail:** Expanded receiving row shows variant name in parentheses after product name (same pattern as InventoryScreen).
- **Inventory apply/reversal:** Already worked — `handleSaveReceiving` uses composite key `${product_id}|${variant_id}` for inventory lookups. Just needed `variantId` to be non-empty.
- **CASHIER role:** Delete/bulk-delete actions hidden (same pattern as other tabs).
- **No new DB table:** Uses existing `variants` Supabase table. Existing `DbVariant` type and variant repository functions sufficient.
- **New repo function:** `deleteInventoryByProductVariant(supabase, productId, variantId)` in `inventory.ts` — handles NULL/empty variant_id matching.
- **New i18n keys (14):** `variants`, `addVariant`, `editVariant`, `variantName`, `parentProduct`, `priceAdjustment`, `noVariants`, `deleteVariantConfirm`, `variantBulkDelete`, `variantBulkDeleteConfirm`, `duplicateVariant`, `selectVariant`, `variantRowsPerPage` (EN + ID).
- **Files affected:** `i18n.ts`, `inventory.ts` (repo), `PurchasingScreen.tsx`. TypeScript passes clean.

## 2026-03-19 — Cashier Session Flow Redesign (IMPLEMENTED)

- **Goal:** Full open/close cashier session lifecycle: POS locked until opened, initial balance set at open, dashboard shift filter, close writes to session record.
- **New DB table:** `cashier_sessions` — `id, tenant_id, user_id, opened_at (BIGINT), closed_at (BIGINT nullable), initial_balance, closing_balance, withdrawal_amount, match_status, mismatch_note, sync_status, updated_at`.
- **POS lock:** `currentSession = null` → show Open Cashier overlay (initial balance + PIN). On confirm → create `cashier_sessions` row + write `INITIAL_BALANCE` general_ledger entry → POS unlocks.
- **Saldo Awal removed from Settings:** Initial balance is now set exclusively via the Open Cashier dialog in PosScreen, not Settings.
- **Dashboard shift chip:** "Shift Aktif / Active Shift" chip filters stats + transactions to `session.opened_at → now`. Hidden when no active session.
- **Close Cashier updated:** Writes `closed_at`, `closing_balance`, `withdrawal_amount`, `match_status`, `mismatch_note` to `cashier_sessions` row. Then performs existing cash-reset steps. After close, `currentSession = null` → POS auto-locks.
- **Files affected:** `types.ts`, new `cashier-sessions.ts` repo, `store.tsx`, `(erp)/layout.tsx`, `PosScreen.tsx`, `DashboardScreen.tsx`, `SettingsScreen.tsx`, `i18n.ts`, `auth.ts` (new `verifyErpPinAction`), `erp.css`. DB migration applied; TypeScript passes clean.
- **PIN verification:** `verifyErpPinAction` server action in `auth.ts` — looks up `pin_hash/pin_salt` from `public.users` and uses the same `verifyPassword` helper as login. Called via dynamic import in PosScreen client component.
- **`currentSession` is derived:** computed as `state.cashierSessions.find(s => s.closed_at === null)` in both PosScreen and SettingsScreen (no extra state needed).
- **Dashboard `shift` period:** added as a 5th period type alongside today/month/year/custom. Uses `activeSession.opened_at` as the `from` boundary. Chip only rendered when `activeSession !== null`.
- **Settle debt session gate (2026-03-20):** "Lunasi" button in the Utang modal is disabled when `activeSession === null`. Tooltip shows `copy.settings.openCashier` text on hover. No new i18n key needed.

## 2026-03-20 — End of Day Report: Tarik Tunai row (IMPLEMENTED)

- **Goal:** Show Tarik Tunai (cash withdrawal amount) between Saldo Awal and Saldo Akhir in the close cashier report.
- **Where it appears:** Report dialog (`showCloseReport`) and downloaded HTML report. Not shown in the confirm dialog (`showCloseCashier`) since the withdrawal decision hasn't been made yet.
- **`frozenSummary` extended:** Added `withdrawalAmount: number | null` field. `setFrozenSummary` moved to after `withdrawalAmount` is determined inside `handleCashResetChoice` (was set before, now set with full data after withdrawal logic runs).
- **Label:** Reuses `copy.dashboard.cashWithdrawal` ("Cash Withdrawal" / "Tarik Tunai") — no new i18n key needed.
- **Condition:** Row only rendered when `withdrawalAmount !== null` (i.e. user chose "empty cash" and balance > 0).
- **Files affected:** `SettingsScreen.tsx` only. TypeScript passes clean.

## 2026-03-18 — ERP Settings: Close Cashier "empty cash" — correct ledger flow

- **Goal:** After "empty cash balance" on cashier close, both Saldo Kas (Dashboard) and Saldo Awal Saat Ini (Settings) must show Rp0.
- **Correct flow (3 steps):**
  1. Write `cash_withdrawals` row with `amount = closingBalance` (full physical cash taken out).
  2. Reset `INITIAL_BALANCE` to 0: delete existing entries, insert new entry with `amount: 0`.
  3. Write `WITHDRAWAL` ledger entry with `amount = -(closingBalance - originalInitialBalance)` i.e. only the sales portion. This way: `INITIAL_BALANCE(0) + SALE(x) - WITHDRAWAL(x) = 0`.
- **Key formula:** WITHDRAWAL amount = `closingBalance - currentInitialBalance` (sales-only). Not the full closing balance.
- **Edge case:** If `salesPortion <= 0` (only initial balance, no sales), skip the WITHDRAWAL entry — INITIAL_BALANCE reset to 0 is enough.
- **cash_withdrawals amount stays = full closingBalance** — this represents how much physical cash was actually taken out of the register, which includes the initial float + all sales.

## 2026-03-17 — ERP Settings: Close Cashier + Language switcher

### Close Cashier
- **Bug fixes**: `tx.total_amount` → `tx.total` (field doesn't exist; correct field is `total`). Closing balance now uses `calculateCashBalance(state.generalLedger)` (all-time, same formula as Dashboard Cash Balance card) instead of a today-only ledger filter.
- **"Close Cashier" section** visible to all roles (not owner-only). Button opens a confirm dialog.
- **Confirm dialog**: shows summary table (close time, cashier name, total transactions, opening/closing balance), payment method breakdown, and a Match/Doesn't Match toggle.
- If "Doesn't Match" is selected, a freetext note textarea appears.
- Confirm button disabled until match status is chosen.
- **Cash reset dialog**: shown between confirm and report. Displays closing balance and two options: (1) "Empty cash balance" — writes both a `cash_withdrawals` row (positive `amount` = cash taken out) and a `WITHDRAWAL` general_ledger entry (`amount = -currentBalance`). Both share the same `reason` string and `date`. Both dispatched via UPSERT so Dashboard + Cash Flow update immediately. Brings `calculateCashBalance` to exactly 0. (2) "Keep cash balance" — no action. After choice, report dialog opens.
- **Why WITHDRAWAL not delete**: deleting INITIAL_BALANCE entries only removes one part of the ledger; SALE entries remain and `calculateCashBalance` would still be non-zero. A negative WITHDRAWAL offsets the full balance cleanly and is auditable.
- **cash_withdrawals parity**: mirrors the Dashboard "Cash Withdrawal" flow — same table, same dispatch pattern (`cashWithdrawals` state key).
- **Report dialog**: opens after cash reset choice — shows the same data in printable monospace layout (`.erp-close-report-dialog`, `.erp-printable`). Two action buttons: Download (HTML file) and Print (`window.print()`).
- **Download** generates a standalone HTML file with embedded styles, named `kasir_report_YYYY-MM-DD.html`.
- **Print CSS**: `.erp-no-print` hides footer buttons; `.erp-close-report-dialog` renders borderless.
- Summary computed entirely from `state.transactions` + `state.generalLedger` filtered to today (midnight→now). Closing balance = SALE+INITIAL_BALANCE ledger − WITHDRAWAL ledger for today.
- New CSS: `.erp-close-report-table`, `.erp-close-report-section`, `.erp-close-report-total`, `.erp-close-match-row`, `.erp-close-match-box`, `.erp-close-match-value`, `.erp-close-report-dialog`, etc.
- New i18n keys in `settings`: `closeCashier`, `closeCashierTitle`, `closeCashierConfirmHint`, `closeCashierReport`, `closeTime`, `cashierInCharge`, `openingBalance`, `closingBalance`, `totalTransactions`, `paymentBreakdown`, `matchQuestion`, `matchYes`, `matchNo`, `mismatchNote`, `mismatchPlaceholder`, `closeCashierConfirmBtn`, `downloadReport`, `printReport` (EN + ID).

### Language switcher
- **"Language" section** in Settings visible to all roles.
- Two buttons: "Indonesia" and "English". Active locale highlighted with `erp-btn--primary`.
- Switching navigates via `router.push()` replacing `/{locale}/` in the current URL path.
- No new i18n keys needed beyond `language`/`languageHint`.

## 2026-03-17 — ERP Settings: payment method toggle — CASH can be disabled

- **Rule changed**: CASH is no longer "always on". Any non-UTANG method (CASH, QRIS, TRANSFER) can be toggled off.
- **Constraint**: at least 1 non-UTANG method must remain enabled. The last active non-UTANG toggle is auto-disabled (can't be turned off).
- **Visual hint**: when a toggle is the last non-UTANG method enabled, it shows `(min. 1 aktif / min. 1 required)` label next to it and the toggle is greyed out.
- **Guard logic**: computed inline in render via `wouldLeaveNoNonUtang = isEnabled && key !== "UTANG" && [...enabledMethods].filter(m => m !== "UTANG" && m !== key).length === 0`. Same check in `handleTogglePaymentMethod` as a safety net.
- **i18n**: `paymentMethodsHint` updated in both EN and ID to mention the 1-non-debt constraint.

## 2026-03-17 — ERP POS: cash calculator dialog + change dialog

- **Flow**: CASH confirm payment → cash calculator dialog → `handleCheckout()` → change dialog → Print Receipt / Skip.
- **Cash calculator dialog** (`.erp-dialog--calc`, 360px wide):
  - Screen section: shows Total (static), Cash Paid (updates live), Change (appears once paid entered; green if ≥0, red if negative).
  - Quick-amount chips: 4 smart round-up values computed from `cartTotal` (nearest 1k/5k/10k/50k/100k, deduped).
  - Numpad: 3×4 grid (7–9, 4–6, 1–3, C / 0 / ⌫). C clears, ⌫ removes last digit. Input stored as plain string in `cashPaid` state.
  - Confirm button disabled if `cashPaid` entered and `paidNum < cartTotal`. If `cashPaid` left blank, defaults to `cartTotal` on confirm (exact change = 0).
  - Cancel returns to checkout dialog (`setShowCheckout(true)`).
- **Change dialog** (`.erp-dialog--sm`): appears after successful `handleCheckout()` for CASH only. Shows paid amount row + large change amount block (`.erp-change-value`, 32px bold primary). Two full-width buttons: "Print Receipt" → opens receipt dialog; "New Transaction" → `handleNewTransaction()`.
- **Non-CASH flow unchanged**: QRIS/TRANSFER/UTANG skip the calculator and go directly to `handleCheckout()` → receipt as before.
- **Stock warning bypass**: stock re-confirm also routes to cash calc (not direct checkout) when payment is CASH.
- **Receipt unchanged**: cash paid/change rows still print on receipt if `cashPaid` was set.
- New states: `showCashCalc`, `showChangeDialog`.
- New CSS classes: `.erp-dialog--calc`, `.erp-calc-body`, `.erp-calc-screen`, `.erp-calc-screen-*`, `.erp-calc-quick`, `.erp-calc-quick-btn`, `.erp-calc-numpad`, `.erp-calc-key` (+`--clear`/`--back`), `.erp-change-paid-row`, `.erp-change-amount-block`, `.erp-change-label`, `.erp-change-value`.

## 2026-03-17 — ERP Products tab: CSV import, bulk delete, pagination, alphabetical sort, unit normalization, BOM unit mismatch guard, auto-create category, duplicate prevention

- **Sort**: `filteredProducts` useMemo now sorts purely alphabetically — category name (case-insensitive localeCompare, uncategorized → `\uFFFF` sorts last), then product name. Replaces previous sort-order-first logic.
- **Pagination**: `pagedProducts` slices `filteredProducts` by `prodPage × prodPageSize`. Page size chips (10/25/50) + ‹/› nav in `.erp-table-pagination`. Page + selection reset on search/filter/page-size change.
- **Bulk delete** (OWNER only): `selectedProdIds: Set<string>` + checkbox column (per-row + select-all for current page). `.erp-bulk-bar` → `showProdBulkConfirm` → `repo.deleteProduct` per id + DELETE dispatch. Selection clears after confirm.
- **Download Template**: generates `ayakasir_products_template.csv` (UTF-8 BOM) with columns: `name, category, price, description, active` + one example row.
- **Import CSV**: two-step flow — (1) parse → `prodImportPreview` dialog (`.erp-dialog--wide`); (2) confirm → save to Supabase. Uses `parseProdCsvLine()` (character-by-character). Header-name-based, order-independent. Duplicate detection case-insensitive vs existing MENU_ITEM names + within batch (`.erp-badge--danger`). New categories flagged with `.erp-badge--warning` "New" badge.
- **Auto-create category**: on import confirm, categories not in `catByName` (MENU type) are created via `repo.createCategory` + dispatched. Map rebuilt at confirm time.
- **Duplicate prevention (manual save)**: `handleSaveProduct` checks case-insensitive name collision vs existing MENU_ITEM products (excluding `editId`) before saving; alerts and returns if found.
- **BOM unit normalization**: `normalizeToBaseUnit(qty, fromUnit, toUnit)` helper — kg↔g (×/÷1000), L↔mL (×/÷1000), same unit → passthrough. Applied in `handleSaveProduct` before `setProductComponents`; stores normalized qty + inventory's base unit.
- **BOM unit mismatch warning**: if `normalizeToBaseUnit` returns `null` (incompatible families, e.g. g vs mL), BOM row is skipped with an alert. Prevents incorrect inventory deduction.
- **active field**: `"true"/"1"/"yes"` (case-insensitive) → true; empty → true (default); anything else → false.
- New i18n keys in `products`: `importCsv`, `downloadTemplate`, `importPreviewTitle`, `importPreviewHint`, `importConfirm`, `importDuplicate`, `importSuccess`, `importSkipped`, `importError`, `bulkDelete`, `bulkDeleteConfirm`, `rowsPerPage`, `importNewCategory`, `duplicateProduct` (EN + ID).

## 2026-03-16 — ERP Purchasing Raw Materials tab: CSV import, bulk delete, pagination, alphabetical sort, unit normalization, auto-create category

- **Sort**: `filteredRawMaterials` useMemo sorts by category name alphabetically first, then name alphabetically within — uses `state.categories` lookup for category name. Implemented via spread + `.sort()` at end of filter chain.
- **Pagination**: `pagedRawMaterials` + `rawTotalPages` useMemos. State: `rawPage`, `rawPageSize` (10/25/50). Page, selection reset on filter/search/category/page-size change.
- **Bulk delete** (OWNER only): `selectedRawIds` Set + select-all checkbox for current page. `.erp-bulk-bar` appears when rows checked → `showRawBulkConfirm` → `handleRawBulkDelete` calls `deleteGoodsReceivingItemsByProductId`, `deleteComponentsByProductId`, `deleteInventoryByProductId`, `deleteProduct` per id + dispatches DELETE.
- **Download Template**: generates `ayakasir_raw_materials_template.csv` (UTF-8 BOM) with columns: `name, category, unit, description` + one example row.
- **Import CSV**: two-step flow — (1) parse → `rawImportPreview` dialog; (2) confirm → save to Supabase. Uses `parseRawCsvLine()` (same character-by-character pattern). Duplicate detection case-insensitive vs existing raw materials + within batch.
- **Unit normalization**: `normalizeUnit()` maps common case variants (KG→kg, G→g, ML/ml→mL, l→L, pcs/pc→pcs) at parse time so preview and stored unit are always canonical.
- **Auto-create category**: if a CSV row has a `category` value that doesn't exist in `rawCategories`, it is created via `repo.createCategory` (RAW_MATERIAL type) at confirm time. `catByName` map rebuilt at confirm time (not parse time). New categories shown with "New" badge in preview.
- **Duplicate prevention**: case-insensitive check vs existing raw material names + within batch — flagged with "duplicate" badge, skipped on confirm. Same as manual add (already blocked in `handleSaveRaw`).
- New i18n keys in `purchasing`: `rawImportCsv`, `rawDownloadTemplate`, `rawImportPreviewTitle`, `rawImportPreviewHint`, `rawImportConfirm`, `rawImportDuplicate`, `rawImportSuccess`, `rawImportSkipped`, `rawImportError`, `rawBulkDelete`, `rawBulkDeleteConfirm`, `rawRowsPerPage`, `rawImportNewCategory` (EN + ID).

## 2026-03-16 — ERP Purchasing Categories tab: CSV import, bulk delete, pagination, alphabetical sort, delete options

- **Sort**: `sortedRawCategories` useMemo calls `.sort((a, b) => a.name.localeCompare(b.name))` — always alphabetical.
- **Pagination**: `pagedRawCategories` useMemo slices `sortedRawCategories` by `catPage × catPageSize`. Page size chips (10/25/50) + ‹/› nav. Page + selection reset on page-size change.
- **Bulk delete** (OWNER only): checkbox column (per-row + select-all for current page). `.erp-bulk-bar` appears when rows checked → `showCatBulkConfirm` → `handleCatBulkDelete` loops `deleteCategory` + dispatches DELETE per id.
- **Download Template**: generates `ayakasir_raw_categories_template.csv` (UTF-8 BOM) with columns: `name, sort_order` + one example row.
- **Import CSV**: two-step flow — (1) parse → `catImportPreview` dialog; (2) confirm → save to Supabase. Uses `parseCatCsvLine()` (same pattern). Duplicate detection case-insensitive vs existing categories + within batch. New keys: `catImportSuccess`, `catImportPreviewHint`.
- **Delete with options**: `handleDeleteRawCat` is now synchronous — sets `deleteCatTarget { id, name, rawMaterialCount }`. Dialog shows two buttons: (1) delete category + all raw materials; (2) delete category only (patches `category_id → null` on raw materials). New i18n keys: `deleteCategoryTitle`, `deleteCategoryWithRaws`, `deleteCategoryKeepRaws`, `deleteCategoryRawCount`.
- **Duplicate prevention on import**: case-insensitive check vs existing raw categories and within batch — flagged with "duplicate" badge, skipped on confirm.
- **Duplicate prevention on manual add/edit**: existing check in `handleSaveRawCat` already blocks duplicate names.
- New i18n keys in `purchasing`: `catImportSuccess`, `catImportPreviewHint`, `catBulkDeleteConfirm`, `deleteCategoryTitle`, `deleteCategoryWithRaws`, `deleteCategoryKeepRaws`, `deleteCategoryRawCount` (EN + ID).

## 2026-03-16 — ERP Purchasing Vendors: CSV import, bulk delete, pagination, alphabetical sort

- **Sort**: `sortedVendors` useMemo calls `.sort((a, b) => a.name.localeCompare(b.name))` — always alphabetical.
- **Pagination**: `pagedVendors` useMemo slices `sortedVendors` by `vendorPage × vendorPageSize`. Page size chips (10/25/50) + ‹/› nav. Page + selection reset on page-size change.
- **Bulk delete** (OWNER only): checkbox column (per-row + select-all for current page). `.erp-bulk-bar` appears when rows checked → `showVendorBulkConfirm` → deletes via `deleteVendor` loop + dispatches DELETE per id.
- **Download Template**: generates `ayakasir_vendors_template.csv` (UTF-8 BOM) with columns: `name, phone, address` + one example row.
- **Import CSV**: two-step flow — (1) parse → preview dialog; (2) confirm → save to Supabase. Uses `parseVendorCsvLine()` character-by-character parser (same pattern as customers). Duplicate detection by name (case-insensitive), checked against existing vendors + within the batch itself.
- **Phone normalization**: `normalizeVendorPhone()` — if number starts with digit 1–9 (not 0), prepend `0`. e.g. `856115060123` → `0856115060123`. Applied at parse time so preview shows corrected number.
- **Duplicate prevention on import**: rows with names matching existing vendors OR duplicate within the same CSV are flagged with a "duplicate" badge and skipped on confirm. Not possible to import vendors with an existing name.
- **Duplicate prevention on manual add**: existing case-insensitive check in `handleSaveVendor` already blocks duplicate names.
- New i18n keys in `purchasing`: `importCsv`, `downloadTemplate`, `importPreviewTitle`, `importPreviewHint`, `importConfirm`, `importDuplicate`, `importSuccess`, `importSkipped`, `importError`, `bulkDelete`, `bulkDeleteConfirm`, `rowsPerPage` (EN + ID).
- CSS reuses: `.erp-bulk-bar`, `.erp-import-msg`, `.erp-dialog--wide`, `.erp-chip`, `.erp-table-row--selected`, `.erp-table-pagination`, `.erp-badge--danger` — all already defined in `erp.css`.

## 2026-03-16 — ERP Customers: bulk delete, pagination, category delete options, alphabetical sort

- **Sort**: `filteredCustomers` useMemo now calls `.sort((a, b) => a.name.localeCompare(b.name))` — always alphabetical regardless of category/search filter.
- **Pagination**: `pagedCustomers` useMemo slices `filteredCustomers` by `page × pageSize`. Page size chips (10/25/50) + ‹/› nav in `.erp-table-pagination`. Page, selection, and pageSize all reset on filter/search/category change.
- **Bulk delete** (OWNER only): checkbox column in table (per-row + select-all for current page). When any rows are checked, `.erp-bulk-bar` appears with count + "Delete Selected" button → confirm dialog → deletes all selected via `deleteCustomer` loop + dispatches DELETE per id. Detail panel clears if selected customer is among deleted.
- **Category delete with options**: delete button now passes `customerCount` (count of customers with that `category_id`) to `deleteTarget`. Delete dialog shows two action buttons when `customerCount > 0`: (1) "Delete category and all its customers" — deletes customers first then category; (2) "Delete category only" — patches each customer's `category_id` to null via `updateCustomer` then deletes category. When `customerCount === 0`, only the keep-customers button is shown.
- New i18n keys in `customers`: `bulkDelete`, `bulkDeleteConfirm`, `rowsPerPage`, `deleteCategoryTitle`, `deleteCategoryWithCustomers`, `deleteCategoryKeepCustomers`, `deleteCategoryCustomerCount` (EN + ID).
- New i18n key in `common`: `selected` (EN + ID).
- New CSS: `.erp-bulk-bar` in `erp.css`.

## 2026-03-16 — ERP Customers: CSV import + preview + template download

- **Download Template** button generates `ayakasir_customers_template.csv` (UTF-8 BOM for Excel) with columns: `name, phone, email, birthday, gender, category, notes` + one example row.
- **Import CSV** is a two-step flow: (1) parse file → show preview dialog; (2) user confirms → save to Supabase.
- **Root bug fixed**: original regex-based CSV parser `("(?:[^"]|"")*"|[^,]*)` produced phantom empty matches between fields, shifting every column after `name` by +1 (phone→email, birthday→notes, etc.). Replaced with a proper character-by-character `parseCsvLine()` function that handles quoted fields, embedded commas, and escaped `""` quotes correctly.
- **Preview dialog** (`.erp-dialog--wide`, 860px): shows a full table of parsed rows before any data is written. Rows with category names not yet in the tenant's category list are flagged with a "New" badge (`.erp-badge--warning`).
- **Auto-create category**: on confirm, categories that don't exist are created via `createCustomerCategory` and dispatched to ERP state; the new `category_id` is then used for the customer row. A live `catByName` map is rebuilt at confirm time (not at parse time) to avoid stale state.
- Column mapping is **header-name-based and order-independent** — any column order in the CSV works.
- `birthday`: ISO date string `YYYY-MM-DD` → `new Date().getTime()` milliseconds.
- `gender`: `MALE/FEMALE/OTHER` (case-insensitive) → stored as-is; invalid → null.
- Rows with empty `name` are silently skipped during parse (not shown in preview).
- After confirm, a dismissable `.erp-import-msg` banner shows success count or error.
- New i18n keys in `customers`: `importCsv`, `downloadTemplate`, `importSuccess`, `importError`, `importInvalidRow`, `importPreviewTitle`, `importPreviewHint`, `importConfirm`, `importNewCategory` (EN + ID).
- New CSS: `.erp-import-msg` / `--ok` / `--err`, `.erp-dialog--wide` in `erp.css`.

## 2026-03-16 — ERP Inventory: avg_cogs formula per movement type (mirrors Android)

- `computeNewAvgCogs` in `InventoryScreen.tsx` now handles 3 types differently:
  - `adjustment_in` (bonus/found stock, no cost): `Math.floor((oldAvg × oldQty) / newQty)` — dilutes cost over more units; floor prevents inflation.
  - `adjustment_out` (stock count correction): `oldAvg` unchanged — per-unit cost is unaffected, stock value drops proportionally with qty. **Mirrors Android `InventoryRepository.kt` line 96-97.**
  - `waste` (expired/damaged — cost already incurred): `Math.ceil((oldAvg × oldQty) / newQty)` — total cost preserved and absorbed by remaining units → higher HPP. ceil prevents rounding below original total.
- Android source confirmed at `repos/ayakasir/.../InventoryRepository.kt`: `adjustment_out`/`waste` both used `currentAvgCogs` unchanged (no recalc). Web ERP now differentiates: `waste` absorbs cost, `adjustment_out` preserves per-unit avg.
- Call site no longer double-wraps with `Math.round` — `computeNewAvgCogs` returns integers directly.

## 2026-03-16 — ERP Purchasing: pre-save warning for uncategorized raw material

- On **new raw material** creation only (not on edit), `handleSaveRaw` checks if `rawCategory` is empty.
- If empty, a `.erp-dialog--sm` warning dialog (`showRawWarning` state) appears with `copy.purchasing.warnRawNoCategory`.
- User can Cancel (stay in form) or Save Anyway (calls `handleSaveRaw(true)` to skip the check).
- `handleSaveRaw` now accepts `skipWarnings = false` param — warning only fires when `!editRawId && !skipWarnings && !rawCategory`.
- New i18n keys in `purchasing`: `warnRawTitle`, `warnRawNoCategory` in EN + ID in `src/components/ayakasir/erp/i18n.ts`.

## 2026-03-16 — ERP Products: pre-save warning for uncategorized / no BOM

- On **new product** creation only (not on edit), `handleSaveProduct` checks two conditions before proceeding:
  1. `!formCategory` → warns category is not selected (product will be Uncategorized).
  2. `formComponents.length === 0` → warns BOM is empty (inventory won't auto-deduct on sale).
- If any warnings exist, a `.erp-dialog--sm` warning dialog appears listing them. User can Cancel (stay in form) or Save Anyway (calls `handleSaveProduct(true)` to skip checks).
- `handleSaveProduct` now accepts `skipWarnings = false` param — warnings only fire when `!editId && !skipWarnings`.
- New i18n keys in `products`: `warnProductTitle`, `warnNoCategory`, `warnNoBom` in EN + ID in `src/components/ayakasir/erp/i18n.ts`.

## 2026-03-16 — ERP POS: out-of-stock warning + re-confirm before checkout

- `outOfStockWarnings` useMemo in `PosScreen.tsx` mirrors the `handleCheckout` BOM-deduction logic to detect insufficient stock *before* payment is confirmed.
- For BOM items: accumulates required base-unit qty per raw material across all cart items; warns if `currentBase < requiredBase`.
- For non-BOM items: compares cart qty directly against `inventory.current_qty`.
- Warning banner (`.erp-stock-warning`) renders inside the checkout dialog body, above the total, listing affected item/raw-material names.
- When warnings exist, "Confirm Payment" button opens a `showStockConfirm` re-confirm dialog (`.erp-dialog--sm`) before calling `handleCheckout`. No warnings → calls `handleCheckout` directly.
- Re-confirm dialog shows `pos.stockConfirmProceed` message + Cancel / Confirm buttons.
- New i18n keys `pos.stockWarning` + `pos.stockConfirmProceed` in EN + ID in `src/components/ayakasir/erp/i18n.ts`.
- CSS `.erp-stock-warning` added to `erp.css` (amber background, soft warning — not a hard block).

## 2026-03-16 — ERP POS: discount decimal handling fix

- `discount_value` in `transaction_items` is BIGINT (matches Android `CartItem.discountValue: Long`) — decimals cause `22P02`.
- Fix: `Math.round(item.discountValue)` when writing `discount_value` to DB in `handleCheckout`. Cart state keeps the float for accurate `discountPerUnit` calculation via `calcDiscountPerUnit`.
- AMOUNT mode: blocked decimal input in the discount dialog via `onChange` guard (`v.includes(".")` → no-op) + `step="1"`, `inputMode="numeric"`.
- PERCENT mode: allows decimal input (`step="0.01"`, `inputMode="decimal"`); stored as rounded integer in DB. Display in cart shows the pre-rounded float while editing, but stored as integer.

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

## 2026-03-17 — AyaKasir Monetization MVP: Plans, Limits, Pricing Page

### Supabase Schema
- Added 3 columns to `tenants` table: `plan TEXT NOT NULL DEFAULT 'PERINTIS'`, `plan_started_at BIGINT`, `plan_expires_at BIGINT`.
- `TenantPlan` type: `"PERINTIS" | "TUMBUH" | "MAPAN"` exported from `src/lib/supabase/types.ts`.
- All existing tenants default to `PERINTIS`. No data migration needed.

### Plan Constants
- New file `src/lib/ayakasir-plan.ts` — defines `PlanLimits` interface and `PLAN_LIMITS` record.
- Limits per plan:

| Limit | Perintis | Tumbuh | Mapan |
|-------|----------|--------|-------|
| maxProducts (MENU_ITEM) | 100 | 300 | ∞ |
| maxCustomers | 100 | 300 | ∞ |
| maxRawMaterials | 100 | 300 | ∞ |
| maxTransactionsPerMonth | 1000 | 6000 | ∞ |
| maxStaff (excl. owner) | 1 | 2 | ∞ |
| allowUtang | true | true | true |

- `getPlanLimits(plan)` helper returns the limits for a given plan.

### usePlanLimits Hook
- New file `src/components/ayakasir/erp/usePlanLimits.ts`.
- Reads `state.restaurant?.plan` from ERP context; handles plan expiry (if `plan_expires_at` is past, effective plan = `PERINTIS`).
- Counts products (MENU_ITEM), customers, raw materials, monthly transactions, staff from state.
- Returns `{ plan, planExpired, limits, counts, canAddProduct, canAddCustomer, canAddRawMaterial, canTransact, canAddStaff, canUseUtang }`.

### Limit Enforcement (client-side)
- **PosScreen**: transaction limit check before `handleCheckout`; UTANG filtered from payment methods if `!canUseUtang`.
- **ProductsScreen**: product count limit on `handleSaveProduct` (new only); "Add Product" button disabled with count badge `(X/100)`.
- **PurchasingScreen**: raw material count limit on `handleSaveRaw` (new only); "Add Raw Material" button disabled with count badge.
- **CustomersScreen**: customer count limit on `handleSaveCustomer` (new only); "Add Customer" button disabled with count badge.
- **SettingsScreen**: staff count limit on `handleSaveUser` (new CASHIER only); "Add User" button disabled with count badge; UTANG toggle hidden if `!canUseUtang`.

### Plan Info Section in Settings
- Owner-only "Paket Langganan" / "Subscription Plan" section at top of SettingsScreen.
- Shows current plan badge (colored: Perintis=gray/muted, Tumbuh=blue/info, Mapan=green/success).
- Usage table: Products, Customers, Raw Materials, Transactions this month, Staff — each showing `current / max`.
- Shows plan expiry date if applicable; red warning if plan expired.

### i18n
- New `plan` section in `ErpCopy` interface + EN/ID data: `planSection`, `currentPlan`, `usage`, `validUntil`, `planExpired`, plan names, limit labels, `limitReached`, `unlimited`.

### Pricing Page (Landing)
- New `pricing` section in `AyaKasirCopy` type + EN/ID data in `src/lib/ayakasir-content.ts`.
- 3-column pricing grid on landing page (between Metrics and Simulator CTA sections).
- Tumbuh highlighted as "Paling Populer" with blue border + badge + "Coba Gratis 3 Bulan!" promo tag.
- Mapan CTA links to WhatsApp. Perintis and Tumbuh CTA link to `/app/register`.
- Branch features listed with "Coming Soon" / "Segera Hadir" badge (branch support not built yet).
- CSS: `.ayakasir-pricing-*` classes in `globals.css`. Responsive: stacks to 1-col below 900px with Tumbuh card first.

### Registration
- `registerErpAction` in `auth.ts` now explicitly sets `plan: "PERINTIS"` on tenant insert.

### What's NOT Built (Deferred)
- Upgrade flow (no WhatsApp CTA or upgrade dialog in-app yet).
- Payment gateway integration.
- Report / CSV export / CSV import gating.
- Server-side limit enforcement (RPC functions).
- Multi-branch support.
- Plan management admin panel.
- Automatic plan expiry downgrade handling.

## 2026-03-18 — ERP Inventory: low-stock banner + editable min_qty in adjust dialog

- **Low-stock banner**: amber banner above the page header listing all items below their `min_qty`. Computed via `lowStockItems` useMemo filtering `inventoryRows` where `min_qty > 0 && current_qty < min_qty`. Shows count + comma-separated product names. CSS: `.erp-low-stock-banner` in `erp.css`.
- **Editable min_qty**: adjust stock dialog now includes a "Min Stock" input (`minQtyInput` state). Initialized from `convertToDisplayUnit(inv.min_qty, inv.unit)` when dialog opens. Saved via new `updateMinQty()` repo function only if value changed.
- **`updateMinQty()`**: new function in `src/lib/supabase/repositories/inventory.ts` — updates `min_qty`, `updated_at`, `sync_status` on the inventory row, handling NULL/empty `variant_id` the same way as `adjustInventory`.
- **Unit conversion**: `minQtyInput` is entered in the display unit (kg/L) and converted to base (g/mL) via `Math.round(value * toBaseConversion(unit))` before saving — same pattern as `newQty`.
- New i18n keys in `inventory`: `setMinStock`, `lowStockAlert`, `lowStockCount` (function) in EN + ID.

## 2026-03-18 — ERP Purchasing: inventory unit stored as base unit (mL/g) not display unit (L/kg)

- **Bug**: When creating a new raw material with unit `L` (or `kg`), the initial inventory row was stored with `unit: "L"` (display unit) instead of `unit: "mL"` (base unit). This caused `unit` to be `"L"` in Supabase while `current_qty` was stored in mL — a mismatch.
- **Root cause**: Two places in `handleSaveRaw` (manual create) and the CSV import confirm loop both passed `rawUnit`/`row.unit` directly to `upsertInventory` without converting to base unit first.
- **Fix**: Convert display unit to base unit before writing the initial inventory row: `rawUnit === "L" ? "mL" : rawUnit === "kg" ? "g" : rawUnit`.
- **Cascading fix 1**: `openEditRaw` reads `inv.unit` (now base unit) and must convert back to display unit before setting `rawUnit` form state (`"g"→"kg"`, `"mL"→"L"`).
- **Cascading fix 2**: Receiving form auto-populate (`updateRecItem` when `field === "productId"`) also reads `inv.unit` and must convert base→display before setting `recItem.unit`.
- **Rule**: `inventory.unit` in Supabase is always the base unit (`g`/`mL`/`pcs`). UI forms that let users enter quantities (receiving, raw material form) use display units (`kg`/`L`) and convert on save via `toBaseQty`.

## 2026-03-18 — Plan follow-up: Perintis UTANG access + Tumbuh price change

### Perintis UTANG Access
- `allowUtang` changed from `false` to `true` for PERINTIS in `src/lib/ayakasir-plan.ts`.
- UTANG payment method is now available on all plans (Perintis, Tumbuh, Mapan). No plan-based gating for UTANG anymore.
- `canUseUtang` in `usePlanLimits` still exists and returns `true` for all plans — no code removal needed in PosScreen/SettingsScreen since the boolean is now always `true`.

### Tumbuh Price Update
- Tumbuh price changed from Rp29,000 to Rp29,900 in both EN and ID pricing copy (`src/lib/ayakasir-content.ts`).

### Pricing Copy Updates
- Perintis payment methods updated in both EN ("Payment: Cash, QRIS, Transfer, Debt (Utang)") and ID ("Pembayaran: Tunai, QRIS, Transfer, Utang") in `src/lib/ayakasir-content.ts`.

## 2026-03-19 — Products: Preset Varian Integration + Variant-Aware BOM

- **Goal:** Rename "Varian" tab to "Preset Varian", integrate variant group presets from Purchasing into Products, and make BOM variant-aware so each product variant deducts from the correct raw material variant.
- **Tab rename:** "Variants" → "Preset Variants" (EN) / "Varian" → "Preset Varian" (ID). Tab now shows `state.variantGroups` table (name, values as badges, applied-to products) instead of the old per-name variant list.
- **Old variant name form removed:** The localStorage-backed variant name template system (`showVariantNameForm`, `editVariantNameKey`, `variantNameTemplates`, `localStorageKey`) is removed. Variant names now derive from `state.variantGroupValues` + existing DB `variants`.
- **Apply Preset in product form:** Variants section header gains a preset selector dropdown (`<select>` from `state.variantGroups`). Selecting a group auto-populates `formVariants` from its group values, preserving existing `price_adjustment` for matching names.
- **`productPresetGroupId` memo:** Determines which variant group (if any) the product's current variants belong to, by checking if all `formVariants` names match a group's values.
- **Variant-aware BOM:** `FormComponent` extended with `component_variant_id: string`. When a raw material has variants matching the product's preset group (`rawHasMatchingVariants()`), a variant `<select>` appears in the BOM row. Allows mapping e.g. "T-shirt Raw (S)" variant to the "S" BOM component.
- **Save:** `handleSaveProduct` now passes `component_variant_id` to `repo.setProductComponents`. Previously always `""`.
- **POS deduction updated (outOfStockWarnings + handleCheckout):** BOM components with `component_variant_id` are only deducted when the sold item's variant name matches the component's raw material variant name (case-insensitive). Shared components (no variant) deduct for all variants. Inventory keys use `productId__variantId` composite to avoid cross-variant collisions.
- **No DB migration needed:** `component_variant_id TEXT NOT NULL DEFAULT ''` already exists on `product_components` table.
- **`findInv` bug (follow-up fix):** Original `!i.variant_id || i.variant_id === variantId` incorrectly matched the base row (variant_id=null) when searching for a specific variantId — null is falsy, so `!null = true` always matched first. Fixed: when `variantId` is non-empty, use exact match `i.variant_id === variantId`; when empty, use `!i.variant_id || i.variant_id === ""`.
- **Files affected:** `ProductsScreen.tsx`, `PosScreen.tsx`, `i18n.ts`. TypeScript passes clean.
- **New i18n keys in `products`:** `applyPreset`, `selectPreset`, `noPresets`, `presetValues`, `presetAppliedTo`, `selectComponentVariant`, `bomPerVariant` (EN + ID).

## 2026-03-19 — Settings: Laporan Kasir fixes (Saldo Awal/Akhir + Total Penjualan)

- **Bugs fixed:**
  1. Saldo Awal showed 0 in Laporan Kasir (report dialog after close).
  2. Saldo Akhir showed 0 in Laporan Kasir.
  3. Total Penjualan (sum of all payment methods) was missing from the report.

- **Root cause:** The report dialog (`showCloseReport`) was reading `closeCashierSummary` which is a live `useMemo`. After `handleCashResetChoice(true)` runs, it mutates the ledger (resets INITIAL_BALANCE to 0), causing `closeCashierSummary` to recalculate with stale/zeroed data by the time the report renders.

- **Fix:** Added `frozenSummary` state (typed explicitly). In `handleCashResetChoice`, call `setFrozenSummary(closeCashierSummary)` *before* any ledger mutations. Both the report dialog JSX and `handleDownloadReport` use `frozenSummary ?? closeCashierSummary`.

- **Total Penjualan:** Added `totalSales` field to `closeCashierSummary` (sum of all `sessionTx.total`). Rendered as a bold total row at the bottom of the Rincian Pembayaran section in both the confirm dialog and the report dialog.

- **New i18n key:** `settings.totalSales` (EN: "Total Sales", ID: "Total Penjualan").

- **Files affected:** `SettingsScreen.tsx`, `i18n.ts`. TypeScript passes clean.

## 2026-03-23 - Cross-Device Sync Lag (Web <-> Mobile) Requires Manual Refresh

- Observed symptom: transactions/activities created on one client are not reflected on the other client until manual refresh/pull.
- Architecture reality: both clients rely on Supabase Realtime for live cross-device updates.
  - Web: `src/lib/supabase/realtime.ts` updates ERP context state through handlers in `src/components/ayakasir/erp/store.tsx`.
  - Mobile: `repos/ayakasir/app/src/main/java/com/ayakasir/app/core/sync/RealtimeManager.kt` subscribes and upserts into Room.
- Primary risk point: realtime subscription health is not observed explicitly on either side.
  - Web calls `channel.subscribe()` without status/error callback handling.
  - Mobile calls `ch.subscribe()` without status/error callback handling.
  - If subscription is unauthorized/disconnected/misconfigured (RLS/publication), both apps silently degrade to stale views.
- Why refresh fixes it:
  - Web refresh reloads SSR data in `(erp)/layout.tsx` via direct Supabase selects.
  - Mobile pull-to-refresh calls `SyncManager.pullAllFromSupabase(tenantId)`.
- Secondary gap: web has no active reconciliation loop while the page stays open (initial load + realtime only). If realtime fails, stale state persists until full page refresh.
- Direction: add realtime status logging/monitoring plus fallback reconcile pull (window focus and interval) so sync remains resilient when websocket/realtime is unhealthy.

## 2026-03-23 - Supabase Realtime Backend Health Check (Project `tlkykpcznaieulbwkapc`)

- Diagnostic method: direct websocket handshake to `wss://<project-ref>.supabase.co/realtime/v1/websocket` and manual Phoenix `phx_join` frames (with anon JWT).
- Result: Realtime join fails with:
  - `UnableToConnectToProject: Realtime was unable to connect to the project database`
- This indicates infra-level Realtime-to-DB connectivity failure on Supabase side/project config, not only app code wiring.
- Impact: web and mobile subscriptions may initialize but will not receive postgres change streams, forcing manual refresh/pull behavior.
- Note: MCP endpoint exists in `.vscode/mcp.json`, but from shell it returns `401` without OAuth access token, so project logs/policies/publication metadata could not be read through MCP in this environment.

## 2026-03-23 - Supabase MCP Deep Check (Logs + RLS + Publication)

- Access method: Supabase MCP authenticated with `SUPABASE_ACCESS_TOKEN` and project ref `tlkykpcznaieulbwkapc`.
- Realtime logs showed intermittent DB connectivity:
  - Earlier entries: `UnableToConnectToProject: Realtime was unable to connect to the project database`.
  - Latest entries: successful reconnect and `Subscribed to PostgreSQL` with replication slot started.
- Manual websocket diagnostic (`phx_join`) also confirmed this pattern:
  - Initially failed with `UnableToConnectToProject`.
  - Retest succeeded with `phx_reply status=ok` and `system: Subscribed to PostgreSQL`.
- Publication status (`pg_publication_tables`) for `supabase_realtime` is incomplete for expected ERP tables:
  - Missing: `cashier_sessions`, `customer_categories`, `customers`, `inventory_movements`, `variant_groups`, `variant_group_values`.
  - Present for transaction pipeline: `transactions`, `transaction_items`, `general_ledger`, `inventory`, `goods_receiving`, `goods_receiving_items`, `cash_withdrawals`, `products`, `variants`, `tenants`, `users`.
- RLS status:
  - RLS is enabled on ERP tables, but policies are broadly permissive (`Allow all ...` with `USING (true)` / role `public`), effectively bypassing tenant isolation.
  - Security advisor flags these as `rls_policy_always_true` warnings.
- Operational note:
  - `pg_stat_activity` shows active/idle realtime backend processes (`realtime_replication_connection`, `realtime_subscription_checker`, etc.) when healthy.

## 2026-03-23 — RLS Security Audit: "Allow All" Policies Are Critical Vulnerability

- **Finding:** All 20 public tables have RLS enabled but each has a single `PERMISSIVE` policy: `"Allow all on {table}"` with `qual = true`, `roles = {public}`, `cmd = ALL`. This means RLS is effectively disabled.
- **Impact (P0/Critical):**
  - The anon key (publicly visible in browser JS bundle) grants unrestricted SELECT/INSERT/UPDATE/DELETE on every table.
  - The `users` table exposes `password_hash`, `password_salt`, `pin_hash`, `pin_salt`, `email` — full credential dump risk.
  - Any tenant's financial data (transactions, ledger, inventory, cash) is readable and writable by anyone.
  - No tenant isolation exists at the database level.
- **Blocker for tenant-scoped RLS:** The ERP uses custom signed-cookie auth (`erp-auth.ts`), not Supabase Auth sessions. Standard `auth.uid()`-based RLS policies won't work with the current ERP client because the browser Supabase client has no Supabase Auth session. Options:
  - (a) Switch ERP auth to Supabase Auth sessions (significant refactor — registration already uses `supabase.auth.signUp()`).
  - (b) Use service role key server-side only, remove direct browser-to-Supabase calls, proxy all writes through server actions.
  - (c) Hybrid: mint a Supabase Auth session at ERP login alongside the cookie, so the browser client carries `auth.uid()`.
- **Mobile app:** Android app presumably uses Supabase Auth directly — tenant-scoped RLS with `auth.uid()` should work there without changes.
- **Recommended order:** (1) Restrict `users` table immediately. (2) Implement tenant-scoped RLS on all tables. (3) Resolve ERP auth architecture.

## 2026-03-23 — Scalability Analysis: 1000 Concurrent ERP Users (by Claude)

- **Critical: SSR loads ALL data** — `(erp)/layout.tsx` fires 19 parallel `SELECT *` queries per page load (no time/pagination filters). At 1000 users, this means 19,000 concurrent Supabase queries. Fix: paginate by date (e.g., last 30 days) and lazy-load older data.
- **Critical: Supabase Realtime limits** — each user opens 1 channel with ~19 table subscriptions. Supabase Free/Pro supports 200-500 concurrent connections; 1000 users will exceed this. Fix: upgrade to Team/Enterprise or self-host Supabase.
- **Critical: No data pagination in state** — all transactions, ledger entries, inventory movements loaded into React state as full arrays. Busy tenants could hold 10k+ rows in browser memory per user.
- **Moderate: No caching layer** — no Redis, no ISR, no `Cache-Control`. Every page load hits Supabase directly. Landing page metrics also query Supabase on every visitor.
- **Moderate: No documented DB indexes** — 19 queries all filter by `tenant_id`. Missing indexes degrade linearly with total rows.
- **Moderate: Dual Supabase client instances** — `store.tsx` and `realtime.ts` each create a separate `createBrowserClient()` per user.
- **Low: Middleware JWT verify per request** — `verifyErpSessionToken` is fast (HS256), but adds CPU at scale.
- **Low: Single Vercel region** — if not deployed to `sin1` (Singapore), Indonesian users get latency.
- **Already good:** tenant-scoped realtime filters, stateless JWT auth, client-side state after initial load, Vercel CDN for static assets.
- **Recommendations (priority):** (1) Paginate SSR data. (2) Upgrade Supabase plan for realtime. (3) Add `tenant_id` + compound indexes. (4) Cache landing page metrics with ISR. (5) Use PgBouncer connection string server-side. (6) Deploy to `sin1` region.

## 2026-03-23 — Scalability Revalidation: 1000 Concurrent ERP Users (by Codex)

- **Critical: ERP bootstrap fanout is still high** — `(erp)/layout.tsx` performs 2 prefetch queries (`users`, `tenants`) plus 19 parallel table reads in `fetchErpData` (all `SELECT *`). At 1000 simultaneous cold loads, this is ~21,000 DB queries at once.
- **Critical: full-dataset loading** — no server-side pagination/date window for heavy tables (`transactions`, `transaction_items`, `general_ledger`, `inventory_movements`, etc.). Busy tenants will push large payloads, slower TTFB, and higher browser memory usage.
- **High: realtime scales linearly with users/tabs** — each open ERP tab creates 1 realtime channel and registers 19 Postgres change listeners (18 tenant tables + `tenants`). 1000 concurrent users means roughly 1000 live websocket clients for ERP alone.
- **High: realtime health is not monitored** — `channel.subscribe()` is called without status/error callback and there is no periodic reconciliation pull while tab stays open. If realtime degrades, clients can stay stale until manual refresh.
- **Moderate: two browser Supabase clients per ERP tab** — one in `store.tsx` and one in `realtime.ts`; increases per-tab resource usage.
- **Moderate: index posture is unknown in this repo** — code filters heavily by `tenant_id`, but no Supabase SQL migration/index files are present in this repository to confirm supporting indexes.
- **Correction from prior note:** AyaKasir landing metrics are now ISR-cached (`src/app/ayakasir/[locale]/(marketing)/page.tsx` has `revalidate = 3600`), so marketing traffic is not a per-request DB hot path.
- **Bottom line:** 1000 concurrently online users are risky with current ERP bootstrap and realtime design; likely acceptable only for low-activity tenants and controlled concurrency.
- **Priority improvements:** (1) Paginate/window initial ERP fetch by date. (2) Add on-demand lazy loading for history tables. (3) Add realtime subscribe status handling + fallback reconcile on focus/interval. (4) Verify/add `tenant_id` and common sort/filter indexes in Supabase. (5) Stress-test with realistic tenant sizes before production 1000-user target.

## 2026-03-23 — ERP Layout: Pagination Info Relocated to Filter Bar Row

- **Products screen:** `erp-table-pagination-info` (rows-per-page chips + count) moved from bottom `erp-table-pagination` to a flex row above the search bar, right-aligned parallel with the `erp-filter-bar` category chips.
- **Customers screen:** Same pattern — rows-per-page chips + count moved to a flex row above the search bar, right-aligned parallel with the category `erp-filter-bar`. Bottom `erp-table-pagination` now contains only the prev/next nav buttons (rendered only when `totalPages > 1`).
- Both use `display:flex; justify-content:space-between` wrapper to keep chips left and pagination info right.

## 2026-03-24 - Inventory Adjustments: kg<->g Precision + "Stok Berkurang" Valuation Rule

- **File:** `src/components/ayakasir/erp/screens/InventoryScreen.tsx`
- **Fix 1 (unit conversion precision):** `toStoredQty()` no longer uses `Math.round(...)`. It now keeps decimal precision (`toFixed(6)`), so adjustments entered in toggled units are preserved accurately (example: `1 kg -> 800 g` saves as `0.8 kg`, not `1 kg`; `1 kg -> 1500 g` saves as `1.5 kg`, not `2 kg`).
- **Fix 2 (valuation behavior):** `computeNewAvgCogs()` now treats `adjustment_out` the same as `waste` for HPP recalculation: `ceil((oldAvg * oldQty) / newQty)`. This preserves total stock cost in remaining units (Nilai Stok not dropped by `Stok Berkurang`) and increases HPP Rata-rata accordingly.
- **Rule update:** On inventory stock reduction adjustments (`adjustment_out` and `waste`), preserve historical total cost in the remaining stock by increasing `avg_cogs` rather than keeping it flat.

## 2026-03-24 - Purchasing Receiving: Unit Toggle on Qty Label + Safe Mixed-Unit HPP Math

- **Files:** `src/components/ayakasir/erp/screens/PurchasingScreen.tsx`, `src/app/ayakasir/[locale]/app/erp.css`
- **UX fix:** In Tambah/Edit Penerimaan, `erp-bom-unit-label` on receiving qty now acts as a quick unit switch for convertible pairs only:
  - `g <-> kg`
  - `mL <-> L`
- **Behavior detail:** Switching unit converts entered qty values in-place (including variant sub-rows) so the physical amount stays the same and users can input large receipts more easily.
- **Valuation hardening:** Goods-receiving create/edit/delete math now converts both qty and `cost_per_unit` into the inventory row's stored unit before weighted-average / reversal HPP calculations. This prevents x1000 valuation drift when item unit differs from inventory unit.

## 2026-03-24 - Raw Material Storage Unit Normalization (Create + CSV Import)

- **File:** `src/components/ayakasir/erp/screens/PurchasingScreen.tsx`
- **Rule applied:** raw material inventory storage now normalizes to smallest convertible unit:
  - `kg -> g`
  - `L -> mL`
  - `g`, `mL`, `pcs` unchanged
- **Coverage:** both manual raw-material create (`handleSaveRaw`) and raw-material CSV import (`handleConfirmRawImport`), including auto-created variant inventory rows from preset groups.
- **Reason:** ensures inventory starts in base unit so later adjustments/receiving can support smallest-unit operations consistently.

## 2026-03-25 - Products: Tambah Produk Field Order (Nama -> Kategori -> Harga)

- **File:** `src/components/ayakasir/erp/screens/ProductsScreen.tsx`
- **Change:** In Product form dialog, moved `Kategori` directly below `Nama`, and moved `Harga` below `Kategori` to match requested input flow.
- **Scope:** UI field order only; no validation/business-logic changes.

## 2026-04-07 — Cashier Session: Stale-session day-boundary rule removed

- **Context:** The web ERP previously had a stale-session rule: any session with `opened_at < todayMidnight` was treated as inactive, locking POS. Mobile had no such rule → divergence where mobile showed session open but web showed POS locked.
- **Decision:** Removed the stale-session concept entirely. Any unclosed session (`closed_at === null`) is now treated as active regardless of age. Stores that carry sessions across days are fully supported, matching mobile behavior.
- **Changes:** `PosScreen.tsx` — removed `todayMidnight`, `staleSession`, simplified `currentSession` to direct `.find(s => s.closed_at === null)`; removed stale auto-close block in `handleOpenCashierSession`; removed `closeCashierSession` import. Same simplification in `DashboardScreen.tsx` for `activeSession`.
- **TypeScript:** `tsc --noEmit` passes clean after change.

## 2026-04-07 — Settings: CSV Export only outputs first item per multi-item transaction

- **Bug:** For SALE/SALE_DEBT/SALE_QRIS/SALE_TRANSFER ledger entries, the CSV only emitted one row per ledger entry (taking `txItems[0]`). Transactions with 2+ items were under-reported.
- **Root cause:** The non-COGS path used `txItems[0]` and emitted a single `rows.push(...)` without iterating over all items. The COGS path already correctly looped over `grItems` — the SALE path was never updated to match.
- **Fix:** Mirrored the COGS pattern: loop over all `txItems` for SALE types, emitting one CSV row per item. Non-sale ledger entries (no txItems) fall through to a plain single row with empty item columns.
- **Note:** `e.amount` (total ledger amount) is still repeated on every item row — matches original behavior, consistent with COGS rows repeating the total COGS amount.
- **File changed:** `src/components/ayakasir/erp/screens/SettingsScreen.tsx`

## 2026-04-08 — Settings CSV: person_in_charge always resolves to Owner name

- **Bug:** `person_in_charge` column showed the Owner's name for all rows, even rows created by a Cashier.
- **Root cause:** The lookup was `userMap.get(tx?.user_id || e.user_id)`. When a transaction existed (`tx` is defined), `tx.user_id` was used instead of `e.user_id`. These can differ — e.g. a DEBT_SETTLED ledger entry written by the Owner references a transaction originally created by a Cashier. The fallback `|| state.user?.name` (the currently logged-in Owner) further masked any miss.
- **Fix:** Always use `e.user_id` (the ledger entry's own user field) as the sole lookup key — it's the authoritative record of who performed that specific action.
- **File changed:** `src/components/ayakasir/erp/screens/SettingsScreen.tsx`

