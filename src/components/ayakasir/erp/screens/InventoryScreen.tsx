"use client";

import { useState, useMemo } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah, formatQty } from "../utils";
import { adjustInventory } from "@/lib/supabase/repositories/inventory";
import { createInventoryMovement } from "@/lib/supabase/repositories/inventory-movements";
import type { DbInventory, DbInventoryMovement } from "@/lib/supabase/types";

export default function InventoryScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [adjustItem, setAdjustItem] = useState<DbInventory | null>(null);
  const [newQty, setNewQty] = useState("");
  const [movementType, setMovementType] = useState<"adjustment_in" | "adjustment_out" | "waste">("adjustment_in");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  // Display unit overrides: key = "productId|variantId", value = display unit
  const [displayUnits, setDisplayUnits] = useState<Map<string, string>>(new Map());

  const getDisplayUnit = (inv: DbInventory): string =>
    displayUnits.get(`${inv.product_id}|${inv.variant_id}`) || inv.unit;

  const toggleDisplayUnit = (inv: DbInventory) => {
    const key = `${inv.product_id}|${inv.variant_id}`;
    const current = displayUnits.get(key) || inv.unit;
    const next =
      current === "L" ? "mL" :
      current === "mL" ? "L" :
      current === "kg" ? "g" :
      current === "g" ? "kg" :
      current;
    setDisplayUnits((prev) => new Map(prev).set(key, next));
  };

  // inv.unit is now the display unit marker (kg/L/g/mL/pcs); current_qty is always in base (g/mL/pcs).
  // Convert stored base qty to display unit for rendering.
  const convertToDisplayUnit = (baseQty: number, displayUnit: string): number => {
    if (displayUnit === "kg") return baseQty / 1000;
    if (displayUnit === "L") return baseQty / 1000;
    return baseQty;
  };

  const isToggleable = (unit: string) =>
    unit === "L" || unit === "mL" || unit === "kg" || unit === "g";

  const rawCategories = useMemo(
    () => state.categories.filter((c) => c.category_type === "RAW_MATERIAL"),
    [state.categories]
  );

  const toBaseConversion = (unit: string) => {
    if (unit === "L") return 1000;
    if (unit === "kg") return 1000;
    return 1;
  };

  /**
   * Compute the new avg_cogs after a stock adjustment.
   *
   * adjustment_in (bonus stock, no cost):
   *   newAvg = floor((oldAvg × oldQty) / newQty)
   *   → cost diluted over more units → lower HPP; floor prevents total cost inflation.
   *
   * adjustment_out (stock count correction — units simply disappear at their avg cost):
   *   newAvg = oldAvg (unchanged)
   *   → stock value drops proportionally with qty; per-unit cost is unaffected.
   *   Mirrors Android app behaviour.
   *
   * waste (expired / damaged — cost was already incurred; absorbed by remaining units):
   *   newAvg = ceil((oldAvg × oldQty) / newQty)
   *   → total cost preserved and spread over fewer units → higher HPP.
   *   ceil prevents the total from rounding below the original cost.
   */
  const computeNewAvgCogs = (
    oldAvg: number,
    oldQty: number,
    newQty: number,
    type: "adjustment_in" | "adjustment_out" | "waste"
  ): number => {
    if (newQty <= 0) return 0;
    if (type === "adjustment_in") {
      return oldQty > 0 ? Math.floor((oldAvg * oldQty) / newQty) : 0;
    }
    if (type === "waste") {
      // Total cost preserved → ceil so remaining stock absorbs the full original cost
      return oldQty > 0 ? Math.ceil((oldAvg * oldQty) / newQty) : 0;
    }
    // adjustment_out: per-unit cost unchanged, stock value drops with qty
    return oldAvg;
  };

  const inventoryRows = useMemo(() => {
    return state.inventory
      .map((inv) => {
        const product = state.products.find((p) => p.id === inv.product_id);
        const variant = inv.variant_id ? state.variants.find((v) => v.id === inv.variant_id) : null;
        const category = product?.category_id ? state.categories.find((c) => c.id === product.category_id) : null;
        return {
          ...inv,
          productName: product?.name || "?",
          variantName: variant?.name || null,
          productType: product?.product_type,
          categoryId: category?.id || null,
          categoryName: category?.name || null,
        };
      })
      .filter((inv) => {
        if (filterCategory && inv.categoryId !== filterCategory) return false;
        if (search) {
          const q = search.toLowerCase();
          return inv.productName.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [state.inventory, state.products, state.variants, state.categories, search, filterCategory]);

  const handleAdjust = async () => {
    if (!adjustItem) return;
    // User enters qty in the display unit (adjustItem.unit); convert to base for storage
    const qtyAfterDisplay = parseFloat(newQty) || 0;
    if (qtyAfterDisplay < 0) {
      alert(locale === "id" ? "Stok tidak boleh di bawah 0." : "Stock cannot be below 0.");
      return;
    }
    // Convert display qty to base (e.g. kg→g, L→mL)
    const qtyAfterVal = Math.round(qtyAfterDisplay * toBaseConversion(adjustItem.unit));
    setSaving(true);
    try {
      // computeNewAvgCogs already returns a rounded integer (floor for in, ceil for out/waste)
      // adjustItem.current_qty and qtyAfterVal are both in base units
      const newAvgCogs = computeNewAvgCogs(
        adjustItem.avg_cogs ?? 0,
        adjustItem.current_qty,
        qtyAfterVal,
        movementType
      );
      const updated = await adjustInventory(
        supabase,
        adjustItem.product_id,
        adjustItem.variant_id,
        qtyAfterVal,
        newAvgCogs
      );
      dispatch({ type: "UPSERT", table: "inventory", payload: updated as unknown as Record<string, unknown> });

      // Record movement in inventory_movements
      const qtyChange = qtyAfterVal - adjustItem.current_qty;
      if (qtyChange !== 0) {
        const movement: Omit<DbInventoryMovement, "sync_status"> = {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          product_id: adjustItem.product_id,
          variant_id: adjustItem.variant_id || "",
          movement_type: movementType,
          qty_before: adjustItem.current_qty,
          qty_change: qtyChange,
          qty_after: qtyAfterVal,
          unit: adjustItem.unit,
          reason: reason,
          user_id: state.user?.id || "",
          date: Date.now(),
          updated_at: Date.now(),
        };
        const saved = await createInventoryMovement(supabase, movement);
        dispatch({ type: "UPSERT", table: "inventoryMovements", payload: saved as unknown as Record<string, unknown> });
      }

      setAdjustItem(null);
    } catch (err) {
      console.error("Adjust stock failed:", err);
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.inventory.title}</h1>
        <div className="erp-card erp-card--stat" style={{ marginLeft: "auto" }}>
          <span className="erp-card-label">{locale === "id" ? "Total Nilai Inventori" : "Total Inventory Value"}</span>
          <span className="erp-card-value">
            {formatRupiah(
              state.inventory.reduce((sum, inv) => {
                const avgCost = inv.current_qty > 0 ? (inv.avg_cogs ?? 0) : 0;
                return sum + inv.current_qty * avgCost;
              }, 0)
            )}
          </span>
        </div>
      </div>

      <div className="erp-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={copy.common.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="erp-filter-bar">
        <span
          className={`erp-chip${filterCategory === "" ? " erp-chip--active" : ""}`}
          onClick={() => setFilterCategory("")}
        >
          {copy.pos.allCategories}
        </span>
        {rawCategories.map((c) => (
          <span
            key={c.id}
            className={`erp-chip${filterCategory === c.id ? " erp-chip--active" : ""}`}
            onClick={() => setFilterCategory(filterCategory === c.id ? "" : c.id)}
          >
            {c.name}
          </span>
        ))}
      </div>

      <div className="erp-table-wrap">
        <table className="erp-table">
          <thead>
            <tr>
              <th>{copy.inventory.product}</th>
              <th>{copy.products.category}</th>
              <th>{copy.inventory.currentStock}</th>
              <th>{copy.inventory.minStock}</th>
              <th>{copy.inventory.unit}</th>
              <th>{locale === "id" ? "HPP Rata-rata" : "Avg COGS"}</th>
              <th>{locale === "id" ? "Nilai Stok" : "Stock Value"}</th>
              <th>{copy.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {inventoryRows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--erp-muted)" }}>
                  {copy.inventory.noInventory}
                </td>
              </tr>
            ) : (
              inventoryRows.map((inv) => {
                const isLow = inv.current_qty < inv.min_qty && inv.min_qty > 0;
                const dispUnit = getDisplayUnit(inv);
                const dispCurrent = convertToDisplayUnit(inv.current_qty, dispUnit);
                const dispMin = convertToDisplayUnit(inv.min_qty, dispUnit);
                const fmt3 = (n: number) => parseFloat(n.toFixed(3)).toString();
                const fmtDisp = (n: number) => `${fmt3(n)} ${dispUnit}`;
                // avg_cogs is stored per base unit in the DB; convert to display unit for label
                const avgCostPerBase = inv.current_qty > 0 ? (inv.avg_cogs ?? 0) : 0;
                // inv.unit is already base (mL/g/pcs); dispUnit may be L/kg.
                // cost per dispUnit = cost per base × how many base units fit in 1 dispUnit
                const avgCostPerDisp = avgCostPerBase * toBaseConversion(dispUnit);
                const stockValue = inv.current_qty * avgCostPerBase;
                return (
                  <tr key={`${inv.product_id}-${inv.variant_id}`}>
                    <td>
                      <strong>{inv.productName}</strong>
                      {inv.variantName && <span style={{ color: "var(--erp-muted)" }}> ({inv.variantName})</span>}
                    </td>
                    <td style={{ color: "var(--erp-muted)", fontSize: 13 }}>
                      {inv.categoryName || "—"}
                    </td>
                    <td>
                      <span style={{ color: isLow ? "var(--erp-danger)" : undefined, fontWeight: isLow ? 600 : undefined }}>
                        {fmtDisp(dispCurrent)}
                      </span>
                      {isLow && (
                        <span className="erp-badge erp-badge--danger" style={{ marginLeft: 8 }}>
                          {copy.inventory.lowStock}
                        </span>
                      )}
                    </td>
                    <td>{fmtDisp(dispMin)}</td>
                    <td>
                      {isToggleable(inv.unit) ? (
                        <button
                          className="erp-chip erp-chip--active"
                          style={{ fontSize: 12, padding: "2px 8px", cursor: "pointer" }}
                          onClick={() => toggleDisplayUnit(inv)}
                          title={`Switch to ${dispUnit === "L" ? "mL" : dispUnit === "mL" ? "L" : dispUnit === "kg" ? "g" : "kg"}`}
                        >
                          {dispUnit} ⇄
                        </button>
                      ) : (
                        inv.unit
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {avgCostPerBase > 0 ? `${formatRupiah(avgCostPerDisp)}/${dispUnit}` : "—"}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: stockValue > 0 ? 500 : undefined }}>
                      {stockValue > 0 ? formatRupiah(stockValue) : "—"}
                    </td>
                    <td className="erp-td-actions">
                      <button
                        className="erp-btn erp-btn--ghost erp-btn--sm"
                        onClick={() => {
                          setAdjustItem(inv);
                          // Initialize with display qty (inv.unit is the display unit marker)
                          setNewQty(String(convertToDisplayUnit(inv.current_qty, inv.unit)));
                          setMovementType("adjustment_in");
                          setReason("");
                        }}
                      >
                        {copy.inventory.adjustStock}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust stock dialog */}
      {adjustItem && (
        <div className="erp-overlay" onClick={() => setAdjustItem(null)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.inventory.adjustStock}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setAdjustItem(null)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ marginBottom: 16, fontWeight: 500 }}>
                {state.products.find((p) => p.id === adjustItem.product_id)?.name}
                {adjustItem.variant_id && state.variants.find((v) => v.id === adjustItem.variant_id)
                  ? ` (${state.variants.find((v) => v.id === adjustItem.variant_id)?.name})`
                  : ""}
              </p>
              <div className="erp-input-group">
                <label className="erp-label">{copy.inventory.currentStock}: {formatQty(adjustItem.current_qty, adjustItem.unit)}</label>
                <span style={{ fontSize: 12, color: "var(--erp-muted)" }}>
                  {locale === "id" ? "Qty baru dalam" : "New qty in"}: {adjustItem.unit}
                </span>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.inventory.movementType}</label>
                <select
                  className="erp-input"
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as typeof movementType)}
                >
                  {copy.inventory.movementTypes.map((mt) => (
                    <option key={mt.value} value={mt.value}>{mt.label}</option>
                  ))}
                </select>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.inventory.newQty}</label>
                <input className="erp-input" type="number" min="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.inventory.notes}</label>
                <input className="erp-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={copy.inventory.notesPlaceholder} />
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setAdjustItem(null)}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleAdjust} disabled={saving}>
                {saving ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
