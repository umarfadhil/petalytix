"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useErp } from "./store";
import { getErpCopy } from "./i18n";
import { useBasePath } from "./useBasePath";
import { logoutErpAction, switchBranchAction } from "@/app/ayakasir/actions/auth";

const NAV_ITEMS = [
  { key: "dashboard", icon: DashboardIcon, path: "/app/dashboard", feature: "DASHBOARD" },
  { key: "pos", icon: PosIcon, path: "/app/pos", feature: "POS" },
  { key: "products", icon: ProductsIcon, path: "/app/products", feature: "MENU" },
  { key: "inventory", icon: InventoryIcon, path: "/app/inventory", feature: "INVENTORY" },
  { key: "purchasing", icon: PurchasingIcon, path: "/app/purchasing", feature: "PURCHASING" },
  { key: "customers", icon: CustomersIcon, path: "/app/customers", feature: "CUSTOMERS" },
  { key: "settings", icon: SettingsIcon, path: "/app/settings", feature: "SETTINGS" },
] as const;

export default function ErpSidebar() {
  const { state, locale } = useErp();
  const pathname = usePathname();
  const router = useRouter();
  const base = useBasePath();
  const copy = getErpCopy(locale);
  const [collapsed, setCollapsed] = useState(false);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const isId = locale === "id";

  // Compute allowed features for current user
  const isOwner = state.user?.role === "OWNER";
  const allowedFeatures = isOwner
    ? null // null = all allowed
    : new Set(
        (state.user?.feature_access || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );

  // Show Office link whenever the plan allows it (orgBranches populated = plan allows Office)
  const canAccessOffice = isOwner && state.orgBranches.length >= 1;
  // Show branch switcher dropdown only when there are actually multiple branches to switch between
  const hasMultiBranch = isOwner && state.orgBranches.length > 1;

  async function handleBranchSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const branchId = e.target.value;
    if (!branchId || branchId === state.restaurant?.id) return;
    setSwitchingBranch(true);
    const result = await switchBranchAction(branchId);
    if (result.ok) {
      // Hard navigation to guarantee fresh SSR with the new tenant cookie
      window.location.href = `${base}/${locale}/app/dashboard`;
    } else {
      setSwitchingBranch(false);
    }
  }

  async function handleLogout() {
    await logoutErpAction();
    router.push(`${base}/${locale}/app/login`);
    router.refresh();
  }

  return (
    <aside className={`erp-sidebar${collapsed ? " erp-sidebar--collapsed" : ""}`}>
      <div className="erp-sidebar-header">
        {!collapsed && <div className="erp-sidebar-logo">AyaKa$ir</div>}
        <button
          className="erp-sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Branch switcher — OWNER with multiple branches only */}
      {hasMultiBranch && !collapsed && (
        <div className="erp-branch-switcher">
          <div className="erp-branch-switcher-label">{isId ? "Cabang Aktif" : "Active Branch"}</div>
          <select
            value={state.restaurant?.id || ""}
            onChange={handleBranchSwitch}
            disabled={switchingBranch}
          >
            {state.orgBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.branch_name || b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="erp-sidebar-nav">
        {NAV_ITEMS.filter(({ feature }) => allowedFeatures === null || allowedFeatures.has(feature)).map(({ key, icon: Icon, path }) => {
          const href = `${base}/${locale}${path}`;
          const isActive = pathname.includes(path);

          return (
            <a
              key={key}
              href={href}
              className={`erp-sidebar-link${isActive ? " erp-sidebar-link--active" : ""}${collapsed ? " erp-sidebar-link--icon-only" : ""}`}
              title={collapsed ? copy.nav[key as keyof typeof copy.nav] : undefined}
              onClick={(e) => {
                e.preventDefault();
                router.push(href);
              }}
            >
              <Icon />
              {!collapsed && <span>{copy.nav[key as keyof typeof copy.nav]}</span>}
            </a>
          );
        })}

        {/* Kantor link — directly after Pengaturan (Settings), same style */}
        {canAccessOffice && (
          <a
            href={`${base}/${locale}/app/office/overview`}
            className={`erp-sidebar-link${pathname.includes("/app/office") ? " erp-sidebar-link--active" : ""}${collapsed ? " erp-sidebar-link--icon-only" : ""}`}
            title={collapsed ? (isId ? "Kantor" : "Back Office") : undefined}
            onClick={(e) => { e.preventDefault(); router.push(`${base}/${locale}/app/office/overview`); }}
          >
            <OfficeIcon />
            {!collapsed && <span>{isId ? "Kantor" : "Back Office"}</span>}
          </a>
        )}
      </nav>

      <div className="erp-sidebar-footer">
        {!collapsed && (
          <>
            <div className="erp-sidebar-restaurant">
              {state.restaurant?.name || "—"}
            </div>
            <div className="erp-sidebar-user">
              {state.user?.email || state.user?.name || ""}
            </div>
          </>
        )}
        <button
          className={`erp-sidebar-link${collapsed ? " erp-sidebar-link--icon-only" : ""}`}
          onClick={handleLogout}
          style={{ color: "var(--erp-danger)" }}
          title={collapsed ? copy.nav.logout : undefined}
        >
          <LogoutIcon />
          {!collapsed && <span>{copy.nav.logout}</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Icons (inline SVG) ─────────────────────────────────────────
function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function PosIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
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

function PurchasingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
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
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
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

function OfficeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" strokeWidth="3" />
      <path d="M2 12h20" />
    </svg>
  );
}
