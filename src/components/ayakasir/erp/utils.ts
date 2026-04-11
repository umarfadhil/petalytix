import type { ConsolidatedInventoryRow, ConsolidatedGoodsReceivingItem } from "./office/store";
import type { DbProductComponent } from "@/lib/supabase/types";

// ── COGS computation utilities ────────────────────────────────────────────────
// Shared between OverviewScreen and ReportsScreen to ensure consistent results.

export function toInventoryUnit(qty: number, bomUnit: string, invUnit: string): number {
  const b = bomUnit.toLowerCase();
  const i = invUnit.toLowerCase();
  if (b === i) return qty;
  if (b === "kg" && i === "g") return qty * 1000;
  if (b === "g" && i === "kg") return qty / 1000;
  if (b === "l" && i === "ml") return qty * 1000;
  if (b === "ml" && i === "l") return qty / 1000;
  return qty;
}

export type InvMap = Map<string, { avg_cogs: number; unit: string }>;
export type BomMap = Map<string, { componentProductId: string; componentVariantId: string; requiredQty: number; unit: string }[]>;
export type HistoricalCogsMap = Map<string, { date: number; avg_cogs: number; qty: number }[]>;

export function buildInvMap(inventory: ConsolidatedInventoryRow[]): InvMap {
  const map: InvMap = new Map();
  inventory.forEach((row) => {
    map.set(`${row.tenant_id}|${row.product_id}|${row.variant_id}`, { avg_cogs: row.avg_cogs, unit: row.unit });
  });
  return map;
}

export function buildBomMap(components: DbProductComponent[]): BomMap {
  const map: BomMap = new Map();
  components.forEach((c) => {
    const key = `${c.tenant_id}|${c.parent_product_id}|${c.parent_variant_id}`;
    const arr = map.get(key) ?? [];
    arr.push({ componentProductId: c.component_product_id, componentVariantId: c.component_variant_id, requiredQty: c.required_qty, unit: c.unit });
    map.set(key, arr);
  });
  return map;
}

export function buildHistoricalCogsMap(grItems: ConsolidatedGoodsReceivingItem[], invMap: InvMap): HistoricalCogsMap {
  const map: HistoricalCogsMap = new Map();
  const sorted = grItems.slice().sort((a, b) => a.date - b.date);
  for (const gr of sorted) {
    const key = `${gr.tenant_id}|${gr.product_id}|${gr.variant_id}`;
    const timeline = map.get(key) ?? [];
    const prev = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    const prevAvg = prev?.avg_cogs ?? 0;
    const prevQty = prev?.qty ?? 0;
    const invUnit = invMap.get(key)?.unit ?? gr.unit;
    const receivedQty = toInventoryUnit(gr.qty, gr.unit, invUnit);
    const costPerBase = gr.cost_per_unit / toInventoryUnit(1, gr.unit, invUnit);
    const newQty = prevQty + receivedQty;
    const newAvg = newQty > 0 ? Math.floor((prevAvg * prevQty + costPerBase * receivedQty) / newQty) : 0;
    timeline.push({ date: gr.date, avg_cogs: newAvg, qty: newQty });
    map.set(key, timeline);
  }
  return map;
}

export function getHistoricalAvgCogs(
  tenantId: string, productId: string, variantId: string, atDate: number,
  historicalCogsMap: HistoricalCogsMap, invMap: InvMap
): { avg_cogs: number; unit: string } | undefined {
  const key = `${tenantId}|${productId}|${variantId}`;
  const timeline = historicalCogsMap.get(key);
  if (timeline && timeline.length > 0) {
    let lo = 0, hi = timeline.length - 1, result = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (timeline[mid].date <= atDate) { result = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    if (result >= 0) {
      const inv = invMap.get(key);
      return { avg_cogs: timeline[result].avg_cogs, unit: inv?.unit ?? "pcs" };
    }
  }
  return invMap.get(key);
}

export function computeItemCogs(
  tenantId: string, productId: string, variantId: string, qtySold: number,
  bomMap: BomMap, invMap: InvMap, historicalCogsMap: HistoricalCogsMap,
  atDate?: number, cogsPerUnit?: number
): number {
  if (cogsPerUnit && cogsPerUnit > 0) return cogsPerUnit * qtySold;
  const specificKey = `${tenantId}|${productId}|${variantId}`;
  const sharedKey = `${tenantId}|${productId}|`;
  const components = variantId
    ? [...(bomMap.get(specificKey) ?? []), ...(bomMap.get(sharedKey) ?? [])]
    : (bomMap.get(sharedKey) ?? []);
  if (components.length === 0) return 0;
  let costPerUnit = 0;
  for (const comp of components) {
    const inv = atDate != null
      ? getHistoricalAvgCogs(tenantId, comp.componentProductId, comp.componentVariantId, atDate, historicalCogsMap, invMap)
      : invMap.get(`${tenantId}|${comp.componentProductId}|${comp.componentVariantId}`);
    if (!inv) continue;
    costPerUnit += toInventoryUnit(comp.requiredQty, comp.unit, inv.unit) * inv.avg_cogs;
  }
  return costPerUnit * qtySold;
}

// ── End COGS utilities ────────────────────────────────────────────────────────

export function formatRupiah(amount: number): string {
  return "Rp" + Math.abs(amount).toLocaleString("id-ID");
}

export function formatDate(timestamp: number, locale: string = "id"): string {
  return new Date(timestamp).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: number, locale: string = "id"): string {
  return new Date(timestamp).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQty(qty: number, unit: string): string {
  // unit is the stored display unit (kg/L/g/mL/pcs); current_qty is in that unit.
  return `${parseFloat(qty.toFixed(3))} ${unit}`;
}

export function todayRange(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000 - 1;
  return [start, end];
}

export function monthRange(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return [start, end];
}

export function yearRange(): [number, number] {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
  return [start, end];
}
