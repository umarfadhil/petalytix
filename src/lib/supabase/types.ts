// Database row types — matching Supabase schema exactly (snake_case, BIGINT timestamps)

export type TenantPlan = "PERINTIS" | "TUMBUH" | "MAPAN";

export interface DbOrganization {
  id: string;
  name: string;
  owner_email: string;
  plan: TenantPlan;
  plan_started_at: number | null;
  plan_expires_at: number | null;
  sync_status: string;
  updated_at: number;
  created_at: number;
}

export interface DbTenant {
  id: string;
  name: string;
  owner_email: string;
  owner_phone: string;
  province: string;
  city: string;
  is_active: boolean;
  qris_image_url: string | null;
  qris_merchant_name: string | null;
  enabled_payment_methods: string; // comma-separated: "CASH,QRIS,TRANSFER,UTANG"
  plan: TenantPlan;
  plan_started_at: number | null;
  plan_expires_at: number | null;
  organization_id: string | null;  // FK → organizations(id)
  branch_name: string | null;      // display name for this branch
  is_primary: boolean;             // true = primary (catalog owner) branch
  sync_status: string;
  updated_at: number;
  created_at: number;
}

export interface DbCustomerCategory {
  id: string;
  tenant_id: string;
  organization_id: string | null; // FK → organizations(id); org-scoped for multi-branch
  name: string;
  sync_status: string;
  updated_at: number;
}

export interface DbCustomer {
  id: string;
  tenant_id: string;
  organization_id: string | null; // FK → organizations(id); org-scoped for multi-branch
  name: string;
  phone: string | null;
  email: string | null;
  birthday: number | null;
  gender: string | null; // "MALE" | "FEMALE" | "OTHER" | null
  category_id: string | null;
  notes: string | null;
  sync_status: string;
  updated_at: number;
  created_at: number;
}

export interface DbUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pin_hash: string;
  pin_salt: string;
  password_hash: string | null;
  password_salt: string | null;
  role: "OWNER" | "CASHIER";
  job_title: string;
  tenant_id: string | null;
  organization_id: string | null; // FK → organizations(id)
  feature_access: string | null;
  is_active: boolean;
  sync_status: string;
  updated_at: number;
  created_at: number;
}

export interface DbCategory {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  category_type: "MENU" | "RAW_MATERIAL";
  sync_status: string;
  updated_at: number;
}

export interface DbProduct {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_path: string | null;
  is_active: boolean;
  product_type: "MENU_ITEM" | "RAW_MATERIAL";
  sync_status: string;
  updated_at: number;
}

export interface DbVariant {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  price_adjustment: number;
  sync_status: string;
  updated_at: number;
}

export interface DbVariantGroup {
  id: string;
  tenant_id: string;
  name: string;
  sync_status: string;
  updated_at: number;
}

export interface DbMasterDataLink {
  id: string;
  organization_id: string;
  target_tenant_id: string;
  data_type: string;
  linked_at: number;
}

export interface DbVariantGroupValue {
  id: string;
  group_id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  sync_status: string;
  updated_at: number;
}

export interface DbProductComponent {
  id: string;
  tenant_id: string;
  parent_product_id: string;
  parent_variant_id: string;
  component_product_id: string;
  component_variant_id: string;
  required_qty: number;
  unit: string;
  sort_order: number;
  sync_status: string;
  updated_at: number;
}

export interface DbVendor {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  sync_status: string;
  updated_at: number;
}

export interface DbInventory {
  product_id: string;
  variant_id: string;
  tenant_id: string;
  current_qty: number;
  min_qty: number;
  unit: string;
  avg_cogs: number; // weighted-average cost per base unit; 0 when stock is 0
  sync_status: string;
  updated_at: number;
}

export interface DbGoodsReceiving {
  id: string;
  tenant_id: string;
  vendor_id: string | null;
  date: number;
  notes: string | null;
  sync_status: string;
  updated_at: number;
}

