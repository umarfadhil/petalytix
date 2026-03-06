"use client";

import { useSimulator } from "../context";
import { formatRupiah, formatDate } from "../constants";

export default function ReceiptDialog({ transactionId }: { transactionId: string }) {
  const { state, dispatch, copy } = useSimulator();

  const tx = state.transactions.find((t) => t.id === transactionId);
  const items = state.transactionItems.filter((i) => i.transactionId === transactionId);

  if (!tx) return null;

  const totalDiscount = items.reduce((sum, i) => sum + (i.discountAmount ?? 0), 0);

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog sim-receipt" onClick={(e) => e.stopPropagation()}>
        <div className="sim-receipt-icon">&#x2705;</div>
        <h3 className="sim-dialog-title">{copy.receipt.title}</h3>

        <div className="sim-receipt-row">
          <span>{copy.receipt.date}</span>
          <span>{formatDate(tx.date)}</span>
        </div>
        <div className="sim-receipt-row">
          <span>{copy.receipt.method}</span>
          <span>{tx.paymentMethod}</span>
        </div>
        {tx.customerName && (
          <div className="sim-receipt-row">
            <span>{copy.receipt.customer}</span>
            <span>{tx.customerName}</span>
          </div>
        )}

        <div className="sim-receipt-items">
          {items.map((item) => (
            <div key={item.id}>
              <div className="sim-receipt-item">
                <span>
                  {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ""} ×{item.qty}
                </span>
                <span>{formatRupiah(item.unitPrice * item.qty)}</span>
              </div>
              {item.discountAmount > 0 && (
                <div className="sim-receipt-item" style={{ color: "#d32f2f", fontSize: 11 }}>
                  <span>
                    {copy.receipt.discount}{" "}
                    {item.discountType === "PERCENT" ? `(${item.discountValue}%)` : ""}
                  </span>
                  <span>-{formatRupiah(item.discountAmount)}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {totalDiscount > 0 && (
          <div className="sim-receipt-row" style={{ color: "#d32f2f" }}>
            <span>{copy.receipt.discount}</span>
            <span>-{formatRupiah(totalDiscount)}</span>
          </div>
        )}

        <div className="sim-receipt-row total">
          <span>{copy.receipt.total}</span>
          <span>{formatRupiah(tx.total)}</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            className="sim-btn sim-btn-primary sim-btn-full"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            {copy.receipt.close}
          </button>
        </div>
      </div>
    </div>
  );
}
