"use client";

import { useMemo, useState, useRef } from "react";
import { useOffice } from "../store";
import { formatRupiah, todayRange, monthRange, yearRange, buildInvMap, buildBomMap, buildHistoricalCogsMap, computeItemCogs } from "../../utils";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type { TenantPlan } from "@/lib/supabase/types";

type ReportPeriod = "today" | "week" | "month" | "year" | "custom";
type ChartGranularity = "hour" | "day" | "month";

interface TooltipState {
  x: number;
  y: number;
  label: string;
  value: number;
}

function weekRange(): [number, number] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
  const end = start + 7 * 86400000 - 1;
  return [start, end];
}

function resolveGranularity(period: ReportPeriod, customFrom: string, customTo: string): ChartGranularity {
  if (period === "today") return "hour";
  if (period === "week" || period === "month") return "day";
  if (period === "year") return "month";
  // custom: pick based on span
  if (customFrom && customTo) {
    const days = (new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000;
    if (days <= 2) return "hour";
    if (days <= 92) return "day";
    return "month";
  }
  return "day";
}

function bucketKey(ts: number, granularity: ChartGranularity): string {
  const d = new Date(ts);
  if (granularity === "hour") return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  if (granularity === "day") return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function bucketLabel(key: string, granularity: ChartGranularity, locale: string): string {
  const parts = key.split("-").map(Number);
  if (granularity === "hour") {
    const h = parts[3];
    return `${String(h).padStart(2, "0")}:00`;
  }
  if (granularity === "day") {
    const d = new Date(parts[0], parts[1], parts[2]);
    return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { day: "numeric", month: "short" });
  }
  const d = new Date(parts[0], parts[1], 1);
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "short" });
}

function allBuckets(range: [number, number], granularity: ChartGranularity): string[] {
  const [start, end] = range;
  const keys: string[] = [];
  const seen = new Set<string>();
  let cur = start;
  while (cur <= end) {
    const k = bucketKey(cur, granularity);
    if (!seen.has(k)) { seen.add(k); keys.push(k); }
    cur += granularity === "hour" ? 3600000 : granularity === "day" ? 86400000 : 28 * 86400000;
    // For month, advance to next month start properly
    if (granularity === "month") {
      const parts = k.split("-").map(Number);
      const next = new Date(parts[0], parts[1] + 1, 1).getTime();
      cur = next;
    }
  }
  // Ensure end bucket is included
  const endKey = bucketKey(end, granularity);
  if (!seen.has(endKey)) keys.push(endKey);
  return keys;
}

