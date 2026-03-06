"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import type { DiscountType } from "../types";

interface Props {
  productId: string;
  variantId: string | null;
}

export default function DiscountPickerDialog({ productId, variantId }: Props) {
  const { state, dispatch, copy } = useSimulator();
  const cartItem = state.cart.find(
    (c) => c.productId === productId && c.variantId === variantId
  );

  const [discountType, setDiscountType] = useState<DiscountType>(
    cartItem?.discountType ?? "NONE"
  );
  const [value, setValue] = useState(String(cartItem?.discountValue ?? 0));

  function handleApply() {
    dispatch({
      type: "SET_ITEM_DISCOUNT",
      productId,
      variantId,
      discountType,
      discountValue: discountType === "NONE" ? 0 : Number(value) || 0,
    });
    dispatch({ type: "CLOSE_DIALOG" });
  }

  const options: { key: DiscountType; label: string }[] = [
    { key: "NONE", label: copy.pos.discountNone },
    { key: "AMOUNT", label: copy.pos.discountAmount },
    { key: "PERCENT", label: copy.pos.discountPercent },
  ];

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">{copy.pos.discount}</h3>
        <div className="sim-discount-options">
          {options.map((opt) => (
            <button
              key={opt.key}
              className={`sim-discount-option${discountType === opt.key ? " active" : ""}`}
              onClick={() => setDiscountType(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {discountType !== "NONE" && (
          <div className="sim-field" style={{ marginBottom: 14 }}>
            <label className="sim-label">
              {copy.pos.discountValue}
              {discountType === "PERCENT" ? " (%)" : " (Rp)"}
            </label>
            <input
              className="sim-input"
              type="number"
              min="0"
              max={discountType === "PERCENT" ? "100" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className="sim-dialog-actions">
          <button
            className="sim-btn sim-btn-ghost"
            onClick={() => dispatch({ type: "CLOSE_DIALOG" })}
          >
            {copy.products.cancel}
          </button>
          <button className="sim-btn sim-btn-primary" onClick={handleApply}>
            {copy.pos.applyDiscount}
          </button>
        </div>
      </div>
    </div>
  );
}
