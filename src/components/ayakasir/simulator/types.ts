export type ProductType = "MENU_ITEM" | "RAW_MATERIAL";
export type CategoryType = "MENU" | "RAW_MATERIAL";
export type PaymentMethod = "CASH" | "QRIS" | "UTANG";
export type TransactionStatus = "COMPLETED" | "VOIDED";
export type InventoryUnit = "pcs" | "g" | "mL" | "kg" | "L";
export type LedgerType =
  | "SALE"
  | "SALE_QRIS"
  | "SALE_DEBT"
  | "DEBT_SETTLED"
  | "DEBT_SETTLED_QRIS"
  | "COGS"
  | "WITHDRAWAL"
  | "ADJUSTMENT"
  | "INITIAL_BALANCE";
export type DiscountType = "NONE" | "AMOUNT" | "PERCENT";
export type DebtStatus = "UNPAID" | "SETTLED";

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  categoryType: CategoryType;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  productType: ProductType;
  isActive: boolean;
}

export interface Variant {
  id: string;
  productId: string;
  name: string;
  priceAdjustment: number;
}

export interface InventoryItem {
  productId: string;
  variantId: string | null;
  currentQty: number;
  minQty: number;
  unit: InventoryUnit;
}

export interface Transaction {
  id: string;
  date: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  debtStatus?: DebtStatus;
  customerName?: string;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  qty: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  subtotal: number;
}

export interface GeneralLedger {
  id: string;
  type: LedgerType;
  amount: number;
  referenceId: string | null;
  description: string;
  date: number;
}

export interface CartItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  qty: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface ProductComponent {
  menuItemId: string;
  rawMaterialId: string;
  qty: number;
  unit: InventoryUnit;
}

export interface GoodsReceivingItem {
  productId: string;
  variantId: string | null;
  qty: number;
  unit?: InventoryUnit;
  unitCost: number;
}

export interface GoodsReceiving {
  id: string;
  vendorId: string;
  date: number;
  totalCost: number;
  items: GoodsReceivingItem[];
}

export type SimScreen = "login" | "scenario" | "app";
export type AppTab = "pos" | "dashboard" | "products" | "inventory" | "purchasing" | "settings";

export type DialogState =
  | { type: "receipt"; transactionId: string }
  | { type: "paymentConfirm"; method: PaymentMethod; total: number; customerName?: string }
  | { type: "utangCustomer"; method: "UTANG"; total: number }
  | { type: "productForm"; productId: string | null }
  | { type: "confirm"; message: string; onConfirmAction: SimAction }
  | { type: "variantPicker"; productId: string }
  | { type: "discountPicker"; productId: string; variantId: string | null }
  | { type: "goodsReceivingForm" }
  | { type: "vendorForm"; vendorId: string | null }
  | { type: "stockAdjust"; productId: string; variantId: string | null }
  | { type: "dateRangePicker" }
  | { type: "debtSettle"; transactionId: string; total: number; customerName?: string };

export interface SimulatorState {
  screen: SimScreen;
  activeTab: AppTab;
  scenarioKey: string | null;
  restaurantName: string;

  categories: Category[];
  products: Product[];
  variants: Variant[];
  productComponents: ProductComponent[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  ledger: GeneralLedger[];
  vendors: Vendor[];
  goodsReceivings: GoodsReceiving[];

  cart: CartItem[];
  selectedCategoryId: string | null;
  dashboardPeriod: "today" | "month" | "year" | "custom";
  dashboardDateRange: { from: number; to: number } | null;
  paymentMethods: { cash: boolean; qris: boolean; utang: boolean };
  activeDialog: DialogState | null;
}

export type SimAction =
  | { type: "LOGIN" }
  | { type: "LOGOUT" }
  | { type: "SELECT_SCENARIO"; key: string; data: ScenarioData }
  | { type: "SET_TAB"; tab: AppTab }
  | { type: "SET_CATEGORY_FILTER"; categoryId: string | null }
  | { type: "ADD_TO_CART"; productId: string; variantId: string | null }
  | { type: "UPDATE_CART_QTY"; productId: string; variantId: string | null; qty: number }
  | { type: "REMOVE_FROM_CART"; productId: string; variantId: string | null }
  | { type: "CLEAR_CART" }
  | { type: "SET_ITEM_DISCOUNT"; productId: string; variantId: string | null; discountType: DiscountType; discountValue: number }
  | { type: "START_PAYMENT"; method: PaymentMethod }
  | { type: "CONFIRM_PAYMENT"; customerName?: string }
  | { type: "SETTLE_DEBT"; transactionId: string; paymentMethod: "CASH" | "QRIS" }
  | { type: "ADD_PRODUCT"; product: Omit<Product, "id"> }
  | { type: "UPDATE_PRODUCT"; id: string; updates: Partial<Product> }
  | { type: "DELETE_PRODUCT"; id: string }
  | { type: "CLONE_PRODUCT"; id: string }
  | { type: "ADD_VARIANT"; variant: Omit<Variant, "id"> }
  | { type: "DELETE_VARIANT"; id: string }
  | { type: "UPDATE_INVENTORY"; productId: string; variantId: string | null; qty: number }
  | { type: "ADJUST_INVENTORY"; productId: string; variantId: string | null; newQty: number; reason: string }
  | { type: "ADD_CATEGORY"; category: Omit<Category, "id"> }
  | { type: "UPDATE_CATEGORY"; id: string; name: string }
  | { type: "DELETE_CATEGORY"; id: string }
  | { type: "TOGGLE_PAYMENT_METHOD"; method: "CASH" | "QRIS" | "UTANG" }
  | { type: "SET_DASHBOARD_PERIOD"; period: "today" | "month" | "year" | "custom" }
  | { type: "SET_DASHBOARD_DATE_RANGE"; from: number; to: number }
  | { type: "SET_INITIAL_BALANCE"; amount: number }
  | { type: "SET_PRODUCT_COMPONENTS"; productId: string; components: ProductComponent[] }
  | { type: "ADD_VENDOR"; vendor: Omit<Vendor, "id"> }
  | { type: "UPDATE_VENDOR"; id: string; updates: Partial<Vendor> }
  | { type: "DELETE_VENDOR"; id: string }
  | { type: "ADD_GOODS_RECEIVING"; receiving: Omit<GoodsReceiving, "id"> }
  | { type: "OPEN_DIALOG"; dialog: DialogState }
  | { type: "CLOSE_DIALOG" };

export interface ScenarioData {
  restaurantName: string;
  categories: Category[];
  products: Product[];
  variants: Variant[];
  productComponents: ProductComponent[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  transactionItems: TransactionItem[];
  ledger: GeneralLedger[];
  vendors: Vendor[];
  goodsReceivings: GoodsReceiving[];
  paymentMethods: { cash: boolean; qris: boolean; utang: boolean };
}
