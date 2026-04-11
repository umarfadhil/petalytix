"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useOffice } from "../store";
import { formatRupiah, todayRange, monthRange, yearRange } from "../../utils";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type { TenantPlan } from "@/lib/supabase/types";

type OverviewPeriod = "today" | "week" | "month" | "year";

function weekRange(): [number, number] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
  const end = start + 7 * 86400000 - 1;
  return [start, end];
}

function fmtPct(pct: number): string {
  return (isFinite(pct) ? pct : 0).toFixed(1) + "%";
}

function fmtSigned(amount: number): string {
  if (amount < 0) return "-" + formatRupiah(Math.abs(amount));
  return formatRupiah(amount);
}

function toInventoryUnit(qty: number, bomUnit: string, invUnit: string): number {
  const b = bomUnit.toLowerCase();
  const i = invUnit.toLowerCase();
  if (b === i) return qty;
  if (b === "kg" && i === "g") return qty * 1000;
  if (b === "g" && i === "kg") return qty / 1000;
  if (b === "l" && i === "ml") return qty * 1000;
  if (b === "ml" && i === "l") return qty / 1000;
  return qty;
}

function downloadXlsx(filename: string, sheets: { name: string; rows: (string | number)[][] }[]) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  XLSX.writeFile(wb, filename);
}

function StatRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="office-branch-stat-item">
      <div className="office-stat-label">{label}</div>
      <div className={`office-branch-stat-value${danger ? " office-stat--danger" : ""}`}>{value}</div>
    </div>
  );
}

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="office-branch-stat-section">
      <div className="office-branch-stat-section-title">{title}</div>
      {children}
    </div>
  );
}

