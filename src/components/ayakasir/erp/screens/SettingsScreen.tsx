"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah, formatDateTime } from "../utils";
import { createLedgerEntry, deleteInitialBalanceEntries, calculateCashBalance } from "@/lib/supabase/repositories/general-ledger";
import { createCashWithdrawal } from "@/lib/supabase/repositories/cash-withdrawals";
import {
  changeErpPasswordAction,
  upsertTenantUserAction,
  deleteTenantUserAction,
  updateQrisSettingsAction,
} from "@/app/ayakasir/actions/auth";
import type { DbGeneralLedger, DbTenant, DbUser } from "@/lib/supabase/types";

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER" | "UTANG";

const ALL_FEATURES = ["POS", "DASHBOARD", "MENU", "INVENTORY", "PURCHASING", "CUSTOMERS", "SETTINGS"] as const;
type UserFeature = typeof ALL_FEATURES[number];
const DEFAULT_CASHIER_FEATURES: UserFeature[] = ["POS", "INVENTORY"];

function parseFeatureAccess(raw: string | null | undefined): UserFeature[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter((s): s is UserFeature => (ALL_FEATURES as readonly string[]).includes(s));
}

export default function SettingsScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const router = useRouter();

  // ── Common ───────────────────────────────────────────────────
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = state.user?.role === "OWNER";

  // ── Initial Balance ──────────────────────────────────────────
  const [showInitialBalance, setShowInitialBalance] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState("");

  const currentInitialBalance = useMemo(
    () =>
      state.generalLedger
        .filter((e) => e.type === "INITIAL_BALANCE")
        .reduce((sum, e) => sum + e.amount, 0),
    [state.generalLedger]
  );

  const openInitialBalance = useCallback(() => {
    setBalanceAmount(currentInitialBalance > 0 ? String(currentInitialBalance) : "");
    setShowInitialBalance(true);
  }, [currentInitialBalance]);

  // ── Payment methods ──────────────────────────────────────────
  const enabledMethods = useMemo<Set<PaymentMethod>>(() => {
    const raw = state.restaurant?.enabled_payment_methods || "CASH";
    return new Set(raw.split(",").map((s) => s.trim()) as PaymentMethod[]);
  }, [state.restaurant?.enabled_payment_methods]);

  const [togglingMethod, setTogglingMethod] = useState<PaymentMethod | null>(null);

  // ── CSV Export ───────────────────────────────────────────────
  const [showCsvDialog, setShowCsvDialog] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [csvFrom, setCsvFrom] = useState(todayStr);
  const [csvTo, setCsvTo] = useState(todayStr);
  const exportLookups = useMemo(() => {
    const txMap = new Map(state.transactions.map((t) => [t.id, t]));
    const customerMap = new Map(state.customers.map((c) => [c.id, c]));
    const customerCatMap = new Map(state.customerCategories.map((cc) => [cc.id, cc]));
    const productMap = new Map(state.products.map((p) => [p.id, p]));
    const categoryMap = new Map(state.categories.map((c) => [c.id, c]));
    const userMap = new Map(state.tenantUsers.map((u) => [u.id, u]));
    const txItemsByTx = new Map<string, typeof state.transactionItems>();
    for (const item of state.transactionItems) {
      if (!txItemsByTx.has(item.transaction_id)) txItemsByTx.set(item.transaction_id, []);
      txItemsByTx.get(item.transaction_id)!.push(item);
    }
    return { txMap, customerMap, customerCatMap, productMap, categoryMap, txItemsByTx, userMap };
  }, [
    state.transactions,
    state.customers,
    state.customerCategories,
    state.products,
    state.categories,
    state.transactionItems,
    state.tenantUsers,
  ]);

  // ── Close Cashier ────────────────────────────────────────────
  const [showCloseCashier, setShowCloseCashier] = useState(false);
  const [closeMatch, setCloseMatch] = useState<boolean | null>(null);
  const [closeMismatchNote, setCloseMismatchNote] = useState("");
  const [showCashReset, setShowCashReset] = useState(false);
  const [showCloseReport, setShowCloseReport] = useState(false);

  const closeCashierSummary = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const fromMs = todayStart.getTime();

    const todayTx = state.transactions.filter(
      (t) => t.date >= fromMs && t.date <= now && t.status === "COMPLETED"
    );

    const byMethod: Record<string, number> = {};
    for (const tx of todayTx) {
      const m = tx.payment_method || "CASH";
      byMethod[m] = (byMethod[m] || 0) + tx.total;
    }

    // Closing balance = all-time cash balance, same formula as Dashboard
    const closingBalance = calculateCashBalance(state.generalLedger);

    return {
      closeTime: now,
      cashier: state.user?.name || state.user?.email || "—",
      openingBalance: currentInitialBalance,
      closingBalance,
      totalTransactions: todayTx.length,
      byMethod,
    };
  }, [state.transactions, state.generalLedger, state.user, currentInitialBalance]);

  const handleOpenCloseCashier = () => {
    setCloseMatch(null);
    setCloseMismatchNote("");
    setShowCloseCashier(true);
  };

  // After match confirmed → ask about cash reset before showing report
  const handleConfirmClose = () => {
    setShowCloseCashier(false);
    setShowCashReset(true);
  };

  const handleCashResetChoice = async (resetToZero: boolean) => {
    setShowCashReset(false);
    if (resetToZero) {
      const currentBalance = closeCashierSummary.closingBalance;
      if (currentBalance !== 0) {
        const now = Date.now();
        const userId = state.user?.id || "";
        const reason = locale === "id"
          ? `Ambil kas — tutup kasir (${new Date(now).toLocaleDateString("id-ID")})`
          : `Cash withdrawal — cashier close (${new Date(now).toLocaleDateString("en-US")})`;

        // 1. Record in cash_withdrawals table (positive amount = how much was taken out)
        const withdrawal = await createCashWithdrawal(supabase, {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          user_id: userId,
          amount: currentBalance,
          reason,
          date: now,
          updated_at: now,
        });
        dispatch({ type: "UPSERT", table: "cashWithdrawals", payload: withdrawal as unknown as Record<string, unknown> });

        // 2. Record WITHDRAWAL in general_ledger (negative amount — reduces cash balance to 0)
        const entry: Omit<DbGeneralLedger, "sync_status"> = {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          type: "WITHDRAWAL",
          amount: -currentBalance,
          reference_id: null,
          description: reason,
          date: now,
          user_id: userId,
          updated_at: now,
        };
        const saved = await createLedgerEntry(supabase, entry);
        dispatch({ type: "UPSERT", table: "generalLedger", payload: saved as unknown as Record<string, unknown> });
      }
    }
    setShowCloseReport(true);
  };

  const handleDownloadReport = () => {
    const s = closeCashierSummary;
    const matchText = closeMatch === true
      ? copy.settings.matchYes
      : closeMatch === false
      ? `${copy.settings.matchNo}${closeMismatchNote ? ` — ${closeMismatchNote}` : ""}`
      : "—";

    const methodRows = Object.entries(s.byMethod)
      .map(([m, amt]) => `      <tr><td>${m}</td><td style="text-align:right">${formatRupiah(amt)}</td></tr>`)
      .join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${copy.settings.closeCashierReport}</title>
  <style>
    body { font-family: 'Courier New', monospace; font-size: 13px; padding: 32px; max-width: 480px; margin: 0 auto; }
    h2 { text-align: center; margin-bottom: 4px; }
    .sub { text-align: center; color: #666; margin-bottom: 24px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    td { padding: 6px 4px; border-bottom: 1px solid #eee; font-size: 13px; }
    td:last-child { text-align: right; }
    .section { font-weight: bold; padding: 10px 4px 4px; border-top: 2px solid #000; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
    .total td { font-weight: bold; border-top: 2px solid #000; }
    .match { margin-top: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
    .match-label { font-weight: bold; margin-bottom: 4px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h2>${state.restaurant?.name || "AyaKasir"}</h2>
  <p class="sub">${copy.settings.closeCashierReport}</p>
  <table>
    <tr><td>${copy.settings.closeTime}</td><td>${formatDateTime(s.closeTime, locale)}</td></tr>
    <tr><td>${copy.settings.cashierInCharge}</td><td>${s.cashier}</td></tr>
    <tr><td>${copy.settings.totalTransactions}</td><td>${s.totalTransactions}</td></tr>
  </table>
  <table>
    <tr><td class="section" colspan="2">${copy.settings.paymentBreakdown}</td></tr>
    ${methodRows}
  </table>
  <table>
    <tr><td>${copy.settings.openingBalance}</td><td>${formatRupiah(s.openingBalance)}</td></tr>
    <tr class="total"><td>${copy.settings.closingBalance}</td><td>${formatRupiah(s.closingBalance)}</td></tr>
  </table>
  <div class="match">
    <div class="match-label">${copy.settings.matchQuestion}</div>
    <div>${matchText}</div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date(s.closeTime).toISOString().split("T")[0];
    a.href = url;
    a.download = `kasir_report_${dateStr}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // ── Change password ──────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // ── QRIS settings ────────────────────────────────────────────
  const [showQris, setShowQris] = useState(false);
  const [qrisMerchantName, setQrisMerchantName] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");

  const openQrisDialog = useCallback(() => {
    setQrisMerchantName(state.restaurant?.qris_merchant_name || "");
    setQrisImageUrl(state.restaurant?.qris_image_url || "");
    setShowQris(true);
  }, [state.restaurant]);

  // ── User management ──────────────────────────────────────────
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "CASHIER" as "OWNER" | "CASHIER",
    password: "",
    isActive: true,
    featureAccess: DEFAULT_CASHIER_FEATURES as UserFeature[],
  });
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState<string | null>(null);

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: "", email: "", phone: "", role: "CASHIER", password: "", isActive: true, featureAccess: DEFAULT_CASHIER_FEATURES });
    setShowUserDialog(true);
  };

  const openEditUser = (u: DbUser) => {
    setEditingUser(u);
    setUserForm({
      name: u.name,
      email: u.email || "",
      phone: u.phone || "",
      role: u.role,
      password: "",
      isActive: u.is_active,
      featureAccess: parseFeatureAccess(u.feature_access),
    });
    setShowUserDialog(true);
  };

  const toggleFeature = (feature: UserFeature) => {
    setUserForm((f) => {
      const has = f.featureAccess.includes(feature);
      return {
        ...f,
        featureAccess: has
          ? f.featureAccess.filter((x) => x !== feature)
          : [...f.featureAccess, feature],
      };
    });
  };

  // ── Handlers ─────────────────────────────────────────────────

  const handleTogglePaymentMethod = async (method: PaymentMethod) => {
    if (!state.restaurant) return;
    setTogglingMethod(null);
    const next = new Set(enabledMethods);
    if (next.has(method)) {
      // Would be disabling — ensure at least 1 non-UTANG method remains
      const afterDisable = new Set(next);
      afterDisable.delete(method);
      const hasNonUtang = [...afterDisable].some((m) => m !== "UTANG");
      if (!hasNonUtang) {
        setTogglingMethod(null);
        return;
      }
      next.delete(method);
    } else {
      next.add(method);
    }
    setTogglingMethod(method);
    const newValue = Array.from(next).join(",");
    try {
      const { data, error } = await supabase
        .from("tenants")
        .update({ enabled_payment_methods: newValue, updated_at: Date.now(), sync_status: "SYNCED" })
        .eq("id", state.restaurant.id)
        .select()
        .single();
      if (!error && data) {
        dispatch({ type: "SET_RESTAURANT", payload: data as DbTenant });
      }
    } catch (err) {
      console.error("Failed to update payment methods:", err);
    }
    setTogglingMethod(null);
  };

  const handleSetInitialBalance = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const amount = parseInt(balanceAmount) || 0;
      const existingIds = state.generalLedger
        .filter((e) => e.type === "INITIAL_BALANCE")
        .map((e) => e.id);
      await deleteInitialBalanceEntries(supabase, tenantId);
      for (const id of existingIds) {
        dispatch({ type: "DELETE", table: "generalLedger", id });
      }
      const entry: Omit<DbGeneralLedger, "sync_status"> = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: "INITIAL_BALANCE",
        amount,
        reference_id: null,
        description: "Initial balance",
        date: Date.now(),
        user_id: state.user?.id || "",
        updated_at: Date.now(),
      };
      const saved = await createLedgerEntry(supabase, entry);
      dispatch({ type: "UPSERT", table: "generalLedger", payload: saved as unknown as Record<string, unknown> });
      setShowInitialBalance(false);
      setMessage({ type: "success", text: copy.common.success });
    } catch {
      setMessage({ type: "error", text: copy.common.error });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPw) {
      setMessage({
        type: "error",
        text: locale === "id" ? "Password saat ini wajib diisi" : "Current password is required",
      });
      return;
    }
    if (newPw !== confirmPw) {
      setMessage({ type: "error", text: locale === "id" ? "Password baru tidak cocok" : "Passwords don't match" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await changeErpPasswordAction({ currentPassword: currentPw, newPassword: newPw, locale });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message || copy.common.error });
        setSaving(false);
        return;
      }
      setShowChangePassword(false);
      setMessage({ type: "success", text: result.message || copy.common.success });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      setMessage({ type: "error", text: (err as Error).message || copy.common.error });
    }
    setSaving(false);
  };

  const handleSaveQris = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateQrisSettingsAction({ qrisMerchantName, qrisImageUrl });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message || copy.common.error });
        setSaving(false);
        return;
      }
      if (result.tenant) {
        dispatch({ type: "SET_RESTAURANT", payload: result.tenant as unknown as DbTenant });
      }
      setShowQris(false);
      setMessage({ type: "success", text: copy.settings.qrisSaved });
    } catch {
      setMessage({ type: "error", text: copy.common.error });
    }
    setSaving(false);
  };

  const handleSaveUser = async () => {
    // Email validation
    if (userForm.email && !userForm.email.includes("@")) {
      setMessage({
        type: "error",
        text: locale === "id" ? "Format email tidak valid." : "Invalid email format.",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const featureAccessStr = userForm.role === "OWNER"
        ? null
        : userForm.featureAccess.length > 0 ? userForm.featureAccess.join(",") : null;
      const result = await upsertTenantUserAction({
        id: editingUser?.id,
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone,
        role: userForm.role,
        password: userForm.password || undefined,
        isActive: userForm.isActive,
        featureAccess: featureAccessStr,
        tenantId,
      });
      if (!result.ok) {
        setMessage({ type: "error", text: result.message || copy.common.error });
        setSaving(false);
        return;
      }
      // Re-fetch tenant users for instant UI update
      const { data: refreshed } = await supabase
        .from("users")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (refreshed) {
        dispatch({ type: "SET_ALL", payload: { tenantUsers: refreshed as DbUser[] } });
      }
      setShowUserDialog(false);
      setMessage({ type: "success", text: copy.common.success });
    } catch {
      setMessage({ type: "error", text: copy.common.error });
    }
    setSaving(false);
  };

  const handleDeleteUser = async (userId: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await deleteTenantUserAction(userId);
      if (!result.ok) {
        setMessage({ type: "error", text: result.message || copy.common.error });
        setSaving(false);
        return;
      }
      dispatch({ type: "DELETE", table: "tenantUsers", id: userId });
      setShowDeleteUserConfirm(null);
      setMessage({ type: "success", text: copy.common.success });
    } catch {
      setMessage({ type: "error", text: copy.common.error });
    }
    setSaving(false);
  };

  const handleExportCsv = () => {
    const fromMs = new Date(csvFrom + "T00:00:00").getTime();
    const toMs = new Date(csvTo + "T23:59:59.999").getTime();

    const { txMap, customerMap, customerCatMap, productMap, categoryMap, txItemsByTx, userMap } = exportLookups;

    const filtered = state.generalLedger.filter((e) => e.date >= fromMs && e.date <= toMs);

    const escape = (s: string | null | undefined) => `"${(s || "").replace(/"/g, '""')}"`;

    const headers = "id,reference_id,tenant_name,date,type,description,customer_category,customer_name,product_category,product_name,variant_name,qty,unit_price,discount_type,discount_value,discount_per_unit,amount,payment_method,transaction_notes,person_in_charge";

    const rows = filtered.map((e) => {
      const tx = e.reference_id ? txMap.get(e.reference_id) : undefined;
      const customer = tx?.customer_id ? customerMap.get(tx.customer_id) : undefined;
      const customerCat = customer?.category_id ? customerCatMap.get(customer.category_id) : undefined;
      const txItems = e.reference_id ? (txItemsByTx.get(e.reference_id) || []) : [];

      // For SALE/COGS types, try to enrich with first matching transaction item
      const isItemType = e.type === "SALE" || e.type === "SALE_QRIS" || e.type === "SALE_TRANSFER" || e.type === "SALE_DEBT" || e.type === "COGS";
      const item = isItemType && txItems.length > 0 ? txItems[0] : undefined;
      const product = item ? productMap.get(item.product_id) : undefined;
      const category = product?.category_id ? categoryMap.get(product.category_id) : undefined;
      const personInCharge = userMap.get(tx?.user_id || e.user_id)?.name || state.user?.name || "";

      return [
        e.id,
        e.reference_id || "",
        escape(state.restaurant?.name),
        new Date(e.date).toISOString(),
        e.type,
        escape(e.description),
        escape(customerCat?.name),
        escape(tx?.notes && !tx.customer_id ? tx.notes : customer?.name),
        escape(category?.name),
        escape(item?.product_name || product?.name),
        escape(item?.variant_name),
        item?.qty ?? "",
        item?.unit_price ?? "",
        item?.discount_type || "",
        item?.discount_value ?? "",
        item?.discount_per_unit ?? "",
        e.amount,
        tx?.payment_method || "",
        escape(tx?.notes),
        escape(personInCharge),
      ].join(",");
    });

    const csv = [headers, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const restaurantName = (state.restaurant?.name || "ayakasir").replace(/\s+/g, "_");
    a.href = url;
    a.download = `ayakasir_${restaurantName}_${csvFrom}_${csvTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowCsvDialog(false);
  };

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.settings.title}</h1>
      </div>

      {message && !showChangePassword && (
        <div className={`erp-alert erp-alert--${message.type}`}>{message.text}</div>
      )}

      {/* Profile */}
      <div className="erp-settings-section">
        <h3>{copy.settings.profile}</h3>
        <div className="erp-settings-row">
          <span className="erp-settings-row-label">Email</span>
          <span style={{ color: "var(--erp-muted)" }}>{state.user?.email || "—"}</span>
        </div>
        <div className="erp-settings-row">
          <span className="erp-settings-row-label">{copy.settings.userName}</span>
          <span style={{ color: "var(--erp-muted)" }}>{state.user?.name || "—"}</span>
        </div>
        <div className="erp-settings-row">
          <span className="erp-settings-row-label">Role</span>
          <span className={`erp-badge ${state.user?.role === "OWNER" ? "erp-badge--info" : "erp-badge--success"}`}>
            {state.user?.role}
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button
            className="erp-btn erp-btn--secondary erp-btn--sm"
            onClick={() => { setMessage(null); setShowChangePassword(true); }}
          >
            {copy.settings.changePassword}
          </button>
        </div>
      </div>

      {/* Business info */}
      <div className="erp-settings-section">
        <h3>{copy.settings.businessSection}</h3>
        <div className="erp-settings-row">
          <span className="erp-settings-row-label">{copy.settings.userName}</span>
          <span style={{ color: "var(--erp-muted)" }}>{state.restaurant?.name || "—"}</span>
        </div>
      </div>

      {/* Payment methods (owner only) */}
      {isOwner && (
        <div className="erp-settings-section">
          <h3>{copy.settings.paymentMethods}</h3>
          <p style={{ color: "var(--erp-muted)", fontSize: 14, marginBottom: 16 }}>
            {copy.settings.paymentMethodsHint}
          </p>
          {(
            [
              { key: "CASH" as PaymentMethod, label: copy.settings.enableCash },
              { key: "QRIS" as PaymentMethod, label: copy.settings.enableQris },
              { key: "TRANSFER" as PaymentMethod, label: copy.settings.enableTransfer },
              { key: "UTANG" as PaymentMethod, label: copy.settings.enableUtang },
            ] as const
          ).map(({ key, label }) => {
            const isEnabled = enabledMethods.has(key);
            // Disable toggle if it's the last non-UTANG method
            const wouldLeaveNoNonUtang = isEnabled && key !== "UTANG" &&
              [...enabledMethods].filter((m) => m !== "UTANG" && m !== key).length === 0;
            const isDisabled = togglingMethod !== null || wouldLeaveNoNonUtang;
            return (
              <div key={key} className="erp-settings-row">
                <div>
                  <span className="erp-settings-row-label">{label}</span>
                  {wouldLeaveNoNonUtang && (
                    <span style={{ fontSize: 12, color: "var(--erp-muted)", marginLeft: 8 }}>
                      ({locale === "id" ? "min. 1 aktif" : "min. 1 required"})
                    </span>
                  )}
                </div>
                <label className={`erp-toggle${isDisabled ? " erp-toggle--disabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={isDisabled}
                    onChange={() => handleTogglePaymentMethod(key)}
                  />
                  <span className="erp-toggle-slider" />
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* QRIS Settings (owner only) */}
      {isOwner && (
        <div className="erp-settings-section">
          <h3>{copy.settings.qrisSettings}</h3>
          {state.restaurant?.qris_merchant_name && (
            <div className="erp-settings-row" style={{ marginBottom: 8 }}>
              <span className="erp-settings-row-label">{copy.settings.qrisMerchantName}</span>
              <span style={{ color: "var(--erp-muted)" }}>{state.restaurant.qris_merchant_name}</span>
            </div>
          )}
          {state.restaurant?.qris_image_url && (
            <div style={{ marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.restaurant.qris_image_url}
                alt="QRIS"
                style={{ maxWidth: 140, maxHeight: 140, borderRadius: 8, border: "1px solid var(--erp-border)", display: "block" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openQrisDialog}>
            {locale === "id" ? "Atur QRIS" : "Configure QRIS"}
          </button>
        </div>
      )}

      {/* User Management (owner only) */}
      {isOwner && (
        <div className="erp-settings-section">
          <h3>{copy.settings.userManagement}</h3>
          <div style={{ marginBottom: 12 }}>
            <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openAddUser}>
              {copy.settings.addUser}
            </button>
          </div>
          {state.tenantUsers.length === 0 ? (
            <p style={{ color: "var(--erp-muted)", fontSize: 14 }}>{copy.settings.noUsers}</p>
          ) : (
            <table className="erp-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th>{copy.settings.userName}</th>
                  <th>Email</th>
                  <th>{copy.settings.userRole}</th>
                  <th>{copy.settings.userActive}</th>
                  <th>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {state.tenantUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td style={{ color: "var(--erp-muted)" }}>{u.email || "—"}</td>
                    <td>
                      <span className={`erp-badge ${u.role === "OWNER" ? "erp-badge--info" : "erp-badge--success"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`erp-badge ${u.is_active ? "erp-badge--success" : "erp-badge--muted"}`}>
                        {u.is_active
                          ? copy.settings.userActive
                          : locale === "id" ? "Nonaktif" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="erp-btn erp-btn--secondary erp-btn--sm"
                          onClick={() => openEditUser(u)}
                        >
                          {copy.common.edit}
                        </button>
                        {u.id !== state.user?.id && (
                          <button
                            className="erp-btn erp-btn--danger erp-btn--sm"
                            onClick={() => setShowDeleteUserConfirm(u.id)}
                          >
                            {copy.common.delete}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Initial balance (owner only) */}
      {isOwner && (
        <div className="erp-settings-section">
          <h3>{copy.settings.initialBalance}</h3>
          <div className="erp-settings-row" style={{ marginBottom: 12 }}>
            <span className="erp-settings-row-label">
              {locale === "id" ? "Saldo Awal Saat Ini" : "Current Initial Balance"}
            </span>
            <span style={{ fontWeight: 600, color: currentInitialBalance > 0 ? "var(--erp-success)" : "var(--erp-muted)" }}>
              {formatRupiah(currentInitialBalance)}
            </span>
          </div>
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openInitialBalance}>
            {copy.settings.setBalance}
          </button>
        </div>
      )}

      {/* Language */}
      <div className="erp-settings-section">
        <h3>{copy.settings.language}</h3>
        <p style={{ color: "var(--erp-muted)", fontSize: 14, marginBottom: 16 }}>
          {copy.settings.languageHint}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {(["id", "en"] as const).map((lang) => (
            <button
              key={lang}
              className={`erp-btn erp-btn--sm${locale === lang ? " erp-btn--primary" : " erp-btn--secondary"}`}
              onClick={() => {
                if (locale !== lang) {
                  const newPath = window.location.pathname.replace(`/${locale}/`, `/${lang}/`);
                  router.push(newPath);
                }
              }}
            >
              {lang === "id" ? "Indonesia" : "English"}
            </button>
          ))}
        </div>
      </div>

      {/* Close Cashier */}
      <div className="erp-settings-section">
        <h3>{copy.settings.closeCashier}</h3>
        <p style={{ color: "var(--erp-muted)", fontSize: 14, marginBottom: 16 }}>
          {locale === "id"
            ? "Tutup sesi kasir hari ini dan cetak laporan akhir hari."
            : "Close today's cashier session and generate an end-of-day report."}
        </p>
        <button className="erp-btn erp-btn--danger erp-btn--sm" onClick={handleOpenCloseCashier}>
          {copy.settings.closeCashier}
        </button>
      </div>

      {/* CSV Export (owner only) */}
      {isOwner && (
        <div className="erp-settings-section">
          <h3>{copy.settings.csvExport}</h3>
          <p style={{ color: "var(--erp-muted)", fontSize: 14, marginBottom: 12 }}>
            {locale === "id"
              ? "Unduh data jurnal umum dalam format CSV."
              : "Download general ledger data as CSV."}
          </p>
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={() => setShowCsvDialog(true)}>
            {copy.settings.downloadCsv}
          </button>
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────── */}

      {/* Initial balance dialog */}
      {showInitialBalance && (
        <div className="erp-overlay" onClick={() => setShowInitialBalance(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.setBalance}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowInitialBalance(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.amount}</label>
                <input
                  className="erp-input"
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowInitialBalance(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSetInitialBalance} disabled={saving}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change password dialog */}
      {showChangePassword && (
        <div className="erp-overlay" onClick={() => setShowChangePassword(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.changePassword}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowChangePassword(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              {message && (
                <div className={`erp-alert erp-alert--${message.type}`} style={{ marginBottom: 12 }}>
                  {message.text}
                </div>
              )}
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.currentPassword}</label>
                <input
                  className="erp-input"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.newPassword}</label>
                <input
                  className="erp-input"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.confirmPassword}</label>
                <input
                  className="erp-input"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowChangePassword(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleChangePassword}
                disabled={saving || !currentPw || !newPw || newPw.length < 6}
              >
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Settings dialog */}
      {showQris && (
        <div className="erp-overlay" onClick={() => setShowQris(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.qrisSettings}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowQris(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.qrisMerchantName}</label>
                <input
                  className="erp-input"
                  type="text"
                  value={qrisMerchantName}
                  onChange={(e) => setQrisMerchantName(e.target.value)}
                  placeholder={locale === "id" ? "Nama merchant QRIS" : "QRIS merchant name"}
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.qrisImageUrl}</label>
                <input
                  className="erp-input"
                  type="url"
                  value={qrisImageUrl}
                  onChange={(e) => setQrisImageUrl(e.target.value)}
                  placeholder="https://..."
                />
                <p style={{ fontSize: 12, color: "var(--erp-muted)", marginTop: 4 }}>
                  {copy.settings.qrisImageUrlHint}
                </p>
              </div>
              {qrisImageUrl && (
                <div style={{ marginTop: 8, textAlign: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisImageUrl}
                    alt="QRIS preview"
                    style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8, border: "1px solid var(--erp-border)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowQris(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveQris} disabled={saving}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User dialog */}
      {showUserDialog && (
        <div className="erp-overlay" onClick={() => setShowUserDialog(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editingUser ? copy.settings.editUser : copy.settings.addUser}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowUserDialog(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.userName} *</label>
                <input
                  className="erp-input"
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">Email</label>
                <input
                  className="erp-input"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.userPhone}</label>
                <input
                  className="erp-input"
                  type="tel"
                  value={userForm.phone}
                  onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.userRole}</label>
                <select
                  className="erp-input"
                  value={userForm.role}
                  onChange={(e) => {
                    const role = e.target.value as "OWNER" | "CASHIER";
                    setUserForm((f) => ({
                      ...f,
                      role,
                      featureAccess: role === "CASHIER" ? (f.featureAccess.length ? f.featureAccess : DEFAULT_CASHIER_FEATURES) : [],
                    }));
                  }}
                >
                  <option value="CASHIER">CASHIER</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">
                  {copy.settings.userPassword}
                  {editingUser && (
                    <span style={{ fontSize: 12, color: "var(--erp-muted)", marginLeft: 8 }}>
                      ({copy.settings.userPasswordHint})
                    </span>
                  )}
                </label>
                <input
                  className="erp-input"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={6}
                  placeholder={editingUser ? "••••••" : ""}
                  autoComplete="new-password"
                />
              </div>
              {/* Feature access — only for CASHIER */}
              {userForm.role === "CASHIER" && (
                <div className="erp-input-group" style={{ marginTop: 8 }}>
                  <label className="erp-label">{copy.settings.featureAccess}</label>
                  <p style={{ fontSize: 12, color: "var(--erp-muted)", marginBottom: 8 }}>
                    {copy.settings.featureAccessHint}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(ALL_FEATURES as readonly UserFeature[]).map((feat) => {
                      const labelMap: Record<UserFeature, string> = {
                        POS: copy.settings.featurePOS,
                        DASHBOARD: copy.settings.featureDashboard,
                        MENU: copy.settings.featureMenu,
                        INVENTORY: copy.settings.featureInventory,
                        PURCHASING: copy.settings.featurePurchasing,
                        CUSTOMERS: copy.settings.featureCustomers,
                        SETTINGS: copy.settings.featureSettings,
                      };
                      return (
                        <label key={feat} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                          <input
                            type="checkbox"
                            checked={userForm.featureAccess.includes(feat)}
                            onChange={() => toggleFeature(feat)}
                            style={{ width: 16, height: 16, accentColor: "var(--erp-primary)", cursor: "pointer" }}
                          />
                          <span>{labelMap[feat]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="erp-settings-row" style={{ marginTop: 12 }}>
                <span className="erp-settings-row-label">{copy.settings.userActive}</span>
                <label className="erp-toggle">
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span className="erp-toggle-slider" />
                </label>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowUserDialog(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleSaveUser}
                disabled={saving || !userForm.name.trim() || (!editingUser && userForm.password.length < 6)}
              >
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Export date range dialog */}
      {showCsvDialog && (
        <div className="erp-overlay" onClick={() => setShowCsvDialog(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.csvExport}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCsvDialog(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.csvDateFrom}</label>
                <input
                  className="erp-input erp-input--date"
                  type="date"
                  value={csvFrom}
                  max={csvTo}
                  onChange={(e) => setCsvFrom(e.target.value)}
                />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.settings.csvDateTo}</label>
                <input
                  className="erp-input erp-input--date"
                  type="date"
                  value={csvTo}
                  min={csvFrom}
                  max={todayStr}
                  onChange={(e) => setCsvTo(e.target.value)}
                />
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowCsvDialog(false)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleExportCsv} disabled={!csvFrom || !csvTo}>
                {copy.settings.downloadCsv}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Cashier confirm dialog */}
      {showCloseCashier && (
        <div className="erp-overlay" onClick={() => setShowCloseCashier(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.closeCashierTitle}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCloseCashier(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ color: "var(--erp-muted)", fontSize: 14, marginBottom: 16 }}>
                {copy.settings.closeCashierConfirmHint}
              </p>
              {/* Summary table */}
              <table className="erp-close-report-table">
                <tbody>
                  <tr><td>{copy.settings.closeTime}</td><td>{formatDateTime(closeCashierSummary.closeTime, locale)}</td></tr>
                  <tr><td>{copy.settings.cashierInCharge}</td><td>{closeCashierSummary.cashier}</td></tr>
                  <tr><td>{copy.settings.totalTransactions}</td><td>{closeCashierSummary.totalTransactions}</td></tr>
                  <tr><td>{copy.settings.openingBalance}</td><td>{formatRupiah(closeCashierSummary.openingBalance)}</td></tr>
                  <tr className="erp-close-report-total"><td>{copy.settings.closingBalance}</td><td>{formatRupiah(closeCashierSummary.closingBalance)}</td></tr>
                </tbody>
              </table>
              {/* Payment breakdown */}
              <div className="erp-close-report-section">{copy.settings.paymentBreakdown}</div>
              <table className="erp-close-report-table">
                <tbody>
                  {Object.entries(closeCashierSummary.byMethod).length === 0 ? (
                    <tr><td colSpan={2} style={{ color: "var(--erp-muted)" }}>{copy.common.noData}</td></tr>
                  ) : (
                    Object.entries(closeCashierSummary.byMethod).map(([m, amt]) => (
                      <tr key={m}><td>{m}</td><td>{formatRupiah(amt)}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
              {/* Match question */}
              <div className="erp-close-match-row">
                <span style={{ fontSize: 14, fontWeight: 500 }}>{copy.settings.matchQuestion}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={`erp-btn erp-btn--sm${closeMatch === true ? " erp-btn--primary" : " erp-btn--secondary"}`}
                    onClick={() => setCloseMatch(true)}
                  >
                    {copy.settings.matchYes}
                  </button>
                  <button
                    className={`erp-btn erp-btn--sm${closeMatch === false ? " erp-btn--danger" : " erp-btn--secondary"}`}
                    onClick={() => setCloseMatch(false)}
                  >
                    {copy.settings.matchNo}
                  </button>
                </div>
              </div>
              {closeMatch === false && (
                <div className="erp-input-group" style={{ marginTop: 12 }}>
                  <label className="erp-label">{copy.settings.mismatchNote}</label>
                  <textarea
                    className="erp-input"
                    rows={3}
                    value={closeMismatchNote}
                    onChange={(e) => setCloseMismatchNote(e.target.value)}
                    placeholder={copy.settings.mismatchPlaceholder}
                    style={{ resize: "vertical" }}
                  />
                </div>
              )}
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowCloseCashier(false)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--danger"
                onClick={handleConfirmClose}
                disabled={closeMatch === null}
              >
                {copy.settings.closeCashierConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash reset dialog */}
      {showCashReset && (
        <div className="erp-overlay">
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.cashResetTitle}</h3>
            </div>
            <div className="erp-dialog-body">
              <p style={{ fontSize: 14, color: "var(--erp-muted)", marginBottom: 16 }}>
                {copy.settings.cashResetHint}
              </p>
              <div className="erp-close-report-table" style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 15 }}>
                  {copy.settings.closingBalance}: {formatRupiah(closeCashierSummary.closingBalance)}
                </strong>
              </div>
            </div>
            <div className="erp-dialog-footer" style={{ flexDirection: "column", gap: 8 }}>
              <button
                className="erp-btn erp-btn--danger"
                style={{ width: "100%" }}
                onClick={() => handleCashResetChoice(true)}
              >
                {copy.settings.cashResetEmpty}
              </button>
              <button
                className="erp-btn erp-btn--secondary"
                style={{ width: "100%" }}
                onClick={() => handleCashResetChoice(false)}
              >
                {copy.settings.cashResetKeep}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Cashier report dialog */}
      {showCloseReport && (
        <div className="erp-overlay" onClick={() => setShowCloseReport(false)}>
          <div className="erp-dialog erp-dialog--wide erp-close-report-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.settings.closeCashierReport}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCloseReport(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body erp-printable">
              <div className="erp-close-report-print-header">
                <div className="erp-close-report-biz">{state.restaurant?.name || "AyaKasir"}</div>
                <div className="erp-close-report-subtitle">{copy.settings.closeCashierReport}</div>
              </div>
              <table className="erp-close-report-table">
                <tbody>
                  <tr><td>{copy.settings.closeTime}</td><td>{formatDateTime(closeCashierSummary.closeTime, locale)}</td></tr>
                  <tr><td>{copy.settings.cashierInCharge}</td><td>{closeCashierSummary.cashier}</td></tr>
                  <tr><td>{copy.settings.totalTransactions}</td><td>{closeCashierSummary.totalTransactions}</td></tr>
                  <tr><td>{copy.settings.openingBalance}</td><td>{formatRupiah(closeCashierSummary.openingBalance)}</td></tr>
                  <tr className="erp-close-report-total"><td>{copy.settings.closingBalance}</td><td>{formatRupiah(closeCashierSummary.closingBalance)}</td></tr>
                </tbody>
              </table>
              <div className="erp-close-report-section">{copy.settings.paymentBreakdown}</div>
              <table className="erp-close-report-table">
                <tbody>
                  {Object.entries(closeCashierSummary.byMethod).length === 0 ? (
                    <tr><td colSpan={2} style={{ color: "var(--erp-muted)" }}>{copy.common.noData}</td></tr>
                  ) : (
                    Object.entries(closeCashierSummary.byMethod).map(([m, amt]) => (
                      <tr key={m}><td>{m}</td><td>{formatRupiah(amt)}</td></tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="erp-close-match-box">
                <div className="erp-close-match-label">{copy.settings.matchQuestion}</div>
                <div className={`erp-close-match-value${closeMatch === false ? " erp-close-match-value--no" : ""}`}>
                  {closeMatch === true ? copy.settings.matchYes : copy.settings.matchNo}
                </div>
                {closeMatch === false && closeMismatchNote && (
                  <div className="erp-close-match-note">{closeMismatchNote}</div>
                )}
              </div>
            </div>
            <div className="erp-dialog-footer erp-no-print">
              <button className="erp-btn erp-btn--secondary" onClick={handleDownloadReport}>
                {copy.settings.downloadReport}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handlePrintReport}>
                {copy.settings.printReport}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete user confirm dialog */}
      {showDeleteUserConfirm && (
        <div className="erp-overlay" onClick={() => setShowDeleteUserConfirm(null)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.common.confirmDelete}</h3>
            </div>
            <div className="erp-dialog-body">
              <p>{copy.common.deleteWarning}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowDeleteUserConfirm(null)}>
                {copy.common.cancel}
              </button>
              <button
                className="erp-btn erp-btn--danger"
                onClick={() => handleDeleteUser(showDeleteUserConfirm)}
                disabled={saving}
              >
                {saving ? copy.common.loading : copy.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
