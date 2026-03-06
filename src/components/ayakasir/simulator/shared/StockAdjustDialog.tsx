"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import { formatQty } from "../constants";

interface Props {
  productId: string;
  variantId: string | null;
}

export default function StockAdjustDialog({ productId, variantId }: Props) {
  const { state, dispatch, copy } = useSimulator();
  const inv = state.inventory.find(
    (i) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null)
  );
  const product = state.products.find((p) => p.id === productId);

  const [qty, setQty] = useState(String(inv?.currentQty ?? 0));
  const [reason, setReason] = useState("");

  function handleApply() {
    const newQty = Number(qty);
    if (isNaN(newQty) || newQty < 0) return;
    dispatch({
      type: "ADJUST_INVENTORY",
      productId,
      variantId,
      newQty,
      reason: reason.trim() || "Manual adjustment",
    });
    dispatch({ type: "CLOSE_DIALOG" });
  }

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">{copy.inventory.adjustTitle}</h3>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
          {product?.name}
          {inv && ` — ${copy.inventory.stock}: ${formatQty(inv.currentQty, inv.unit)}`}
        </p>
        <div className="sim-adjust-row">
          <div className="sim-field">
            <label className="sim-label">
              {copy.inventory.adjustQty}
              {inv ? ` (${inv.unit})` : ""}
            </label>
            <input
              className="sim-input"
              type="number"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
            />
          </div>
          <div className="sim-field">
            <label className="sim-label">{copy.inventory.adjustReason}</label>
            <input
              className="sim-input"
              placeholder="e.g. stocktake, spoilage"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <div className="sim-dialog-actions">
          <button className="sim-btn sim-btn-ghost" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
            {copy.products.cancel}
          </button>
          <button className="sim-btn sim-btn-primary" onClick={handleApply}>
            {copy.products.save}
          </button>
        </div>
      </div>
    </div>
  );
}
