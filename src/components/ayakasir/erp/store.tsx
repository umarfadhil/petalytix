"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRealtimeSync } from "@/lib/supabase/realtime";
import type {
  DbCategory, DbProduct, DbVariant, DbInventory, DbProductComponent,
  DbVendor, DbGoodsReceiving, DbGoodsReceivingItem, DbTransaction,
  DbTransactionItem, DbCashWithdrawal, DbGeneralLedger, DbTenant, DbUser, DbCustomer,
  DbCustomerCategory, DbInventoryMovement, DbCashierSession,
  DbVariantGroup, DbVariantGroupValue,
} from "@/lib/supabase/types";

// Re-export types for screen components
export type { DbUser, DbCustomerCategory, DbCashierSession };

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
};

// ── Actions ────────────────────────────────────────────────────
type ErpAction =
  | { type: "SET_ALL"; payload: Partial<ErpState> }
  | { type: "SET_RESTAURANT"; payload: DbTenant }
  | { type: "UPSERT"; table: keyof ErpState; payload: Record<string, unknown> }
  | { type: "DELETE"; table: keyof ErpState; id: string; compositeKey?: { product_id: string; variant_id: string } };

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
  locale: string;
  initialData: Partial<ErpState>;
}

export function ErpProvider({ children, tenantId, locale, initialData }: ErpProviderProps) {
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

  useRealtimeSync(tenantId, handlers);

  const value = useMemo(
    () => ({ state, dispatch, supabase, tenantId, locale }),
    [state, dispatch, supabase, tenantId, locale]
  );

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}
