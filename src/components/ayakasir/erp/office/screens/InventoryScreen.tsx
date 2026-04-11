"use client";

import { useMemo, useState, useRef } from "react";
import { useOffice } from "../store";
import { formatRupiah, todayRange, monthRange, yearRange } from "../../utils";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type { TenantPlan } from "@/lib/supabase/types";

type InvPeriod = "today" | "week" | "month" | "year" | "custom";
type ChartGranularity = "hour" | "day" | "month";

interface TooltipState { x: number; y: number; label: string; value: number }

function weekRange(): [number, number] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
  return [start, start + 7 * 86400000 - 1];
}

function resolveGranularity(period: InvPeriod, customFrom: string, customTo: string): ChartGranularity {
  if (period === "today") return "hour";
  if (period === "week" || period === "month") return "day";
  if (period === "year") return "month";
  if (customFrom && customTo) {
    const days = (new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000;
    if (days <= 2) return "hour";
    if (days <= 92) return "day";
  }
  return "month";
}

function bucketKey(ts: number, g: ChartGranularity): string {
  const d = new Date(ts);
  if (g === "hour") return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  if (g === "day")  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function bucketLabel(key: string, g: ChartGranularity, locale: string): string {
  const p = key.split("-").map(Number);
  if (g === "hour") return `${String(p[3]).padStart(2, "0")}:00`;
  if (g === "day") {
    return new Date(p[0], p[1], p[2]).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" });
  }
  return new Date(p[0], p[1], 1).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "short" });
}

function allBuckets(range: [number, number], g: ChartGranularity): string[] {
  const [start, end] = range;
  const keys: string[] = [];
  const seen = new Set<string>();
  let cur = start;
  while (cur <= end) {
    const k = bucketKey(cur, g);
    if (!seen.has(k)) { seen.add(k); keys.push(k); }
    if (g === "hour") { cur += 3600000; continue; }
    if (g === "day")  { cur += 86400000; continue; }
    const pp = k.split("-").map(Number);
    cur = new Date(pp[0], pp[1] + 1, 1).getTime();
  }
  const endKey = bucketKey(end, g);
  if (!seen.has(endKey)) keys.push(endKey);
  return keys;
}