export interface DbGoodsReceivingItem {
  id: string;
  tenant_id: string;
  receiving_id: string;
  product_id: string;
  variant_id: string;
  variant_name: string; // NOT NULL in DB — empty string for no-variant rows
  qty: number;          // stored as integer in DB — must be Math.round()'ed
  cost_per_unit: number; // BIGINT in DB — must be Math.round()'ed
  unit: string;
  sync_status: string;
  updated_at: number;
}

export interface DbTransaction {
  id: string;
  tenant_id: string;
  user_id: string;
  date: number;
  total: number;
  payment_method: "CASH" | "QRIS" | "TRANSFER" | "UTANG";
  status: "COMPLETED" | "VOIDED";
  customer_id: string | null;
  debt_status: string | null;
  notes: string | null;
  sync_status: string;
  updated_at: number;
}

export interface DbTransactionItem {
  id: string;
  tenant_id: string;
  transaction_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string | null;
  qty: number;
  unit_price: number;
  subtotal: number;
  discount_type: "NONE" | "AMOUNT" | "PERCENT";
  discount_value: number;
  discount_per_unit: number;
  cogs_per_unit: number; // BIGINT: BOM-computed HPP per unit at checkout time; 0 for legacy rows
  sync_status: string;
  updated_at: number;
}

export interface DbCashWithdrawal {
  id: string;
  tenant_id: string;
  user_id: string;
  amount: number;
  reason: string;
  date: number;
  sync_status: string;
  updated_at: number;
}

export interface DbInventoryMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  variant_id: string; // empty string when no variant (matches mobile app default '')
  movement_type: "adjustment_in" | "adjustment_out" | "waste" | string; // mobile app values; string fallback for other types
  qty_before: number;
  qty_change: number; // positive = in, negative = out
  qty_after: number;
  unit: string;
  reason: string; // empty string when no reason
  user_id: string;
  date: number;
  sync_status: string;
  updated_at: number;
}

export interface DbCashierSession {
  id: string;
  tenant_id: string;
  user_id: string;
  opened_at: number; // BIGINT timestamp ms
  closed_at: number | null;
  initial_balance: number;
  closing_balance: number | null;
  withdrawal_amount: number | null;
  match_status: "MATCH" | "MISMATCH" | null;
  mismatch_note: string | null;
  sync_status: string;
  updated_at: number;
}

export interface DbGeneralLedger {
  id: string;
  tenant_id: string;
  type: "INITIAL_BALANCE" | "SALE" | "SALE_QRIS" | "SALE_TRANSFER" | "WITHDRAWAL" | "ADJUSTMENT" | "COGS" | "SALE_DEBT" | "DEBT_SETTLED";
  amount: number;
  reference_id: string | null;
  description: string;
  date: number;
  user_id: string;
  sync_status: string;
  updated_at: number;
}

// All tenant-scoped tables
export const TENANT_TABLES = [
  "categories",
  "products",
  "variants",
  "inventory",
  "product_components",
  "vendors",
  "goods_receiving",
  "goods_receiving_items",
  "transactions",
  "transaction_items",
  "cash_withdrawals",
  "general_ledger",
  "customers",
  "customer_categories",
  "inventory_movements",
  "cashier_sessions",
  "variant_groups",
  "variant_group_values",
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

// Map table name to its row type
export interface TableTypeMap {
  categories: DbCategory;
  products: DbProduct;
  variants: DbVariant;
  inventory: DbInventory;
  product_components: DbProductComponent;
  vendors: DbVendor;
  goods_receiving: DbGoodsReceiving;
  goods_receiving_items: DbGoodsReceivingItem;
  transactions: DbTransaction;
  transaction_items: DbTransactionItem;
  cash_withdrawals: DbCashWithdrawal;
  general_ledger: DbGeneralLedger;
  customers: DbCustomer;
  customer_categories: DbCustomerCategory;
  inventory_movements: DbInventoryMovement;
  cashier_sessions: DbCashierSession;
  variant_groups: DbVariantGroup;
  variant_group_values: DbVariantGroupValue;
}
