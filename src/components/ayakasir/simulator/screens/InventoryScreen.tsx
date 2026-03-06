"use client";

import { useMemo } from "react";
import { useSimulator } from "../context";
import { formatQty, formatRupiah } from "../constants";
import StockAdjustDialog from "../shared/StockAdjustDialog";

// Convert a purchased qty in purchasedUnit to inventoryUnit for cost-per-inv-unit calculation
function toCostPerInvUnit(unitCost: number, purchasedUnit: string | undefined, inventoryUnit: string): number {
  if (!purchasedUnit || purchasedUnit === inventoryUnit) return unitCost;
  // Cost is per purchasedUnit. We need cost per inventoryUnit.
  // e.g. Rp15.000/kg → Rp15/g (÷1000); Rp15/g → Rp15.000/kg (×1000)
  if (purchasedUnit === "kg" && inventoryUnit === "g") return unitCost / 1000;
  if (purchasedUnit === "g" && inventoryUnit === "kg") return unitCost * 1000;
  if (purchasedUnit === "L" && inventoryUnit === "mL") return unitCost / 1000;
  if (purchasedUnit === "mL" && inventoryUnit === "L") return unitCost * 1000;
  return unitCost;
}

// Display the COGS in a human-friendly unit (per kg if inv is g, per L if inv is mL)
function formatCogDisplay(costPerInvUnit: number, inventoryUnit: string): { amount: number; unit: string } {
  if (inventoryUnit === "g") return { amount: costPerInvUnit * 1000, unit: "kg" };
  if (inventoryUnit === "mL") return { amount: costPerInvUnit * 1000, unit: "L" };
  return { amount: costPerInvUnit, unit: inventoryUnit };
}

export default function InventoryScreen() {
  const { state, dispatch, copy } = useSimulator();

  const grouped = useMemo(() => {
    const groups: Record<string, typeof state.inventory> = {};
    for (const inv of state.inventory) {
      const product = state.products.find((p) => p.id === inv.productId);
      if (!product || product.productType !== "RAW_MATERIAL") continue;
      const catId = product.categoryId || "__none__";
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(inv);
    }
    return groups;
  }, [state.inventory, state.products]);

  // Weighted average cost per inventory unit per product, from all goods receivings
  const avgCostMap = useMemo(() => {
    // Accumulate total spend and total qty (in inventory unit) per product
    const totalSpend: Record<string, number> = {};
    const totalQty: Record<string, number> = {};

    for (const gr of state.goodsReceivings) {
      for (const item of gr.items) {
        const inv = state.inventory.find(
          (i) => i.productId === item.productId && i.variantId === null
        );
        if (!inv) continue;
        const costPerInvUnit = toCostPerInvUnit(item.unitCost, item.unit, inv.unit);
        // qty converted to inventory unit
        const qtyInInvUnit = item.unit && item.unit !== inv.unit
          ? (item.unit === "kg" && inv.unit === "g" ? item.qty * 1000
          : item.unit === "g" && inv.unit === "kg" ? item.qty / 1000
          : item.unit === "L" && inv.unit === "mL" ? item.qty * 1000
          : item.unit === "mL" && inv.unit === "L" ? item.qty / 1000
          : item.qty)
          : item.qty;
        totalSpend[item.productId] = (totalSpend[item.productId] ?? 0) + costPerInvUnit * qtyInInvUnit;
        totalQty[item.productId] = (totalQty[item.productId] ?? 0) + qtyInInvUnit;
      }
    }

    const map: Record<string, number> = {};
    for (const productId of Object.keys(totalQty)) {
      if (totalQty[productId] > 0) {
        map[productId] = totalSpend[productId] / totalQty[productId];
      }
    }
    return map;
  }, [state.goodsReceivings, state.inventory]);

  // Total stock value = sum over all raw material inventory items
  const totalStockValue = useMemo(() => {
    let total = 0;
    for (const inv of state.inventory) {
      const product = state.products.find((p) => p.id === inv.productId);
      if (!product || product.productType !== "RAW_MATERIAL") continue;
      const costPerUnit = avgCostMap[inv.productId] ?? 0;
      total += inv.currentQty * costPerUnit;
    }
    return total;
  }, [state.inventory, state.products, avgCostMap]);

  function getCategoryName(catId: string): string {
    if (catId === "__none__") return copy.products.noCategory;
    return state.categories.find((c) => c.id === catId)?.name ?? copy.products.noCategory;
  }

  if (state.inventory.length === 0) {
    return (
      <div className="sim-screen">
        <div className="sim-empty">
          <span className="sim-empty-icon">&#x1F4E6;</span>
          {copy.inventory.noItems}
        </div>
      </div>
    );
  }

  return (
    <div className="sim-screen">
      {/* Total stock value header */}
      {totalStockValue > 0 && (
        <div className="sim-inventory-total-row">
          <span className="sim-inventory-total-label">{copy.inventory.totalStockValue}</span>
          <span className="sim-inventory-total-value">{formatRupiah(Math.round(totalStockValue))}</span>
        </div>
      )}

      {Object.entries(grouped).map(([catId, items]) => (
        <div key={catId}>
          <div className="sim-category-header">{getCategoryName(catId)}</div>
          {items.map((inv) => {
            const product = state.products.find((p) => p.id === inv.productId);
            const variant = inv.variantId
              ? state.variants.find((v) => v.id === inv.variantId)
              : null;
            const isLow = inv.currentQty <= inv.minQty;
            const costPerInvUnit = avgCostMap[inv.productId];
            const cogDisplay = costPerInvUnit != null ? formatCogDisplay(costPerInvUnit, inv.unit) : null;

            return (
              <div key={`${inv.productId}-${inv.variantId ?? ""}`} className="sim-inventory-row">
                <span className={`sim-inventory-dot${isLow ? " low" : " ok"}`} />
                <div className="sim-inventory-info">
                  <div className="sim-inventory-name">
                    {product?.name ?? "?"}
                    {variant ? ` (${variant.name})` : ""}
                  </div>
                  <div className="sim-inventory-detail">
                    {copy.inventory.minStock}: {formatQty(inv.minQty, inv.unit)}
                    {isLow && ` — ${copy.inventory.low}`}
                    {cogDisplay != null && (
                      <span className="sim-inventory-cog">
                        {" · "}{copy.inventory.cogPerUnit}: {formatRupiah(Math.round(cogDisplay.amount))}/{cogDisplay.unit}
                      </span>
                    )}
                  </div>
                </div>
                <span className="sim-inventory-qty" style={isLow ? { color: "#d32f2f" } : undefined}>
                  {formatQty(inv.currentQty, inv.unit)}
                </span>
                <button
                  className="sim-inventory-adjust-btn"
                  onClick={() =>
                    dispatch({
                      type: "OPEN_DIALOG",
                      dialog: {
                        type: "stockAdjust",
                        productId: inv.productId,
                        variantId: inv.variantId,
                      },
                    })
                  }
                >
                  {copy.inventory.adjust}
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {state.activeDialog?.type === "stockAdjust" && (
        <StockAdjustDialog
          productId={state.activeDialog.productId}
          variantId={state.activeDialog.variantId}
        />
      )}
    </div>
  );
}