export default function OverviewScreen() {
  const { state, locale } = useOffice();
  const isId = locale === "id";

  // Plan gate for CSV export
  const planExpired =
    state.organization?.plan_expires_at != null &&
    Date.now() > (state.organization.plan_expires_at ?? 0);
  const effectivePlan = planExpired ? "PERINTIS" : (state.organization?.plan ?? "PERINTIS") as TenantPlan;
  const canExportCsv = getPlanLimits(effectivePlan).maxBranches > 1;

  const [period, setPeriod] = useState<OverviewPeriod>("today");

  const range = useMemo<[number, number]>(() => {
    if (period === "today") return todayRange();
    if (period === "week") return weekRange();
    if (period === "month") return monthRange();
    return yearRange();
  }, [period]);

  const filteredTxs = useMemo(
    () => state.consolidatedTxs.filter((t) => t.date >= range[0] && t.date <= range[1]),
    [state.consolidatedTxs, range]
  );

  const filteredTxItems = useMemo(() => {
    const txIdSet = new Set(filteredTxs.map((t) => t.id));
    return state.consolidatedTxItems.filter((i) => txIdSet.has(i.transaction_id));
  }, [filteredTxs, state.consolidatedTxItems]);

  const filteredGrItems = useMemo(
    () => state.consolidatedGrItems.filter((g) => g.date >= range[0] && g.date <= range[1]),
    [state.consolidatedGrItems, range]
  );

  const filteredMovements = useMemo(
    () => state.consolidatedMovements.filter((m) => m.date >= range[0] && m.date <= range[1]),
    [state.consolidatedMovements, range]
  );

  // inv lookup: "tenantId|productId|variantId" → { avg_cogs, unit }
  const invMap = useMemo(() => {
    const map = new Map<string, { avg_cogs: number; unit: string }>();
    state.consolidatedInventory.forEach((row) => {
      map.set(`${row.tenant_id}|${row.product_id}|${row.variant_id}`, { avg_cogs: row.avg_cogs, unit: row.unit });
    });
    return map;
  }, [state.consolidatedInventory]);

  // BOM lookup: "tenantId|parentProductId|parentVariantId" → component list
  const bomMap = useMemo(() => {
    const map = new Map<string, { componentProductId: string; componentVariantId: string; requiredQty: number; unit: string }[]>();
    state.consolidatedProductComponents.forEach((c) => {
      const key = `${c.tenant_id}|${c.parent_product_id}|${c.parent_variant_id}`;
      const arr = map.get(key) ?? [];
      arr.push({ componentProductId: c.component_product_id, componentVariantId: c.component_variant_id, requiredQty: c.required_qty, unit: c.unit });
      map.set(key, arr);
    });
    return map;
  }, [state.consolidatedProductComponents]);

  // Historical avg_cogs timeline: "tenantId|productId|variantId" → [{date, avg_cogs}] sorted ascending
  // Reconstructed by replaying goods receivings in chronological order using weighted-average formula.
  // Falls back to latest inventory snapshot when no GR history exists for a component.
  const historicalCogsMap = useMemo(() => {
    const map = new Map<string, { date: number; avg_cogs: number; qty: number }[]>();

    // Sort all GR items by date ascending for chronological replay
    const sorted = state.consolidatedGrItems.slice().sort((a, b) => a.date - b.date);

    for (const gr of sorted) {
      const key = `${gr.tenant_id}|${gr.product_id}|${gr.variant_id}`;
      const timeline = map.get(key) ?? [];

      // Get current running avg and qty from last checkpoint
      const prev = timeline.length > 0 ? timeline[timeline.length - 1] : null;
      const prevAvg = prev?.avg_cogs ?? 0;
      const prevQty = prev?.qty ?? 0;

      // GR items may use display units (kg, L) while inventory stores in base units (g, mL).
      // Convert both qty and cost_per_unit to the inventory's stored unit before weighted-average.
      const invUnit = invMap.get(key)?.unit ?? gr.unit;
      const receivedQty = toInventoryUnit(gr.qty, gr.unit, invUnit);
      // cost_per_unit is per GR unit → convert to per base unit
      const costPerBase = gr.cost_per_unit / toInventoryUnit(1, gr.unit, invUnit);
      const newQty = prevQty + receivedQty;
      const newAvg = newQty > 0
        ? Math.floor((prevAvg * prevQty + costPerBase * receivedQty) / newQty)
        : 0;

      timeline.push({ date: gr.date, avg_cogs: newAvg, qty: newQty });
      map.set(key, timeline);
    }

    return map;
  }, [state.consolidatedGrItems]);

  // Look up avg_cogs for a raw material at a point in time.
  // Uses the last GR checkpoint before `atDate`; falls back to latest inventory snapshot.
  function getHistoricalAvgCogs(tenantId: string, productId: string, variantId: string, atDate: number): { avg_cogs: number; unit: string } | undefined {
    const key = `${tenantId}|${productId}|${variantId}`;
    const timeline = historicalCogsMap.get(key);
    if (timeline && timeline.length > 0) {
      // Binary search: find the last entry with date <= atDate
      let lo = 0, hi = timeline.length - 1, result = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (timeline[mid].date <= atDate) { result = mid; lo = mid + 1; }
        else hi = mid - 1;
      }
      if (result >= 0) {
        const inv = invMap.get(key); // for the unit only
        return { avg_cogs: timeline[result].avg_cogs, unit: inv?.unit ?? "pcs" };
      }
    }
    // Fall back to latest snapshot
    return invMap.get(key);
  }

  // atDate is optional: when provided uses historical avg_cogs, otherwise uses latest snapshot.
  // cogsPerUnit: if >0 (stored at checkout), use it directly; if 0 (legacy row), fall back to GR reconstruction.
  function computeItemCogs(tenantId: string, productId: string, variantId: string, qtySold: number, atDate?: number, cogsPerUnit?: number): number {
    if (cogsPerUnit && cogsPerUnit > 0) return cogsPerUnit * qtySold;
    const specificKey = `${tenantId}|${productId}|${variantId}`;
    const sharedKey = `${tenantId}|${productId}|`;
    // When variantId is empty, specificKey === sharedKey — avoid double-counting by only using one.
    const components = variantId
      ? [...(bomMap.get(specificKey) ?? []), ...(bomMap.get(sharedKey) ?? [])]
      : (bomMap.get(sharedKey) ?? []);
    if (components.length === 0) return 0;
    let costPerUnit = 0;
    for (const comp of components) {
      const inv = atDate != null
        ? getHistoricalAvgCogs(tenantId, comp.componentProductId, comp.componentVariantId, atDate)
        : invMap.get(`${tenantId}|${comp.componentProductId}|${comp.componentVariantId}`);
      if (!inv) continue;
      costPerUnit += toInventoryUnit(comp.requiredQty, comp.unit, inv.unit) * inv.avg_cogs;
    }
    return costPerUnit * qtySold;
  }

  // ── Org-level KPIs ────────────────────────────────────────────────
  const txDateMap = useMemo(() => new Map(filteredTxs.map((t) => [t.id, t.date])), [filteredTxs]);

  const orgGrossRevenue = useMemo(() => filteredTxs.reduce((s, t) => s + t.total, 0), [filteredTxs]);

  const orgCogs = useMemo(
    () => filteredTxItems.reduce((s, item) => {
      const atDate = txDateMap.get(item.transaction_id);
      return s + computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, atDate, item.cogs_per_unit);
    }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredTxItems, txDateMap, bomMap, invMap, historicalCogsMap]
  );

  const orgNetRevenue = orgGrossRevenue - orgCogs;
  const orgProfitPct = orgGrossRevenue > 0 ? (orgNetRevenue / orgGrossRevenue) * 100 : 0;

  const orgTxCount = filteredTxs.length;
  const orgAvgTx = orgTxCount > 0 ? Math.round(orgGrossRevenue / orgTxCount) : 0;
  const orgUniqueCustomers = useMemo(
    () => new Set(filteredTxs.filter((t) => t.customer_id).map((t) => t.customer_id)).size,
    [filteredTxs]
  );

  const orgPurchasing = useMemo(
    () => filteredGrItems.reduce((s, g) => s + g.qty * g.cost_per_unit, 0),
    [filteredGrItems]
  );

  const orgStockValue = useMemo(
    () => state.consolidatedInventory.reduce((s, row) => s + row.current_qty * row.avg_cogs, 0),
    [state.consolidatedInventory]
  );
  const orgStockAdjValue = useMemo(
    () => filteredMovements.reduce((s, m) => {
      const inv = invMap.get(`${m.tenant_id}|${m.product_id}|${m.variant_id}`);
      return s + m.qty_change * (inv?.avg_cogs ?? 0);
    }, 0),
    [filteredMovements, invMap]
  );
  const orgLowStock = state.branchSummaries.reduce((s, b) => s + b.lowStockCount, 0);

  // ── Per-branch stats ───────────────────────────────────────────────
  const branchStats = useMemo(() => {
    const txMap = new Map<string, { revenue: number; count: number; customerIds: Set<string> }>();
    const cogsMap = new Map<string, number>();
    const purchasingMap = new Map<string, number>();
    const adjMap = new Map<string, number>();
    const stockValueMap = new Map<string, number>();

    filteredTxs.forEach((t) => {
      const prev = txMap.get(t.tenant_id) || { revenue: 0, count: 0, customerIds: new Set<string>() };
      prev.revenue += t.total;
      prev.count += 1;
      if (t.customer_id) prev.customerIds.add(t.customer_id);
      txMap.set(t.tenant_id, prev);
    });

    filteredTxItems.forEach((item) => {
      const atDate = txDateMap.get(item.transaction_id);
      const itemCogs = computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, atDate, item.cogs_per_unit);
      cogsMap.set(item.tenant_id, (cogsMap.get(item.tenant_id) ?? 0) + itemCogs);
    });

    filteredGrItems.forEach((g) => {
      purchasingMap.set(g.tenant_id, (purchasingMap.get(g.tenant_id) ?? 0) + g.qty * g.cost_per_unit);
    });

    filteredMovements.forEach((m) => {
      const inv = invMap.get(`${m.tenant_id}|${m.product_id}|${m.variant_id}`);
      adjMap.set(m.tenant_id, (adjMap.get(m.tenant_id) ?? 0) + m.qty_change * (inv?.avg_cogs ?? 0));
    });

    state.consolidatedInventory.forEach((row) => {
      stockValueMap.set(row.tenant_id, (stockValueMap.get(row.tenant_id) ?? 0) + row.current_qty * row.avg_cogs);
    });

    return state.branchSummaries.map((b) => {
      const tx = txMap.get(b.tenantId) || { revenue: 0, count: 0, customerIds: new Set<string>() };
      const grossRevenue = tx.revenue;
      const cogs = cogsMap.get(b.tenantId) ?? 0;
      const netRevenue = grossRevenue - cogs;
      const profitPct = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
      return {
        tenantId: b.tenantId,
        branchName: b.branchName,
        activeSession: b.activeSession,
        grossRevenue,
        cogs,
        netRevenue,
        profitPct,
        txCount: tx.count,
        avgTx: tx.count > 0 ? Math.round(grossRevenue / tx.count) : 0,
        uniqueCustomers: tx.customerIds.size,
        purchasing: purchasingMap.get(b.tenantId) ?? 0,
        stockValue: stockValueMap.get(b.tenantId) ?? 0,
        stockAdjValue: adjMap.get(b.tenantId) ?? 0,
        lowStockCount: b.lowStockCount,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTxs, filteredTxItems, filteredGrItems, filteredMovements, txDateMap, invMap, bomMap, historicalCogsMap, state.consolidatedInventory, state.branchSummaries]);

  // ── XLSX Export ────────────────────────────────────────────────────
  function handleExportCsv() {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `ringkasan_${period}_${dateStr}.xlsx`;

    // Lookup helpers
    const branchName = (tenantId: string) =>
      state.branches.find((b) => b.id === tenantId)?.branch_name ||
      state.branches.find((b) => b.id === tenantId)?.name || tenantId;
    const productName = (tenantId: string, productId: string) =>
      state.consolidatedProducts.find((p) => p.tenant_id === tenantId && p.id === productId)?.name ?? productId;
    const customerName = (customerId: string | null) =>
      customerId ? (state.orgCustomers.find((c) => c.id === customerId)?.name ?? customerId) : "";
    const fmtDate = (ts: number) => new Date(ts).toLocaleString(isId ? "id-ID" : "en-US");

    // ── Sheet 1: Penjualan — one row per transaction item ──
    const txPaymentMap = new Map(filteredTxs.map((t) => [t.id, t.payment_method]));
    const penjualanHeader = isId
      ? ["Tanggal", "Cabang", "ID Transaksi", "Metode Bayar", "Produk", "Varian", "Qty", "Harga Satuan", "Subtotal", "COGS Item", "Pendapatan Bersih Item"]
      : ["Date", "Branch", "Transaction ID", "Payment Method", "Product", "Variant", "Qty", "Unit Price", "Subtotal", "Item COGS", "Net Item"];
    const penjualanRows: (string | number)[][] = [penjualanHeader,
      ...filteredTxItems
        .filter((item) => txDateMap.has(item.transaction_id))
        .sort((a, b) => (txDateMap.get(a.transaction_id) ?? 0) - (txDateMap.get(b.transaction_id) ?? 0))
        .map((item) => {
          const atDate = txDateMap.get(item.transaction_id);
          const itemCogs = computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, atDate, item.cogs_per_unit);
          const unitPrice = item.qty > 0 ? Math.round(item.subtotal / item.qty) : 0;
          return [
            fmtDate(txDateMap.get(item.transaction_id)!),
            branchName(item.tenant_id),
            item.transaction_id,
            txPaymentMap.get(item.transaction_id) ?? "",
            item.product_name,
            item.variant_name ?? "",
            item.qty,
            unitPrice,
            item.subtotal,
            Math.round(itemCogs),
            Math.round(item.subtotal - itemCogs),
          ];
        }),
    ];

    // ── Sheet 2: Inventori — three sections separated by blank rows ──
    const vendorName = (vendorId: string | null) =>
      vendorId ? (state.consolidatedVendors.find((v) => v.id === vendorId)?.name ?? "") : "";
    const userName = (userId: string | null) =>
      userId ? (state.orgUsers.find((u) => u.id === userId)?.name ?? "") : "";

    // Section A: Goods Receiving (Pembelian)
    const pembelianHeader = isId
      ? ["Tanggal", "Cabang", "ID Penerimaan", "Produk", "Varian", "Qty", "Satuan", "Harga/Unit", "Total Harga", "Vendor"]
      : ["Date", "Branch", "Receiving ID", "Product", "Variant", "Qty", "Unit", "Cost/Unit", "Total Cost", "Vendor"];
    const pembelianData = filteredGrItems
      .slice()
      .sort((a, b) => a.date - b.date)
      .map((g) => [
        fmtDate(g.date),
        branchName(g.tenant_id),
        g.receiving_id,
        productName(g.tenant_id, g.product_id),
        productName(g.tenant_id, g.variant_id) !== g.variant_id ? productName(g.tenant_id, g.variant_id) : "",
        g.qty,
        g.unit,
        g.cost_per_unit,
        Math.round(g.qty * g.cost_per_unit),
        vendorName(g.vendor_id),
      ]);

    // Section B: Inventory Movements (Penyesuaian)
    const movementHeader = isId
      ? ["Tanggal", "Cabang", "Produk", "Varian", "Tipe", "Perubahan Qty", "Satuan", "HPP/Unit", "Nilai Perubahan", "Keterangan", "Penanggung Jawab"]
      : ["Date", "Branch", "Product", "Variant", "Type", "Qty Change", "Unit", "COGS/Unit", "Value Change", "Reason", "Person in Charge"];
    const movementData = filteredMovements
      .slice()
      .sort((a, b) => a.date - b.date)
      .map((m) => {
        const inv = invMap.get(`${m.tenant_id}|${m.product_id}|${m.variant_id}`);
        const cogsPer = inv?.avg_cogs ?? 0;
        return [
          fmtDate(m.date),
          branchName(m.tenant_id),
          productName(m.tenant_id, m.product_id),
          "",
          m.movement_type,
          m.qty_change,
          m.unit,
          cogsPer,
          Math.round(m.qty_change * cogsPer),
          m.reason,
          userName(m.user_id),
        ];
      });

    // Section C: Stock Snapshot
    const stokHeader = isId
      ? ["Cabang", "Produk", "Varian", "Stok Saat Ini", "Stok Min.", "Satuan", "HPP/Unit", "Nilai Stok", "Status"]
      : ["Branch", "Product", "Variant", "Current Stock", "Min Stock", "Unit", "COGS/Unit", "Stock Value", "Status"];
    const stokData = state.consolidatedInventory
      .slice()
      .sort((a, b) => branchName(a.tenant_id).localeCompare(branchName(b.tenant_id)))
      .map((row) => {
        const status = row.current_qty <= 0
          ? (isId ? "Habis" : "Out of Stock")
          : row.current_qty <= row.min_qty
          ? (isId ? "Kritis" : "Low")
          : "OK";
        return [
          branchName(row.tenant_id),
          productName(row.tenant_id, row.product_id),
          "",
          row.current_qty,
          row.min_qty,
          row.unit,
          row.avg_cogs,
          Math.round(row.current_qty * row.avg_cogs),
          status,
        ];
      });

    const inventoriRows: (string | number)[][] = [
      [isId ? "— PEMBELIAN BAHAN BAKU —" : "— GOODS RECEIVING —"],
      pembelianHeader,
      ...pembelianData,
      [],
      [isId ? "— PENYESUAIAN STOK —" : "— STOCK ADJUSTMENTS —"],
      movementHeader,
      ...movementData,
      [],
      [isId ? "— SNAPSHOT STOK SAAT INI —" : "— CURRENT STOCK SNAPSHOT —"],
      stokHeader,
      ...stokData,
    ];

    // ── Sheet 3: Analisa Transaksi — one row per transaction ──
    const transaksiHeader = isId
      ? ["Tanggal", "Cabang", "ID Transaksi", "Pelanggan", "Metode Bayar", "Total", "COGS", "Pendapatan Bersih", "Status Utang"]
      : ["Date", "Branch", "Transaction ID", "Customer", "Payment Method", "Total", "COGS", "Net Revenue", "Debt Status"];

    // Pre-compute COGS per transaction from filtered items using historical avg_cogs at tx date
    const txCogsMap = new Map<string, number>();
    filteredTxItems.forEach((item) => {
      const atDate = txDateMap.get(item.transaction_id);
      const c = computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, atDate, item.cogs_per_unit);
      txCogsMap.set(item.transaction_id, (txCogsMap.get(item.transaction_id) ?? 0) + c);
    });

    const transaksiRows: (string | number)[][] = [transaksiHeader,
      ...filteredTxs
        .slice()
        .sort((a, b) => a.date - b.date)
        .map((t) => {
          const cogs = Math.round(txCogsMap.get(t.id) ?? 0);
          return [
            fmtDate(t.date),
            branchName(t.tenant_id),
            t.id,
            customerName(t.customer_id),
            t.payment_method,
            t.total,
            cogs,
            t.total - cogs,
            t.debt_status ?? "",
          ];
        }),
    ];

    downloadXlsx(filename, [
      { name: isId ? "Penjualan" : "Sales", rows: penjualanRows },
      { name: isId ? "Inventori" : "Inventory", rows: inventoriRows },
      { name: isId ? "Analisa Transaksi" : "Tx Analysis", rows: transaksiRows },
    ]);
  }

  const periodLabels: Record<OverviewPeriod, string> = {
    today: isId ? "Hari Ini" : "Today",
    week: isId ? "Minggu Ini" : "This Week",
    month: isId ? "Bulan Ini" : "This Month",
    year: isId ? "Tahun Ini" : "This Year",
  };

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <h1 className="erp-screen-title">{isId ? "RINGKASAN" : "OVERVIEW"}</h1>
        <button
          className="erp-btn erp-btn--primary"
          onClick={handleExportCsv}
          disabled={!canExportCsv}
          title={!canExportCsv ? (isId ? "Upgrade ke Tumbuh/Mapan untuk ekspor data" : "Upgrade to Tumbuh/Mapan to export data") : undefined}
        >
          {isId ? "Unduh Data" : "Export Data"}
        </button>
      </div>
      <p className="erp-screen-subtitle">{isId ? "RINGKASAN PERFORMA SEMUA CABANG" : "OVERVIEW OFALL BRANCHES"}</p>
      <div className="office-report-filters">
        <div className="erp-chip-group">
          {(["today", "week", "month", "year"] as OverviewPeriod[]).map((p) => (
            <button
              key={p}
              className={`erp-chip${period === p ? " erp-chip--active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 1: Penjualan ── */}
      <div className="office-overview-kpi-row-label">{isId ? "Penjualan" : "Sales"}</div>
      <div className="office-overview-kpi-grid office-overview-kpi-grid--4">
        <div className="office-overview-kpi-card office-overview-kpi-card--primary">
          <div className="office-overview-kpi-label">{isId ? "Pendapatan Kotor" : "Gross Revenue"}</div>
          <div className="office-overview-kpi-value">{formatRupiah(orgGrossRevenue)}</div>
        </div>
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">COGS</div>
          <div className="office-overview-kpi-value">{formatRupiah(orgCogs)}</div>
        </div>
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Pendapatan Bersih" : "Net Revenue"}</div>
          <div className="office-overview-kpi-value">{formatRupiah(orgNetRevenue)}</div>
        </div>
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Profitabilitas" : "Profitability"}</div>
          <div className="office-overview-kpi-value">{fmtPct(orgProfitPct)}</div>
        </div>
      </div>

      {/* ── Row 2: Inventori ── */}
      <div className="office-overview-kpi-row-label">{isId ? "Inventori" : "Inventory"}</div>
      <div className="office-overview-kpi-grid office-overview-kpi-grid--4">
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Nilai Stok" : "Stock Value"}</div>
          <div className="office-overview-kpi-value">{formatRupiah(orgStockValue)}</div>
        </div>
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Total Pembelian" : "Total Purchasing"}</div>
          <div className="office-overview-kpi-value">{formatRupiah(orgPurchasing)}</div>
        </div>
        <div className={`office-overview-kpi-card${orgStockAdjValue < 0 ? " office-overview-kpi-card--danger" : ""}`}>
          <div className="office-overview-kpi-label">{isId ? "Penyesuaian Stok" : "Stock Adj."}</div>
          <div className={`office-overview-kpi-value${orgStockAdjValue < 0 ? " office-overview-kpi-value--danger" : ""}`}>{fmtSigned(orgStockAdjValue)}</div>
        </div>
        <div className={`office-overview-kpi-card${orgLowStock > 0 ? " office-overview-kpi-card--danger" : ""}`}>
          <div className="office-overview-kpi-label">{isId ? "Perlu Stok" : "Low Stock"}</div>
          <div className="office-overview-kpi-value">{orgLowStock}</div>
        </div>
      </div>

      {/* ── Row 3: Analisa Transaksi ── */}
      <div className="office-overview-kpi-row-label">{isId ? "Analisa Transaksi" : "Transaction Analysis"}</div>
      <div className="office-overview-kpi-grid office-overview-kpi-grid--3">
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Transaksi" : "Transactions"}</div>
          <div className="office-overview-kpi-value">{orgTxCount}</div>
        </div>
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Pelanggan" : "Customers"}</div>
          <div className="office-overview-kpi-value">{orgUniqueCustomers}</div>
        </div>
        <div className="office-overview-kpi-card">
          <div className="office-overview-kpi-label">{isId ? "Rata-Rata Transaksi" : "Avg. Transaction"}</div>
          <div className="office-overview-kpi-value">{formatRupiah(orgAvgTx)}</div>
        </div>
      </div>

      {/* ── Per-branch cards ── */}
      <h2 className="office-section-title">{isId ? "Per Cabang" : "Per Branch"}</h2>
      <div className="office-branch-grid">
        {branchStats.map((b) => (
          <div key={b.tenantId} className="erp-card office-branch-card">
            <div className="office-branch-card-header">
              <span className="office-branch-name">{b.branchName}</span>
              {b.activeSession ? (
                <span className="office-badge office-badge--success">
                  {isId ? "Kasir Aktif" : "Active Shift"}
                </span>
              ) : (
                <span className="office-badge office-badge--muted">
                  {isId ? "Tutup" : "Closed"}
                </span>
              )}
            </div>
            <div className="office-branch-stats-grid">
              <StatSection title={isId ? "Penjualan" : "Sales"}>
                <StatRow label={isId ? "Pendapatan Kotor" : "Gross Revenue"} value={formatRupiah(b.grossRevenue)} />
                <StatRow label="COGS" value={formatRupiah(b.cogs)} />
                <StatRow label={isId ? "Pendapatan Bersih" : "Net Revenue"} value={formatRupiah(b.netRevenue)} />
                <StatRow label={isId ? "Profitabilitas" : "Profitability"} value={fmtPct(b.profitPct)} />
              </StatSection>
              <StatSection title={isId ? "Inventori" : "Inventory"}>
                <StatRow label={isId ? "Nilai Stok" : "Stock Value"} value={formatRupiah(b.stockValue)} />
                <StatRow label={isId ? "Total Pembelian" : "Total Purchasing"} value={formatRupiah(b.purchasing)} />
                <StatRow label={isId ? "Penyesuaian Stok" : "Stock Adj."} value={fmtSigned(b.stockAdjValue)} danger={b.stockAdjValue < 0} />
                <StatRow label={isId ? "Perlu Stok" : "Low Stock"} value={String(b.lowStockCount)} danger={b.lowStockCount > 0} />
              </StatSection>
              <StatSection title={isId ? "Analisa Transaksi" : "Transaction Analysis"}>
                <StatRow label={isId ? "Transaksi" : "Transactions"} value={String(b.txCount)} />
                <StatRow label={isId ? "Pelanggan" : "Customers"} value={String(b.uniqueCustomers)} />
                <StatRow label={isId ? "Rata-Rata Transaksi" : "Avg. Transaction"} value={formatRupiah(b.avgTx)} />
              </StatSection>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
