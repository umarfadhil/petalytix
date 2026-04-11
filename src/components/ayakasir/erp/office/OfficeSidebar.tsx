"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOffice } from "./store";
import { useBasePath } from "../useBasePath";
import { logoutErpAction } from "@/app/ayakasir/actions/auth";

const NAV_ITEMS = [
  { key: "overview",    icon: OverviewIcon,    path: "/app/office/overview" },
  { key: "reports",     icon: ReportsIcon,     path: "/app/office/reports" },
  { key: "branches",    icon: BranchesIcon,    path: "/app/office/branches" },
  { key: "staff",       icon: StaffIcon,       path: "/app/office/staff" },
  { key: "inventory",   icon: InventoryIcon,   path: "/app/office/inventory" },
  { key: "customers",   icon: CustomersIcon,   path: "/app/office/customers" },
  { key: "master-data", icon: MasterDataIcon,  path: "/app/office/master-data" },
  { key: "settings",    icon: SettingsIcon,    path: "/app/office/settings" },
] as const;

const NAV_LABELS: Record<string, { id: string; en: string }> = {
  overview:  { id: "Ringkasan",  en: "Overview" },
  branches:  { id: "Cabang",     en: "Branches" },
  staff:     { id: "Karyawan",   en: "Staff" },
  reports:   { id: "Penjualan",    en: "Sales" },
  "master-data": { id: "Data Master", en: "Master Data" },
  inventory: { id: "Inventori",  en: "Inventory" },
  customers: { id: "Pelanggan",  en: "Customers" },
  settings:  { id: "Pengaturan", en: "Settings" },
};

export default function OfficeSidebar() {
  const { state, locale } = useOffice();
  const pathname = usePathname();
  const router = useRouter();
  const base = useBasePath();
  const [collapsed, setCollapsed] = useState(false);
  const isId = locale === "id";

  async function handleLogout() {
    await logoutErpAction();
    router.push(`${base}/${locale}/app/login`);
    router.refresh();
  }

  return (
    <aside className={`erp-sidebar office-sidebar${collapsed ? " erp-sidebar--collapsed" : ""}`}>
      <div className="erp-sidebar-header">
        {!collapsed && (
          <div className="erp-sidebar-logo office-sidebar-logo">
            {isId ? "Kantor" : "Office"}
          </div>
        )}
        <button
          className="erp-sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      <nav className="erp-sidebar-nav">
        {NAV_ITEMS.map(({ key, icon: Icon, path }) => {
          const href = `${base}/${locale}${path}`;
          const isActive = pathname.includes(path);
          const label = isId ? NAV_LABELS[key].id : NAV_LABELS[key].en;

          return (
            <a
              key={key}
              href={href}
              className={`erp-sidebar-link${isActive ? " erp-sidebar-link--active" : ""}${collapsed ? " erp-sidebar-link--icon-only" : ""}`}
              title={collapsed ? label : undefined}
              onClick={(e) => { e.preventDefault(); router.push(href); }}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </a>
          );
        })}

        {/* Back to branch ERP */}
        <a
          href={`${base}/${locale}/app/dashboard`}
          className={`erp-sidebar-link office-back-link${collapsed ? " erp-sidebar-link--icon-only" : ""}`}
          title={collapsed ? (isId ? "Ke Kasir" : "To Cashier") : undefined}
          onClick={(e) => { e.preventDefault(); router.push(`${base}/${locale}/app/dashboard`); router.refresh(); }}
        >
          <BackIcon />
          {!collapsed && <span>{isId ? "Ke Kasir" : "To Cashier"}</span>}
        </a>
      </nav>

      <div className="erp-sidebar-footer">
        {!collapsed && (
          <>
            <div className="erp-sidebar-restaurant office-org-name">
              {state.organization?.name || "—"}
            </div>
            <div className="erp-sidebar-user">
              {state.orgUsers.find((u) => u.role === "OWNER")?.email || ""}
            </div>
          </>
        )}
        <button
          className={`erp-sidebar-link${collapsed ? " erp-sidebar-link--icon-only" : ""}`}
          onClick={handleLogout}
          style={{ color: "var(--erp-danger)" }}
          title={collapsed ? (isId ? "Keluar" : "Logout") : undefined}
        >
          <LogoutIcon />
          {!collapsed && <span>{isId ? "Keluar" : "Logout"}</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Icons ─────────────────────────────────────────────────────────
function OverviewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function BranchesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function StaffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5 19c0-2.21 1.79-4 4-4s4 1.79 4 4" />
      <line x1="15" y1="9" x2="19" y2="9" />
      <line x1="15" y1="13" x2="18" y2="13" />
    </svg>
  );
}
function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function MasterDataIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}
function InventoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function CustomersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
