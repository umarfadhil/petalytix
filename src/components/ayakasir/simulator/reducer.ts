import { genId } from "./constants";
import type { SimulatorState, SimAction, CartItem } from "./types";

export const initialState: SimulatorState = {
  screen: "login",
  activeTab: "pos",
  scenarioKey: null,
  restaurantName: "",
  categories: [],
  products: [],
  variants: [],
  productComponents: [],
  inventory: [],
  transactions: [],
  transactionItems: [],
  ledger: [],
  vendors: [],
  goodsReceivings: [],
  cart: [],
  selectedCategoryId: null,
  dashboardPeriod: "today",
  dashboardDateRange: null,
  paymentMethods: { cash: true, qris: true, utang: false },
  activeDialog: null,
};

function calcDiscount(unitPrice: number, qty: number, discountType: CartItem["discountType"], discountValue: number): number {
  if (discountType === "AMOUNT") return Math.min(discountValue, unitPrice * qty);
  if (discountType === "PERCENT") return Math.round((unitPrice * qty * Math.min(discountValue, 100)) / 100);
  return 0;
}

export function simulatorReducer(
  state: SimulatorState,
  action: SimAction
): SimulatorState {
  switch (action.type) {
    case "LOGIN":
      return { ...state, screen: "scenario" };

    case "LOGOUT":
      return { ...initialState };

    case "SELECT_SCENARIO": {
      const { data } = action;
      return {
        ...state,
        screen: "app",
        activeTab: "pos",
        scenarioKey: action.key,
        restaurantName: data.restaurantName,
        categories: data.categories,
        products: data.products,
        variants: data.variants,
        productComponents: data.productComponents,
        inventory: data.inventory,
        transactions: data.transactions,
        transactionItems: data.transactionItems,
        ledger: data.ledger,
        vendors: data.vendors,
        goodsReceivings: data.goodsReceivings,
        paymentMethods: data.paymentMethods,
        cart: [],
        selectedCategoryId: null,
        activeDialog: null,
        dashboardPeriod: "today",
        dashboardDateRange: null,
      };
    }

    case "SET_TAB":
      return { ...state, activeTab: action.tab, activeDialog: null };

    case "SET_CATEGORY_FILTER":
      return { ...state, selectedCategoryId: action.categoryId };

    case "ADD_TO_CART": {
      const product = state.products.find((p) => p.id === action.productId);
      if (!product) return state;

      const variant = action.variantId
        ? state.variants.find((v) => v.id === action.variantId)
        : null;
      const unitPrice = product.price + (variant?.priceAdjustment ?? 0);

      const existingIdx = state.cart.findIndex(
        (c) => c.productId === action.productId && c.variantId === action.variantId
      );

      if (existingIdx >= 0) {
        const newCart = [...state.cart];
        newCart[existingIdx] = { ...newCart[existingIdx], qty: newCart[existingIdx].qty + 1 };
        return { ...state, cart: newCart };
      }

      return {
        ...state,
        cart: [
          ...state.cart,
          {
            productId: product.id,
            variantId: action.variantId,
            productName: product.name,
            variantName: variant?.name ?? null,
            unitPrice,
            qty: 1,
            discountType: "NONE",
            discountValue: 0,
          },
        ],
      };
    }

    case "UPDATE_CART_QTY": {
      if (action.qty <= 0) {
        return {
          ...state,
          cart: state.cart.filter(
            (c) => !(c.productId === action.productId && c.variantId === action.variantId)
          ),
        };
      }
      return {
        ...state,
        cart: state.cart.map((c) =>
          c.productId === action.productId && c.variantId === action.variantId
            ? { ...c, qty: action.qty }
            : c
        ),
      };
    }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter(
          (c) => !(c.productId === action.productId && c.variantId === action.variantId)
        ),
      };

    case "CLEAR_CART":
      return { ...state, cart: [] };

    case "SET_ITEM_DISCOUNT":
      return {
        ...state,
        cart: state.cart.map((c) =>
          c.productId === action.productId && c.variantId === action.variantId
            ? { ...c, discountType: action.discountType, discountValue: action.discountValue }
            : c
        ),
      };

    case "START_PAYMENT": {
      const total = state.cart.reduce((sum, c) => {
        const disc = calcDiscount(c.unitPrice, c.qty, c.discountType, c.discountValue);
        return sum + c.unitPrice * c.qty - disc;
      }, 0);
      if (action.method === "UTANG") {
        return { ...state, activeDialog: { type: "utangCustomer", method: "UTANG", total } };
      }
      return { ...state, activeDialog: { type: "paymentConfirm", method: action.method, total } };
    }

    case "CONFIRM_PAYMENT": {
      const dialog = state.activeDialog;
      if (dialog?.type !== "paymentConfirm" && dialog?.type !== "utangCustomer") return state;

      const { method, total } = dialog;
      const customerName = action.customerName ?? (dialog as { customerName?: string }).customerName;
      const txId = genId();
      const now = Date.now();
      const isUtang = method === "UTANG";

      const newTransaction = {
        id: txId,
        date: now,
        total,
        paymentMethod: method,
        status: "COMPLETED" as const,
        ...(isUtang ? { debtStatus: "UNPAID" as const, customerName: customerName ?? "" } : {}),
      };

      const newItems = state.cart.map((c) => {
        const discAmount = calcDiscount(c.unitPrice, c.qty, c.discountType, c.discountValue);
        return {
          id: genId(),
          transactionId: txId,
          productId: c.productId,
          variantId: c.variantId,
          productName: c.productName,
          variantName: c.variantName,
          qty: c.qty,
          unitPrice: c.unitPrice,
          discountType: c.discountType,
          discountValue: c.discountValue,
          discountAmount: discAmount,
          subtotal: c.unitPrice * c.qty - discAmount,
        };
      });

      let ledgerType: "SALE" | "SALE_QRIS" | "SALE_DEBT";
      if (method === "CASH") ledgerType = "SALE";
      else if (method === "QRIS") ledgerType = "SALE_QRIS";
      else ledgerType = "SALE_DEBT";

      const ledgerEntry = {
        id: genId(),
        type: ledgerType,
        amount: total,
        referenceId: txId,
        description: `Sale #${state.transactions.length + 1}`,
        date: now,
      };

      // Accumulate raw material deductions via BOM for each cart item
      const rawMaterialDeductions: Record<string, number> = {};
      for (const cartItem of state.cart) {
        const bom = state.productComponents.filter((c) => c.menuItemId === cartItem.productId);
        for (const comp of bom) {
          rawMaterialDeductions[comp.rawMaterialId] =
            (rawMaterialDeductions[comp.rawMaterialId] ?? 0) + comp.qty * cartItem.qty;
        }
      }

      const newInventory = state.inventory.map((inv) => {
        // Direct product inventory deduction (for products tracked without BOM)
        const cartItem = state.cart.find(
          (c) => c.productId === inv.productId && (c.variantId ?? null) === (inv.variantId ?? null)
        );
        const hasBom = state.productComponents.some((c) => c.menuItemId === inv.productId);
        const directDeduction = cartItem && !hasBom ? cartItem.qty : 0;
        // Raw material deduction via BOM
        const rawDeduction = rawMaterialDeductions[inv.productId] ?? 0;
        const totalDeduction = directDeduction + rawDeduction;
        if (totalDeduction > 0) {
          return { ...inv, currentQty: Math.max(0, inv.currentQty - totalDeduction) };
        }
        return inv;
      });

      return {
        ...state,
        transactions: [...state.transactions, newTransaction],
        transactionItems: [...state.transactionItems, ...newItems],
        ledger: [...state.ledger, ledgerEntry],
        inventory: newInventory,
        cart: [],
        activeDialog: { type: "receipt", transactionId: txId },
      };
    }

    case "SETTLE_DEBT": {
      const tx = state.transactions.find((t) => t.id === action.transactionId);
      if (!tx || tx.debtStatus !== "UNPAID") return state;
      const now = Date.now();
      const ledgerType = action.paymentMethod === "QRIS" ? "DEBT_SETTLED_QRIS" as const : "DEBT_SETTLED" as const;
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.transactionId ? { ...t, debtStatus: "SETTLED" as const } : t
        ),
        ledger: [
          ...state.ledger,
          {
            id: genId(),
            type: ledgerType,
            amount: tx.total,
            referenceId: action.transactionId,
            description: `Debt settled: ${tx.customerName ?? ""}`,
            date: now,
          },
        ],
      };
    }

    case "ADD_PRODUCT": {
      const newProduct = { ...action.product, id: genId() };
      return { ...state, products: [...state.products, newProduct] };
    }

    case "UPDATE_PRODUCT":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, ...action.updates } : p
        ),
      };

    case "SET_PRODUCT_COMPONENTS":
      return {
        ...state,
        productComponents: [
          ...state.productComponents.filter((c) => c.menuItemId !== action.productId),
          ...action.components,
        ],
      };

    case "DELETE_PRODUCT":
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.id),
        variants: state.variants.filter((v) => v.productId !== action.id),
        inventory: state.inventory.filter((i) => i.productId !== action.id),
        productComponents: state.productComponents.filter(
          (c) => c.menuItemId !== action.id && c.rawMaterialId !== action.id
        ),
      };

    case "CLONE_PRODUCT": {
      const src = state.products.find((p) => p.id === action.id);
      if (!src) return state;
      const newId = genId();
      const clone = { ...src, id: newId, name: src.name + " (copy)" };
      const srcVariants = state.variants.filter((v) => v.productId === action.id);
      const clonedVariants = srcVariants.map((v) => ({ ...v, id: genId(), productId: newId }));
      const srcComponents = state.productComponents.filter((c) => c.menuItemId === action.id);
      const clonedComponents = srcComponents.map((c) => ({ ...c, menuItemId: newId }));
      return {
        ...state,
        products: [...state.products, clone],
        variants: [...state.variants, ...clonedVariants],
        productComponents: [...state.productComponents, ...clonedComponents],
      };
    }

    case "ADD_VARIANT": {
      const newVariant = { ...action.variant, id: genId() };
      return { ...state, variants: [...state.variants, newVariant] };
    }

    case "DELETE_VARIANT":
      return { ...state, variants: state.variants.filter((v) => v.id !== action.id) };

    case "UPDATE_INVENTORY":
      return {
        ...state,
        inventory: state.inventory.map((inv) =>
          inv.productId === action.productId &&
          (inv.variantId ?? null) === (action.variantId ?? null)
            ? { ...inv, currentQty: action.qty }
            : inv
        ),
      };

    case "ADJUST_INVENTORY": {
      const now = Date.now();
      const inv = state.inventory.find(
        (i) => i.productId === action.productId && (i.variantId ?? null) === (action.variantId ?? null)
      );
      const product = state.products.find((p) => p.id === action.productId);
      const diff = action.newQty - (inv?.currentQty ?? 0);
      return {
        ...state,
        inventory: state.inventory.map((i) =>
          i.productId === action.productId && (i.variantId ?? null) === (action.variantId ?? null)
            ? { ...i, currentQty: action.newQty }
            : i
        ),
        ledger: [
          ...state.ledger,
          {
            id: genId(),
            type: "ADJUSTMENT" as const,
            amount: diff,
            referenceId: action.productId,
            description: `Adjustment: ${product?.name ?? action.productId} — ${action.reason}`,
            date: now,
          },
        ],
      };
    }

    case "ADD_CATEGORY": {
      const newCat = { ...action.category, id: genId() };
      return { ...state, categories: [...state.categories, newCat] };
    }

    case "UPDATE_CATEGORY":
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.id ? { ...c, name: action.name } : c
        ),
      };

    case "DELETE_CATEGORY":
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        products: state.products.map((p) =>
          p.categoryId === action.id ? { ...p, categoryId: "" } : p
        ),
      };

    case "TOGGLE_PAYMENT_METHOD": {
      const pm = { ...state.paymentMethods };
      const key = action.method === "CASH" ? "cash" : action.method === "QRIS" ? "qris" : "utang";
      // Must keep at least one of cash/qris
      const cashQrisCount = [pm.cash, pm.qris].filter(Boolean).length;
      if (key !== "utang" && pm[key] && cashQrisCount <= 1) return state;
      pm[key] = !pm[key];
      return { ...state, paymentMethods: pm };
    }

    case "SET_DASHBOARD_PERIOD":
      return { ...state, dashboardPeriod: action.period };

    case "SET_DASHBOARD_DATE_RANGE":
      return {
        ...state,
        dashboardPeriod: "custom",
        dashboardDateRange: { from: action.from, to: action.to },
      };

    case "SET_INITIAL_BALANCE": {
      const now = Date.now();
      return {
        ...state,
        ledger: [
          ...state.ledger,
          {
            id: genId(),
            type: "INITIAL_BALANCE" as const,
            amount: action.amount,
            referenceId: null,
            description: "Initial cash balance",
            date: now,
          },
        ],
      };
    }

    case "ADD_VENDOR": {
      const newVendor = { ...action.vendor, id: genId() };
      return { ...state, vendors: [...state.vendors, newVendor] };
    }

    case "UPDATE_VENDOR":
      return {
        ...state,
        vendors: state.vendors.map((v) =>
          v.id === action.id ? { ...v, ...action.updates } : v
        ),
      };

    case "DELETE_VENDOR":
      return { ...state, vendors: state.vendors.filter((v) => v.id !== action.id) };

    case "ADD_GOODS_RECEIVING": {
      const now = Date.now();
      const id = genId();
      const receiving = { ...action.receiving, id };

      // Convert purchased quantity to the inventory's native unit
      function toInventoryQty(purchasedQty: number, purchasedUnit: string | undefined, inventoryUnit: string): number {
        if (!purchasedUnit || purchasedUnit === inventoryUnit) return purchasedQty;
        // kg → g
        if (purchasedUnit === "kg" && inventoryUnit === "g") return purchasedQty * 1000;
        // g → kg
        if (purchasedUnit === "g" && inventoryUnit === "kg") return purchasedQty / 1000;
        // L → mL
        if (purchasedUnit === "L" && inventoryUnit === "mL") return purchasedQty * 1000;
        // mL → L
        if (purchasedUnit === "mL" && inventoryUnit === "L") return purchasedQty / 1000;
        // No known conversion — use as-is
        return purchasedQty;
      }

      // Increment inventory for each item
      let newInventory = [...state.inventory];
      for (const item of receiving.items) {
        const idx = newInventory.findIndex(
          (i) => i.productId === item.productId && (i.variantId ?? null) === (item.variantId ?? null)
        );
        if (idx >= 0) {
          const converted = toInventoryQty(item.qty, item.unit, newInventory[idx].unit);
          newInventory[idx] = { ...newInventory[idx], currentQty: newInventory[idx].currentQty + converted };
        } else {
          newInventory.push({ productId: item.productId, variantId: item.variantId, currentQty: item.qty, minQty: 0, unit: item.unit ?? "pcs" });
        }
      }

      const ledgerEntry = {
        id: genId(),
        type: "COGS" as const,
        amount: -receiving.totalCost,
        referenceId: id,
        description: `Goods receiving from ${state.vendors.find((v) => v.id === receiving.vendorId)?.name ?? receiving.vendorId}`,
        date: now,
      };

      return {
        ...state,
        goodsReceivings: [...state.goodsReceivings, receiving],
        inventory: newInventory,
        ledger: [...state.ledger, ledgerEntry],
      };
    }

    case "OPEN_DIALOG":
      return { ...state, activeDialog: action.dialog };

    case "CLOSE_DIALOG":
      return { ...state, activeDialog: null };

    default:
      return state;
  }
}
