"use client";

import { useMemo } from "react";
import { useSimulator } from "../context";
import { formatRupiah, formatDate } from "../constants";
import DateRangePickerDialog from "../shared/DateRangePickerDialog";
import DebtSettleDialog from "../shared/DebtSettleDialog";

export default function DashboardScreen() {
  const { state, dispatch, copy } = useSimulator();

  const periodRange = useMemo((): { from: number; to: number } => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    if (state.dashboardPeriod === "custom" && state.dashboardDateRange) {
      return state.dashboardDateRange;
    }
    switch (state.dashboardPeriod) {
      case "month": return { from: startOfMonth, to: endOfDay };
      case "year": return { from: startOfYear, to: endOfDay };
      default: return { from: startOfDay, to: endOfDay };
    }
  }, [state.dashboardPeriod, state.dashboardDateRange]);

  const filteredTx = useMemo(
    () => state.transactions.filter(
      (t) => t.status === "COMPLETED" && t.date >= periodRange.from && t.date <= periodRange.to
    ),
    [state.transactions, periodRange]
  );

  const totalSales = filteredTx.reduce((sum, t) => sum + t.total, 0);
  const cashSales = filteredTx.filter((t) => t.paymentMethod === "CASH").reduce((sum, t) => sum + t.total, 0);
  const qrisSales = filteredTx.filter((t) => t.paymentMethod === "QRIS").reduce((sum, t) => sum + t.total, 0);
  const utangSales = filteredTx.filter((t) => t.paymentMethod === "UTANG").reduce((sum, t) => sum + t.total, 0);

  const cashBalance = state.ledger
    .filter((l) => l.type === "SALE" || l.type === "INITIAL_BALANCE" || l.type === "DEBT_SETTLED")
    .reduce((sum, l) => sum + l.amount, 0);
  // DEBT_SETTLED_QRIS is intentionally excluded from cashBalance

  const unpaidDebts = state.transactions.filter(
    (t) => t.paymentMethod === "UTANG" && t.debtStatus === "UNPAID"
  );

  const lowStockItems = state.inventory.filter((i) => i.currentQty <= i.minQty);

  // Product sales summary for period
  const productSales = useMemo(() => {
    const txIds = new Set(filteredTx.map((t) => t.id));
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const item of state.transactionItems) {
      if (!txIds.has(item.transactionId)) continue;
      const key = item.productId;
      if (!map[key]) map[key] = { name: item.productName, qty: 0, revenue: 0 };
      map[key].qty += item.qty;
      map[key].revenue += item.subtotal;
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTx, state.transactionItems]);

  const periods: { key: "today" | "month" | "year" | "custom"; label: string }[] = [
    { key: "today", label: copy.dashboard.today },
    { key: "month", label: copy.dashboard.month },
    { key: "year", label: copy.dashboard.year },
    { key: "custom", label: copy.dashboard.custom },
  ];

  return (
    <div className="sim-screen">
      {/* Period chips */}
      <div className="sim-chips">
        {periods.map((p) => (
          <button
            key={p.key}
            className={`sim-chip${state.dashboardPeriod === p.key ? " active" : ""}`}
            onClick={() => {
              if (p.key === "custom") {
                dispatch({ type: "OPEN_DIALOG", dialog: { type: "dateRangePicker" } });
              } else {
                dispatch({ type: "SET_DASHBOARD_PERIOD", period: p.key });
              }
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="sim-stats-grid">
        <div className="sim-stat-card">
          <div className="sim-stat-label">{copy.dashboard.totalSales}</div>
          <div className="sim-stat-value primary">{formatRupiah(totalSales)}</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-label">{copy.dashboard.saldoKas}</div>
          <div className="sim-stat-value" style={{ color: "#37A454" }}>{formatRupiah(cashBalance)}</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-label">{copy.dashboard.txCount}</div>
          <div className="sim-stat-value">{filteredTx.length}</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-label">{copy.dashboard.cashSales}</div>
          <div className="sim-stat-value">{formatRupiah(cashSales)}</div>
        </div>
        <div className="sim-stat-card">
          <div className="sim-stat-label">{copy.dashboard.qrisSales}</div>
          <div className="sim-stat-value">{formatRupiah(qrisSales)}</div>
        </div>
        {utangSales > 0 && (
          <div className="sim-stat-card">
            <div className="sim-stat-label">{copy.dashboard.utangSales}</div>
            <div className="sim-stat-value" style={{ color: "#d32f2f" }}>{formatRupiah(utangSales)}</div>
          </div>
        )}
      </div>

      {/* Unpaid debts */}
      {unpaidDebts.length > 0 && (
        <div style={{ padding: "8px 14px 0" }}>
          <div className="sim-settings-label">{copy.dashboard.unpaidDebts}</div>
          {unpaidDebts.map((tx) => (
            <div key={tx.id} className="sim-debt-row">
              <div className="sim-debt-info">
                <div className="sim-debt-customer">{tx.customerName || "—"}</div>
                <div className="sim-debt-date">{formatDate(tx.date)}</div>
              </div>
              <div className="sim-debt-amount">{formatRupiah(tx.total)}</div>
              <button
                className="sim-btn sim-btn-success sim-btn-sm"
                onClick={() =>
                  dispatch({
                    type: "OPEN_DIALOG",
                    dialog: {
                      type: "debtSettle",
                      transactionId: tx.id,
                      total: tx.total,
                      customerName: tx.customerName,
                    },
                  })
                }
              >
                {copy.dashboard.settleDebt}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Low stock alert */}
      {lowStockItems.length > 0 ? (
        <div className="sim-alert" style={{ margin: "8px 14px" }}>
          <span className="sim-alert-icon">&#x26A0;&#xFE0F;</span>
          <span className="sim-alert-text">
            {copy.dashboard.lowStock}: {lowStockItems.length} {copy.pos.items}
          </span>
        </div>
      ) : (
        <div className="sim-alert ok" style={{ margin: "8px 14px" }}>
          <span className="sim-alert-icon">&#x2705;</span>
          <span className="sim-alert-text">{copy.dashboard.noLowStock}</span>
        </div>
      )}

      {/* Product sales summary */}
      {productSales.length > 0 && (
        <div style={{ padding: "4px 14px 12px" }}>
          <div className="sim-settings-label" style={{ marginBottom: 8 }}>{copy.dashboard.productSummary}</div>
          <table className="sim-product-summary-table">
            <thead>
              <tr>
                <th>{copy.dashboard.productName}</th>
                <th>{copy.dashboard.qtySold}</th>
                <th>{copy.dashboard.revenue}</th>
              </tr>
            </thead>
            <tbody>
              {productSales.map((ps) => (
                <tr key={ps.name}>
                  <td>{ps.name}</td>
                  <td>{ps.qty}</td>
                  <td>{formatRupiah(ps.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No data message */}
      {filteredTx.length === 0 && (
        <div className="sim-empty">
          <span className="sim-empty-icon">&#x1F4CA;</span>
          {copy.dashboard.noData}
        </div>
      )}

      {/* Date range picker dialog */}
      {state.activeDialog?.type === "dateRangePicker" && <DateRangePickerDialog />}

      {/* Debt settle payment method dialog */}
      {state.activeDialog?.type === "debtSettle" && (
        <DebtSettleDialog
          transactionId={state.activeDialog.transactionId}
          total={state.activeDialog.total}
          customerName={state.activeDialog.customerName}
        />
      )}
    </div>
  );
}
