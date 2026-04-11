"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRealtimeSync, type RealtimeStatus } from "@/lib/supabase/realtime";
import type {
  DbCategory, DbProduct, DbVariant, DbInventory, DbProductComponent,
  DbVendor, DbGoodsReceiving, DbGoodsReceivingItem, DbTransaction,
  DbTransactionItem, DbCashWithdrawal, DbGeneralLedger, DbTenant, DbUser, DbCustomer,
  DbCustomerCategory, DbInventoryMovement, DbCashierSession,
  DbVariantGroup, DbVariantGroupValue,
} from "@/lib/supabase/types";

// Re-export types for screen components
export type { DbUser, DbCustomerCategory, DbCashierSession };

export { type RealtimeStatus };

// ── State ──────────────────────────────────────────────────────
export interface ErpState {
  restaurant: DbTenant | null;
  user: DbUser | null;
  categories: DbCategory[];
  products: DbProduct[];
  variants: DbVariant[];
  inventory: DbInventory[];
  productComponents: DbProductComponent[];
  vendors: DbVendor[];
  goodsReceivings: DbGoodsReceiving[];
  goodsReceivingItems: DbGoodsReceivingItem[];
  transactions: DbTransaction[];
  transactionItems: DbTransactionItem[];
  cashWithdrawals: DbCashWithdrawal[];
  generalLedger: DbGeneralLedger[];
  customers: DbCustomer[];
  customerCategories: DbCustomerCategory[];
  inventoryMovements: DbInventoryMovement[];
  tenantUsers: DbUser[];
  cashierSessions: DbCashierSession[];
  variantGroups: DbVariantGroup[];
  variantGroupValues: DbVariantGroupValue[];
  // Multi-branch: org branches visible to OWNER for branch switcher
  orgBranches: DbTenant[];
  // Pagination metadata
  dataWindowStart: number; // ms timestamp — rows with date < this were not loaded initially
  olderDataLoaded: boolean; // true once all-time data has been fetched and merged
  // Realtime connection status
  realtimeStatus: RealtimeStatus;
}

export const EMPTY_STATE: ErpState = {
  restaurant: null,
  user: null,
  categories: [],
  products: [],
  variants: [],
  inventory: [],
  productComponents: [],
  vendors: [],
  goodsReceivings: [],
  goodsReceivingItems: [],
  transactions: [],
  transactionItems: [],
  cashWithdrawals: [],
  generalLedger: [],
  customers: [],
  customerCategories: [],
  inventoryMovements: [],
  tenantUsers: [],
  cashierSessions: [],
  variantGroups: [],
  variantGroupValues: [],
  orgBranches: [],
  dataWindowStart: 0,
  olderDataLoaded: false,
  realtimeStatus: "CONNECTING" as RealtimeStatus,
};

// ── Actions ────────────────────────────────────────────────────
export interface OlderData {
  transactions: DbTransaction[];
  transactionItems: DbTransactionItem[];
  generalLedger: DbGeneralLedger[];
  cashWithdrawals: DbCashWithdrawal[];
  goodsReceivings: DbGoodsReceiving[];
  goodsReceivingItems: DbGoodsReceivingItem[];
  inventoryMovements: DbInventoryMovement[];
  cashierSessions: DbCashierSession[];
}

type ErpAction =
  | { type: "SET_ALL"; payload: Partial<ErpState> }
  | { type: "SET_RESTAURANT"; payload: DbTenant }
  | { type: "UPSERT"; table: keyof ErpState; payload: Record<string, unknown> }
  | { type: "DELETE"; table: keyof ErpState; id: string; compositeKey?: { product_id: string; variant_id: string } }
  | { type: "MERGE_OLDER"; payload: OlderData; newWindowStart: number }
  | { type: "SET_REALTIME_STATUS"; status: RealtimeStatus };

function upsertInList<T extends Record<string, unknown>>(
  list: T[],
  item: T,
  idField = "id"
): T[] {
  const idx = list.findIndex((r) => r[idField] === (item as Record<string, unknown>)[idField]);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = item;
    return next;
  }
  return [...list, item];
}