// Simple SVG line chart — no external library needed
function LineChart({
  buckets,
  data,
  granularity,
  locale,
}: {
  buckets: string[];
  data: Map<string, number>;
  granularity: ChartGranularity;
  locale: string;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 800;
  const H = 140;
  const PAD_L = 8;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const values = buckets.map((k) => data.get(k) ?? 0);
  const maxVal = Math.max(...values, 1);

  // Decide how many x-labels to show to avoid crowding
  const maxLabels = 12;
  const step = Math.max(1, Math.ceil(buckets.length / maxLabels));

  const pts = buckets.map((k, i) => {
    const x = PAD_L + (i / Math.max(buckets.length - 1, 1)) * chartW;
    const y = PAD_T + chartH - ((data.get(k) ?? 0) / maxVal) * chartH;
    return { x, y, k, v: data.get(k) ?? 0 };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = pts.length > 0
    ? `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`
    : "";

  function handleMouseEnter(e: React.MouseEvent<SVGCircleElement>, pt: typeof pts[0]) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width / W;
    const scaleY = rect.height / H;
    setTooltip({
      x: pt.x * scaleX,
      y: pt.y * scaleY,
      label: bucketLabel(pt.k, granularity, locale),
      value: pt.v,
    });
  }

  return (
    <div className="office-report-chart-container">
      <svg
        ref={svgRef}
        className="office-report-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--erp-primary)" />
            <stop offset="100%" stopColor="var(--erp-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Baseline */}
        <line
          x1={PAD_L} y1={PAD_T + chartH}
          x2={PAD_L + chartW} y2={PAD_T + chartH}
          className="office-report-chart-axis"
        />
        {/* Area fill */}
        {areaD && <path d={areaD} className="office-report-chart-area" />}
        {/* Line */}
        {pathD && <path d={pathD} className="office-report-chart-line" />}
        {/* Dots + x labels */}
        {pts.map((pt, i) => (
          <g key={pt.k}>
            <circle
              cx={pt.x} cy={pt.y} r={3}
              className="office-report-chart-dot"
              onMouseEnter={(e) => handleMouseEnter(e, pt)}
              onMouseLeave={() => setTooltip(null)}
            />
            {i % step === 0 && (
              <text
                x={pt.x} y={H - 6}
                className="office-report-chart-label"
              >
                {bucketLabel(pt.k, granularity, locale)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {tooltip && (
        <div
          className="office-report-chart-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.label}: {formatRupiah(tooltip.value)}
        </div>
      )}
    </div>
  );
}

function buildPdfContent(params: {
  isId: boolean;
  periodLabel: string;
  rangeFrom: number;
  rangeTo: number;
  orgName: string;
  totalRevenue: number;
  totalCogs: number;
  netIncome: number;
  profitabilityPct: number;
  txCount: number;
  avgTxValue: number;
  uniqueCustomers: number;
  unpaidDebtTotal: number;
  paymentBreakdown: Record<string, number>;
  branchRevenue: Array<{ branchName: string; revenue: number; count: number; cogs: number; netIncome: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number; cogs: number }>;
  topCategories: Array<{ name: string; qty: number; revenue: number; cogs: number }>;
  topCustomers: Array<{ name: string; spending: number; txCount: number }>;
}): string {
  const {
    isId, periodLabel, rangeFrom, rangeTo, orgName,
    totalRevenue, totalCogs, netIncome, profitabilityPct,
    txCount, avgTxValue, uniqueCustomers, unpaidDebtTotal,
    paymentBreakdown, branchRevenue, topProducts, topCategories, topCustomers,
  } = params;

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(isId ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric" });
  const fmtRupiah = (n: number) =>
    "Rp" + n.toLocaleString("id-ID");

  const pmLabel: Record<string, string> = isId
    ? { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer", UTANG: "Utang" }
    : { CASH: "Cash", QRIS: "QRIS", TRANSFER: "Transfer", UTANG: "Debt" };

  const pmRows = ["CASH", "QRIS", "TRANSFER"]
    .map((pm) => {
      const amt = paymentBreakdown[pm] || 0;
      const pct = totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0;
      return `<tr><td>${pmLabel[pm]}</td><td>${fmtRupiah(amt)}</td><td>${pct}%</td></tr>`;
    }).join("");

  const branchRows = branchRevenue.map((b) =>
    `<tr><td>${b.branchName}</td><td>${fmtRupiah(b.revenue)}</td><td>${b.cogs > 0 ? fmtRupiah(b.cogs) : "-"}</td><td>${b.cogs > 0 ? fmtRupiah(b.netIncome) : "-"}</td><td>${b.count}</td><td>${b.count > 0 ? fmtRupiah(Math.round(b.revenue / b.count)) : "-"}</td></tr>`
  ).join("") + `<tr class="total-row"><td><strong>Total</strong></td><td><strong>${fmtRupiah(branchRevenue.reduce((s, b) => s + b.revenue, 0))}</strong></td><td><strong>${totalCogs > 0 ? fmtRupiah(totalCogs) : "-"}</strong></td><td><strong>${totalCogs > 0 ? fmtRupiah(netIncome) : "-"}</strong></td><td><strong>${branchRevenue.reduce((s, b) => s + b.count, 0)}</strong></td><td><strong>${txCount > 0 ? fmtRupiah(avgTxValue) : "-"}</strong></td></tr>`;

  const top10Products = topProducts.slice(0, 10);
  const productRows = top10Products.map((p, i) => {
    const pNet = p.revenue - p.cogs;
    const pProfitPct = p.revenue > 0 && p.cogs > 0 ? Math.round((pNet / p.revenue) * 100) : null;
    const salesSharePct = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
    return `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.qty}</td><td>${fmtRupiah(p.revenue)}</td><td>${p.cogs > 0 ? fmtRupiah(p.cogs) : "-"}</td><td>${p.cogs > 0 ? fmtRupiah(pNet) : "-"}</td><td>${pProfitPct !== null ? `${pProfitPct}%` : "-"}</td><td>${salesSharePct}%</td></tr>`;
  }).join("");

  const top10Categories = topCategories.slice(0, 10);
  const categoryRows = top10Categories.map((c, i) => {
    const cNet = c.revenue - c.cogs;
    const cProfitPct = c.revenue > 0 && c.cogs > 0 ? Math.round((cNet / c.revenue) * 100) : null;
    const salesSharePct = totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0;
    return `<tr><td>${i + 1}</td><td>${c.name}</td><td>${c.qty}</td><td>${fmtRupiah(c.revenue)}</td><td>${c.cogs > 0 ? fmtRupiah(c.cogs) : "-"}</td><td>${c.cogs > 0 ? fmtRupiah(cNet) : "-"}</td><td>${cProfitPct !== null ? `${cProfitPct}%` : "-"}</td><td>${salesSharePct}%</td></tr>`;
  }).join("");

  const top10Customers = topCustomers.slice(0, 10);
  const customerRows = top10Customers.map((c, i) =>
    `<tr><td>${i + 1}</td><td>${c.name}</td><td>${fmtRupiah(c.spending)}</td><td>${c.txCount}</td><td>${fmtRupiah(Math.round(c.spending / c.txCount))}</td></tr>`
  ).join("");

  const generatedAt = new Date().toLocaleString(isId ? "id-ID" : "en-US", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${isId ? "Laporan Konsolidasi" : "Consolidated Report"} — ${orgName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sora', Arial, sans-serif; font-size: 12px; color: #1a1d26; background: #fff; padding: 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1D72E9; padding-bottom: 12px; }
  .header-left h1 { font-size: 18px; font-weight: 700; color: #1D72E9; }
  .header-left p { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .header-right { text-align: right; font-size: 11px; color: #6b7280; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; margin-bottom: 10px; border-left: 3px solid #1D72E9; padding-left: 8px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .kpi-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
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
    <h1>${isId ? "Laporan Konsolidasi" : "Consolidated Report"}</h1>
    <p>${orgName} &nbsp;·&nbsp; ${periodLabel}: ${fmtDate(rangeFrom)} – ${fmtDate(rangeTo)}</p>
  </div>
  <div class="header-right">
    <div>${isId ? "Dibuat" : "Generated"}: ${generatedAt}</div>
    <div>AyaKasir by Petalytix</div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">${isId ? "Total Pendapatan" : "Total Revenue"}</div><div class="kpi-value">${fmtRupiah(totalRevenue)}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "HPP (COGS)" : "COGS"}</div><div class="kpi-value">${totalCogs > 0 ? fmtRupiah(totalCogs) : "-"}</div></div>
  <div class="kpi-card${netIncome < 0 ? " danger" : ""}"><div class="kpi-label">${isId ? "Pendapatan Bersih" : "Net Income"}</div><div class="kpi-value">${totalCogs > 0 ? fmtRupiah(netIncome) : "-"}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "Margin Keuntungan" : "Profit Margin"}</div><div class="kpi-value">${totalCogs > 0 ? profitabilityPct + "%" : "-"}</div></div>
</div>
<div class="kpi-grid">
  <div class="kpi-card"><div class="kpi-label">${isId ? "Total Transaksi" : "Total Transactions"}</div><div class="kpi-value">${txCount.toLocaleString("id-ID")}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "Rata-rata Transaksi" : "Avg Transaction"}</div><div class="kpi-value">${fmtRupiah(avgTxValue)}</div></div>
  <div class="kpi-card"><div class="kpi-label">${isId ? "Pelanggan Unik" : "Unique Customers"}</div><div class="kpi-value">${uniqueCustomers.toLocaleString("id-ID")}</div></div>
  <div class="kpi-card danger"><div class="kpi-label">${isId ? "Utang Belum Lunas" : "Unpaid Debts"}</div><div class="kpi-value">${fmtRupiah(unpaidDebtTotal)}</div></div>
</div>

<div class="section">
  <h2>${isId ? "Metode Pembayaran" : "Payment Methods"}</h2>
  <table><thead><tr><th>${isId ? "Metode" : "Method"}</th><th>${isId ? "Jumlah" : "Amount"}</th><th>%</th></tr></thead><tbody>${pmRows}</tbody></table>
</div>

<div class="section">
  <h2>${isId ? "Pendapatan per Cabang" : "Revenue by Branch"}</h2>
  <table><thead><tr><th>${isId ? "Cabang" : "Branch"}</th><th>${isId ? "Pendapatan" : "Revenue"}</th><th>${isId ? "HPP" : "COGS"}</th><th>${isId ? "Pendapatan Bersih" : "Net Income"}</th><th>${isId ? "Transaksi" : "Transactions"}</th><th>${isId ? "Rata-rata" : "Avg"}</th></tr></thead><tbody>${branchRows}</tbody></table>
</div>

${top10Categories.length > 0 ? `<div class="section"><h2>${isId ? "Kategori Terlaris" : "Top Categories"}</h2><table><thead><tr><th>#</th><th>${isId ? "Kategori" : "Category"}</th><th>${isId ? "Terjual" : "Sold"}</th><th>${isId ? "Pendapatan" : "Revenue"}</th><th>${isId ? "HPP" : "COGS"}</th><th>${isId ? "Pendapatan Bersih" : "Net Income"}</th><th>${isId ? "Profitabilitas" : "Profitability"}</th><th>${isId ? "Porsi Penjualan" : "Sales Share"}</th></tr></thead><tbody>${categoryRows}</tbody></table></div>` : ""}

${top10Products.length > 0 ? `<div class="section"><h2>${isId ? "10 Produk Terlaris" : "Top 10 Products"}</h2><table><thead><tr><th>#</th><th>${isId ? "Produk" : "Product"}</th><th>${isId ? "Terjual" : "Sold"}</th><th>${isId ? "Pendapatan" : "Revenue"}</th><th>${isId ? "HPP" : "COGS"}</th><th>${isId ? "Pendapatan Bersih" : "Net Income"}</th><th>${isId ? "Profitabilitas" : "Profitability"}</th><th>${isId ? "Porsi Penjualan" : "Sales Share"}</th></tr></thead><tbody>${productRows}</tbody></table></div>` : ""}

${top10Customers.length > 0 ? `<div class="section"><h2>${isId ? "10 Konsumen Utama" : "Top 10 Customers"}</h2><table><thead><tr><th>#</th><th>${isId ? "Pelanggan" : "Customer"}</th><th>${isId ? "Total Belanja" : "Total Spending"}</th><th>${isId ? "Transaksi" : "Transactions"}</th><th>${isId ? "Rata-rata" : "Avg"}</th></tr></thead><tbody>${customerRows}</tbody></table></div>` : ""}

<div class="footer">AyaKasir by Petalytix &nbsp;·&nbsp; ${isId ? "Laporan ini dibuat otomatis oleh sistem" : "This report was automatically generated by the system"}</div>
</body>
</html>`;
}

export default function ReportsScreen() {
  const { state, locale } = useOffice();
  const isId = locale === "id";

  const planExpired =
    state.organization?.plan_expires_at != null &&
    Date.now() > (state.organization.plan_expires_at ?? 0);
  const effectivePlan = planExpired ? "PERINTIS" : (state.organization?.plan ?? "PERINTIS") as TenantPlan;
  const limits = getPlanLimits(effectivePlan);
  const canExportCsv = limits.maxBranches > 1;

  const [period, setPeriod] = useState<ReportPeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [customerPage, setCustomerPage] = useState(0);
  const PAGE_SIZE = 10;

  // Date range
  const range = useMemo<[number, number]>(() => {
    if (period === "today") return todayRange();
    if (period === "week") return weekRange();
    if (period === "month") return monthRange();
    if (period === "year") return yearRange();
    const from = customFrom ? new Date(customFrom).setHours(0, 0, 0, 0) : 0;
    const to = customTo ? new Date(customTo).setHours(23, 59, 59, 999) : Date.now();
    return [from, to];
  }, [period, customFrom, customTo]);

  // Filtered transactions
  const filteredTxs = useMemo(
    () => state.consolidatedTxs.filter((t) => t.date >= range[0] && t.date <= range[1]),
    [state.consolidatedTxs, range]
  );

  // ── KPI Computations ───────────────────────────────────────────
  const totalRevenue = useMemo(() => filteredTxs.reduce((s, t) => s + t.total, 0), [filteredTxs]);
  const txCount = filteredTxs.length;
  const avgTxValue = txCount > 0 ? Math.round(totalRevenue / txCount) : 0;

  const filteredTxIdSet = useMemo(() => new Set(filteredTxs.map((t) => t.id)), [filteredTxs]);
  const txDateMap = useMemo(() => new Map(filteredTxs.map((t) => [t.id, t.date])), [filteredTxs]);

  // COGS support maps — same logic as OverviewScreen for consistent results
  const invMap = useMemo(() => buildInvMap(state.consolidatedInventory), [state.consolidatedInventory]);
  const bomMap = useMemo(() => buildBomMap(state.consolidatedProductComponents), [state.consolidatedProductComponents]);
  const historicalCogsMap = useMemo(() => buildHistoricalCogsMap(state.consolidatedGrItems, invMap), [state.consolidatedGrItems, invMap]);

  const filteredTxItems = useMemo(
    () => state.consolidatedTxItems.filter((i) => filteredTxIdSet.has(i.transaction_id)),
    [state.consolidatedTxItems, filteredTxIdSet]
  );

  const totalCogs = useMemo(() => {
    return filteredTxItems.reduce((s, item) => {
      const atDate = txDateMap.get(item.transaction_id);
      return s + computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, bomMap, invMap, historicalCogsMap, atDate, item.cogs_per_unit);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTxItems, txDateMap, bomMap, invMap, historicalCogsMap]);

  const netIncome = totalRevenue - totalCogs;
  const profitabilityPct = totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0;

  const uniqueCustomers = useMemo(
    () => new Set(filteredTxs.filter((t) => t.customer_id).map((t) => t.customer_id)).size,
    [filteredTxs]
  );

  const unpaidDebtTotal = useMemo(
    () => state.consolidatedTxs
      .filter((t) => t.payment_method === "UTANG" && t.debt_status === "UNPAID")
      .reduce((s, t) => s + t.total, 0),
    [state.consolidatedTxs]
  );

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { CASH: 0, QRIS: 0, TRANSFER: 0, UTANG: 0 };
    filteredTxs.forEach((t) => { map[t.payment_method] = (map[t.payment_method] || 0) + t.total; });
    return map;
  }, [filteredTxs]);

  // Revenue by branch
  const branchRevenue = useMemo(() => {
    const revenueMap = new Map<string, { revenue: number; count: number }>();
    filteredTxs.forEach((t) => {
      const prev = revenueMap.get(t.tenant_id) || { revenue: 0, count: 0 };
      revenueMap.set(t.tenant_id, { revenue: prev.revenue + t.total, count: prev.count + 1 });
    });
    const cogsMap = new Map<string, number>();
    filteredTxItems.forEach((item) => {
      const atDate = txDateMap.get(item.transaction_id);
      const cogs = computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, bomMap, invMap, historicalCogsMap, atDate, item.cogs_per_unit);
      cogsMap.set(item.tenant_id, (cogsMap.get(item.tenant_id) ?? 0) + cogs);
    });
    return state.branches.map((b) => {
      const { revenue, count } = revenueMap.get(b.id) || { revenue: 0, count: 0 };
      const cogs = cogsMap.get(b.id) ?? 0;
      return {
        tenantId: b.id,
        branchName: b.branch_name || b.name,
        revenue,
        count,
        cogs,
        netIncome: revenue - cogs,
        activeSession: state.branchSummaries.find((s) => s.tenantId === b.id)?.activeSession ?? false,
        lowStockCount: state.branchSummaries.find((s) => s.tenantId === b.id)?.lowStockCount ?? 0,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTxs, filteredTxItems, txDateMap, bomMap, invMap, historicalCogsMap, state.branches, state.branchSummaries]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cogs: number }>();
    filteredTxItems.forEach((item) => {
      const key = item.product_name + (item.variant_name ? ` (${item.variant_name})` : "");
      const atDate = txDateMap.get(item.transaction_id);
      const itemCogs = computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, bomMap, invMap, historicalCogsMap, atDate, item.cogs_per_unit);
      const prev = map.get(key) || { name: key, qty: 0, revenue: 0, cogs: 0 };
      map.set(key, {
        name: key,
        qty: prev.qty + item.qty,
        revenue: prev.revenue + item.subtotal,
        cogs: prev.cogs + itemCogs,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTxItems, txDateMap, bomMap, invMap, historicalCogsMap]);

  // Top customers (by spending in period)
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, string>(state.orgCustomers.map((c) => [c.id, c.name]));
    const map = new Map<string, { name: string; spending: number; txCount: number }>();
    filteredTxs
      .filter((t) => t.customer_id)
      .forEach((t) => {
        const id = t.customer_id!;
        const name = customerMap.get(id) ?? (isId ? "Pelanggan" : "Customer");
        const prev = map.get(id) || { name, spending: 0, txCount: 0 };
        map.set(id, { name, spending: prev.spending + t.total, txCount: prev.txCount + 1 });
      });
    return Array.from(map.values()).sort((a, b) => b.spending - a.spending);
  }, [filteredTxs, state.orgCustomers, isId]);

  // Top categories
  const topCategories = useMemo(() => {
    // Build product → category_id map (dedupe by product_id across branches using primary branch first)
    const productCategoryMap = new Map<string, string | null>();
    state.consolidatedProducts.forEach((p) => {
      if (!productCategoryMap.has(p.id)) {
        productCategoryMap.set(p.id, p.category_id);
      }
    });
    // Build category name map (tenant-aware, dedupe by id)
    const categoryNameMap = new Map<string, string>();
    state.consolidatedCategories.forEach((c) => {
      if (!categoryNameMap.has(c.id)) categoryNameMap.set(c.id, c.name);
    });
    const uncategorized = isId ? "Tanpa Kategori" : "Uncategorized";
    // Aggregate by category
    const map = new Map<string, { name: string; qty: number; revenue: number; cogs: number }>();
    filteredTxItems.forEach((item) => {
      const catId = productCategoryMap.get(item.product_id) ?? null;
      const catName = catId ? (categoryNameMap.get(catId) ?? uncategorized) : uncategorized;
      const key = catId ?? "__uncategorized__";
      const atDate = txDateMap.get(item.transaction_id);
      const itemCogs = computeItemCogs(item.tenant_id, item.product_id, item.variant_id, item.qty, bomMap, invMap, historicalCogsMap, atDate, item.cogs_per_unit);
      const prev = map.get(key) || { name: catName, qty: 0, revenue: 0, cogs: 0 };
      map.set(key, { name: catName, qty: prev.qty + item.qty, revenue: prev.revenue + item.subtotal, cogs: prev.cogs + itemCogs });
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTxItems, txDateMap, bomMap, invMap, historicalCogsMap, state.consolidatedProducts, state.consolidatedCategories, isId]);

  // Previous period comparison
  const prevRange = useMemo<[number, number]>(() => {
    const [start, end] = range;
    const duration = end - start;
    return [start - duration - 1, start - 1];
  }, [range]);

  const prevTxs = useMemo(
    () => state.consolidatedTxs.filter((t) => t.date >= prevRange[0] && t.date <= prevRange[1]),
    [state.consolidatedTxs, prevRange]
  );

  const prevRevenue = useMemo(() => prevTxs.reduce((s, t) => s + t.total, 0), [prevTxs]);
  const prevTxCount = prevTxs.length;
  const prevAvgTxValue = prevTxCount > 0 ? Math.round(prevRevenue / prevTxCount) : 0;
  const prevUniqueCustomers = useMemo(
    () => new Set(prevTxs.filter((t) => t.customer_id).map((t) => t.customer_id)).size,
    [prevTxs]
  );

  function pctChange(current: number, previous: number): { label: string; direction: "up" | "down" | "flat" } {
    if (previous === 0) return { label: "-", direction: "flat" };
    const pct = Math.round(((current - previous) / previous) * 100);
    return {
      label: `${pct > 0 ? "+" : ""}${pct}%`,
      direction: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
    };
  }

  const revenueChange = pctChange(totalRevenue, prevRevenue);
  const txCountChange = pctChange(txCount, prevTxCount);
  const avgChange = pctChange(avgTxValue, prevAvgTxValue);
  const customerChange = pctChange(uniqueCustomers, prevUniqueCustomers);

  // Chart
  const granularity = resolveGranularity(period, customFrom, customTo);
  const chartBuckets = useMemo(() => allBuckets(range, granularity), [range, granularity]);
  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTxs.forEach((t) => {
      const k = bucketKey(t.date, granularity);
      map.set(k, (map.get(k) ?? 0) + t.total);
    });
    return map;
  }, [filteredTxs, granularity]);

  // Payment method labels
  const pmLabel: Record<string, string> = isId
    ? { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer", UTANG: "Utang" }
    : { CASH: "Cash", QRIS: "QRIS", TRANSFER: "Transfer", UTANG: "Debt" };

  const pmColors: Record<string, string> = {
    CASH: "var(--erp-success)",
    QRIS: "var(--erp-primary)",
    TRANSFER: "var(--erp-warning)",
    UTANG: "var(--erp-danger)",
  };

  // Paged slices
  const productTotalPages = Math.ceil(topProducts.length / PAGE_SIZE);
  const pagedProducts = topProducts.slice(productPage * PAGE_SIZE, (productPage + 1) * PAGE_SIZE);
  const customerTotalPages = Math.ceil(topCustomers.length / PAGE_SIZE);
  const pagedCustomers = topCustomers.slice(customerPage * PAGE_SIZE, (customerPage + 1) * PAGE_SIZE);

  const periodLabels: Record<ReportPeriod, string> = isId
    ? { today: "Hari Ini", week: "Minggu Ini", month: "Bulan Ini", year: "Tahun Ini", custom: "Kustom" }
    : { today: "Today", week: "This Week", month: "This Month", year: "This Year", custom: "Custom" };

  function handleDownloadPdf() {
    const html = buildPdfContent({
      isId,
      periodLabel: periodLabels[period],
      rangeFrom: range[0],
      rangeTo: range[1],
      orgName: state.organization?.name ?? "AyaKasir",
      totalRevenue,
      totalCogs,
      netIncome,
      profitabilityPct,
      txCount,
      avgTxValue,
      uniqueCustomers,
      unpaidDebtTotal,
      paymentBreakdown,
      branchRevenue,
      topProducts,
      topCategories,
      topCustomers,
    });
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html); // eslint-disable-line
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  const granularityLabel = isId
    ? { hour: "per jam", day: "per hari", month: "per bulan" }[granularity]
    : { hour: "hourly", day: "daily", month: "monthly" }[granularity];

  function KpiChange({ change }: { change: ReturnType<typeof pctChange> }) {
    if (change.direction === "flat") return null;
    return (
      <div className={`office-report-kpi-change office-report-kpi-change--${change.direction}`}>
        {change.direction === "up" ? "▲" : "▼"} {change.label} {isId ? "vs periode lalu" : "vs prev period"}
      </div>
    );
  }

  return (
    <div className="erp-screen">
      {/* Header */}
      <div className="erp-screen-header">
        <div>
          <h1 className="erp-screen-title">{isId ? "LAPORAN KONSOLIDASI" : "CONSOLIDATED REPORTS"}</h1>
          <p className="erp-screen-subtitle">
            {isId ? "RINGKASAN PENJUALAN SEMUA CABANG" : "SALES SUMMARY ACROSS ALL BRANCHES"}
          </p>
        </div>
        <button
          className="erp-btn erp-btn--primary"
          disabled={!canExportCsv}
          title={!canExportCsv ? (isId ? "Upgrade untuk ekspor data" : "Upgrade to export data") : undefined}
          onClick={handleDownloadPdf}
        >
          {isId ? "Unduh Laporan" : "Download Report"}
        </button>
      </div>

      {!canExportCsv && (
        <div className="erp-info-banner erp-info-banner--warning">
          {isId
            ? "Unduh laporan tersedia untuk plan Tumbuh dan Mapan."
            : "Report download is available for Tumbuh and Mapan plans."}
        </div>
      )}

      {/* Period filter */}
      <div className="office-report-filters">
        <div className="erp-chip-group">
          {(["today", "week", "month", "year", "custom"] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              className={`erp-chip${period === p ? " erp-chip--active" : ""}`}
              onClick={() => { setPeriod(p); setProductPage(0); setCustomerPage(0); }}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="office-report-date-range">
            <input
              type="date"
              className="erp-input"
              value={customFrom}
              onChange={(e) => { setCustomFrom(e.target.value); setProductPage(0); setCustomerPage(0); }}
            />
            <span className="office-report-date-sep">—</span>
            <input
              type="date"
              className="erp-input"
              value={customTo}
              onChange={(e) => { setCustomTo(e.target.value); setProductPage(0); setCustomerPage(0); }}
            />
          </div>
        )}
      </div>

      {/* KPI Cards — 3 sections */}
      <div className="office-report-kpi-sections">

        {/* Penjualan */}
        <div className="office-report-kpi-section">
          <div className="office-report-kpi-section-title">{isId ? "Penjualan" : "Sales"}</div>
          <div className="office-report-kpi-grid">
            <div className="office-report-kpi-card">
              <div className="office-report-kpi-label">{isId ? "Pendapatan Kotor" : "Gross Revenue"}</div>
              <div className="office-report-kpi-value">{formatRupiah(totalRevenue)}</div>
              <KpiChange change={revenueChange} />
            </div>
            <div className="office-report-kpi-card">
              <div className="office-report-kpi-label">COGS</div>
              <div className="office-report-kpi-value">{totalCogs > 0 ? formatRupiah(totalCogs) : "-"}</div>
              {totalCogs === 0 && (
                <div className="office-report-kpi-sub">{isId ? "Belum ada data HPP" : "No COGS data yet"}</div>
              )}
            </div>
            <div className={`office-report-kpi-card${netIncome < 0 ? " office-report-kpi-card--danger" : ""}`}>
              <div className="office-report-kpi-label">{isId ? "Pendapatan Bersih" : "Net Income"}</div>
              <div className="office-report-kpi-value">{totalCogs > 0 ? formatRupiah(netIncome) : "-"}</div>
            </div>
            <div className={`office-report-kpi-card${profitabilityPct < 0 ? " office-report-kpi-card--danger" : profitabilityPct >= 30 ? " office-report-kpi-card--success" : ""}`}>
              <div className="office-report-kpi-label">{isId ? "Profitabilitas" : "Profitability"}</div>
              <div className="office-report-kpi-value">{totalCogs > 0 ? `${profitabilityPct}%` : "-"}</div>
              {totalCogs > 0 && (
                <div className="office-report-kpi-sub">{isId ? "Bersih / kotor" : "Net / gross"}</div>
              )}
            </div>
          </div>
        </div>

        {/* Analisa Transaksi */}
        <div className="office-report-kpi-section">
          <div className="office-report-kpi-section-title">{isId ? "Analisa Transaksi" : "Transaction Analysis"}</div>
          <div className="office-report-kpi-grid">
            <div className="office-report-kpi-card">
              <div className="office-report-kpi-label">{isId ? "Transaksi" : "Transactions"}</div>
              <div className="office-report-kpi-value">{txCount.toLocaleString("id-ID")}</div>
              <KpiChange change={txCountChange} />
            </div>
            <div className="office-report-kpi-card">
              <div className="office-report-kpi-label">{isId ? "Pelanggan" : "Customers"}</div>
              <div className="office-report-kpi-value">{uniqueCustomers.toLocaleString("id-ID")}</div>
              <KpiChange change={customerChange} />
            </div>
            <div className="office-report-kpi-card">
              <div className="office-report-kpi-label">{isId ? "Rata-rata Transaksi" : "Avg Transaction"}</div>
              <div className="office-report-kpi-value">{formatRupiah(avgTxValue)}</div>
              <KpiChange change={avgChange} />
            </div>
          </div>
        </div>

        {/* Utang */}
        <div className="office-report-kpi-section">
          <div className="office-report-kpi-section-title">{isId ? "Utang" : "Debt"}</div>
          <div className="office-report-kpi-grid">
            <div className="office-report-kpi-card office-report-kpi-card--danger" style={{ maxWidth: 280 }}>
              <div className="office-report-kpi-label">{isId ? "Utang Belum Lunas" : "Unpaid Debts"}</div>
              <div className="office-report-kpi-value">{formatRupiah(unpaidDebtTotal)}</div>
              <div className="office-report-kpi-sub">{isId ? "Seluruh periode" : "All-time"}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Revenue trend chart */}
      <h2 className="office-section-title">
        {isId ? `Tren Pendapatan (${granularityLabel})` : `Revenue Trend (${granularityLabel})`}
      </h2>
      <div className="erp-card">
        <div className="office-report-chart-wrap">
          <LineChart
            buckets={chartBuckets}
            data={chartData}
            granularity={granularity}
            locale={locale}
          />
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <h2 className="office-section-title">{isId ? "Metode Pembayaran" : "Payment Methods"}</h2>
      <div className="erp-card">
        <div className="office-report-payment-grid">
          {(["CASH", "QRIS", "TRANSFER"] as const).map((pm) => {
            const amount = paymentBreakdown[pm] || 0;
            const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
            return (
              <div key={pm} className="office-report-payment-item">
                <div className="office-report-payment-bar-bg">
                  <div
                    className="office-report-payment-bar"
                    style={{ width: `${pct}%`, backgroundColor: pmColors[pm] }}
                  />
                </div>
                <div className="office-report-payment-info">
                  <span className="office-report-payment-label">{pmLabel[pm]}</span>
                  <span className="office-report-payment-amount">{formatRupiah(amount)}</span>
                  <span className="office-report-payment-pct">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by Branch */}
      <h2 className="office-section-title">{isId ? "Pendapatan per Cabang" : "Revenue by Branch"}</h2>
      <div className="erp-card">
        <table className="erp-table">
          <thead>
            <tr>
              <th>{isId ? "Cabang" : "Branch"}</th>
              <th>{isId ? "Pendapatan" : "Revenue"}</th>
              <th>{isId ? "HPP" : "COGS"}</th>
              <th>{isId ? "Pendapatan Bersih" : "Net Income"}</th>
              <th>{isId ? "Transaksi" : "Transactions"}</th>
              <th>{isId ? "Rata-rata" : "Avg"}</th>
              <th>{isId ? "Kasir" : "Shift"}</th>
              <th>{isId ? "Stok Rendah" : "Low Stock"}</th>
            </tr>
          </thead>
          <tbody>
            {branchRevenue.map((b) => (
              <tr key={b.tenantId}>
                <td>{b.branchName}</td>
                <td>{formatRupiah(b.revenue)}</td>
                <td>{b.cogs > 0 ? formatRupiah(b.cogs) : "-"}</td>
                <td>{b.cogs > 0 ? formatRupiah(b.netIncome) : "-"}</td>
                <td>{b.count}</td>
                <td>{b.count > 0 ? formatRupiah(Math.round(b.revenue / b.count)) : "-"}</td>
                <td>
                  {b.activeSession ? (
                    <span className="office-badge office-badge--success">{isId ? "Aktif" : "Active"}</span>
                  ) : (
                    <span className="office-badge office-badge--muted">{isId ? "Tutup" : "Closed"}</span>
                  )}
                </td>
                <td>
                  {b.lowStockCount > 0 ? (
                    <span className="office-badge office-badge--warning">{b.lowStockCount}</span>
                  ) : (
                    <span className="office-badge office-badge--success">OK</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="office-table-total">
              <td><strong>Total</strong></td>
              <td><strong>{formatRupiah(branchRevenue.reduce((s, b) => s + b.revenue, 0))}</strong></td>
              <td><strong>{totalCogs > 0 ? formatRupiah(totalCogs) : "-"}</strong></td>
              <td><strong>{totalCogs > 0 ? formatRupiah(netIncome) : "-"}</strong></td>
              <td><strong>{branchRevenue.reduce((s, b) => s + b.count, 0)}</strong></td>
              <td><strong>{txCount > 0 ? formatRupiah(avgTxValue) : "-"}</strong></td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <>
          <h2 className="office-section-title">{isId ? "Kategori Terlaris" : "Top Categories"}</h2>
          <div className="erp-card">
            <table className="erp-table erp-table--fixed">
              <colgroup>
                <col style={{ width: "3%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{isId ? "Kategori" : "Category"}</th>
                  <th>{isId ? "Terjual" : "Sold"}</th>
                  <th>{isId ? "Pendapatan" : "Revenue"}</th>
                  <th>{isId ? "HPP" : "COGS"}</th>
                  <th>{isId ? "Pendapatan Bersih" : "Net Income"}</th>
                  <th>{isId ? "Profitabilitas" : "Profitability"}</th>
                  <th>{isId ? "Porsi Penjualan" : "Sales Share"}</th>
                </tr>
              </thead>
              <tbody>
                {topCategories.map((c, i) => {
                  const cNet = c.revenue - c.cogs;
                  const cProfitPct = c.revenue > 0 && c.cogs > 0 ? Math.round((cNet / c.revenue) * 100) : null;
                  const salesSharePct = totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0;
                  return (
                    <tr key={c.name}>
                      <td>{i + 1}</td>
                      <td>{c.name}</td>
                      <td>{c.qty}</td>
                      <td>{formatRupiah(c.revenue)}</td>
                      <td>{c.cogs > 0 ? formatRupiah(c.cogs) : "-"}</td>
                      <td>{c.cogs > 0 ? formatRupiah(cNet) : "-"}</td>
                      <td>{cProfitPct !== null ? `${cProfitPct}%` : "-"}</td>
                      <td>{salesSharePct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <>
          <h2 className="office-section-title">{isId ? "Produk Terlaris" : "Top Products"}</h2>
          <div className="erp-card">
            <table className="erp-table erp-table--fixed">
              <colgroup>
                <col style={{ width: "3%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "11%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{isId ? "Produk" : "Product"}</th>
                  <th>{isId ? "Terjual" : "Sold"}</th>
                  <th>{isId ? "Pendapatan" : "Revenue"}</th>
                  <th>{isId ? "HPP" : "COGS"}</th>
                  <th>{isId ? "Pendapatan Bersih" : "Net Income"}</th>
                  <th>{isId ? "Profitabilitas" : "Profitability"}</th>
                  <th>{isId ? "Porsi Penjualan" : "Sales Share"}</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((p, i) => {
                  const pNet = p.revenue - p.cogs;
                  const pProfitPct = p.revenue > 0 && p.cogs > 0 ? Math.round((pNet / p.revenue) * 100) : null;
                  const salesSharePct = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
                  return (
                  <tr key={p.name}>
                    <td>{productPage * PAGE_SIZE + i + 1}</td>
                    <td>{p.name}</td>
                    <td>{p.qty}</td>
                    <td>{formatRupiah(p.revenue)}</td>
                    <td>{p.cogs > 0 ? formatRupiah(p.cogs) : "-"}</td>
                    <td>{p.cogs > 0 ? formatRupiah(pNet) : "-"}</td>
                    <td>{pProfitPct !== null ? `${pProfitPct}%` : "-"}</td>
                    <td>{salesSharePct}%</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {productTotalPages > 1 && (
              <div className="erp-table-pagination">
                <button
                  className="erp-btn erp-btn--secondary erp-btn--sm"
                  disabled={productPage === 0}
                  onClick={() => setProductPage((p) => p - 1)}
                >‹</button>
                <span className="erp-table-pagination-info">
                  {productPage + 1} / {productTotalPages}
                </span>
                <button
                  className="erp-btn erp-btn--secondary erp-btn--sm"
                  disabled={productPage >= productTotalPages - 1}
                  onClick={() => setProductPage((p) => p + 1)}
                >›</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Top Customers */}
      {topCustomers.length > 0 && (
        <>
          <h2 className="office-section-title">{isId ? "Konsumen Utama" : "Top Customers"}</h2>
          <div className="erp-card">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{isId ? "Pelanggan" : "Customer"}</th>
                  <th>{isId ? "Total Belanja" : "Total Spending"}</th>
                  <th>{isId ? "Transaksi" : "Transactions"}</th>
                  <th>{isId ? "Rata-rata" : "Avg"}</th>
                </tr>
              </thead>
              <tbody>
                {pagedCustomers.map((c, i) => (
                  <tr key={c.name}>
                    <td>{customerPage * PAGE_SIZE + i + 1}</td>
                    <td>{c.name}</td>
                    <td>{formatRupiah(c.spending)}</td>
                    <td>{c.txCount}</td>
                    <td>{formatRupiah(Math.round(c.spending / c.txCount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customerTotalPages > 1 && (
              <div className="erp-table-pagination">
                <button
                  className="erp-btn erp-btn--secondary erp-btn--sm"
                  disabled={customerPage === 0}
                  onClick={() => setCustomerPage((p) => p - 1)}
                >‹</button>
                <span className="erp-table-pagination-info">
                  {customerPage + 1} / {customerTotalPages}
                </span>
                <button
                  className="erp-btn erp-btn--secondary erp-btn--sm"
                  disabled={customerPage >= customerTotalPages - 1}
                  onClick={() => setCustomerPage((p) => p + 1)}
                >›</button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="office-reports-note">
        {isId
          ? "Laporan detail per cabang tersedia di halaman Dashboard masing-masing cabang."
          : "Detailed per-branch reports are available in each branch's Dashboard page."}
      </div>
    </div>
  );
}
