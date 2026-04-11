"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type { DbOrganization, DbTenant, DbUser, DbCustomer, DbCustomerCategory, DbInventory, DbInventoryMovement, DbProduct, DbMasterDataLink, DbProductComponent, DbVendor, DbCategory } from "@/lib/supabase/types";

// ── Branch summary (lightweight aggregate per branch) ─────────────
export interface BranchSummary {
  tenantId: string;
  branchName: string;
  todayRevenue: number;
  todayTransactions: number;
  activeSession: boolean;
  lowStockCount: number;
}

// ── Consolidated transaction (lightweight, for reports) ───────────
export interface ConsolidatedTx {
  id: string;
  tenant_id: string;
  date: number;
  total: number;
  payment_method: "CASH" | "QRIS" | "TRANSFER" | "UTANG";
  debt_status: string | null;
  customer_id: string | null;
}

export interface ConsolidatedTxItem {
  transaction_id: string;
  tenant_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string | null;
  qty: number;
  subtotal: number;
  cogs_per_unit: number; // 0 for legacy rows — fall back to GR reconstruction
}

// ── Consolidated inventory (lightweight, for reports) ────────────
export interface ConsolidatedInventoryRow {
  tenant_id: string;
  product_id: string;
  variant_id: string;
  current_qty: number;
  min_qty: number;
  unit: string;
  avg_cogs: number;
}

export interface ConsolidatedMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  variant_id: string;
  movement_type: string;
  qty_change: number;
  unit: string;
  date: number;
  reason: string;
  user_id: string | null;
}

export interface ConsolidatedGoodsReceivingItem {
  tenant_id: string;
  receiving_id: string;
  product_id: string;
  variant_id: string;
  qty: number;
  cost_per_unit: number;
  unit: string;
  date: number;     // from parent goods_receiving.date
  vendor_id: string | null; // from parent goods_receiving.vendor_id
}

export interface ConsolidatedProduct {
  id: string;
  tenant_id: string;
  name: string;
  product_type: "MENU_ITEM" | "RAW_MATERIAL";
  category_id: string | null;
}

// ── Primary branch data counts (for master data cards) ──────────
export interface PrimaryDataCounts {
  customers: number;
  vendors: number;
  rawMaterials: number;
  categoryRaw: number;
  variantGroups: number;
  menuItems: number;
  categoryMenu: number;
}

// ── State ─────────────────────────────────────────────────────────
export interface OfficeState {
  organization: DbOrganization | null;
  branches: DbTenant[];
  orgUsers: DbUser[];          // all users across the org
  orgCustomers: DbCustomer[];
  orgCustomerCategories: DbCustomerCategory[];
  branchSummaries: BranchSummary[];
  consolidatedTxs: ConsolidatedTx[];
  consolidatedTxItems: ConsolidatedTxItem[];
  consolidatedInventory: ConsolidatedInventoryRow[];
  consolidatedMovements: ConsolidatedMovement[];
  consolidatedGrItems: ConsolidatedGoodsReceivingItem[];
  consolidatedProducts: ConsolidatedProduct[];
  consolidatedProductComponents: DbProductComponent[];
  consolidatedVendors: DbVendor[];
  consolidatedCategories: DbCategory[];
  masterDataLinks: DbMasterDataLink[];
  primaryDataCounts: PrimaryDataCounts;
  activeTenantId: string;      // which branch the owner is currently operating in
}

// ── Actions ───────────────────────────────────────────────────────
type OfficeAction =
  | { type: "SET_ALL"; payload: Partial<OfficeState> }
  | { type: "UPSERT_BRANCH"; payload: DbTenant }
  | { type: "DELETE_BRANCH"; id: string }
  | { type: "UPSERT_USER"; payload: DbUser }
  | { type: "DELETE_USER"; id: string }
  | { type: "UPSERT_CUSTOMER"; payload: DbCustomer }
  | { type: "DELETE_CUSTOMER"; id: string }
  | { type: "UPSERT_CUSTOMER_CATEGORY"; payload: DbCustomerCategory }
  | { type: "DELETE_CUSTOMER_CATEGORY"; id: string }
  | { type: "UPSERT_MASTER_DATA_LINK"; payload: DbMasterDataLink }
  | { type: "DELETE_MASTER_DATA_LINK"; targetTenantId: string; dataType: string };

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((r) => r.id === item.id);
  if (idx >= 0) { const next = [...list]; next[idx] = item; return next; }
  return [...list, item];
}

function officeReducer(state: OfficeState, action: OfficeAction): OfficeState {
  switch (action.type) {
    case "SET_ALL":
      return { ...state, ...action.payload };
    case "UPSERT_BRANCH":
      return { ...state, branches: upsertById(state.branches, action.payload) };
    case "DELETE_BRANCH":
      return { ...state, branches: state.branches.filter((b) => b.id !== action.id) };
    case "UPSERT_USER":
      return { ...state, orgUsers: upsertById(state.orgUsers, action.payload) };
    case "DELETE_USER":
      return { ...state, orgUsers: state.orgUsers.filter((u) => u.id !== action.id) };
    case "UPSERT_CUSTOMER":
      return { ...state, orgCustomers: upsertById(state.orgCustomers, action.payload) };
    case "DELETE_CUSTOMER":
      return { ...state, orgCustomers: state.orgCustomers.filter((c) => c.id !== action.id) };
    case "UPSERT_CUSTOMER_CATEGORY":
      return { ...state, orgCustomerCategories: upsertById(state.orgCustomerCategories, action.payload) };
    case "DELETE_CUSTOMER_CATEGORY":
      return { ...state, orgCustomerCategories: state.orgCustomerCategories.filter((c) => c.id !== action.id) };
    case "UPSERT_MASTER_DATA_LINK": {
      const existing = state.masterDataLinks.findIndex(
        (l) => l.target_tenant_id === action.payload.target_tenant_id && l.data_type === action.payload.data_type
      );
      if (existing >= 0) {
        const next = [...state.masterDataLinks];
        next[existing] = action.payload;
        return { ...state, masterDataLinks: next };
      }
      return { ...state, masterDataLinks: [...state.masterDataLinks, action.payload] };
    }
    case "DELETE_MASTER_DATA_LINK":
      return {
        ...state,
        masterDataLinks: state.masterDataLinks.filter(
          (l) => !(l.target_tenant_id === action.targetTenantId && l.data_type === action.dataType)
        ),
      };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────
interface OfficeContextValue {
  state: OfficeState;
  dispatch: React.Dispatch<OfficeAction>;
  locale: string;
}

const OfficeContext = createContext<OfficeContextValue | null>(null);

export function useOffice(): OfficeContextValue {
  const ctx = useContext(OfficeContext);
  if (!ctx) throw new Error("useOffice must be used inside OfficeProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────
interface OfficeProviderProps {
  locale: string;
  initialData: Omit<OfficeState, never>;
  children: ReactNode;
}

export function OfficeProvider({ locale, initialData, children }: OfficeProviderProps) {
  const [state, dispatch] = useReducer(officeReducer, initialData);

  return (
    <OfficeContext.Provider value={{ state, dispatch, locale }}>
      {children}
    </OfficeContext.Provider>
  );
}
