"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { usePlanLimits } from "../usePlanLimits";
import { formatRupiah } from "../utils";
import { createTransaction } from "@/lib/supabase/repositories/transactions";
import { calculateCashBalance, createLedgerEntry } from "@/lib/supabase/repositories/general-ledger";
import { createCashWithdrawal } from "@/lib/supabase/repositories/cash-withdrawals";
import { createCustomer } from "@/lib/supabase/repositories/customers";
import { adjustInventory } from "@/lib/supabase/repositories/inventory";
import { openCashierSession } from "@/lib/supabase/repositories/cashier-sessions";
import { verifyErpPinAction } from "@/app/ayakasir/actions/auth";
import type { DbTransaction, DbTransactionItem, DbGeneralLedger, DbCashWithdrawal, DbCustomer } from "@/lib/supabase/types";

type DiscountType = "NONE" | "AMOUNT" | "PERCENT";

interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  variantName: string | null;
  unitPrice: number;
  qty: number;
  discountType: DiscountType;
  discountValue: number; // raw input: rupiah for AMOUNT, percentage for PERCENT
}

function calcDiscountPerUnit(item: CartItem): number {
  if (item.discountType === "AMOUNT") return item.discountValue;
  if (item.discountType === "PERCENT") return Math.round(item.unitPrice * item.discountValue / 100);
  return 0;
}

function calcSubtotal(item: CartItem): number {
  return Math.max(0, (item.unitPrice - calcDiscountPerUnit(item)) * item.qty);
}

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "UTANG";