function deleteFromList<T extends Record<string, unknown>>(
  list: T[],
  id: string,
  idField = "id"
): T[] {
  return list.filter((r) => r[idField] !== id);
}

function erpReducer(state: ErpState, action: ErpAction): ErpState {
  switch (action.type) {
    case "SET_ALL":
      return { ...state, ...action.payload };
    case "SET_RESTAURANT":
      return { ...state, restaurant: action.payload };
    case "UPSERT": {
      const { table, payload } = action;
      const list = state[table];
      if (!Array.isArray(list)) return state;

      if (table === "inventory") {
        // Inventory uses composite key (product_id, variant_id)
        const inv = payload as unknown as DbInventory;
        const idx = (list as DbInventory[]).findIndex(
          (r) => r.product_id === inv.product_id && r.variant_id === inv.variant_id
        );
        const next = [...list] as DbInventory[];
        if (idx >= 0) next[idx] = inv;
        else next.push(inv);
        return { ...state, [table]: next };
      }

      return { ...state, [table]: upsertInList(list as unknown as Record<string, unknown>[], payload) };
    }
    case "DELETE": {
      const { table, id, compositeKey } = action;
      const list = state[table];
      if (!Array.isArray(list)) return state;

      if (table === "inventory" && compositeKey) {
        return {
          ...state,
          [table]: (list as DbInventory[]).filter(
            (r) =>
              !(r.product_id === compositeKey.product_id && r.variant_id === compositeKey.variant_id)
          ),
        };
      }

      return { ...state, [table]: deleteFromList(list as unknown as Record<string, unknown>[], id) };
    }
    case "MERGE_OLDER": {
      // Merge older rows by deduplicating on id — existing rows (from realtime) take precedence
      const { payload, newWindowStart } = action;
      function mergeById<T extends { id: string }>(existing: T[], older: T[]): T[] {
        const existingIds = new Set(existing.map((r) => r.id));
        return [...older.filter((r) => !existingIds.has(r.id)), ...existing];
      }
      return {
        ...state,
        transactions: mergeById(state.transactions, payload.transactions as DbTransaction[]),
        transactionItems: mergeById(state.transactionItems, payload.transactionItems as DbTransactionItem[]),
        generalLedger: mergeById(state.generalLedger, payload.generalLedger as DbGeneralLedger[]),
        cashWithdrawals: mergeById(state.cashWithdrawals, payload.cashWithdrawals as DbCashWithdrawal[]),
        goodsReceivings: mergeById(state.goodsReceivings, payload.goodsReceivings as DbGoodsReceiving[]),
        goodsReceivingItems: mergeById(state.goodsReceivingItems, payload.goodsReceivingItems as DbGoodsReceivingItem[]),
        inventoryMovements: mergeById(state.inventoryMovements, payload.inventoryMovements as DbInventoryMovement[]),
        cashierSessions: mergeById(state.cashierSessions, payload.cashierSessions as DbCashierSession[]),
        dataWindowStart: newWindowStart,
        olderDataLoaded: newWindowStart === 0,
      };
    }
    case "SET_REALTIME_STATUS":
      return { ...state, realtimeStatus: action.status };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────
interface ErpContextValue {
  state: ErpState;
  dispatch: React.Dispatch<ErpAction>;
  supabase: ReturnType<typeof createBrowserClient>;
  tenantId: string;
  locale: string;
}

const ErpContext = createContext<ErpContextValue | null>(null);

export function useErp() {
  const ctx = useContext(ErpContext);
  if (!ctx) throw new Error("useErp must be used within ErpProvider");
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────
interface ErpProviderProps {
  children: React.ReactNode;
  tenantId: string;
  organizationId?: string;
  locale: string;
  initialData: Partial<ErpState>;
}

export function ErpProvider({ children, tenantId, organizationId, locale, initialData }: ErpProviderProps) {
  const [state, dispatch] = useReducer(erpReducer, { ...EMPTY_STATE, ...initialData });
  const supabase = useMemo(() => createBrowserClient(), []);

  // Table name → state key mapping
  const tableKeyMap: Record<string, keyof ErpState> = {
    categories: "categories",
    products: "products",
    variants: "variants",
    inventory: "inventory",
    product_components: "productComponents",
    vendors: "vendors",
    goods_receiving: "goodsReceivings",
    goods_receiving_items: "goodsReceivingItems",
    transactions: "transactions",
    transaction_items: "transactionItems",
    cash_withdrawals: "cashWithdrawals",
    general_ledger: "generalLedger",
    customers: "customers",
    customer_categories: "customerCategories",
    inventory_movements: "inventoryMovements",
    users: "tenantUsers",
    cashier_sessions: "cashierSessions",
    variant_groups: "variantGroups",
    variant_group_values: "variantGroupValues",
  };

  const makeHandler = useCallback(
    (dbTable: string) => {
      const stateKey = tableKeyMap[dbTable];
      if (!stateKey) return () => {};

      return (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          dispatch({ type: "UPSERT", table: stateKey, payload: payload.new });
        } else if (payload.eventType === "DELETE") {
          const old = payload.old;
          if (dbTable === "inventory") {
            dispatch({
              type: "DELETE",
              table: stateKey,
              id: "",
              compositeKey: { product_id: old.product_id as string, variant_id: old.variant_id as string },
            });
          } else {
            dispatch({ type: "DELETE", table: stateKey, id: old.id as string });
          }
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Build handlers object for all tables
  const handlers = useMemo(() => {
    const h: Record<string, ReturnType<typeof makeHandler>> = {};
    for (const dbTable of Object.keys(tableKeyMap)) {
      h[dbTable] = makeHandler(dbTable);
    }
    h.tenants = (payload: { eventType: string; new: Record<string, unknown> }) => {
      if (payload.eventType === "UPDATE") {
        dispatch({ type: "SET_RESTAURANT", payload: payload.new as unknown as DbTenant });
      }
    };
    return h;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onStatusChange = useCallback((status: RealtimeStatus) => {
    dispatch({ type: "SET_REALTIME_STATUS", status });
  }, []);

  useRealtimeSync(tenantId, handlers, onStatusChange);

  // ── Fallback reconcile ────────────────────────────────────────
  // Re-fetch all static + recent windowed tables when realtime is disconnected.
  // Triggered on: window focus (always) and a 5-minute interval (only when DISCONNECTED).
  const realtimeStatusRef = useRef<RealtimeStatus>("CONNECTING");
  const reconcileRef = useRef<() => Promise<void>>();

  reconcileRef.current = async () => {
    try {
      const windowStart = Date.now() - 90 * 24 * 60 * 60 * 1000;
      // Note: tenantUsers is intentionally excluded — the browser anon client is restricted by RLS
      // and cannot reliably read all users rows. tenantUsers is managed via SSR initial load,
      // UPSERT/DELETE dispatches, and Realtime. Reconcile should not overwrite it.
      const [
        categories, products, variants, inventory, productComponents,
        vendors, customersLinkCheck, customers, customerCategories,
        variantGroups, variantGroupValues,
        goodsReceivings, transactions, cashWithdrawals,
        generalLedger, inventoryMovements, cashierSessions,
        tenantRow,
      ] = await Promise.all([
        supabase.from("categories").select("*").eq("tenant_id", tenantId).order("sort_order"),
        supabase.from("products").select("*").eq("tenant_id", tenantId).order("name"),
        supabase.from("variants").select("*").eq("tenant_id", tenantId),
        supabase.from("inventory").select("*").eq("tenant_id", tenantId),
        supabase.from("product_components").select("*").eq("tenant_id", tenantId).order("sort_order"),
        supabase.from("vendors").select("*").eq("tenant_id", tenantId).order("name"),
        organizationId
          ? supabase.from("master_data_links").select("id").eq("target_tenant_id", tenantId).eq("data_type", "CUSTOMERS").limit(1)
          : Promise.resolve({ data: [] }),
        supabase.from("customers").select("*").eq("tenant_id", tenantId).order("name"),
        supabase.from("customer_categories").select("*").eq("tenant_id", tenantId).order("name"),
        supabase.from("variant_groups").select("*").eq("tenant_id", tenantId).order("name"),
        supabase.from("variant_group_values").select("*").eq("tenant_id", tenantId).order("sort_order"),
        supabase.from("goods_receiving").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
        supabase.from("transactions").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
        supabase.from("cash_withdrawals").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
        supabase.from("general_ledger").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
        supabase.from("inventory_movements").select("*").eq("tenant_id", tenantId).gte("date", windowStart).order("date", { ascending: false }),
        supabase.from("cashier_sessions").select("*").eq("tenant_id", tenantId).gte("opened_at", windowStart).order("opened_at", { ascending: false }),
        supabase.from("tenants").select("*").eq("id", tenantId).single(),
      ]);

      // If CUSTOMERS link active, also load org-scoped customers and merge
      let mergedCustomers = customers.data || [];
      let mergedCustCats = customerCategories.data || [];
      const customersLinked = organizationId && (customersLinkCheck.data || []).length > 0;
      if (customersLinked) {
        const [orgCustRes, orgCatRes] = await Promise.all([
          supabase.from("customers").select("*").eq("organization_id", organizationId).order("name"),
          supabase.from("customer_categories").select("*").eq("organization_id", organizationId).order("name"),
        ]);
        const custMap = new Map<string, unknown>();
        for (const c of [...mergedCustomers, ...(orgCustRes.data || [])]) custMap.set((c as { id: string }).id, c);
        const catMap = new Map<string, unknown>();
        for (const c of [...mergedCustCats, ...(orgCatRes.data || [])]) catMap.set((c as { id: string }).id, c);
        mergedCustomers = Array.from(custMap.values()) as typeof mergedCustomers;
        mergedCustCats = Array.from(catMap.values()) as typeof mergedCustCats;
      }

      const txIds = (transactions.data || []).map((t: { id: string }) => t.id);
      const grIds = (goodsReceivings.data || []).map((r: { id: string }) => r.id);
      const [transactionItems, goodsReceivingItems] = await Promise.all([
        txIds.length > 0
          ? supabase.from("transaction_items").select("*").in("transaction_id", txIds)
          : Promise.resolve({ data: [] }),
        grIds.length > 0
          ? supabase.from("goods_receiving_items").select("*").in("receiving_id", grIds)
          : Promise.resolve({ data: [] }),
      ]);

      dispatch({
        type: "SET_ALL",
        payload: {
          categories: categories.data || [],
          products: products.data || [],
          variants: variants.data || [],
          inventory: inventory.data || [],
          productComponents: productComponents.data || [],
          vendors: vendors.data || [],
          customers: mergedCustomers,
          customerCategories: mergedCustCats,
          variantGroups: variantGroups.data || [],
          variantGroupValues: variantGroupValues.data || [],
          goodsReceivings: goodsReceivings.data || [],
          goodsReceivingItems: goodsReceivingItems.data || [],
          transactions: transactions.data || [],
          transactionItems: transactionItems.data || [],
          cashWithdrawals: cashWithdrawals.data || [],
          generalLedger: generalLedger.data || [],
          inventoryMovements: inventoryMovements.data || [],
          cashierSessions: cashierSessions.data || [],
          ...(tenantRow.data ? { restaurant: tenantRow.data as DbTenant } : {}),
          dataWindowStart: windowStart,
        },
      });
    } catch (err) {
      console.warn("[erp] reconcile failed:", err);
    }
  };

  // Keep ref in sync with latest status
  useEffect(() => {
    realtimeStatusRef.current = state.realtimeStatus;
  }, [state.realtimeStatus]);

  // Focus reconcile — always run on tab focus
  useEffect(() => {
    const onFocus = () => reconcileRef.current?.();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Interval reconcile — only while DISCONNECTED (5-minute poll)
  useEffect(() => {
    const id = setInterval(() => {
      if (realtimeStatusRef.current === "DISCONNECTED") {
        reconcileRef.current?.();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo(
    () => ({ state, dispatch, supabase, tenantId, locale }),
    [state, dispatch, supabase, tenantId, locale]
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}
