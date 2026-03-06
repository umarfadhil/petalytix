"use client";

import { useSimulator } from "../context";
import { formatRupiah } from "../constants";

export default function DebtSettleDialog({
  transactionId,
  total,
  customerName,
}: {
  transactionId: string;
  total: number;
  customerName?: string;
}) {
  const { state, dispatch, copy } = useSimulator();

  function settle(method: "CASH" | "QRIS") {
    dispatch({ type: "SETTLE_DEBT", transactionId, paymentMethod: method });
    dispatch({ type: "CLOSE_DIALOG" });
  }

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">{copy.dashboard.settleDebt}</h3>

        {customerName && (
          <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{customerName}</div>
        )}
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>{formatRupiah(total)}</div>

        <div className="sim-settings-label" style={{ marginBottom: 8 }}>{copy.dashboard.settleMethod}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {state.paymentMethods.cash && (
            <button
              className="sim-btn sim-btn-primary"
              style={{ flex: 1 }}
              onClick={() => settle("CASH")}
            >
              {copy.dashboard.settleWithCash}
            </button>
          )}
          {state.paymentMethods.qris && (
            <button
              className="sim-btn sim-btn-ghost"
              style={{ flex: 1 }}
              onClick={() => settle("QRIS")}
            >
              {copy.dashboard.settleWithQris}
            </button>
          )}
        </div>

        <div className="sim-dialog-actions" style={{ marginTop: 12 }}>
          <button className="sim-btn sim-btn-ghost" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
            {copy.products.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