// ── SVG Line Chart ──────────────────────────────────────────────────
function LineChart({ buckets, data, granularity, locale }: {
  buckets: string[];
  data: Map<string, number>;
  granularity: ChartGranularity;
  locale: string;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 800, H = 140, PAD_L = 8, PAD_R = 8, PAD_T = 12, PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const values = buckets.map((k) => data.get(k) ?? 0);
  const maxVal = Math.max(...values, 1);
  const step = Math.max(1, Math.ceil(buckets.length / 12));
  const pts = buckets.map((k, i) => ({
    x: PAD_L + (i / Math.max(buckets.length - 1, 1)) * chartW,
    y: PAD_T + chartH - ((data.get(k) ?? 0) / maxVal) * chartH,
    k, v: data.get(k) ?? 0,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = pts.length > 0
    ? `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`
    : "";
  function handleMouseEnter(_e: React.MouseEvent<SVGCircleElement>, pt: typeof pts[0]) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setTooltip({ x: pt.x * (rect.width / W), y: pt.y * (rect.height / H), label: bucketLabel(pt.k, granularity, locale), value: pt.v });
  }
  return (
    <div className="office-report-chart-container">
      <svg ref={svgRef} className="office-report-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="invChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--erp-success)" />
            <stop offset="100%" stopColor="var(--erp-success)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PAD_L} y1={PAD_T + chartH} x2={PAD_L + chartW} y2={PAD_T + chartH} className="office-report-chart-axis" />
        {areaD && <path d={areaD} className="office-inv-chart-area" />}
        {pathD && <path d={pathD} className="office-inv-chart-line" />}
        {pts.map((pt, i) => (
          <g key={pt.k}>
            <circle cx={pt.x} cy={pt.y} r={3} className="office-report-chart-dot"
              onMouseEnter={(e) => handleMouseEnter(e, pt)} onMouseLeave={() => setTooltip(null)} />
            {i % step === 0 && (
              <text x={pt.x} y={H - 6} className="office-report-chart-label">
                {bucketLabel(pt.k, granularity, locale)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {tooltip && (
        <div className="office-report-chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.label}: {formatRupiah(tooltip.value)}
        </div>
      )}
    </div>
  );
}

// ── Pagination control ──────────────────────────────────────────────
function TablePager({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) {
  if (total <= 1) return null;
  return (
    <div className="erp-table-pagination">
      <button className="erp-btn erp-btn--secondary erp-btn--sm" disabled={page === 0} onClick={onPrev}>‹</button>
      <span className="erp-table-pagination-info">{page + 1} / {total}</span>
      <button className="erp-btn erp-btn--secondary erp-btn--sm" disabled={page >= total - 1} onClick={onNext}>›</button>
    </div>
  );
}

// ── Period comparison badge ─────────────────────────────────────────
function KpiChange({ current, previous, isId }: { current: number; previous: number; isId: boolean }) {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  if (dir === "flat") return null;
  return (
    <div className={`office-report-kpi-change office-report-kpi-change--${dir}`}>
      {dir === "up" ? "▲" : "▼"} {pct > 0 ? "+" : ""}{pct}% {isId ? "vs periode lalu" : "vs prev period"}
    </div>
  );
}

// ── PDF builder ─────────────────────────────────────────────────────
function buildInvPdfContent(params: {
  isId: boolean;
  periodLabel: string;
  rangeFrom: number;
  rangeTo: number;
  orgName: string;
  totalStockValue: number;
  totalSkuCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  grSpend: number;
  wasteValue: number;
  movementCount: number;
  uniqueVendors: number;
  branchSummary: Array<{ branchName: string; skuCount: number; stockValue: number; lowStock: number; outOfStock: number; grSpend: number; wasteValue: number }>;
  lowStockAlerts: Array<{ productName: string; branchName: string; currentQty: number; minQty: number; unit: string; isOos: boolean }>;
  topWasted: Array<{ name: string; qty: number; unit: string; value: number }>;
  topPurchased: Array<{ name: string; qty: number; unit: string; spend: number }>;
  movements: Array<{ date: number; branchName: string; productName: string; type: string; qtyChange: number; unit: string; value: number; reason: string }>;
}): string {
  const {
    isId, periodLabel, rangeFrom, rangeTo, orgName,
    totalStockValue, totalSkuCount, lowStockCount, outOfStockCount,
    grSpend, wasteValue, movementCount, uniqueVendors,
    branchSummary, lowStockAlerts, topWasted, topPurchased, movements,
  } = params;

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(isId ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  const fmtRupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
  const fmtQty = (qty: number, unit: string) => `${parseFloat(Math.abs(qty).toFixed(2))} ${unit}`;
  const fmtDateShort = (ts: number) =>
    new Date(ts).toLocaleDateString(isId ? "id-ID" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const generatedAt = new Date().toLocaleString(isId ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const typeLabel: Record<string, string> = isId
    ? { adjustment_in: "Masuk", adjustment_out: "Keluar", waste: "Limbah" }
    : { adjustment_in: "Stock In", adjustment_out: "Stock Out", waste: "Waste" };

  const branchRows = branchSummary.map((b) =>
    `<tr><td>${b.branchName}</td><td>${b.skuCount}</td><td>${fmtRupiah(b.stockValue)}</td><td>${b.lowStock}</td><td>${b.outOfStock}</td><td>${fmtRupiah(b.grSpend)}</td><td>${fmtRupiah(b.wasteValue)}</td></tr>`
  ).join("") + `<tr class="total-row"><td><strong>Total</strong></td><td><strong>${totalSkuCount}</strong></td><td><strong>${fmtRupiah(totalStockValue)}</strong></td><td><strong>${lowStockCount}</strong></td><td><strong>${outOfStockCount}</strong></td><td><strong>${fmtRupiah(grSpend)}</strong></td><td><strong>${fmtRupiah(wasteValue)}</strong></td></tr>`;

  const alertRows = lowStockAlerts.map((a) =>
    `<tr><td>${a.productName}</td><td>${a.branchName}</td><td>${fmtQty(a.currentQty, a.unit)}</td><td>${fmtQty(a.minQty, a.unit)}</td><td>${a.isOos ? (isId ? "Habis" : "Out of Stock") : (isId ? "Rendah" : "Low")}</td></tr>`
  ).join("");

  const purchasedRows = topPurchased.map((p, i) =>
    `<tr><td>${i + 1}</td><td>${p.name}</td><td>${fmtQty(p.qty, p.unit)}</td><td>${fmtRupiah(p.spend)}</td></tr>`
  ).join("");

  const wastedRows = topWasted.map((w, i) =>
    `<tr><td>${i + 1}</td><td>${w.name}</td><td>${fmtQty(w.qty, w.unit)}</td><td>${fmtRupiah(w.value)}</td></tr>`
  ).join("");

  const movementRows = movements.map((m) =>
    `<tr><td>${fmtDateShort(m.date)}</td><td>${m.branchName}</td><td>${m.productName}</td><td>${typeLabel[m.type] ?? m.type}</td><td>${m.qtyChange >= 0 ? "+" : ""}${fmtQty(m.qtyChange, m.unit)}</td><td>${m.value > 0 ? fmtRupiah(m.value) : "-"}</td><td>${m.reason || "-"}</td></tr>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${isId ? "Laporan Inventori" : "Inventory Report"} — ${orgName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sora', Arial, sans-serif; font-size: 12px; color: #1a1d26; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #37A454; padding-bottom: 12px; }
  .header-left h1 { font-size: 18px; font-weight: 700; color: #37A454; }
  .header-left p { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .header-right { text-align: right; font-size: 11px; color: #6b7280; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; margin-bottom: 10px; border-left: 3px solid #37A454; padding-left: 8px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
  .kpi-card.warning { border-left: 3px solid #f59e0b; }
  .kpi-card.danger { border-left: 3px solid #dc2626; }
  .kpi-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .kpi-value { font-size: 15px; font-weight: 700; color: #1a1d26; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-weight: 600; color: #4b5563; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; color: #1a1d26; }
  tr.total-row td { border-top: 2px solid #e5e7eb; background: #f9fafb; }
  .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  @page { margin: 20mm 15mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>${isId ? "Laporan Inventori" : "Inventory Report"}</h1>
    <p>${orgName} &nbsp;·&nbsp; ${periodLabel}: ${fmtDate(rangeFrom)} – ${fmtDate(rangeTo)}</p>
  </div>
  <div class="header-right">
    <div>${isId ? "Dibuat" : "Generated"}: ${generatedAt}</div>
    <div>AyaKasir by Petalytix</div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">${isId ? "Total Nilai Stok" : "Total Stock Value"}</div><div class="kpi-value">${fmtRupiah(totalStockValue)}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "Total SKU" : "Total SKUs"}</div><div class="kpi-value">${totalSkuCount.toLocaleString("id-ID")}</div></div>
  <div class="kpi-card${lowStockCount > 0 ? " warning" : ""}"><div class="kpi-label">${isId ? "Stok Rendah" : "Low Stock"}</div><div class="kpi-value">${lowStockCount}</div></div>
  <div class="kpi-card${outOfStockCount > 0 ? " danger" : ""}"><div class="kpi-label">${isId ? "Habis" : "Out of Stock"}</div><div class="kpi-value">${outOfStockCount}</div></div>
</div>
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">${isId ? "Total Pembelian" : "Total Purchasing"}</div><div class="kpi-value">${fmtRupiah(grSpend)}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "Pergerakan Stok" : "Stock Movements"}</div><div class="kpi-value">${movementCount.toLocaleString("id-ID")}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "Jumlah Vendor" : "Unique Vendors"}</div><div class="kpi-value">${uniqueVendors}</div></div>
  <div class="kpi-card${wasteValue > 0 ? " danger" : ""}"><div class="kpi-label">${isId ? "Nilai Limbah" : "Waste Value"}</div><div class="kpi-value">${fmtRupiah(wasteValue)}</div></div>
</div>

<div class="section">
  <h2>${isId ? "Inventori per Cabang" : "Inventory by Branch"}</h2>
  <table><thead><tr><th>${isId ? "Cabang" : "Branch"}</th><th>${isId ? "SKU" : "SKUs"}</th><th>${isId ? "Nilai Stok" : "Stock Value"}</th><th>${isId ? "Stok Rendah" : "Low Stock"}</th><th>${isId ? "Habis" : "Out"}</th><th>${isId ? "Pembelian" : "Purchasing"}</th><th>${isId ? "Limbah" : "Waste"}</th></tr></thead><tbody>${branchRows}</tbody></table>
</div>

${lowStockAlerts.length > 0 ? `<div class="section"><h2>${isId ? "Peringatan Stok Rendah" : "Low Stock Alerts"}</h2><table><thead><tr><th>${isId ? "Produk" : "Product"}</th><th>${isId ? "Cabang" : "Branch"}</th><th>${isId ? "Stok" : "Stock"}</th><th>${isId ? "Minimum" : "Minimum"}</th><th>${isId ? "Status" : "Status"}</th></tr></thead><tbody>${alertRows}</tbody></table></div>` : ""}

${topPurchased.length > 0 ? `<div class="section"><h2>${isId ? "Bahan Baku Terbanyak Dibeli" : "Top Purchased Materials"}</h2><table><thead><tr><th>#</th><th>${isId ? "Bahan Baku" : "Material"}</th><th>${isId ? "Jumlah" : "Qty"}</th><th>${isId ? "Total Biaya" : "Total Cost"}</th></tr></thead><tbody>${purchasedRows}</tbody></table></div>` : ""}

${topWasted.length > 0 ? `<div class="section"><h2>${isId ? "Produk Paling Banyak Limbah" : "Top Wasted Products"}</h2><table><thead><tr><th>#</th><th>${isId ? "Produk" : "Product"}</th><th>${isId ? "Jumlah Limbah" : "Waste Qty"}</th><th>${isId ? "Nilai Limbah" : "Waste Value"}</th></tr></thead><tbody>${wastedRows}</tbody></table></div>` : ""}

${movements.length > 0 ? `<div class="section"><h2>${isId ? "Riwayat Pergerakan Stok" : "Stock Movement History"}</h2><table><thead><tr><th>${isId ? "Waktu" : "Time"}</th><th>${isId ? "Cabang" : "Branch"}</th><th>${isId ? "Produk" : "Product"}</th><th>${isId ? "Tipe" : "Type"}</th><th>${isId ? "Perubahan" : "Change"}</th><th>${isId ? "Nilai" : "Value"}</th><th>${isId ? "Alasan" : "Reason"}</th></tr></thead><tbody>${movementRows}</tbody></table></div>` : ""}

<div class="footer">AyaKasir by Petalytix &nbsp;·&nbsp; ${isId ? "Laporan ini dibuat otomatis oleh sistem" : "This report was automatically generated by the system"}</div>
</body>
</html>`;
}

// ── Main screen ─────────────────────────────────────────────────────
export default function OfficeInventoryScreen() {
  const { state, locale } = useOffice();
  const isId = locale === "id";

  const planExpired =
    state.organization?.plan_expires_at != null &&
    Date.now() > (state.organization.plan_expires_at ?? 0);
  const effectivePlan = planExpired ? "PERINTIS" : (state.organization?.plan ?? "PERINTIS") as TenantPlan;
  const limits = getPlanLimits(effectivePlan);
  const canDownload = limits.maxBranches > 1;

  const [period, setPeriod] = useState<InvPeriod>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [branchDetailPage, setBranchDetailPage] = useState<Record<string, number>>({});
  const [movementPage, setMovementPage] = useState(0);
  const [wastedPage, setWastedPage] = useState(0);
  const [lowStockPage, setLowStockPage] = useState(0);
  const [purchasedPage, setPurchasedPage] = useState(0);
  const PAGE_SIZE = 10;

  const periodLabels: Record<InvPeriod, string> = isId
    ? { today: "Hari Ini", week: "Minggu Ini", month: "Bulan Ini", year: "Tahun Ini", custom: "Kustom" }
    : { today: "Today", week: "This Week", month: "This Month", year: "This Year", custom: "Custom" };

  const granularity = resolveGranularity(period, customFrom, customTo);
  const granularityLabel = isId
    ? { hour: "per jam", day: "per hari", month: "per bulan" }[granularity]
    : { hour: "hourly", day: "daily", month: "monthly" }[granularity];

  // Current period range
  const range = useMemo<[number, number]>(() => {
    if (period === "today") return todayRange();
    if (period === "week") return weekRange();
    if (period === "month") return monthRange();
    if (period === "year") return yearRange();
    const from = customFrom ? new Date(customFrom).setHours(0, 0, 0, 0) : 0;
    const to = customTo ? new Date(customTo).setHours(23, 59, 59, 999) : Date.now();
    return [from, to];
  }, [period, customFrom, customTo]);

  // Previous period range (same duration, immediately before)
  const prevRange = useMemo<[number, number]>(() => {
    const [start, end] = range;
    const duration = end - start;
    return [start - duration - 1, start - 1];
  }, [range]);

  // Lookups
  const productNameMap = useMemo(() => {
    const m = new Map<string, string>();
    state.consolidatedProducts.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [state.consolidatedProducts]);

  const branchNameMap = useMemo(() => {
    const m = new Map<string, string>();
    state.branches.forEach((b) => m.set(b.id, b.branch_name || b.name));
    return m;
  }, [state.branches]);

  const cogsMap = useMemo(() => {
    const m = new Map<string, number>();
    state.consolidatedInventory.forEach((inv) => m.set(`${inv.product_id}|${inv.variant_id}`, inv.avg_cogs));
    return m;
  }, [state.consolidatedInventory]);

  // ── Snapshot KPIs ─────────────────────────────────────────────────
  const totalSkuCount = state.consolidatedInventory.length;
  const totalStockValue = useMemo(
    () => state.consolidatedInventory.reduce((sum, inv) => sum + inv.current_qty * inv.avg_cogs, 0),
    [state.consolidatedInventory]
  );
  const lowStockItems = useMemo(
    () => state.consolidatedInventory.filter((inv) => inv.current_qty > 0 && inv.current_qty <= inv.min_qty),
    [state.consolidatedInventory]
  );
  const outOfStockItems = useMemo(
    () => state.consolidatedInventory.filter((inv) => inv.current_qty <= 0),
    [state.consolidatedInventory]
  );

  // ── Period-filtered movements ─────────────────────────────────────
  const filteredMovements = useMemo(
    () => state.consolidatedMovements.filter((m) => m.date >= range[0] && m.date <= range[1]),
    [state.consolidatedMovements, range]
  );
  const prevMovements = useMemo(
    () => state.consolidatedMovements.filter((m) => m.date >= prevRange[0] && m.date <= prevRange[1]),
    [state.consolidatedMovements, prevRange]
  );

  const movementStats = useMemo(() => {
    let adjustIn = 0, adjustOut = 0, waste = 0, wasteValue = 0;
    filteredMovements.forEach((m) => {
      if (m.movement_type === "adjustment_in") adjustIn += Math.abs(m.qty_change);
      else if (m.movement_type === "adjustment_out") adjustOut += Math.abs(m.qty_change);
      else if (m.movement_type === "waste") {
        const qty = Math.abs(m.qty_change);
        waste += qty;
        wasteValue += qty * (cogsMap.get(`${m.product_id}|${m.variant_id}`) ?? 0);
      }
    });
    return { adjustIn, adjustOut, waste, wasteValue, total: filteredMovements.length };
  }, [filteredMovements, cogsMap]);

  const prevWasteValue = useMemo(() => {
    return prevMovements
      .filter((m) => m.movement_type === "waste")
      .reduce((s, m) => s + Math.abs(m.qty_change) * (cogsMap.get(`${m.product_id}|${m.variant_id}`) ?? 0), 0);
  }, [prevMovements, cogsMap]);

  // ── Period-filtered goods receiving ───────────────────────────────
  const filteredGrItems = useMemo(
    () => state.consolidatedGrItems.filter((g) => g.date >= range[0] && g.date <= range[1]),
    [state.consolidatedGrItems, range]
  );
  const prevGrItems = useMemo(
    () => state.consolidatedGrItems.filter((g) => g.date >= prevRange[0] && g.date <= prevRange[1]),
    [state.consolidatedGrItems, prevRange]
  );

  const grStats = useMemo(() => {
    const totalSpend = filteredGrItems.reduce((sum, g) => sum + g.qty * g.cost_per_unit, 0);
    const receivingIds = new Set(filteredGrItems.map((g) => g.receiving_id));
    const vendorIds = new Set(filteredGrItems.map((g) => g.vendor_id).filter((v): v is string => !!v));
    return { totalSpend, receivingCount: receivingIds.size, itemCount: filteredGrItems.length, uniqueVendors: vendorIds.size };
  }, [filteredGrItems]);

  const prevGrSpend = useMemo(
    () => prevGrItems.reduce((sum, g) => sum + g.qty * g.cost_per_unit, 0),
    [prevGrItems]
  );

  // ── Stock value trend: purchasing spend bucketed over time ─────────
  const chartBuckets = useMemo(() => allBuckets(range, granularity), [range, granularity]);
  const chartData = useMemo(() => {
    const m = new Map<string, number>();
    filteredGrItems.forEach((g) => {
      const k = bucketKey(g.date, granularity);
      m.set(k, (m.get(k) ?? 0) + g.qty * g.cost_per_unit);
    });
    return m;
  }, [filteredGrItems, granularity]);

  // ── Per-branch summary ────────────────────────────────────────────
  const branchInventorySummary = useMemo(() => {
    return state.branches.map((branch) => {
      const inv = state.consolidatedInventory.filter((i) => i.tenant_id === branch.id);
      const stockValue = inv.reduce((sum, i) => sum + i.current_qty * i.avg_cogs, 0);
      const lowStock = inv.filter((i) => i.current_qty > 0 && i.current_qty <= i.min_qty).length;
      const outOfStock = inv.filter((i) => i.current_qty <= 0).length;
      const branchMovements = filteredMovements.filter((m) => m.tenant_id === branch.id);
      const branchWaste = branchMovements
        .filter((m) => m.movement_type === "waste")
        .reduce((s, m) => s + Math.abs(m.qty_change) * (cogsMap.get(`${m.product_id}|${m.variant_id}`) ?? 0), 0);
      const branchGr = filteredGrItems.filter((g) => g.tenant_id === branch.id);
      return {
        tenantId: branch.id, branchName: branch.branch_name || branch.name,
        skuCount: inv.length, stockValue, lowStock, outOfStock,
        wasteValue: branchWaste,
        grSpend: branchGr.reduce((s, g) => s + g.qty * g.cost_per_unit, 0),
      };
    });
  }, [state.branches, state.consolidatedInventory, filteredMovements, filteredGrItems, cogsMap]);

  // ── Top wasted products ───────────────────────────────────────────
  const topWasted = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; unit: string; value: number }>();
    filteredMovements.filter((m) => m.movement_type === "waste").forEach((m) => {
      const key = m.product_id + "|" + m.variant_id;
      const cogs = cogsMap.get(`${m.product_id}|${m.variant_id}`) ?? 0;
      const absQty = Math.abs(m.qty_change);
      const prev = map.get(key) || { name: productNameMap.get(m.product_id) || m.product_id, qty: 0, unit: m.unit, value: 0 };
      map.set(key, { ...prev, qty: prev.qty + absQty, value: prev.value + absQty * cogs });
    });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [filteredMovements, productNameMap, cogsMap]);

  const wastedTotalPages = Math.ceil(topWasted.length / PAGE_SIZE);
  const pagedWasted = topWasted.slice(wastedPage * PAGE_SIZE, (wastedPage + 1) * PAGE_SIZE);

  // ── Top purchased raw materials ───────────────────────────────────
  const topPurchased = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; spend: number; unit: string }>();
    filteredGrItems.forEach((g) => {
      const key = g.product_id + "|" + g.variant_id;
      const prev = map.get(key) || { name: productNameMap.get(g.product_id) || g.product_id, qty: 0, spend: 0, unit: g.unit };
      map.set(key, { ...prev, qty: prev.qty + g.qty, spend: prev.spend + g.qty * g.cost_per_unit });
    });
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [filteredGrItems, productNameMap]);

  const purchasedTotalPages = Math.ceil(topPurchased.length / PAGE_SIZE);
  const pagedPurchased = topPurchased.slice(purchasedPage * PAGE_SIZE, (purchasedPage + 1) * PAGE_SIZE);

  // ── Recent movements ──────────────────────────────────────────────
  const sortedMovements = useMemo(() => [...filteredMovements].sort((a, b) => b.date - a.date), [filteredMovements]);
  const movementTotalPages = Math.ceil(sortedMovements.length / PAGE_SIZE);
  const pagedMovements = sortedMovements.slice(movementPage * PAGE_SIZE, (movementPage + 1) * PAGE_SIZE);

  const movementTypeLabel = (type: string) => {
    const labels: Record<string, string> = isId
      ? { adjustment_in: "Masuk", adjustment_out: "Keluar", waste: "Limbah" }
      : { adjustment_in: "Stock In", adjustment_out: "Stock Out", waste: "Waste" };
    return labels[type] || type;
  };
  const movementTypeClass = (type: string) => {
    if (type === "adjustment_in") return "office-badge--success";
    if (type === "waste") return "office-badge--danger";
    return "office-badge--warning";
  };

  function formatQtyDisplay(qty: number, unit: string): string {
    return `${parseFloat(Math.abs(qty).toFixed(2))} ${unit}`;
  }
  function formatDateShort(ts: number): string {
    return new Date(ts).toLocaleDateString(isId ? "id-ID" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  function resetPages() { setMovementPage(0); setWastedPage(0); setPurchasedPage(0); setLowStockPage(0); }

  function handleDownloadPdf() {
    const html = buildInvPdfContent({
      isId,
      periodLabel: periodLabels[period],
      rangeFrom: range[0],
      rangeTo: range[1],
      orgName: state.organization?.name ?? "AyaKasir",
      totalStockValue,
      totalSkuCount,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      grSpend: grStats.totalSpend,
      wasteValue: movementStats.wasteValue,
      movementCount: movementStats.total,
      uniqueVendors: grStats.uniqueVendors,
      branchSummary: branchInventorySummary.map((b) => ({
        branchName: b.branchName,
        skuCount: b.skuCount,
        stockValue: b.stockValue,
        lowStock: b.lowStock,
        outOfStock: b.outOfStock,
        grSpend: b.grSpend,
        wasteValue: b.wasteValue,
      })),
      lowStockAlerts: [...outOfStockItems, ...lowStockItems].map((inv) => ({
        productName: productNameMap.get(inv.product_id) || inv.product_id,
        branchName: branchNameMap.get(inv.tenant_id) || "-",
        currentQty: inv.current_qty,
        minQty: inv.min_qty,
        unit: inv.unit,
        isOos: inv.current_qty <= 0,
      })),
      topWasted,
      topPurchased,
      movements: sortedMovements.map((m) => {
        const cogs = cogsMap.get(`${m.product_id}|${m.variant_id}`) ?? 0;
        return {
          date: m.date,
          branchName: branchNameMap.get(m.tenant_id) || "-",
          productName: productNameMap.get(m.product_id) || m.product_id,
          type: m.movement_type,
          qtyChange: m.qty_change,
          unit: m.unit,
          value: Math.abs(m.qty_change) * cogs,
          reason: m.reason || "",
        };
      }),
    });
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html); // eslint-disable-line
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <div>
          <h1 className="erp-screen-title">{isId ? "INVENTORI" : "INVENTORY"}</h1>
          <p className="erp-screen-subtitle">
            {isId ? "Analisis stok & pergerakan seluruh cabang" : "Stock & movement analytics across all branches"}
          </p>
        </div>
        <button
          className="erp-btn erp-btn--primary"
          disabled={!canDownload}
          title={!canDownload ? (isId ? "Upgrade untuk unduh laporan" : "Upgrade to download report") : undefined}
          onClick={handleDownloadPdf}
        >
          {isId ? "Unduh Laporan" : "Download Report"}
        </button>
      </div>

      {!canDownload && (
        <div className="erp-info-banner erp-info-banner--warning">
          {isId
            ? "Unduh laporan tersedia untuk plan Tumbuh dan Mapan."
            : "Report download is available for Tumbuh and Mapan plans."}
        </div>
      )}

      {/* Period filter */}
      <div className="office-report-filters">
        <div className="erp-chip-group">
          {(["today", "week", "month", "year", "custom"] as InvPeriod[]).map((p) => (
            <button key={p} className={`erp-chip${period === p ? " erp-chip--active" : ""}`}
              onClick={() => { setPeriod(p); resetPages(); }}>
              {periodLabels[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="office-report-date-range">
            <input type="date" className="erp-input" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); resetPages(); }} />
            <span className="office-report-date-sep">—</span>
            <input type="date" className="erp-input" value={customTo} onChange={(e) => { setCustomTo(e.target.value); resetPages(); }} />
          </div>
        )}
      </div>

      {/* ── Snapshot KPI Cards ─────────────────────────────────────── */}
      <h2 className="office-section-title">{isId ? "Snapshot Stok Saat Ini" : "Current Stock Snapshot"}</h2>
      <div className="office-report-kpi-grid">
        <div className="office-report-kpi-card">
          <div className="office-report-kpi-label">{isId ? "Total Nilai Stok" : "Total Stock Value"}</div>
          <div className="office-report-kpi-value">{formatRupiah(totalStockValue)}</div>
          <div className="office-report-kpi-sub">{isId ? "Berdasarkan HPP rata-rata" : "Based on avg COGS"}</div>
        </div>
        <div className="office-report-kpi-card">
          <div className="office-report-kpi-label">{isId ? "Total SKU" : "Total SKUs"}</div>
          <div className="office-report-kpi-value">{totalSkuCount.toLocaleString("id-ID")}</div>
          <div className="office-report-kpi-sub">{isId ? "Seluruh cabang" : "All branches"}</div>
        </div>
        <div className={`office-report-kpi-card${lowStockItems.length > 0 ? " office-report-kpi-card--warning" : ""}`}>
          <div className="office-report-kpi-label">{isId ? "Stok Rendah" : "Low Stock"}</div>
          <div className="office-report-kpi-value">{lowStockItems.length}</div>
          <div className="office-report-kpi-sub">{isId ? "Di bawah minimum" : "Below minimum"}</div>
        </div>
        <div className={`office-report-kpi-card${outOfStockItems.length > 0 ? " office-report-kpi-card--danger" : ""}`}>
          <div className="office-report-kpi-label">{isId ? "Habis" : "Out of Stock"}</div>
          <div className="office-report-kpi-value">{outOfStockItems.length}</div>
          <div className="office-report-kpi-sub">{isId ? "Stok 0 atau kurang" : "Zero or negative"}</div>
        </div>
      </div>

      {/* ── Period KPI Cards ──────────────────────────────────────── */}
      <h2 className="office-section-title">
        {isId ? `Aktivitas Periode (${periodLabels[period]})` : `Period Activity (${periodLabels[period]})`}
      </h2>
      <div className="office-report-kpi-grid">
        <div className="office-report-kpi-card">
          <div className="office-report-kpi-label">{isId ? "Total Pembelian" : "Total Purchasing"}</div>
          <div className="office-report-kpi-value">{formatRupiah(grStats.totalSpend)}</div>
          <KpiChange current={grStats.totalSpend} previous={prevGrSpend} isId={isId} />
          <div className="office-report-kpi-sub">
            {grStats.receivingCount} {isId ? "penerimaan" : "receivings"} · {grStats.itemCount} {isId ? "item" : "items"}
          </div>
        </div>
        <div className="office-report-kpi-card">
          <div className="office-report-kpi-label">{isId ? "Pergerakan Stok" : "Stock Movements"}</div>
          <div className="office-report-kpi-value">{movementStats.total.toLocaleString("id-ID")}</div>
          <div className="office-report-kpi-sub">{isId ? "penyesuaian" : "adjustments"}</div>
        </div>
        <div className="office-report-kpi-card">
          <div className="office-report-kpi-label">{isId ? "Jumlah Vendor" : "Unique Vendors"}</div>
          <div className="office-report-kpi-value office-inv-value--success">{grStats.uniqueVendors}</div>
          <div className="office-report-kpi-sub">{isId ? "vendor aktif periode ini" : "active vendors this period"}</div>
        </div>
        <div className={`office-report-kpi-card${movementStats.wasteValue > 0 ? " office-report-kpi-card--danger" : ""}`}>
          <div className="office-report-kpi-label">{isId ? "Nilai Limbah" : "Waste Value"}</div>
          <div className="office-report-kpi-value">{formatRupiah(movementStats.wasteValue)}</div>
          <KpiChange current={movementStats.wasteValue} previous={prevWasteValue} isId={isId} />
          <div className="office-report-kpi-sub">{isId ? "estimasi HPP terbuang" : "est. COGS lost"}</div>
        </div>
      </div>

      {/* ── Purchasing Value Trend Chart ──────────────────────────── */}
      <h2 className="office-section-title">
        {isId ? `Tren Nilai Pembelian (${granularityLabel})` : `Purchasing Value Trend (${granularityLabel})`}
      </h2>
      <div className="erp-card">
        <div className="office-report-chart-wrap">
          <LineChart buckets={chartBuckets} data={chartData} granularity={granularity} locale={locale} />
        </div>
      </div>

      {/* ── Low Stock Alerts ─────────────────────────────────────── */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <>
          <h2 className="office-section-title">{isId ? "Peringatan Stok Rendah" : "Low Stock Alerts"}</h2>
          <div className="erp-card">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{isId ? "Produk" : "Product"}</th>
                  <th>{isId ? "Cabang" : "Branch"}</th>
                  <th>{isId ? "Stok" : "Stock"}</th>
                  <th>{isId ? "Minimum" : "Minimum"}</th>
                  <th>{isId ? "Status" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {[...outOfStockItems, ...lowStockItems]
                  .slice(lowStockPage * PAGE_SIZE, (lowStockPage + 1) * PAGE_SIZE)
                  .map((inv, i) => {
                    const isOos = inv.current_qty <= 0;
                    return (
                      <tr key={i}>
                        <td>{productNameMap.get(inv.product_id) || inv.product_id}</td>
                        <td>{branchNameMap.get(inv.tenant_id) || "-"}</td>
                        <td>{formatQtyDisplay(inv.current_qty, inv.unit)}</td>
                        <td>{formatQtyDisplay(inv.min_qty, inv.unit)}</td>
                        <td>
                          {isOos
                            ? <span className="office-badge office-badge--danger">{isId ? "Habis" : "Out of Stock"}</span>
                            : <span className="office-badge office-badge--warning">{isId ? "Rendah" : "Low"}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            <TablePager
              page={lowStockPage}
              total={Math.ceil((outOfStockItems.length + lowStockItems.length) / PAGE_SIZE)}
              onPrev={() => setLowStockPage((p) => p - 1)}
              onNext={() => setLowStockPage((p) => p + 1)}
            />
          </div>
        </>
      )}

      {/* ── Per-Branch Inventory Breakdown ───────────────────────── */}
      <h2 className="office-section-title">{isId ? "Inventori per Cabang" : "Inventory by Branch"}</h2>
      <div className="erp-card">
        <table className="erp-table">
          <thead>
            <tr>
              <th>{isId ? "Cabang" : "Branch"}</th>
              <th>{isId ? "SKU" : "SKUs"}</th>
              <th>{isId ? "Nilai Stok" : "Stock Value"}</th>
              <th>{isId ? "Stok Rendah" : "Low Stock"}</th>
              <th>{isId ? "Habis" : "Out"}</th>
              <th>{isId ? "Pembelian" : "Purchasing"}</th>
              <th>{isId ? "Limbah" : "Waste"}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {branchInventorySummary.map((b) => (
              <>
                <tr key={b.tenantId} className="office-inv-branch-row" style={{ cursor: "pointer" }}
                  onClick={() => setExpandedBranch(expandedBranch === b.tenantId ? null : b.tenantId)}>
                  <td><strong>{b.branchName}</strong></td>
                  <td>{b.skuCount}</td>
                  <td>{formatRupiah(b.stockValue)}</td>
                  <td>{b.lowStock > 0 ? <span className="office-badge office-badge--warning">{b.lowStock}</span> : <span className="office-badge office-badge--success">OK</span>}</td>
                  <td>{b.outOfStock > 0 ? <span className="office-badge office-badge--danger">{b.outOfStock}</span> : <span className="office-badge office-badge--success">OK</span>}</td>
                  <td>{formatRupiah(b.grSpend)}</td>
                  <td>{formatRupiah(b.wasteValue)}</td>
                  <td className="office-inv-expand-icon">{expandedBranch === b.tenantId ? "▲" : "▼"}</td>
                </tr>
                {expandedBranch === b.tenantId && (
                  <tr key={b.tenantId + "-detail"}>
                    <td colSpan={8} className="office-inv-detail-cell">
                      <BranchInventoryDetail
                        inventory={state.consolidatedInventory.filter((i) => i.tenant_id === b.tenantId)}
                        productNameMap={productNameMap}
                        isId={isId}
                        page={branchDetailPage[b.tenantId] ?? 0}
                        onPageChange={(p) => setBranchDetailPage((prev) => ({ ...prev, [b.tenantId]: p }))}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
            <tr className="office-table-total">
              <td><strong>Total</strong></td>
              <td><strong>{totalSkuCount}</strong></td>
              <td><strong>{formatRupiah(totalStockValue)}</strong></td>
              <td><strong>{lowStockItems.length}</strong></td>
              <td><strong>{outOfStockItems.length}</strong></td>
              <td><strong>{formatRupiah(grStats.totalSpend)}</strong></td>
              <td><strong>{formatRupiah(movementStats.wasteValue)}</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Top Purchased Raw Materials (paginated) ───────────────── */}
      {topPurchased.length > 0 && (
        <>
          <h2 className="office-section-title">{isId ? "Bahan Baku Terbanyak Dibeli" : "Top Purchased Materials"}</h2>
          <div className="erp-card">
            <table className="erp-table office-inv-ranked-table">
              <colgroup>
                <col className="office-inv-ranked-col--rank" />
                <col className="office-inv-ranked-col--name" />
                <col className="office-inv-ranked-col--qty" />
                <col className="office-inv-ranked-col--value" />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{isId ? "Bahan Baku" : "Material"}</th>
                  <th>{isId ? "Jumlah" : "Qty"}</th>
                  <th>{isId ? "Total Biaya" : "Total Cost"}</th>
                </tr>
              </thead>
              <tbody>
                {pagedPurchased.map((p, i) => (
                  <tr key={i}>
                    <td>{purchasedPage * PAGE_SIZE + i + 1}</td>
                    <td>{p.name}</td>
                    <td>{formatQtyDisplay(p.qty, p.unit)}</td>
                    <td>{formatRupiah(p.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager page={purchasedPage} total={purchasedTotalPages}
              onPrev={() => setPurchasedPage((p) => p - 1)} onNext={() => setPurchasedPage((p) => p + 1)} />
          </div>
        </>
      )}

      {/* ── Top Wasted Products (paginated) ──────────────────────── */}
      {topWasted.length > 0 && (
        <>
          <h2 className="office-section-title">{isId ? "Produk Paling Banyak Limbah" : "Top Wasted Products"}</h2>
          <div className="erp-card">
            <table className="erp-table office-inv-ranked-table">
              <colgroup>
                <col className="office-inv-ranked-col--rank" />
                <col className="office-inv-ranked-col--name" />
                <col className="office-inv-ranked-col--qty" />
                <col className="office-inv-ranked-col--value" />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{isId ? "Produk" : "Product"}</th>
                  <th>{isId ? "Jumlah Limbah" : "Waste Qty"}</th>
                  <th>{isId ? "Nilai Limbah" : "Waste Value"}</th>
                </tr>
              </thead>
              <tbody>
                {pagedWasted.map((w, i) => (
                  <tr key={i}>
                    <td>{wastedPage * PAGE_SIZE + i + 1}</td>
                    <td>{w.name}</td>
                    <td>{formatQtyDisplay(w.qty, w.unit)}</td>
                    <td className="office-inv-value--danger">-{formatRupiah(w.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager page={wastedPage} total={wastedTotalPages}
              onPrev={() => setWastedPage((p) => p - 1)} onNext={() => setWastedPage((p) => p + 1)} />
          </div>
        </>
      )}

      {/* ── Recent Stock Movements (paginated) ───────────────────── */}
      {sortedMovements.length > 0 && (
        <>
          <h2 className="office-section-title">{isId ? "Riwayat Pergerakan Stok" : "Stock Movement History"}</h2>
          <div className="erp-card">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{isId ? "Waktu" : "Time"}</th>
                  <th>{isId ? "Cabang" : "Branch"}</th>
                  <th>{isId ? "Produk" : "Product"}</th>
                  <th>{isId ? "Tipe" : "Type"}</th>
                  <th>{isId ? "Perubahan" : "Change"}</th>
                  <th>{isId ? "Nilai" : "Value"}</th>
                  <th>{isId ? "Alasan" : "Reason"}</th>
                </tr>
              </thead>
              <tbody>
                {pagedMovements.map((m) => {
                  const cogs = cogsMap.get(`${m.product_id}|${m.variant_id}`) ?? 0;
                  const costValue = Math.abs(m.qty_change) * cogs;
                  const isPositive = m.qty_change >= 0;
                  return (
                    <tr key={m.id}>
                      <td className="office-inv-date-cell">{formatDateShort(m.date)}</td>
                      <td>{branchNameMap.get(m.tenant_id) || "-"}</td>
                      <td>{productNameMap.get(m.product_id) || m.product_id}</td>
                      <td><span className={`office-badge ${movementTypeClass(m.movement_type)}`}>{movementTypeLabel(m.movement_type)}</span></td>
                      <td className={isPositive ? "office-inv-value--success" : "office-inv-value--danger"}>
                        {isPositive ? "+" : ""}{formatQtyDisplay(m.qty_change, m.unit)}
                      </td>
                      <td className={isPositive ? "office-inv-value--success" : "office-inv-value--danger"}>
                        {cogs > 0 ? (isPositive ? "+" : "-") + formatRupiah(costValue) : "-"}
                      </td>
                      <td className="erp-muted">{m.reason || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePager page={movementPage} total={movementTotalPages}
              onPrev={() => setMovementPage((p) => p - 1)} onNext={() => setMovementPage((p) => p + 1)} />
          </div>
        </>
      )}

      <div className="office-reports-note">
        {isId
          ? "Penyesuaian stok dilakukan di halaman Inventori masing-masing cabang."
          : "Stock adjustments are made in each branch's Inventory page."}
      </div>
    </div>
  );
}

// ── Branch inventory detail (expanded row) ──────────────────────────
function BranchInventoryDetail({
  inventory,
  productNameMap,
  isId,
  page,
  onPageChange,
}: {
  inventory: { product_id: string; variant_id: string; current_qty: number; min_qty: number; unit: string; avg_cogs: number }[];
  productNameMap: Map<string, string>;
  isId: boolean;
  page: number;
  onPageChange: (p: number) => void;
}) {
  const PAGE_SIZE = 10;
  const sorted = useMemo(
    () => [...inventory].sort((a, b) => {
      const aOos = a.current_qty <= 0 ? 0 : a.current_qty <= a.min_qty ? 1 : 2;
      const bOos = b.current_qty <= 0 ? 0 : b.current_qty <= b.min_qty ? 1 : 2;
      if (aOos !== bOos) return aOos - bOos;
      return (productNameMap.get(a.product_id) || "").localeCompare(productNameMap.get(b.product_id) || "");
    }),
    [inventory, productNameMap]
  );

  if (sorted.length === 0) {
    return <div className="erp-muted" style={{ padding: 12 }}>{isId ? "Belum ada data inventori." : "No inventory data."}</div>;
  }

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <table className="erp-table office-inv-detail-table">
        <thead>
          <tr>
            <th>{isId ? "Produk" : "Product"}</th>
            <th>{isId ? "Stok" : "Stock"}</th>
            <th>{isId ? "Min" : "Min"}</th>
            <th>{isId ? "HPP" : "COGS"}</th>
            <th>{isId ? "Nilai" : "Value"}</th>
            <th>{isId ? "Status" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((inv, i) => {
            const value = inv.current_qty * inv.avg_cogs;
            const isOos = inv.current_qty <= 0;
            const isLow = !isOos && inv.current_qty <= inv.min_qty;
            return (
              <tr key={i} className={isOos ? "office-inv-row--oos" : isLow ? "office-inv-row--low" : ""}>
                <td>{productNameMap.get(inv.product_id) || inv.product_id}</td>
                <td>{parseFloat(inv.current_qty.toFixed(2))} {inv.unit}</td>
                <td>{parseFloat(inv.min_qty.toFixed(2))} {inv.unit}</td>
                <td>{formatRupiah(inv.avg_cogs)}/{inv.unit}</td>
                <td>{formatRupiah(value)}</td>
                <td>
                  {isOos
                    ? <span className="office-badge office-badge--danger">{isId ? "Habis" : "Out"}</span>
                    : isLow
                    ? <span className="office-badge office-badge--warning">{isId ? "Rendah" : "Low"}</span>
                    : <span className="office-badge office-badge--success">OK</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <TablePager page={page} total={totalPages}
        onPrev={() => onPageChange(page - 1)} onNext={() => onPageChange(page + 1)} />
    </>
  );
}
