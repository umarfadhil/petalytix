"use client";

import { useMemo, useState } from "react";
import { useErp } from "../store";
import type { OlderData } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah, formatDateTime, todayRange, monthRange, yearRange } from "../utils";
import { createLedgerEntry } from "@/lib/supabase/repositories/general-ledger";
import { settleDebt } from "@/lib/supabase/repositories/transactions";
import { fetchOlderErpData } from "@/app/ayakasir/actions/fetch-older-data";
import type { DbTransaction } from "@/lib/supabase/types";

type Period = "today" | "month" | "year" | "custom" | "shift";
type PageSize = 10 | 25 | 50;

export default function DashboardScreen() {
  const { state, locale, dispatch, supabase, tenantId } = useErp();
  const copy = getErpCopy(locale);
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [txPage, setTxPage] = useState(0);
  const [txPageSize, setTxPageSize] = useState<PageSize>(10);
  const [showCashFlow, setShowCashFlow] = useState(false);
  const [showUtangModal, setShowUtangModal] = useState(false);
  const [settlingTx, setSettlingTx] = useState<DbTransaction | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settledReceipt, setSettledReceipt] = useState<{ tx: DbTransaction; paymentMethod: "CASH" | "QRIS" | "TRANSFER" } | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  async function handleLoadOlderData() {
    if (loadingOlder || state.olderDataLoaded) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const older = await fetchOlderErpData(tenantId, 0, state.dataWindowStart) as OlderData;
      dispatch({ type: "MERGE_OLDER", payload: older, newWindowStart: 0 });
    } catch {
      setOlderError(copy.common.error);
    } finally {
      setLoadingOlder(false);
    }
  }

  // Active cashier session (null = no open session)
  // A session opened before today midnight is considered stale and excluded from shift filtering
  const todayMidnight = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const rawActiveSession = state.cashierSessions.find((s) => s.closed_at === null) ?? null;
  const activeSession = rawActiveSession && rawActiveSession.opened_at >= todayMidnight ? rawActiveSession : null;

  const range = useMemo<[number, number]>(() => {
    if (period === "today") return todayRange();
    if (period === "month") return monthRange();
    if (period === "year") return yearRange();
    if (period === "shift") {
      const from = activeSession ? activeSession.opened_at : todayRange()[0];
      return [from, Date.now()];
    }
    // custom
    const from = customFrom ? new Date(customFrom).setHours(0, 0, 0, 0) : 0;
    const to = customTo ? new Date(customTo).setHours(23, 59, 59, 999) : Date.now();
    return [from, to];
  }, [period, customFrom, customTo, activeSession]);

  const filteredTransactions = useMemo(
    () =>
      state.transactions
        .filter((t) => t.status === "COMPLETED" && t.date >= range[0] && t.date <= range[1])
        .sort((a, b) => b.date - a.date),
    [state.transactions, range]
  );

  const totalSales = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum + t.total, 0),
    [filteredTransactions]
  );

  const cashSales = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.payment_method === "CASH")
        .reduce((sum, t) => sum + t.total, 0),
    [filteredTransactions]
  );

  const transferSales = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.payment_method === "TRANSFER")
        .reduce((sum, t) => sum + t.total, 0),
    [filteredTransactions]
  );

  // All-time unpaid debt — NOT period-filtered (mirrors mobile TransactionDao.getTotalUnpaidDebt)
  const utangTotal = useMemo(
    () =>
      state.transactions
        .filter((t) => t.payment_method === "UTANG" && t.debt_status === "UNPAID" && t.status === "COMPLETED")
        .reduce((sum, t) => sum + t.total, 0),
    [state.transactions]
  );

  const qrisSales = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.payment_method === "QRIS")
        .reduce((sum, t) => sum + t.total, 0),
    [filteredTransactions]
  );

  // Saldo Kas scoped to current (or last closed) cashier session
  const lastClosedSession = useMemo(() => {
    if (activeSession) return null;
    const closed = state.cashierSessions.filter((s) => s.closed_at !== null);
    return closed.length > 0 ? closed.reduce((a, b) => ((a.closed_at ?? 0) > (b.closed_at ?? 0) ? a : b)) : null;
  }, [state.cashierSessions, activeSession]);

  const cashBalance = useMemo(() => {
    const CASH_TYPES = ["INITIAL_BALANCE", "SALE", "WITHDRAWAL", "ADJUSTMENT"];
    const scopeSession = activeSession ?? lastClosedSession;
    const entries = scopeSession
      ? state.generalLedger.filter((e) => CASH_TYPES.includes(e.type) && e.date >= scopeSession.opened_at)
      : state.generalLedger.filter((e) => CASH_TYPES.includes(e.type));
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }, [state.generalLedger, activeSession, lastClosedSession]);

  // Cash flow detail modal: filtered by period range
  const CASH_FLOW_TYPES = ["INITIAL_BALANCE", "SALE", "WITHDRAWAL", "ADJUSTMENT"];
  const cashFlowEntries = useMemo(
    () =>
      state.generalLedger
        .filter((e) => CASH_FLOW_TYPES.includes(e.type) && e.date >= range[0] && e.date <= range[1])
        .sort((a, b) => b.date - a.date),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.generalLedger, range]
  );

  const cashFlowIn = useMemo(
    () => cashFlowEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    [cashFlowEntries]
  );
  const cashFlowOut = useMemo(
    () => cashFlowEntries.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0),
    [cashFlowEntries]
  );
  const cashFlowNet = cashFlowIn + cashFlowOut;

  // All unpaid UTANG transactions (no period filter — show all outstanding)
  const unpaidDebts = useMemo(
    () =>
      state.transactions
        .filter((t) => t.payment_method === "UTANG" && t.debt_status === "UNPAID" && t.status === "COMPLETED")
        .sort((a, b) => b.date - a.date),
    [state.transactions]
  );

  function resolveCustomerName(tx: DbTransaction): string {
    if (tx.customer_id) {
      const customer = state.customers.find((c) => c.id === tx.customer_id);
      if (customer) return customer.name;
    }
    return "—";
  }

  async function handleSettle(tx: DbTransaction, paymentMethod: "CASH" | "QRIS" | "TRANSFER") {
    setSettleLoading(true);
    setSettleError(null);
    try {
      const updatedTx = await settleDebt(supabase, tx.id, paymentMethod);
      dispatch({ type: "UPSERT", table: "transactions", payload: updatedTx as unknown as Record<string, unknown> });

      // Mirror mobile app TransactionRepository.settleDebt() ledger convention:
      // CASH → SALE (affects Saldo Kas), QRIS → SALE_QRIS, TRANSFER → SALE_TRANSFER
      const ledgerType =
        paymentMethod === "CASH" ? "SALE" :
        paymentMethod === "QRIS" ? "SALE_QRIS" :
        "SALE_TRANSFER";
      const description =
        paymentMethod === "CASH" ? "Pelunasan utang (tunai)" :
        paymentMethod === "QRIS" ? "Pelunasan utang (QRIS)" :
        "Pelunasan utang (transfer)";
      const ledgerEntry = await createLedgerEntry(supabase, {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        type: ledgerType,
        amount: tx.total,
        date: Date.now(),
        description,
        reference_id: tx.id,
        user_id: state.user?.id ?? "",
        updated_at: Date.now(),
      });
      dispatch({ type: "UPSERT", table: "generalLedger", payload: ledgerEntry as unknown as Record<string, unknown> });

      setSettlingTx(null);
      setSettledReceipt({ tx: updatedTx, paymentMethod });
    } catch (err) {
      setSettleError(err instanceof Error ? err.message : "Error");
    } finally {
      setSettleLoading(false);
    }
  }

  // Top products
  const topProducts = useMemo(() => {
    const txIds = new Set(filteredTransactions.map((t) => t.id));
    const items = state.transactionItems.filter((i) => txIds.has(i.transaction_id));
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const item of items) {
      const existing = map.get(item.product_name) || { name: item.product_name, qty: 0, revenue: 0 };
      existing.qty += item.qty;
      existing.revenue += item.subtotal;
      map.set(item.product_name, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions, state.transactionItems]);

  const [topPage, setTopPage] = useState(0);
  const [topPageSize, setTopPageSize] = useState<PageSize>(10);
  const topTotalPages = Math.ceil(topProducts.length / topPageSize);
  const pagedTopProducts = topProducts.slice(topPage * topPageSize, topPage * topPageSize + topPageSize);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / txPageSize);
  const pagedTransactions = filteredTransactions.slice(
    txPage * txPageSize,
    txPage * txPageSize + txPageSize
  );

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setTxPage(0);
    setTopPage(0);
  }

  function handlePageSizeChange(size: PageSize) {
    setTxPageSize(size);
    setTxPage(0);
  }

  function toggleExpand(t: DbTransaction) {
    setExpandedTxId((prev) => (prev === t.id ? null : t.id));
  }

  const periodLabels: Record<Period, string> = {
    today: copy.dashboard.today,
    month: copy.dashboard.thisMonth,
    year: copy.dashboard.thisYear,
    custom: copy.dashboard.customDate,
    shift: copy.settings.activeShift,
  };

  // Adaptive sales card label
  const salesLabel = useMemo(() => {
    const prefix = locale === "id" ? "Penjualan" : "Sales";
    if (period === "today") return `${prefix} ${copy.dashboard.today}`;
    if (period === "month") return `${prefix} ${copy.dashboard.thisMonth}`;
    if (period === "year") return `${prefix} ${copy.dashboard.thisYear}`;
    if (period === "shift") return `${prefix} — ${copy.settings.activeShift}`;
    // custom
    if (!customFrom && !customTo) return `${prefix} ${copy.dashboard.customDate}`;
    const fmt = (d: string) => {
      const date = new Date(d);
      return date.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        day: "numeric", month: "short", year: "numeric",
      });
    };
    if (customFrom && customTo) return `${prefix} ${fmt(customFrom)} – ${fmt(customTo)}`;
    if (customFrom) return `${prefix} ${fmt(customFrom)}`;
    return `${prefix} ${fmt(customTo)}`;
  }, [period, customFrom, customTo, locale, copy.dashboard]);

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.dashboard.title}</h1>
      </div>

      {/* Period chips */}
      <div className="erp-chips">
        {activeSession && (
          <button
            className={`erp-chip erp-chip--shift${period === "shift" ? " erp-chip--active" : ""}`}
            onClick={() => handlePeriodChange("shift")}
            title={`${copy.settings.shiftFrom}: ${new Date(activeSession.opened_at).toLocaleTimeString(locale === "id" ? "id-ID" : "en-US", { hour: "2-digit", minute: "2-digit" })}`}
          >
            {copy.settings.activeShift}
          </button>
        )}
        {(["today", "month", "year", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            className={`erp-chip${period === p ? " erp-chip--active" : ""}`}
            onClick={() => handlePeriodChange(p)}
          >
            {periodLabels[p]}
          </button>
        ))}
        {period === "custom" && (
          <div className="erp-dashboard-date-range">
            <input
              type="date"
              className="erp-input erp-input--date"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setTxPage(0); }}
            />
            <span className="erp-dashboard-date-sep">—</span>
            <input
              type="date"
              className="erp-input erp-input--date"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setTxPage(0); }}
            />
          </div>
        )}
      </div>

      {/* Older data banner — shown when selected range extends before the 90-day window */}
      {!state.olderDataLoaded && range[0] < state.dataWindowStart && (
        <div className="erp-alert erp-alert--warning erp-older-data-banner">
          <span>
            {locale === "id"
              ? "Data ditampilkan terbatas 90 hari. Muat data lebih lama untuk melihat periode ini."
              : "Data is limited to the last 90 days. Load older data to view this period."}
          </span>
          <button
            className="erp-btn erp-btn--sm erp-btn--secondary"
            onClick={handleLoadOlderData}
            disabled={loadingOlder}
          >
            {loadingOlder ? copy.common.loading : (locale === "id" ? "Muat Data Lama" : "Load Older Data")}
          </button>
          {olderError && <span className="erp-text--error">{olderError}</span>}
        </div>
      )}

      {/* Stats — row 1: 3 cards */}
      <div className="erp-stats-grid erp-stats-grid--3">
        <button
          className="erp-card erp-card--stat erp-card--clickable"
          onClick={() => setShowCashFlow(true)}
          title={copy.dashboard.cashFlowDetails}
        >
          <span className="erp-card-label">
            {copy.dashboard.cashBalance}
            <span className="erp-card-label-hint"> ↗</span>
          </span>
          <span className={`erp-card-value${cashBalance >= 0 ? " erp-card-value--success" : " erp-card-value--danger"}`}>
            {formatRupiah(cashBalance)}
          </span>
        </button>
        <div className="erp-card erp-card--stat">
          <span className="erp-card-label">{salesLabel}</span>
          <span className="erp-card-value">{formatRupiah(totalSales)}</span>
        </div>
        <div className="erp-card erp-card--stat">
          <span className="erp-card-label">{copy.dashboard.totalTransactions}</span>
          <span className="erp-card-value">{filteredTransactions.length}</span>
        </div>
      </div>

      {/* Stats — row 2: 4 cards */}
      <div className="erp-stats-grid erp-stats-grid--4">
        <div className="erp-card erp-card--stat">
          <span className="erp-card-label">{copy.dashboard.cashSales}</span>
          <span className="erp-card-value">{formatRupiah(cashSales)}</span>
        </div>
        <div className="erp-card erp-card--stat">
          <span className="erp-card-label">{copy.dashboard.transferSales}</span>
          <span className="erp-card-value">{formatRupiah(transferSales)}</span>
        </div>
        <div className="erp-card erp-card--stat">
          <span className="erp-card-label">{copy.dashboard.qrisSales}</span>
          <span className="erp-card-value">{formatRupiah(qrisSales)}</span>
        </div>
        <button
          className="erp-card erp-card--stat erp-card--clickable"
          onClick={() => setShowUtangModal(true)}
          title={copy.dashboard.manageDebts}
        >
          <span className="erp-card-label">
            {copy.dashboard.utangTotal}
            <span className="erp-card-label-hint"> ↗</span>
          </span>
          <span className={`erp-card-value${utangTotal > 0 ? " erp-card-value--danger" : ""}`}>
            {formatRupiah(utangTotal)}
          </span>
        </button>
      </div>

      <div className="erp-dashboard-tables">
        {/* Recent transactions */}
        <div className="erp-table-wrap">
          <div className="erp-table-header-row">
            <span style={{ fontWeight: 600 }}>{copy.dashboard.recentTransactions}</span>
            <div className="erp-table-controls">
              <span className="erp-table-controls-label">{copy.dashboard.rowsPerPage}:</span>
              {([10, 25, 50] as PageSize[]).map((size) => (
                <button
                  key={size}
                  className={`erp-chip erp-chip--sm${txPageSize === size ? " erp-chip--active" : ""}`}
                  onClick={() => handlePageSizeChange(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 24 }}></th>
                <th>{copy.purchasing.date}</th>
                <th>{copy.pos.total}</th>
                <th>{copy.pos.paymentMethod}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.dashboard.noTransactions}
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((t) => {
                  const isExpanded = expandedTxId === t.id;
                  const items = state.transactionItems.filter((i) => i.transaction_id === t.id);
                  return (
                    <>
                      <tr
                        key={t.id}
                        className="erp-table-row--clickable"
                        onClick={() => toggleExpand(t)}
                      >
                        <td style={{ color: "var(--erp-muted)", fontSize: 12 }}>
                          {isExpanded ? "▼" : "▶"}
                        </td>
                        <td>{formatDateTime(t.date, locale)}</td>
                        <td>{formatRupiah(t.total)}</td>
                        <td>
                          <span className={`erp-badge erp-badge--${t.payment_method === "CASH" ? "success" : t.payment_method === "QRIS" ? "info" : t.payment_method === "TRANSFER" ? "warning" : "danger"}`}>
                            {t.payment_method}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${t.id}-detail`} className="erp-table-row--expanded">
                          <td colSpan={4} style={{ padding: 0 }}>
                            <div className="erp-tx-detail">
                              {items.length === 0 ? (
                                <span style={{ color: "var(--erp-muted)", fontSize: 13 }}>{copy.common.noData}</span>
                              ) : (
                                <table className="erp-tx-detail-table">
                                  <thead>
                                    <tr>
                                      <th>{copy.products.name}</th>
                                      <th>{copy.products.qty}</th>
                                      <th>{copy.pos.total}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item) => (
                                      <tr key={item.id}>
                                        <td>
                                          {item.product_name}
                                          {item.variant_name ? ` (${item.variant_name})` : ""}
                                        </td>
                                        <td>{item.qty}×</td>
                                        <td>{formatRupiah(item.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="erp-table-pagination">
              <button
                className="erp-btn erp-btn--secondary erp-btn--sm"
                disabled={txPage === 0}
                onClick={() => setTxPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="erp-table-pagination-info">
                {txPage + 1} / {totalPages}
              </span>
              <button
                className="erp-btn erp-btn--secondary erp-btn--sm"
                disabled={txPage >= totalPages - 1}
                onClick={() => setTxPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="erp-table-wrap">
          <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, flex: 1 }}>{copy.dashboard.topProducts}</span>
            <div className="erp-table-pagination-info">
              <span>{copy.purchasing.rowsPerPage}:</span>
              {([10, 25, 50] as PageSize[]).map((n) => (
                <span
                  key={n}
                  className={`erp-chip erp-chip--sm${topPageSize === n ? " erp-chip--active" : ""}`}
                  onClick={() => { setTopPageSize(n); setTopPage(0); }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          <table className="erp-table">
            <thead>
              <tr>
                <th>{copy.products.name}</th>
                <th>{copy.products.qty}</th>
                <th>{copy.pos.total}</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                    {copy.common.noData}
                  </td>
                </tr>
              ) : (
                pagedTopProducts.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td>{p.qty}</td>
                    <td>{formatRupiah(p.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {topTotalPages > 1 && (
            <div className="erp-table-pagination">
              <button
                className="erp-btn erp-btn--secondary erp-btn--sm"
                disabled={topPage === 0}
                onClick={() => setTopPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="erp-table-pagination-info">
                {topPage + 1} / {topTotalPages}
              </span>
              <button
                className="erp-btn erp-btn--secondary erp-btn--sm"
                disabled={topPage >= topTotalPages - 1}
                onClick={() => setTopPage((p) => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Utang Management Modal */}
      {showUtangModal && (
        <div className="erp-overlay" onClick={() => { setShowUtangModal(false); setSettlingTx(null); setSettleError(null); }}>
          <div className="erp-dialog erp-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.dashboard.manageDebts}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => { setShowUtangModal(false); setSettlingTx(null); setSettleError(null); }}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body" style={{ padding: 0 }}>
              {unpaidDebts.length === 0 ? (
                <div className="erp-empty"><p>{copy.dashboard.noDebts}</p></div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.dashboard.debtCustomer}</th>
                      <th>{copy.dashboard.debtDate}</th>
                      <th>{copy.dashboard.debtAmount}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidDebts.map((t) => (
                      <tr key={t.id}>
                        <td>{resolveCustomerName(t)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(t.date, locale)}</td>
                        <td>{formatRupiah(t.total)}</td>
                        <td>
                          <button
                            className="erp-btn erp-btn--primary erp-btn--sm"
                            disabled={!activeSession}
                            title={!activeSession ? copy.pos.openCashier : undefined}
                            onClick={() => { setSettlingTx(t); setSettleError(null); }}
                          >
                            {copy.dashboard.settleDebt}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settle Payment Method Sub-Dialog */}
      {settlingTx && (
        <div className="erp-overlay" onClick={() => { setSettlingTx(null); setSettleError(null); }}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <div>
                <h3>{copy.dashboard.settleDebt}</h3>
                <span style={{ fontSize: 13, color: "var(--erp-ink-secondary)" }}>
                  {resolveCustomerName(settlingTx)} — {formatRupiah(settlingTx.total)}
                </span>
              </div>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => { setSettlingTx(null); setSettleError(null); }}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ marginBottom: 16, color: "var(--erp-ink-secondary)", fontSize: 14 }}>
                {copy.dashboard.selectSettleMethod}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["CASH", "QRIS", "TRANSFER"] as const).map((pm) => (
                  <button
                    key={pm}
                    className="erp-btn erp-btn--secondary"
                    disabled={settleLoading}
                    onClick={() => handleSettle(settlingTx, pm)}
                  >
                    {pm === "CASH" ? copy.pos.cash : pm === "QRIS" ? copy.pos.qris : copy.pos.transfer}
                  </button>
                ))}
              </div>
              {settleError && (
                <p style={{ marginTop: 12, color: "var(--erp-danger)", fontSize: 13 }}>{settleError}</p>
              )}
              {settleLoading && (
                <p style={{ marginTop: 12, color: "var(--erp-muted)", fontSize: 13 }}>{copy.common.loading}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settle Receipt Dialog */}
      {settledReceipt && (
        <div className="erp-overlay">
          <div className="erp-dialog">
            <div className="erp-dialog-header">
              <h3>{copy.pos.paymentSuccess}</h3>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-receipt">
                <div className="erp-receipt-header">{state.restaurant?.name || "AyaKasir"}</div>
                <div style={{ textAlign: "center", fontSize: 12, marginBottom: 2 }}>
                  {new Date(settledReceipt.tx.date).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  {" "}
                  {new Date(settledReceipt.tx.date).toLocaleTimeString(locale === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
                {state.user?.name && (
                  <div style={{ textAlign: "center", fontSize: 12, marginBottom: 2 }}>
                    {locale === "id" ? "Kasir" : "Cashier"}: {state.user.name}
                  </div>
                )}
                <div className="erp-receipt-divider">================================</div>
                {state.transactionItems
                  .filter((i) => i.transaction_id === settledReceipt.tx.id)
                  .map((item) => (
                    <div key={item.id}>
                      <div>{item.product_name}{item.variant_name ? ` (${item.variant_name})` : ""}</div>
                      <div className="erp-receipt-row">
                        <span>{item.qty} x {formatRupiah(item.unit_price)}</span>
                        <span>{formatRupiah(item.subtotal)}</span>
                      </div>
                    </div>
                  ))}
                <div className="erp-receipt-divider">================================</div>
                <div className="erp-receipt-row erp-receipt-total">
                  <span>GRAND TOTAL</span>
                  <span>{formatRupiah(settledReceipt.tx.total)}</span>
                </div>
                {settledReceipt.tx.customer_id && (
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {copy.pos.customerName}: {resolveCustomerName(settledReceipt.tx)}
                  </div>
                )}
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  {copy.pos.paymentMethod}: {settledReceipt.paymentMethod === "CASH" ? copy.pos.cash : settledReceipt.paymentMethod === "QRIS" ? copy.pos.qris : copy.pos.transfer}
                </div>
                <div style={{ marginTop: 8, padding: "6px 8px", border: "1px solid var(--erp-success)", borderRadius: 4, fontSize: 12, color: "var(--erp-success)", fontWeight: 600, textAlign: "center" }}>
                  {locale === "id" ? "*** LUNAS ***" : "*** SETTLED ***"}
                </div>
                <div className="erp-receipt-footer">Dicetak melalui aplikasi AyaKasir</div>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => window.print()}>
                {copy.pos.printReceipt}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={() => setSettledReceipt(null)}>
                {copy.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Modal */}
      {showCashFlow && (
        <div className="erp-overlay" onClick={() => setShowCashFlow(false)}>
          <div className="erp-dialog erp-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <div>
                <h3>{copy.dashboard.cashFlowDetails}</h3>
                <span style={{ fontSize: 12, color: "var(--erp-muted)" }}>{salesLabel}</span>
              </div>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCashFlow(false)}>
                {copy.common.close}
              </button>
            </div>
            {/* Summary row */}
            <div className="erp-cashflow-summary">
              <div className="erp-cashflow-summary-item erp-cashflow-summary-item--in">
                <span className="erp-cashflow-summary-label">{copy.dashboard.cashFlowIn}</span>
                <span className="erp-cashflow-summary-value">{formatRupiah(cashFlowIn)}</span>
              </div>
              <div className="erp-cashflow-summary-item erp-cashflow-summary-item--out">
                <span className="erp-cashflow-summary-label">{copy.dashboard.cashFlowOut}</span>
                <span className="erp-cashflow-summary-value">{formatRupiah(Math.abs(cashFlowOut))}</span>
              </div>
              <div className="erp-cashflow-summary-item erp-cashflow-summary-item--balance">
                <span className="erp-cashflow-summary-label">{copy.dashboard.cashFlowNet}</span>
                <span className={`erp-cashflow-summary-value${cashFlowNet >= 0 ? " erp-card-value--success" : " erp-card-value--danger"}`}>
                  {cashFlowNet >= 0 ? "+" : ""}{formatRupiah(cashFlowNet)}
                </span>
              </div>
            </div>
            <div className="erp-dialog-body" style={{ padding: 0 }}>
              {cashFlowEntries.length === 0 ? (
                <div className="erp-empty"><p>{copy.common.noData}</p></div>
              ) : (
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.purchasing.date}</th>
                      <th>{copy.dashboard.cashFlowType}</th>
                      <th>{copy.dashboard.cashFlowDesc}</th>
                      <th style={{ textAlign: "right" }}>{copy.dashboard.cashFlowAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowEntries.map((e) => (
                      <tr key={e.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(e.date, locale)}</td>
                        <td>
                          <span className={`erp-badge erp-badge--${e.amount >= 0 ? "success" : "danger"}`}>
                            {e.type}
                          </span>
                        </td>
                        <td style={{ color: "var(--erp-ink-secondary)", fontSize: 13 }}>{e.description}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: e.amount >= 0 ? "var(--erp-success)" : "var(--erp-danger)" }}>
                          {e.amount >= 0 ? "+" : ""}{formatRupiah(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