export default function PosScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const planLimits = usePlanLimits();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  // Customer dialog
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<DbCustomer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Tarik Tunai
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalReason, setWithdrawalReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawalMsg, setWithdrawalMsg] = useState<string | null>(null);

  // Cash payment calculator
  const [cashPaid, setCashPaid] = useState("");
  const [showCashCalc, setShowCashCalc] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);

  // Checkout / receipt
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStockConfirm, setShowStockConfirm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDate, setReceiptDate] = useState<Date | null>(null);
  const [txNote, setTxNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [variantPicker, setVariantPicker] = useState<string | null>(null);

  // Discount picker
  const [discountPickerIdx, setDiscountPickerIdx] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType>("NONE");
  const [discountValue, setDiscountValue] = useState("");

  // Open cashier session
  const [showOpenCashier, setShowOpenCashier] = useState(false);
  const [openBalance, setOpenBalance] = useState("");
  const [openPin, setOpenPin] = useState("");
  const [openingSession, setOpeningSession] = useState(false);
  const [openSessionError, setOpenSessionError] = useState<string | null>(null);

  const customerSearchRef = useRef<HTMLInputElement>(null);

  // Derive current active cashier session (null = locked)
  // Any unclosed session is considered active regardless of when it was opened
  const currentSession = state.cashierSessions.find((s) => s.closed_at === null) ?? null;

  // Enabled payment methods from tenant settings (comma-separated string)
  const enabledMethods = useMemo<Set<PaymentMethod>>(() => {
    const raw = state.restaurant?.enabled_payment_methods || "CASH";
    const set = new Set(raw.split(",").map((s) => s.trim()) as PaymentMethod[]);
    return set;
  }, [state.restaurant?.enabled_payment_methods]);

  // QRIS is only usable when merchant has configured both image and name
  const qrisReady = !!(state.restaurant?.qris_image_url?.trim() && state.restaurant?.qris_merchant_name?.trim());

  // Ensure current paymentMethod is always valid
  useEffect(() => {
    if (!enabledMethods.has(paymentMethod)) {
      const first = (["CASH", "QRIS", "TRANSFER", "UTANG"] as PaymentMethod[]).find((m) => enabledMethods.has(m));
      if (first) setPaymentMethod(first);
    }
  }, [enabledMethods, paymentMethod]);

  const menuProducts = useMemo(
    () => state.products.filter((p) => p.product_type === "MENU_ITEM" && p.is_active),
    [state.products]
  );

  const menuCategories = useMemo(
    () => state.categories.filter((c) => c.category_type === "MENU"),
    [state.categories]
  );

  const filteredProducts = useMemo(() => {
    let list = menuProducts;
    if (categoryFilter) list = list.filter((p) => p.category_id === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [menuProducts, categoryFilter, search]);

  // Group products by category when showing all (no category filter, no search)
  const groupedProducts = useMemo(() => {
    if (categoryFilter || search) return null;
    const groups: { categoryName: string; products: typeof filteredProducts }[] = [];
    const catIds = new Set(menuCategories.map((c) => c.id));
    for (const cat of menuCategories) {
      const catProducts = filteredProducts.filter((p) => p.category_id === cat.id);
      if (catProducts.length > 0) groups.push({ categoryName: cat.name, products: catProducts });
    }
    const uncategorized = filteredProducts.filter((p) => !p.category_id || !catIds.has(p.category_id));
    if (uncategorized.length > 0) groups.push({ categoryName: copy.products.noCategory, products: uncategorized });
    return groups;
  }, [filteredProducts, categoryFilter, search, menuCategories, copy.products.noCategory]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + calcSubtotal(item), 0),
    [cart]
  );

  // Check for insufficient raw material stock for BOM items (or direct inventory for non-BOM items)
  const outOfStockWarnings = useMemo(() => {
    const toBaseUnit = (qty: number, unit: string): number => {
      if (unit === "kg") return qty * 1000;
      if (unit === "L") return qty * 1000;
      return qty;
    };
    const findInv = (productId: string, variantId: string) => {
      if (variantId) {
        return state.inventory.find(
          (i) => i.product_id === productId && i.variant_id === variantId
        );
      }
      return state.inventory.find(
        (i) => i.product_id === productId && (!i.variant_id || i.variant_id === "")
      );
    };

    // Accumulate required quantities in base units, same logic as handleCheckout
    const required = new Map<string, { name: string; requiredBase: number; currentBase: number; unit: string }>();
    for (const item of cart) {
      const allComponents = state.productComponents.filter((c) => c.parent_product_id === item.productId);
      // Filter by parent_variant_id: shared (empty) always included; variant-specific only when matching sold variant
      const components = allComponents.filter((comp) => {
        if (!comp.parent_variant_id) return true; // shared — always include
        return item.variantId && comp.parent_variant_id === item.variantId;
      });
      if (components.length > 0) {
        for (const comp of components) {
          const compVarId = comp.component_variant_id || "";
          const inv = findInv(comp.component_product_id, compVarId);
          if (!inv) continue;
          const reqBase = toBaseUnit(comp.required_qty * item.qty, comp.unit || "pcs");
          const curBase = inv.current_qty;
          const key = `${comp.component_product_id}__${compVarId}`;
          const existing = required.get(key);
          const rawProduct = state.products.find((p) => p.id === comp.component_product_id);
          const compVariant = compVarId ? state.variants.find((v) => v.id === compVarId) : null;
          const displayName = compVariant ? `${rawProduct?.name ?? comp.component_product_id} (${compVariant.name})` : (rawProduct?.name ?? comp.component_product_id);
          required.set(key, {
            name: displayName,
            requiredBase: (existing?.requiredBase ?? 0) + reqBase,
            currentBase: curBase,
            unit: inv.unit,
          });
        }
      } else {
        const inv = findInv(item.productId, item.variantId);
        if (!inv) continue;
        const key = `${item.productId}__${item.variantId}`;
        const existing = required.get(key);
        required.set(key, {
          name: item.variantName ? `${item.name} (${item.variantName})` : item.name,
          requiredBase: (existing?.requiredBase ?? 0) + item.qty,
          currentBase: inv.current_qty,
          unit: inv.unit,
        });
      }
    }

    const warnings: string[] = [];
    for (const { name, requiredBase, currentBase } of required.values()) {
      if (currentBase < requiredBase) {
        warnings.push(name);
      }
    }
    return warnings;
  }, [cart, state.inventory, state.productComponents, state.products, state.variants]);

  // Customer search filtered from local state
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return state.customers.slice(0, 10);
    const q = customerSearch.toLowerCase();
    return state.customers
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q))
      .slice(0, 10);
  }, [state.customers, customerSearch]);

  const addToCart = useCallback(
    (productId: string, variantId = "", variantName: string | null = null) => {
      const product = state.products.find((p) => p.id === productId);
      if (!product) return;
      const variant = variantId ? state.variants.find((v) => v.id === variantId) : null;
      const unitPrice = product.price + (variant?.price_adjustment || 0);
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === productId && i.variantId === variantId);
        if (existing) return prev.map((i) => i === existing ? { ...i, qty: i.qty + 1 } : i);
        return [...prev, { productId, variantId, name: product.name, variantName: variantName || variant?.name || null, unitPrice, qty: 1, discountType: "NONE", discountValue: 0 }];
      });
    },
    [state.products, state.variants]
  );

  const handleProductClick = useCallback(
    (productId: string) => {
      const variants = state.variants.filter((v) => v.product_id === productId);
      if (variants.length > 0) setVariantPicker(productId);
      else addToCart(productId);
    },
    [state.variants, addToCart]
  );

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, qty: item.qty + delta } : item)).filter((item) => item.qty > 0)
    );
  };

  const openCustomerDialog = () => {
    setCustomerSearch("");
    setSelectedCustomer(null);
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setShowCustomerDialog(true);
    setTimeout(() => customerSearchRef.current?.focus(), 50);
  };

  const handleSaveNewCustomer = async () => {
    if (!newCustomerName.trim()) return;
    setSavingCustomer(true);
    try {
      const saved = await createCustomer(supabase, {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        organization_id: null,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        email: null,
        birthday: null,
        gender: null,
        category_id: null,
        notes: null,
      });
      dispatch({ type: "UPSERT", table: "customers", payload: saved as unknown as Record<string, unknown> });
      setSelectedCustomer(saved);
      setShowNewCustomerForm(false);
      setShowCustomerDialog(false);
      setShowCheckout(true);
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
    setSavingCustomer(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    if (!planLimits.canTransact) {
      alert(copy.plan.limitReached);
      return;
    }
    setProcessing(true);
    try {
      const now = Date.now();
      const txId = crypto.randomUUID();
      const userId = state.user?.id || "";

      const transaction: Omit<DbTransaction, "sync_status"> = {
        id: txId,
        tenant_id: tenantId,
        user_id: userId,
        date: now,
        total: cartTotal,
        payment_method: paymentMethod,
        status: "COMPLETED",
        customer_id: selectedCustomer?.id || null,
        debt_status: paymentMethod === "UTANG" ? "UNPAID" : null,
        notes: txNote.trim() || null,
        updated_at: now,
      };

      // Compute cogs_per_unit from live inventory avg_cogs before stock is deducted
      const toBaseForCogs = (qty: number, bomUnit: string, invUnit: string): number => {
        const b = bomUnit.toLowerCase(), i = invUnit.toLowerCase();
        if (b === i) return qty;
        if (b === "kg" && i === "g") return qty * 1000;
        if (b === "g" && i === "kg") return qty / 1000;
        if (b === "l" && i === "ml") return qty * 1000;
        if (b === "ml" && i === "l") return qty / 1000;
        return qty;
      };
      const calcCogsPerUnit = (productId: string, variantId: string): number => {
        const allComponents = state.productComponents.filter((c) => c.parent_product_id === productId);
        const components = allComponents.filter((c) => {
          if (!c.parent_variant_id) return true;
          return variantId && c.parent_variant_id === variantId;
        });
        if (components.length === 0) return 0;
        let total = 0;
        for (const comp of components) {
          const compVarId = comp.component_variant_id || "";
          const inv = state.inventory.find(
            (i) => i.product_id === comp.component_product_id && (i.variant_id === compVarId || (!i.variant_id && !compVarId))
          );
          if (!inv || inv.avg_cogs <= 0) continue;
          total += toBaseForCogs(comp.required_qty, comp.unit || "pcs", inv.unit || "pcs") * inv.avg_cogs;
        }
        return Math.round(total);
      };

      const items: Omit<DbTransactionItem, "sync_status">[] = cart.map((item) => {
        const discountPerUnit = calcDiscountPerUnit(item);
        return {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          transaction_id: txId,
          product_id: item.productId,
          variant_id: item.variantId,
          product_name: item.name,
          variant_name: item.variantName,
          qty: item.qty,
          unit_price: item.unitPrice,
          subtotal: calcSubtotal(item),
          discount_type: item.discountType,
          discount_value: item.discountType === "NONE" ? 0 : Math.round(item.discountValue),
          discount_per_unit: item.discountType === "NONE" ? 0 : discountPerUnit,
          cogs_per_unit: calcCogsPerUnit(item.productId, item.variantId),
          updated_at: now,
        };
      });

      const result = await createTransaction(supabase, transaction, items);
      dispatch({ type: "UPSERT", table: "transactions", payload: result.transaction as unknown as Record<string, unknown> });
      for (const item of result.items) {
        dispatch({ type: "UPSERT", table: "transactionItems", payload: item as unknown as Record<string, unknown> });
      }

      // Mirror mobile app ledger conventions:
      // CASH → SALE (positive amount, affects Saldo Kas)
      // QRIS → SALE_QRIS (positive amount, excluded from Saldo Kas)
      // TRANSFER → SALE_TRANSFER (non-cash, excluded from Saldo Kas)
      // UTANG → SALE_DEBT (amount=0, placeholder; cash only enters on DEBT_SETTLED)
      const ledgerType =
        paymentMethod === "CASH" ? "SALE" :
        paymentMethod === "QRIS" ? "SALE_QRIS" :
        paymentMethod === "TRANSFER" ? "SALE_TRANSFER" :
        "SALE_DEBT"; // UTANG
      const ledgerEntry: Omit<DbGeneralLedger, "sync_status"> = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: ledgerType,
        amount: paymentMethod === "UTANG" ? 0 : cartTotal,
        reference_id: txId,
        description:
          paymentMethod === "CASH" ? (locale === "id" ? "Penjualan tunai" : "Cash sale") :
          paymentMethod === "QRIS" ? (locale === "id" ? "Penjualan QRIS" : "QRIS sale") :
          paymentMethod === "TRANSFER" ? (locale === "id" ? "Penjualan transfer" : "Transfer sale") :
          (locale === "id" ? "Penjualan (utang)" : "Sale (debt)"),
        date: now,
        user_id: userId,
        updated_at: now,
      };
      const savedLedger = await createLedgerEntry(supabase, ledgerEntry);
      dispatch({ type: "UPSERT", table: "generalLedger", payload: savedLedger as unknown as Record<string, unknown> });

      // Deduct inventory: BOM-aware with unit conversion (mirrors mobile app logic)
      // Convert BOM qty to inventory's stored unit before accumulating
      const toBaseUnit = (qty: number, unit: string): { qty: number; base: string } => {
        if (unit === "kg") return { qty: qty * 1000, base: "g" };
        if (unit === "L") return { qty: qty * 1000, base: "mL" };
        return { qty, base: unit };
      };
      const fromBaseUnit = (qty: number, targetUnit: string): number => {
        if (targetUnit === "kg") return qty / 1000;
        if (targetUnit === "L") return qty / 1000;
        return qty;
      };
      // Accumulate in base units (g / mL / pcs) keyed by productId alone for raw materials
      // (raw material inventory rows have no variant — stored as "" or null)
      const deductionsBase = new Map<string, { qty: number; variantId: string }>();
      const findInv = (productId: string, variantId: string) => {
        if (variantId) {
          // Exact variant match first
          return state.inventory.find(
            (i) => i.product_id === productId && i.variant_id === variantId
          );
        }
        // No variant: match null or empty
        return state.inventory.find(
          (i) => i.product_id === productId && (!i.variant_id || i.variant_id === "")
        );
      };
      for (const item of cart) {
        const allComponents = state.productComponents.filter((c) => c.parent_product_id === item.productId);
        // Filter by parent_variant_id: shared (empty) always included; variant-specific only when matching sold variant
        const components = allComponents.filter((comp) => {
          if (!comp.parent_variant_id) return true; // shared — always include
          return item.variantId && comp.parent_variant_id === item.variantId;
        });
        if (components.length > 0) {
          for (const comp of components) {
            const compVarId = comp.component_variant_id || "";
            const key = `${comp.component_product_id}__${compVarId}`;
            const { qty: baseQty } = toBaseUnit(comp.required_qty * item.qty, comp.unit || "pcs");
            const existing = deductionsBase.get(key);
            deductionsBase.set(key, { qty: (existing?.qty || 0) + baseQty, variantId: compVarId });
          }
        } else {
          const key = `${item.productId}__${item.variantId}`;
          const existing = deductionsBase.get(key);
          deductionsBase.set(key, { qty: (existing?.qty || 0) + item.qty, variantId: item.variantId });
        }
      }
      for (const [key, { qty: baseQty, variantId }] of deductionsBase) {
        const productId = key.includes("__") ? key.split("__")[0] : key;
        const current = findInv(productId, variantId);
        if (!current) continue;
        // current_qty is always stored in base units (g/mL/pcs) regardless of unit display label
        const currentInBase = current.current_qty;
        const newBase = Math.max(0, currentInBase - baseQty);
        const newQty = newBase; // store back in base
        try {
          const updated = await adjustInventory(supabase, productId, current.variant_id ?? "", newQty);
          dispatch({ type: "UPSERT", table: "inventory", payload: updated as unknown as Record<string, unknown> });
        } catch (err) {
          console.error("Inventory deduction failed for", productId, err);
        }
      }

      setShowCheckout(false);
      setShowCashCalc(false);
      setReceiptDate(new Date());
      if (paymentMethod === "CASH") {
        setShowChangeDialog(true);
      } else {
        setShowReceipt(true);
      }
    } catch (err) {
      console.error("Transaction failed:", err);
    }
    setProcessing(false);
  };

  const handleNewTransaction = () => {
    setCart([]);
    setShowReceipt(false);
    setShowChangeDialog(false);
    setSelectedCustomer(null);
    setTxNote("");
    setPaymentMethod("CASH");
    setCashPaid("");
    setShowCashCalc(false);
    setShowCustomerDialog(false);
    setShowCheckout(false);
  };

  // Last closed session — used to scope Saldo Kas when no active session exists
  const lastClosedSession = useMemo(() => {
    if (currentSession) return null;
    const closed = state.cashierSessions.filter((s) => s.closed_at !== null);
    return closed.length > 0 ? closed.reduce((a, b) => ((a.closed_at ?? 0) > (b.closed_at ?? 0) ? a : b)) : null;
  }, [state.cashierSessions, currentSession]);

  const cashBalance = useMemo(() => {
    const CASH_TYPES = ["INITIAL_BALANCE", "SALE", "WITHDRAWAL", "ADJUSTMENT"];
    const scopeSession = currentSession ?? lastClosedSession;
    const entries = scopeSession
      ? state.generalLedger.filter((e) => CASH_TYPES.includes(e.type) && e.date >= scopeSession.opened_at)
      : state.generalLedger.filter((e) => CASH_TYPES.includes(e.type));
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }, [state.generalLedger, currentSession, lastClosedSession]);

  // Cash balance from last closed session — used to detect remaining cash from previous session
  const prevCashBalance = useMemo(() => {
    if (currentSession) return 0;
    const CASH_TYPES = ["INITIAL_BALANCE", "SALE", "WITHDRAWAL", "ADJUSTMENT"];
    const entries = lastClosedSession
      ? state.generalLedger.filter((e) => CASH_TYPES.includes(e.type) && e.date >= lastClosedSession.opened_at)
      : state.generalLedger.filter((e) => CASH_TYPES.includes(e.type));
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }, [state.generalLedger, currentSession, lastClosedSession]);

  const handleOpenCashierSession = async () => {
    setOpenSessionError(null);
    const amount = parseInt(openBalance.replace(/\./g, "").replace(/,/g, "")) || 0;
    if (prevCashBalance > 0 && amount < prevCashBalance) {
      setOpenSessionError(
        copy.pos.initialBalanceTooLow.replace("{amount}", formatRupiah(prevCashBalance))
      );
      return;
    }
    if (!openPin || openPin.length < 4) {
      setOpenSessionError(locale === "id" ? "PIN wajib diisi (min. 4 digit)." : "PIN is required (min. 4 digits).");
      return;
    }
    // Verify PIN against current user
    const user = state.user;
    if (!user) return;
    // Verify PIN via server action
    const ok = await verifyErpPinAction({ userId: user.id, pin: openPin });
    if (!ok) {
      setOpenSessionError(locale === "id" ? "PIN salah." : "Incorrect PIN.");
      return;
    }
    setOpeningSession(true);
    try {
      const now = Date.now();
      // Generate session ID upfront so INITIAL_BALANCE can reference it
      const sessionId = crypto.randomUUID();
      // Write INITIAL_BALANCE general_ledger entry linked to this session
      const ledgerEntry = await createLedgerEntry(supabase, {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: "INITIAL_BALANCE",
        amount,
        reference_id: sessionId,
        description: (() => {
          const d = new Date(now);
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          const dateStr = `${dd}/${mm}/${yyyy}`;
          return locale === "id" ? `Saldo awal — buka kasir (${dateStr})` : `Opening balance — open cashier (${dateStr})`;
        })(),
        date: now,
        user_id: user.id,
        updated_at: now,
      });
      dispatch({ type: "UPSERT", table: "generalLedger", payload: ledgerEntry as unknown as Record<string, unknown> });
      // Create cashier session row
      const session = await openCashierSession(supabase, {
        id: sessionId,
        tenant_id: tenantId,
        user_id: user.id,
        opened_at: now,
        initial_balance: amount,
        sync_status: "SYNCED",
        updated_at: now,
      });
      dispatch({ type: "UPSERT", table: "cashierSessions", payload: session as unknown as Record<string, unknown> });
      setShowOpenCashier(false);
      setOpenBalance("");
      setOpenPin("");
    } catch (err) {
      setOpenSessionError(err instanceof Error ? err.message : (locale === "id" ? "Terjadi kesalahan." : "An error occurred."));
    }
    setOpeningSession(false);
  };

  const handleWithdrawal = async () => {
    const amount = parseInt(withdrawalAmount);
    if (!amount || amount <= 0) return;
    if (amount > cashBalance) return;
    setWithdrawing(true);
    setWithdrawalMsg(null);
    try {
      const now = Date.now();
      const userId = state.user?.id || "";
      const withdrawalId = crypto.randomUUID();
      const reason = withdrawalReason.trim() || (locale === "id" ? "Tarik tunai" : "Cash withdrawal");

      const withdrawal: Omit<DbCashWithdrawal, "sync_status"> = {
        id: withdrawalId,
        tenant_id: tenantId,
        user_id: userId,
        amount,
        reason,
        date: now,
        updated_at: now,
      };
      const savedWithdrawal = await createCashWithdrawal(supabase, withdrawal);
      dispatch({ type: "UPSERT", table: "cashWithdrawals", payload: savedWithdrawal as unknown as Record<string, unknown> });

      const ledgerEntry: Omit<DbGeneralLedger, "sync_status"> = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: "WITHDRAWAL",
        amount: -amount,
        reference_id: withdrawalId,
        description: reason,
        date: now,
        user_id: userId,
        updated_at: now,
      };
      const savedLedger = await createLedgerEntry(supabase, ledgerEntry);
      dispatch({ type: "UPSERT", table: "generalLedger", payload: savedLedger as unknown as Record<string, unknown> });

      setWithdrawalMsg(copy.dashboard.withdrawalSuccess);
      setWithdrawalAmount("");
      setWithdrawalReason("");
      setTimeout(() => { setShowWithdrawal(false); setWithdrawalMsg(null); }, 1200);
    } catch (err) {
      console.error("Withdrawal failed:", err);
      setWithdrawalMsg(copy.common.error);
    }
    setWithdrawing(false);
  };

  const ALL_METHODS: { key: PaymentMethod; label: string }[] = [
    { key: "CASH", label: copy.pos.cash },
    { key: "QRIS", label: copy.pos.qris },
    { key: "TRANSFER", label: copy.pos.transfer },
    ...(planLimits.canUseUtang ? [{ key: "UTANG" as PaymentMethod, label: copy.pos.utang }] : []),
  ];

  return (
    <div className="erp-pos">

      {/* Session lock overlay */}
      {!currentSession && (
        <div className="erp-session-lock">
          <div className="erp-session-lock-card">
            <div className="erp-session-lock-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="erp-session-lock-title">{copy.pos.sessionLocked}</h2>
            <button
              className="erp-btn erp-btn--primary"
              onClick={() => { setOpenBalance(""); setOpenPin(""); setOpenSessionError(null); setShowOpenCashier(true); }}
            >
              {copy.pos.openCashier}
            </button>
          </div>
        </div>
      )}

      {/* Open Cashier dialog */}
      {showOpenCashier && (
        <div className="erp-overlay">
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.pos.openCashierTitle}</h3>
            </div>
            <div className="erp-dialog-body">
              <p style={{ color: "var(--erp-muted)", fontSize: 14, marginBottom: 16 }}>
                {copy.pos.openCashierHint}
              </p>
              {prevCashBalance > 0 && (
                <div className="erp-alert erp-alert--warning" style={{ marginBottom: 12 }}>
                  {copy.pos.prevCashBalanceInfo.replace("{amount}", formatRupiah(prevCashBalance))}
                </div>
              )}
              {openSessionError && (
                <div className="erp-alert erp-alert--error" style={{ marginBottom: 12 }}>{openSessionError}</div>
              )}
              <div className="erp-input-group">
                <label className="erp-label">{copy.pos.initialCashBalance}</label>
                <input
                  className="erp-input"
                  type="text"
                  inputMode="numeric"
                  value={openBalance}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    if (raw === "") { setOpenBalance(""); return; }
                    const num = parseInt(raw) || 0;
                    setOpenBalance(num.toLocaleString("id-ID"));
                  }}
                  placeholder="0"
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.pos.enterPin}</label>
                <input
                  className="erp-input"
                  type="password"
                  inputMode="numeric"
                  value={openPin}
                  onChange={(e) => setOpenPin(e.target.value)}
                  placeholder="••••••"
                  maxLength={8}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowOpenCashier(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleOpenCashierSession}
                disabled={openingSession || !openPin}
              >
                {openingSession ? copy.common.loading : copy.pos.openCashierBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product grid */}
      <div className="erp-pos-products">
        <div className="erp-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={copy.pos.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="erp-chips">
          <button
            className={`erp-chip${!categoryFilter ? " erp-chip--active" : ""}`}
            onClick={() => setCategoryFilter(null)}
          >
            {copy.pos.allCategories}
          </button>
          {menuCategories.map((c) => (
            <button
              key={c.id}
              className={`erp-chip${categoryFilter === c.id ? " erp-chip--active" : ""}`}
              onClick={() => setCategoryFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className={`erp-pos-grid${groupedProducts ? "" : " erp-pos-grid--flat"}`}>
          {groupedProducts ? (
            groupedProducts.map((group) => (
              <div key={group.categoryName} className="erp-pos-category-group">
                <div className="erp-pos-category-label">{group.categoryName}</div>
                <div className="erp-pos-category-items">
                  {group.products.map((p) => (
                    <div key={p.id} className="erp-pos-card" onClick={() => handleProductClick(p.id)}>
                      <div className="erp-pos-card-name">{p.name}</div>
                      <div className="erp-pos-card-price">{formatRupiah(p.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            filteredProducts.map((p) => (
              <div key={p.id} className="erp-pos-card" onClick={() => handleProductClick(p.id)}>
                <div className="erp-pos-card-name">{p.name}</div>
                <div className="erp-pos-card-price">{formatRupiah(p.price)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cart */}
      <div className="erp-pos-cart">
        <div className="erp-pos-cart-header">
          <span>{copy.pos.cart}</span>
          {cart.length > 0 && (
            <button className="erp-btn erp-btn--danger erp-btn--sm" onClick={() => setCart([])}>
              {copy.pos.clearCart}
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="erp-pos-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <p>{copy.pos.emptyCart}</p>
            <p style={{ fontSize: 13 }}>{copy.pos.addItems}</p>
          </div>
        ) : (
          <div className="erp-pos-cart-items">
            {cart.map((item, idx) => {
              const discountPerUnit = calcDiscountPerUnit(item);
              const subtotal = calcSubtotal(item);
              return (
                <div key={`${item.productId}-${item.variantId}`} className="erp-pos-cart-item">
                  <div className="erp-pos-cart-item-info">
                    <div className="erp-pos-cart-item-name">
                      {item.name}
                      {item.variantName && <span style={{ color: "var(--erp-muted)", fontSize: 12 }}> ({item.variantName})</span>}
                    </div>
                    <div className="erp-pos-cart-item-price-row">
                      <span className="erp-pos-cart-item-price">{formatRupiah(item.unitPrice)}</span>
                      <button
                        className={`erp-pos-discount-btn${item.discountType !== "NONE" ? " erp-pos-discount-btn--active" : ""}`}
                        onClick={() => {
                          setDiscountPickerIdx(idx);
                          setDiscountType(item.discountType === "NONE" ? "AMOUNT" : item.discountType);
                          setDiscountValue(item.discountType !== "NONE" ? String(item.discountValue) : "");
                        }}
                        title={copy.pos.discount}
                      >
                        %
                      </button>
                    </div>
                    {item.discountType !== "NONE" && (
                      <div className="erp-pos-cart-item-discount">
                        -{item.discountType === "PERCENT" ? `${item.discountValue}%` : formatRupiah(item.discountValue)}
                        <span style={{ color: "var(--erp-muted)", marginLeft: 4 }}>({formatRupiah(discountPerUnit)}/item)</span>
                      </div>
                    )}
                  </div>
                  <div className="erp-pos-cart-item-qty">
                    <button className="erp-pos-qty-btn" onClick={() => updateQty(idx, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button className="erp-pos-qty-btn" onClick={() => updateQty(idx, 1)}>+</button>
                  </div>
                  <div className="erp-pos-cart-item-subtotal">{formatRupiah(subtotal)}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="erp-pos-cart-footer">
          {cart.length > 0 && (
            <>
              <div className="erp-pos-total">
                <span className="erp-pos-total-label">{copy.pos.total}</span>
                <span className="erp-pos-total-value">{formatRupiah(cartTotal)}</span>
              </div>
              <button className="erp-btn erp-btn--primary erp-btn--full" onClick={openCustomerDialog}>
                {copy.pos.checkout}
              </button>
            </>
          )}
          <button
            className="erp-btn erp-btn--secondary erp-btn--full"
            style={{ marginTop: cart.length > 0 ? 8 : 0 }}
            onClick={() => { setShowWithdrawal(true); setWithdrawalMsg(null); }}
          >
            {copy.dashboard.cashWithdrawal}
          </button>
        </div>
      </div>

      {/* Discount picker dialog */}
      {discountPickerIdx !== null && (
        <div className="erp-overlay" onClick={() => setDiscountPickerIdx(null)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.pos.discount}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setDiscountPickerIdx(null)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-discount-type-row">
                {(["AMOUNT", "PERCENT"] as DiscountType[]).map((t) => (
                  <button
                    key={t}
                    className={`erp-btn erp-btn--secondary${discountType === t ? " erp-btn--active" : ""}`}
                    onClick={() => { setDiscountType(t); setDiscountValue(""); }}
                  >
                    {t === "AMOUNT" ? copy.pos.amountDiscount : copy.pos.percentDiscount}
                  </button>
                ))}
              </div>
              {(() => {
                const itemPrice = cart[discountPickerIdx!]?.unitPrice ?? 0;
                const val = parseFloat(discountValue) || 0;
                const overLimit = discountType === "PERCENT" ? val > 100 : val > itemPrice;
                const maxLabel = discountType === "PERCENT" ? "100%" : formatRupiah(itemPrice);
                return (
                  <div className="erp-input-group" style={{ marginTop: 16 }}>
                    <label className="erp-label">
                      {discountType === "AMOUNT"
                        ? `${copy.pos.amountDiscount} (Rp)`
                        : `${copy.pos.percentDiscount} (%)`}
                    </label>
                    <input
                      className={`erp-input${overLimit ? " erp-input--error" : ""}`}
                      type="number"
                      min="0"
                      max={discountType === "PERCENT" ? 100 : itemPrice}
                      step={discountType === "PERCENT" ? "0.01" : "1"}
                      inputMode={discountType === "AMOUNT" ? "numeric" : "decimal"}
                      value={discountValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (discountType === "AMOUNT" && v.includes(".")) return;
                        setDiscountValue(v);
                      }}
                      placeholder="0"
                      autoFocus
                    />
                    {overLimit && (
                      <span className="erp-input-hint erp-input-hint--error">
                        {locale === "id" ? `Maksimum ${maxLabel}` : `Maximum ${maxLabel}`}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="erp-dialog-footer">
              {(() => {
                const itemPrice = cart[discountPickerIdx!]?.unitPrice ?? 0;
                const val = parseFloat(discountValue) || 0;
                const overLimit = discountType === "PERCENT" ? val > 100 : val > itemPrice;
                return (
                  <button
                    className="erp-btn erp-btn--primary"
                    disabled={overLimit}
                    onClick={() => {
                      setCart((prev) => prev.map((item, i) =>
                        i === discountPickerIdx ? { ...item, discountType, discountValue: val } : item
                      ));
                      setDiscountPickerIdx(null);
                    }}
                  >
                    {copy.common.confirm}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Variant picker dialog */}
      {variantPicker && (
        <div className="erp-overlay" onClick={() => setVariantPicker(null)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.pos.selectVariant}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setVariantPicker(null)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              {state.variants.filter((v) => v.product_id === variantPicker).map((v) => {
                const product = state.products.find((p) => p.id === variantPicker);
                return (
                  <button
                    key={v.id}
                    className="erp-btn erp-btn--secondary erp-btn--full"
                    style={{ marginBottom: 8, justifyContent: "space-between" }}
                    onClick={() => { addToCart(variantPicker, v.id, v.name); setVariantPicker(null); }}
                  >
                    <span>{v.name}</span>
                    <span>{formatRupiah((product?.price || 0) + v.price_adjustment)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Customer search / add dialog */}
      {showCustomerDialog && (
        <div className="erp-overlay" onClick={() => setShowCustomerDialog(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.pos.searchCustomer}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCustomerDialog(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body" style={{ paddingBottom: 8 }}>
              {!showNewCustomerForm ? (
                <>
                  <div className="erp-search" style={{ marginBottom: 12 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      ref={customerSearchRef}
                      type="text"
                      placeholder={copy.pos.customerNamePlaceholder}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                  </div>
                  <div className="erp-pos-customer-list">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        className={`erp-pos-customer-row${selectedCustomer?.id === c.id ? " erp-pos-customer-row--active" : ""}`}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDialog(false);
                          setShowCheckout(true);
                        }}
                      >
                        <span className="erp-pos-customer-name">{c.name}</span>
                        {c.phone && <span className="erp-pos-customer-phone">{c.phone}</span>}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <p style={{ textAlign: "center", color: "var(--erp-muted)", fontSize: 13, padding: "12px 0" }}>
                        {copy.common.noData}
                      </p>
                    )}
                  </div>
                  <button
                    className="erp-btn erp-btn--ghost erp-btn--sm"
                    style={{ marginTop: 8 }}
                    onClick={() => { setShowNewCustomerForm(true); setNewCustomerName(customerSearch); }}
                  >
                    {copy.pos.newCustomer}
                  </button>
                </>
              ) : (
                <>
                  <div className="erp-input-group">
                    <label className="erp-label">{copy.products.name}</label>
                    <input
                      className="erp-input"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="erp-input-group">
                    <label className="erp-label">{copy.pos.customerPhone}</label>
                    <input
                      className="erp-input"
                      type="tel"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="erp-dialog-footer">
              {showNewCustomerForm ? (
                <>
                  <button className="erp-btn erp-btn--secondary" onClick={() => setShowNewCustomerForm(false)}>
                    {copy.common.back}
                  </button>
                  <button
                    className="erp-btn erp-btn--primary"
                    onClick={handleSaveNewCustomer}
                    disabled={savingCustomer || !newCustomerName.trim()}
                  >
                    {savingCustomer ? copy.common.loading : copy.common.save}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="erp-btn erp-btn--secondary"
                    onClick={() => { setSelectedCustomer(null); setShowCustomerDialog(false); setShowCheckout(true); }}
                  >
                    {locale === "id" ? "Lewati" : "Skip"}
                  </button>
                  <button
                    className="erp-btn erp-btn--primary"
                    onClick={() => { setShowCustomerDialog(false); setShowCheckout(true); }}
                    disabled={!selectedCustomer}
                  >
                    {copy.common.confirm}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout / payment dialog */}
      {showCheckout && (
        <div className="erp-overlay" onClick={() => setShowCheckout(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.pos.confirmPayment}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCheckout(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              {outOfStockWarnings.length > 0 && (
                <div className="erp-stock-warning" style={{ marginBottom: 16 }}>
                  <strong>{copy.pos.stockWarning}</strong>
                  <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
                    {outOfStockWarnings.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="erp-pos-total" style={{ marginBottom: 20 }}>
                <span className="erp-pos-total-label">{copy.pos.total}</span>
                <span className="erp-pos-total-value">{formatRupiah(cartTotal)}</span>
              </div>

              {selectedCustomer && (
                <div className="erp-input-group">
                  <label className="erp-label">{copy.pos.customerName}</label>
                  <div className="erp-pos-customer-badge">
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.phone && (
                      <span style={{ color: "var(--erp-muted)", fontSize: 12 }}>{selectedCustomer.phone}</span>
                    )}
                    <button
                      className="erp-btn erp-btn--ghost erp-btn--sm"
                      style={{ marginLeft: "auto", padding: "2px 8px" }}
                      onClick={() => { setSelectedCustomer(null); setShowCheckout(false); openCustomerDialog(); }}
                    >
                      {copy.common.edit}
                    </button>
                  </div>
                </div>
              )}

              <div className="erp-input-group">
                <label className="erp-label">{copy.pos.paymentMethod}</label>
                <div className="erp-payment-methods">
                  {ALL_METHODS.map(({ key, label }) => {
                    const enabled = enabledMethods.has(key) && (key !== "QRIS" || qrisReady);
                    const disabledTitle = !enabledMethods.has(key)
                      ? (locale === "id" ? "Metode tidak aktif" : "Method not enabled")
                      : key === "QRIS" && !qrisReady
                      ? (locale === "id" ? "QRIS belum dikonfigurasi" : "QRIS not configured")
                      : undefined;
                    return (
                      <button
                        key={key}
                        className={`erp-payment-btn${paymentMethod === key ? " erp-payment-btn--active" : ""}${!enabled ? " erp-payment-btn--disabled" : ""}`}
                        onClick={() => { if (enabled) { setPaymentMethod(key); setTxNote(""); } }}
                        disabled={!enabled}
                        title={disabledTitle}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(paymentMethod === "UTANG" || paymentMethod === "TRANSFER") && (
                <div className="erp-input-group">
                  <label className="erp-label">{copy.pos.utangNote}</label>
                  <input
                    className="erp-input"
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    placeholder={locale === "id" ? "Catatan tambahan..." : "Additional notes..."}
                  />
                </div>
              )}

            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowCheckout(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={() => {
                  if (paymentMethod === "CASH") {
                    setCashPaid("");
                    setShowCheckout(false);
                    setShowCashCalc(true);
                  } else if (outOfStockWarnings.length > 0) {
                    setShowStockConfirm(true);
                  } else {
                    handleCheckout();
                  }
                }}
                disabled={processing}
              >
                {processing ? copy.common.loading : copy.pos.confirmPayment}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock insufficient re-confirm dialog */}
      {showStockConfirm && (
        <div className="erp-overlay" onClick={() => setShowStockConfirm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.pos.confirmPayment}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowStockConfirm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ margin: 0, lineHeight: 1.6 }}>{copy.pos.stockConfirmProceed}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowStockConfirm(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={() => {
                  setShowStockConfirm(false);
                  if (paymentMethod === "CASH") {
                    setCashPaid("");
                    setShowCheckout(false);
                    setShowCashCalc(true);
                  } else {
                    handleCheckout();
                  }
                }}
                disabled={processing}
              >
                {processing ? copy.common.loading : copy.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash calculator dialog */}
      {showCashCalc && (() => {
        const paidNum = parseFloat(cashPaid) || 0;
        const change = paidNum - cartTotal;
        const handleNumpad = (val: string) => {
          if (val === "⌫") {
            setCashPaid((prev) => prev.slice(0, -1));
          } else if (val === "C") {
            setCashPaid("");
          } else {
            setCashPaid((prev) => {
              if (prev === "0") return val;
              return prev + val;
            });
          }
        };
        const quickAmounts = (() => {
          const base = cartTotal;
          const candidates = [
            Math.ceil(base / 1000) * 1000,
            Math.ceil(base / 5000) * 5000,
            Math.ceil(base / 10000) * 10000,
            Math.ceil(base / 50000) * 50000,
            Math.ceil(base / 100000) * 100000,
          ];
          const seen = new Set<number>();
          return candidates.filter((v) => {
            if (v <= 0 || seen.has(v)) return false;
            seen.add(v);
            return true;
          }).slice(0, 4);
        })();
        return (
          <div className="erp-overlay">
            <div className="erp-dialog erp-dialog--calc" onClick={(e) => e.stopPropagation()}>
              <div className="erp-dialog-header">
                <h3>{copy.pos.cashPaid}</h3>
                <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => { setShowCashCalc(false); setShowCheckout(true); }}>
                  {copy.common.close}
                </button>
              </div>
              <div className="erp-dialog-body erp-calc-body">
                {/* Screen */}
                <div className="erp-calc-screen">
                  <div className="erp-calc-screen-total">
                    <span className="erp-calc-screen-label">{copy.pos.total}</span>
                    <span className="erp-calc-screen-total-value">{formatRupiah(cartTotal)}</span>
                  </div>
                  <div className="erp-calc-screen-paid">
                    <span className="erp-calc-screen-label">{copy.pos.cashPaid}</span>
                    <span className="erp-calc-screen-paid-value">{cashPaid ? formatRupiah(paidNum) : "—"}</span>
                  </div>
                  {cashPaid !== "" && (
                    <div className={`erp-calc-screen-change${change < 0 ? " erp-calc-screen-change--neg" : ""}`}>
                      <span className="erp-calc-screen-label">{copy.pos.cashChange}</span>
                      <span className="erp-calc-screen-change-value">
                        {change < 0 ? `−${formatRupiah(Math.abs(change))}` : formatRupiah(change)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick amount chips */}
                <div className="erp-calc-quick">
                  {quickAmounts.map((amt) => (
                    <button key={amt} className="erp-calc-quick-btn" onClick={() => setCashPaid(String(amt))}>
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>

                {/* Numpad */}
                <div className="erp-calc-numpad">
                  {["7","8","9","4","5","6","1","2","3","C","0","⌫"].map((k) => (
                    <button
                      key={k}
                      className={`erp-calc-key${k === "C" ? " erp-calc-key--clear" : ""}${k === "⌫" ? " erp-calc-key--back" : ""}`}
                      onClick={() => handleNumpad(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
              <div className="erp-dialog-footer">
                <button className="erp-btn erp-btn--secondary" onClick={() => { setShowCashCalc(false); setShowCheckout(true); }}>
                  {copy.common.cancel}
                </button>
                <button
                  className="erp-btn erp-btn--primary"
                  onClick={() => { if (cashPaid === "") setCashPaid(String(cartTotal)); handleCheckout(); }}
                  disabled={processing || (cashPaid !== "" && paidNum < cartTotal)}
                >
                  {processing ? copy.common.loading : copy.pos.confirmPayment}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cash change dialog */}
      {showChangeDialog && (() => {
        const paidNum = parseFloat(cashPaid) || 0;
        const change = Math.max(0, paidNum - cartTotal);
        return (
          <div className="erp-overlay">
            <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
              <div className="erp-dialog-header">
                <h3>{copy.pos.paymentSuccess}</h3>
              </div>
              <div className="erp-dialog-body" style={{ textAlign: "center" }}>
                {cashPaid !== "" && paidNum > 0 && (
                  <>
                    <div className="erp-change-paid-row">
                      <span>{copy.pos.cashPaid}</span>
                      <span>{formatRupiah(paidNum)}</span>
                    </div>
                    <div className="erp-change-amount-block">
                      <div className="erp-change-label">{copy.pos.cashChange}</div>
                      <div className="erp-change-value">{formatRupiah(change)}</div>
                    </div>
                  </>
                )}
                {(cashPaid === "" || paidNum === 0) && (
                  <p style={{ margin: 0, color: "var(--erp-muted)" }}>{copy.pos.paymentSuccess}</p>
                )}
              </div>
              <div className="erp-dialog-footer" style={{ flexDirection: "column", gap: 8 }}>
                <button
                  className="erp-btn erp-btn--primary"
                  style={{ width: "100%" }}
                  onClick={() => { setShowChangeDialog(false); setShowReceipt(true); }}
                >
                  {copy.pos.printReceipt}
                </button>
                <button
                  className="erp-btn erp-btn--secondary"
                  style={{ width: "100%" }}
                  onClick={handleNewTransaction}
                >
                  {copy.pos.newTransaction}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tarik Tunai dialog */}
      {showWithdrawal && (
        <div className="erp-overlay" onClick={() => setShowWithdrawal(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.dashboard.cashWithdrawal}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowWithdrawal(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-card erp-card--stat" style={{ marginBottom: 20 }}>
                <span className="erp-card-label">{copy.dashboard.cashBalance}</span>
                <span className={`erp-card-value${cashBalance >= 0 ? " erp-card-value--success" : " erp-card-value--danger"}`}>
                  {formatRupiah(cashBalance)}
                </span>
              </div>
              {(() => {
                const amt = parseInt(withdrawalAmount) || 0;
                const overLimit = amt > cashBalance;
                return (
                  <>
                    <div className="erp-input-group">
                      <label className="erp-label">{copy.dashboard.withdrawalAmount}</label>
                      <input
                        className={`erp-input${overLimit ? " erp-input--error" : ""}`}
                        type="number"
                        min="1"
                        max={cashBalance}
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="0"
                        autoFocus
                      />
                      {overLimit && (
                        <span className="erp-input-hint erp-input-hint--error">
                          {locale === "id"
                            ? `Maksimum ${formatRupiah(cashBalance)}`
                            : `Maximum ${formatRupiah(cashBalance)}`}
                        </span>
                      )}
                    </div>
                    <div className="erp-input-group">
                      <label className="erp-label">{copy.dashboard.withdrawalReason}</label>
                      <input
                        className="erp-input"
                        value={withdrawalReason}
                        onChange={(e) => setWithdrawalReason(e.target.value)}
                        placeholder={locale === "id" ? "Tarik tunai..." : "Cash withdrawal..."}
                      />
                    </div>
                    {withdrawalMsg && (
                      <div className={`erp-alert erp-alert--${withdrawalMsg === copy.common.error ? "error" : "success"}`}>
                        {withdrawalMsg}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowWithdrawal(false)}>
                {copy.common.cancel}
              </button>
              {(() => {
                const amt = parseInt(withdrawalAmount) || 0;
                const overLimit = amt > cashBalance;
                return (
                  <button
                    key="withdraw-btn"
                    className="erp-btn erp-btn--primary"
                    onClick={handleWithdrawal}
                    disabled={withdrawing || !withdrawalAmount || amt <= 0 || overLimit}
                  >
                    {withdrawing ? copy.common.loading : copy.dashboard.cashWithdrawal}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Receipt dialog */}
      {showReceipt && (
        <div className="erp-overlay">
          <div className="erp-dialog">
            <div className="erp-dialog-header">
              <h3>{paymentMethod === "UTANG" ? (locale === "id" ? "Transaksi Dicatat" : "Transaction Recorded") : copy.pos.paymentSuccess}</h3>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-receipt">
                <div className="erp-receipt-header">{state.restaurant?.name || "AyaKasir"}</div>
                {receiptDate && (
                  <div style={{ textAlign: "center", fontSize: 12, marginBottom: 2 }}>
                    {receiptDate.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    {" "}
                    {receiptDate.toLocaleTimeString(locale === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                )}
                {state.user?.name && (
                  <div style={{ textAlign: "center", fontSize: 12, marginBottom: 4 }}>
                    {locale === "id" ? "Kasir" : "Cashier"}: {state.user.name}
                  </div>
                )}
                <div className="erp-receipt-divider">================================</div>
                {cart.map((item, i) => {
                  const discountPerUnit = calcDiscountPerUnit(item);
                  const subtotal = calcSubtotal(item);
                  return (
                    <div key={i}>
                      <div>{item.name}{item.variantName ? ` (${item.variantName})` : ""}</div>
                      <div className="erp-receipt-row">
                        <span>{item.qty} x {formatRupiah(item.unitPrice)}</span>
                        <span>{formatRupiah(item.unitPrice * item.qty)}</span>
                      </div>
                      {item.discountType !== "NONE" && (
                        <div className="erp-receipt-row" style={{ color: "#e53e3e" }}>
                          <span>
                            {locale === "id" ? "Diskon" : "Discount"}
                            {item.discountType === "PERCENT" ? ` ${item.discountValue}%` : ""}{" "}
                            (-{formatRupiah(discountPerUnit)}/item)
                          </span>
                          <span>-{formatRupiah(discountPerUnit * item.qty)}</span>
                        </div>
                      )}
                      {item.discountType !== "NONE" && (
                        <div className="erp-receipt-row" style={{ fontWeight: 600 }}>
                          <span>{locale === "id" ? "Subtotal" : "Subtotal"}</span>
                          <span>{formatRupiah(subtotal)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="erp-receipt-divider">================================</div>
                <div className="erp-receipt-row erp-receipt-total">
                  <span>GRAND TOTAL</span>
                  <span>{formatRupiah(cartTotal)}</span>
                </div>
                <div className="erp-receipt-row" style={{ fontSize: 12, marginTop: 4 }}>
                  <span>{locale === "id" ? "Metode Bayar" : "Payment"}</span>
                  <span>{paymentMethod}</span>
                </div>
                {paymentMethod === "CASH" && cashPaid !== "" && parseFloat(cashPaid) > 0 && (
                  <>
                    <div className="erp-receipt-row" style={{ fontSize: 12, marginTop: 2 }}>
                      <span>{copy.pos.cashPaid}</span>
                      <span>{formatRupiah(parseFloat(cashPaid))}</span>
                    </div>
                    <div className="erp-receipt-row" style={{ fontSize: 12, marginTop: 2, fontWeight: 600 }}>
                      <span>{copy.pos.cashChange}</span>
                      <span>{formatRupiah(Math.max(0, parseFloat(cashPaid) - cartTotal))}</span>
                    </div>
                  </>
                )}
                {selectedCustomer && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {copy.pos.customerName}: {selectedCustomer.name}
                  </div>
                )}
                {paymentMethod === "UTANG" && (
                  <div style={{ marginTop: 8, padding: "6px 8px", border: "1px dashed #e53e3e", borderRadius: 4, fontSize: 12, color: "#e53e3e", fontWeight: 600, textAlign: "center" }}>
                    {locale === "id" ? "*** BELUM LUNAS (UTANG) ***" : "*** UNPAID DEBT ***"}
                  </div>
                )}
                <div className="erp-receipt-footer">Dicetak melalui aplikasi AyaKasir</div>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => window.print()}>
                {copy.pos.printReceipt}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleNewTransaction}>
                {copy.pos.newTransaction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
