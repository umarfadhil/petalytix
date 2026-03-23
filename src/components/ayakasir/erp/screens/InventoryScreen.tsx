"use client";

import { useState, useMemo } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah, formatQty } from "../utils";
import { adjustInventory, updateMinQty, deleteInventoryByProductVariant } from "@/lib/supabase/repositories/inventory";
import { createInventoryMovement } from "@/lib/supabase/repositories/inventory-movements";
import type { DbInventory, DbInventoryMovement } from "@/lib/supabase/types";

export default function InventoryScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const isOwner = state.user?.role === "OWNER";

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [invPage, setInvPage] = useState(0);
  const [invPageSize, setInvPageSize] = useState<10 | 25 | 50>(10);
  const [adjustItem, setAdjustItem] = useState<DbInventory | null>(null);
  const [newQty, setNewQty] = useState("");
  const [minQtyInput, setMinQtyInput] = useState("");
  const [dialogUnit, setDialogUnit] = useState(""); // active input unit for the dialog (may differ from base)
  const [movementType, setMovementType] = useState<"adjustment_in" | "adjustment_out" | "waste">("adjustment_in");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null); // key = "productId|variantId"
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

  const productsWithVariants = useMemo(
    () => new Set(state.variants.map((v) => v.product_id)),
    [state.variants]
  );

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
        // Hide the base (no-variant) inventory row only if the product has variants AND the base row has no stock
        // (i.e., it was auto-created when the raw material was added, not from an explicit receiving)
        if (!inv.variant_id && productsWithVariants.has(inv.product_id) && inv.current_qty === 0) return false;
        if (filterCategory && inv.categoryId !== filterCategory) return false;
        if (search) {
          const q = search.toLowerCase();
          return inv.productName.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [state.inventory, state.products, state.variants, state.categories, search, filterCategory, productsWithVariants]);

  const handleAdjust = async () => {
    if (!adjustItem) return;
    // User enters qty in the display unit (adjustItem.unit); convert to base for storage
    const qtyAfterDisplay = parseFloat(newQty) || 0;
    if (qtyAfterDisplay < 0) {
      alert(locale === "id" ? "Stok tidak boleh di bawah 0." : "Stock cannot be below 0.");
      return;
    }
    // Convert dialog unit to base (e.g. L→mL, kg→g); dialogUnit tracks the active input unit
    const qtyAfterVal = Math.round(qtyAfterDisplay * toBaseConversion(dialogUnit));
    // Validate direction: adjustment_in must increase stock; adjustment_out/waste must decrease stock
    if (movementType === "adjustment_in" && qtyAfterVal < adjustItem.current_qty) {
      alert(locale === "id"
        ? "Stok Berlebih: jumlah baru tidak boleh lebih kecil dari stok saat ini."
        : "Stock Surplus: new quantity cannot be lower than current stock.");
      return;
    }
    if ((movementType === "adjustment_out" || movementType === "waste") && qtyAfterVal > adjustItem.current_qty) {
      alert(locale === "id"
        ? `${movementType === "waste" ? "Kadaluwarsa / Rusak" : "Stok Berkurang"}: jumlah baru tidak boleh lebih besar dari stok saat ini.`
        : `${movementType === "waste" ? "Expired / Damaged" : "Stock Shortage"}: new quantity cannot be greater than current stock.`);
      return;
    }
    // min_qty is also entered in dialogUnit — convert to base
    const minQtyDisplay = parseFloat(minQtyInput) || 0;
    const minQtyVal = Math.round(minQtyDisplay * toBaseConversion(dialogUnit));
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
      let updated = await adjustInventory(
        supabase,
        adjustItem.product_id,
        adjustItem.variant_id,
        qtyAfterVal,
        newAvgCogs
      );
      // Save min_qty if it changed
      if (minQtyVal !== adjustItem.min_qty) {
        updated = await updateMinQty(supabase, adjustItem.product_id, adjustItem.variant_id, minQtyVal);
      }
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

  const handleDeleteInventory = async (inv: DbInventory) => {
    if (!confirm(copy.inventory.confirmDeleteInventory)) return;
    const key = `${inv.product_id}|${inv.variant_id}`;
    setDeleting(key);
    try {
      await deleteInventoryByProductVariant(supabase, inv.product_id, inv.variant_id || "");
      dispatch({ type: "DELETE", table: "inventory", compositeKey: { product_id: inv.product_id, variant_id: inv.variant_id || "" }, id: "" });
    } catch (err) {
      console.error("Delete inventory failed:", err);
    }
    setDeleting(null);
  };

  const lowStockItems = useMemo(
    () => inventoryRows.filter((inv) => inv.min_qty > 0 && inv.current_qty < inv.min_qty),
    [inventoryRows]
  );

  const invTotalPages = Math.ceil(inventoryRows.length / invPageSize);
  const pagedInventoryRows = inventoryRows.slice(invPage * invPageSize, invPage * invPageSize + invPageSize);

  return (
    <div>
      {lowStockItems.length > 0 && (
        <div className="erp-low-stock-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>{copy.inventory.lowStockCount(lowStockItems.length)}</span>
          <span style={{ color: "var(--erp-muted)", fontSize: 13 }}>
            {lowStockItems.map((i) => i.productName).join(", ")}
          </span>
        </div>
      )}
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div className="erp-filter-bar" style={{ margin: 0 }}>
          <span
            className={`erp-chip${filterCategory === "" ? " erp-chip--active" : ""}`}
            onClick={() => { setFilterCategory(""); setInvPage(0); }}
          >
            {copy.pos.allCategories}
          </span>
          {rawCategories.map((c) => (
            <span
              key={c.id}
              className={`erp-chip${filterCategory === c.id ? " erp-chip--active" : ""}`}
              onClick={() => { setFilterCategory(filterCategory === c.id ? "" : c.id); setInvPage(0); }}
            >
              {c.name}
            </span>
          ))}
        </div>
        <div className="erp-table-pagination-info">
          <span>{copy.purchasing.rowsPerPage}:</span>
          {([10, 25, 50] as const).map((n) => (
            <span
              key={n}
              className={`erp-chip erp-chip--sm${invPageSize === n ? " erp-chip--active" : ""}`}
              onClick={() => { setInvPageSize(n); setInvPage(0); }}
            >
              {n}
            </span>
          ))}
          <span>
            {inventoryRows.length === 0 ? "0" : `${invPage * invPageSize + 1}–${Math.min((invPage + 1) * invPageSize, inventoryRows.length)}`} / {inventoryRows.length}
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
          onChange={(e) => { setSearch(e.target.value); setInvPage(0); }}
        />
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
              pagedInventoryRows.map((inv) => {
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
                        <span className="erp-low-stock-indicator" title={copy.inventory.lowStock}>↓</span>
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
                          // Start dialog in display unit (mL→L, g→kg) for toggleable units
                          const initUnit = inv.unit === "mL" ? "L" : inv.unit === "g" ? "kg" : inv.unit;
                          setAdjustItem(inv);
                          setDialogUnit(initUnit);
                          setNewQty(String(convertToDisplayUnit(inv.current_qty, initUnit)));
                          setMinQtyInput(String(convertToDisplayUnit(inv.min_qty, initUnit)));
                          setMovementType("adjustment_in");
                          setReason("");
                        }}
                      >
                        {copy.inventory.adjustStock}
                      </button>
                      {isOwner && inv.current_qty === 0 && (
                        <button
                          className="erp-btn erp-btn--danger erp-btn--sm"
                          disabled={deleting === `${inv.product_id}|${inv.variant_id}`}
                          onClick={() => handleDeleteInventory(inv)}
                        >
                          {copy.inventory.deleteInventory}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {invTotalPages > 1 && (
          <div className="erp-table-pagination">
            <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={invPage === 0} onClick={() => setInvPage((p) => p - 1)}>‹</button>
            <span style={{ fontSize: 13 }}>{invPage + 1} / {invTotalPages}</span>
            <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={invPage >= invTotalPages - 1} onClick={() => setInvPage((p) => p + 1)}>›</button>
          </div>
        )}
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
                {isToggleable(adjustItem.unit) && (() => {
                  const altUnit = dialogUnit === "L" ? "mL" : dialogUnit === "mL" ? "L" : dialogUnit === "kg" ? "g" : "kg";
                  return (
                    <div className="erp-dialog-unit-switch">
                      <span style={{ fontSize: 12, color: "var(--erp-muted)" }}>
                        {locale === "id" ? "Input dalam" : "Input in"}:
                      </span>
                      <button
                        type="button"
                        className={`erp-chip${dialogUnit === (adjustItem.unit === "mL" ? "mL" : "g") ? " erp-chip--active" : ""}`}
                        style={{ fontSize: 12, padding: "2px 10px" }}
                        onClick={() => {
                          const factor = (dialogUnit === "L" || dialogUnit === "kg") ? 1000 : 1 / 1000;
                          const convert = (v: string) => {
                            const n = parseFloat(v);
                            return isNaN(n) ? "" : String(parseFloat((n * factor).toFixed(6)));
                          };
                          setNewQty(convert(newQty));
                          setMinQtyInput(convert(minQtyInput));
                          setDialogUnit(altUnit);
                        }}
                      >
                        {dialogUnit} ⇄ {altUnit}
                      </button>
                    </div>
                  );
                })()}
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
                <label className="erp-label">{copy.inventory.newQty} ({dialogUnit})</label>
                <input className="erp-input" type="number" min="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.inventory.setMinStock} ({dialogUnit})</label>
                <input className="erp-input" type="number" min="0" value={minQtyInput} onChange={(e) => setMinQtyInput(e.target.value)} />
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
