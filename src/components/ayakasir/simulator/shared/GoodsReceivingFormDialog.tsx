"use client";

import { useState } from "react";
import { useSimulator } from "../context";
import { formatRupiah, formatQty } from "../constants";
import type { InventoryUnit } from "../types";

interface LineItem {
  productId: string;
  variantId: string | null;
  qty: string;
  unit: InventoryUnit;
  lineCost: string; // total cost for this line (not per unit)
}

export default function GoodsReceivingFormDialog() {
  const { state, dispatch, copy } = useSimulator();
  const [vendorId, setVendorId] = useState(state.vendors[0]?.id ?? "");
  const [items, setItems] = useState<LineItem[]>([
    { productId: "", variantId: null, qty: "", unit: "pcs", lineCost: "" },
  ]);

  // Only raw materials can be purchased, grouped by category
  const rawMaterials = state.products.filter((p) => p.productType === "RAW_MATERIAL" && p.isActive);
  const rawCategories = state.categories.filter((c) => c.categoryType === "RAW_MATERIAL");

  function getDefaultUnit(productId: string): InventoryUnit {
    const inv = state.inventory.find((i) => i.productId === productId && i.variantId === null);
    return inv?.unit ?? "pcs";
  }

  function updateItem(idx: number, key: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [key]: value };
        if (key === "productId" && value) {
          updated.unit = getDefaultUnit(value);
        }
        return updated;
      })
    );
  }

  function addLine() {
    setItems((prev) => [...prev, { productId: "", variantId: null, qty: "", unit: "pcs", lineCost: "" }]);
  }

  function removeLine(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    const validItems = items.filter((i) => i.productId && Number(i.qty) > 0);
    if (!vendorId || validItems.length === 0) return;

    const receivingItems = validItems.map((i) => {
      const qty = Number(i.qty);
      const lineCost = Number(i.lineCost) || 0;
      return {
        productId: i.productId,
        variantId: i.variantId,
        qty,
        unit: i.unit,
        unitCost: qty > 0 ? lineCost / qty : 0,
      };
    });

    const totalCost = receivingItems.reduce((sum, i) => sum + i.qty * i.unitCost, 0);

    dispatch({
      type: "ADD_GOODS_RECEIVING",
      receiving: { vendorId, date: Date.now(), totalCost, items: receivingItems },
    });
    dispatch({ type: "CLOSE_DIALOG" });
  }

  const totalCost = items.reduce((sum, i) => sum + (Number(i.lineCost) || 0), 0);

  // Build grouped options for the raw material select
  function RawMaterialOptions() {
    if (rawCategories.length === 0) {
      return (
        <>
          <option value="">—</option>
          {rawMaterials.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </>
      );
    }
    const uncategorized = rawMaterials.filter(
      (p) => !p.categoryId || !rawCategories.find((c) => c.id === p.categoryId)
    );
    return (
      <>
        <option value="">—</option>
        {rawCategories.map((cat) => {
          const catItems = rawMaterials.filter((p) => p.categoryId === cat.id);
          if (catItems.length === 0) return null;
          return (
            <optgroup key={cat.id} label={cat.name}>
              {catItems.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
          );
        })}
        {uncategorized.length > 0 && (
          <optgroup label="—">
            {uncategorized.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </optgroup>
        )}
      </>
    );
  }

  return (
    <div className="sim-dialog-overlay" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
      <div className="sim-dialog sim-form-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="sim-dialog-title">{copy.purchasing.addReceiving}</h3>

        <div className="sim-field">
          <label className="sim-label">{copy.purchasing.selectVendor}</label>
          <select className="sim-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">—</option>
            {state.vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="sim-settings-label" style={{ marginTop: 8 }}>{copy.purchasing.items}</div>
        <div className="sim-receiving-items">
          {items.map((item, idx) => {
            const inv = item.productId
              ? state.inventory.find((i) => i.productId === item.productId && i.variantId === null)
              : null;
            return (
              <div key={idx}>
                <div className="sim-receiving-item-row">
                  <select
                    className="sim-input"
                    value={item.productId}
                    onChange={(e) => updateItem(idx, "productId", e.target.value)}
                  >
                    <RawMaterialOptions />
                  </select>
                  <input
                    className="sim-input"
                    type="number"
                    min="1"
                    placeholder={copy.purchasing.qty}
                    value={item.qty}
                    onChange={(e) => updateItem(idx, "qty", e.target.value)}
                  />
                  <select
                    className="sim-input"
                    value={item.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value as InventoryUnit)}
                  >
                    <option value="pcs">pcs</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="mL">mL</option>
                    <option value="L">L</option>
                  </select>
                  <input
                    className="sim-input"
                    type="number"
                    min="0"
                    placeholder={copy.purchasing.unitCost}
                    value={item.lineCost}
                    onChange={(e) => updateItem(idx, "lineCost", e.target.value)}
                  />
                  <button
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#d32f2f", fontSize: 14 }}
                    onClick={() => removeLine(idx)}
                  >
                    ✕
                  </button>
                </div>
                {inv && (
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4, paddingLeft: 2 }}>
                    {copy.inventory.stock}: {formatQty(inv.currentQty, inv.unit)}
                  </div>
                )}
              </div>
            );
          })}
          <button className="sim-btn sim-btn-ghost sim-btn-sm" onClick={addLine} style={{ marginTop: 4 }}>
            + {copy.purchasing.addItem}
          </button>
        </div>

        {totalCost > 0 && (
          <div className="sim-receipt-row total" style={{ marginBottom: 12 }}>
            <span>{copy.purchasing.totalCost}</span>
            <span>{formatRupiah(totalCost)}</span>
          </div>
        )}

        <div className="sim-dialog-actions">
          <button className="sim-btn sim-btn-ghost" onClick={() => dispatch({ type: "CLOSE_DIALOG" })}>
            {copy.products.cancel}
          </button>
          <button className="sim-btn sim-btn-primary" onClick={handleSave}>
            {copy.products.save}
          </button>
        </div>
      </div>
    </div>
  );
}
