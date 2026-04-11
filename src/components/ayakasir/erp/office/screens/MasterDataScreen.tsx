"use client";

import { useState, useTransition } from "react";
import { useOffice } from "../store";

// ── Data set definitions ──────────────────────────────────────────

type DataSetKey = "CUSTOMERS" | "VENDORS" | "RAW_MATERIALS" | "CATEGORY_RAW" | "VARIANT_GROUPS" | "MENU_ITEMS" | "CATEGORY_MENU";

interface DataSet {
  key: DataSetKey;
  icon: () => JSX.Element;
  labelId: string;
  labelEn: string;
  countKey: "customers" | "vendors" | "rawMaterials" | "categoryRaw" | "variantGroups" | "menuItems" | "categoryMenu";
}

const SECTIONS: Array<{
  keyId: string;
  keyEn: string;
  labelId: string;
  labelEn: string;
  sets: DataSet[];
}> = [
  {
    keyId: "pelanggan",
    keyEn: "customers",
    labelId: "Pelanggan",
    labelEn: "Customers",
    sets: [
      { key: "CUSTOMERS", icon: CustomersIcon, labelId: "Pelanggan", labelEn: "Customers", countKey: "customers" },
    ],
  },
  {
    keyId: "pembelian",
    keyEn: "purchasing",
    labelId: "Pembelian",
    labelEn: "Purchasing",
    sets: [
      { key: "VENDORS",       icon: VendorsIcon,      labelId: "Vendor",              labelEn: "Vendors",                 countKey: "vendors" },
      { key: "RAW_MATERIALS", icon: RawMaterialsIcon, labelId: "Bahan Baku",          labelEn: "Raw Materials",           countKey: "rawMaterials" },
      { key: "CATEGORY_RAW",  icon: CategoryIcon,     labelId: "Kategori Bahan Baku", labelEn: "Raw Material Categories", countKey: "categoryRaw" },
    ],
  },
  {
    keyId: "produk",
    keyEn: "products",
    labelId: "Produk",
    labelEn: "Products",
    sets: [
      { key: "MENU_ITEMS",    icon: MenuItemsIcon, labelId: "Produk Menu",   labelEn: "Menu Items",      countKey: "menuItems" },
      { key: "CATEGORY_MENU", icon: CategoryIcon,  labelId: "Kategori Menu", labelEn: "Menu Categories", countKey: "categoryMenu" },
      { key: "VARIANT_GROUPS",icon: VariantIcon,   labelId: "Preset Varian", labelEn: "Variant Presets", countKey: "variantGroups" },
    ],
  },
];

// ── Confirm dialog ────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, confirmLabel, onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="erp-overlay" onClick={onCancel}>
      <div className="erp-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div className="erp-dialog-header">
          <h3>{title}</h3>
          <button className="erp-icon-btn" onClick={onCancel}>✕</button>
        </div>
        <div className="erp-dialog-body">
          <p style={{ margin: 0, fontSize: 14, color: "var(--erp-ink-secondary)" }}>{message}</p>
        </div>
        <div className="erp-dialog-footer">
          <button className="erp-btn erp-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="erp-btn erp-btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────

export default function OfficeMasterDataScreen() {
  const { state, dispatch, locale } = useOffice();
  const isId = locale === "id";

  const [pendingKey, setPendingKey] = useState<string | null>(null); // "VENDORS::branchId"
  const [, startTransition] = useTransition();
  const [confirmUnlink, setConfirmUnlink] = useState<{ dataType: string; branchId: string; branchName: string } | null>(null);

  const primaryBranch = state.branches.find((b) => b.is_primary) || state.branches[0];
  const nonPrimaryBranches = state.branches.filter((b) => b.id !== primaryBranch?.id);

  function isLinked(dataType: string, branchId: string): boolean {
    return state.masterDataLinks.some(
      (l) => l.data_type === dataType && l.target_tenant_id === branchId
    );
  }

  function handleToggle(dataType: string, branchId: string, branchName: string) {
    if (isLinked(dataType, branchId)) {
      // Confirm before unlinking
      setConfirmUnlink({ dataType, branchId, branchName });
    } else {
      doLink(dataType, branchId);
    }
  }

  function doLink(dataType: string, branchId: string) {
    const key = `${dataType}::${branchId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        const res = await fetch("/api/office/master-data-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "LINK", targetTenantId: branchId, dataType }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unknown error");

        dispatch({
          type: "UPSERT_MASTER_DATA_LINK",
          payload: {
            id: crypto.randomUUID(),
            organization_id: state.organization?.id ?? "",
            target_tenant_id: branchId,
            data_type: dataType,
            linked_at: Date.now(),
          },
        });
      } catch (e) {
        console.error("Link failed:", e);
      } finally {
        setPendingKey(null);
      }
    });
  }

  function doUnlink(dataType: string, branchId: string) {
    setConfirmUnlink(null);
    const key = `${dataType}::${branchId}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        const res = await fetch("/api/office/master-data-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "UNLINK", targetTenantId: branchId, dataType }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Unknown error");

        dispatch({
          type: "DELETE_MASTER_DATA_LINK",
          targetTenantId: branchId,
          dataType,
        });
      } catch (e) {
        console.error("Unlink failed:", e);
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <div>
          <h1 className="erp-screen-title">{isId ? "DATA MASTER" : "MASTER DATA"}</h1>
          <p className="erp-screen-subtitle">
            {isId
              ? `Kelola data yang dibagikan dari ${primaryBranch?.branch_name || primaryBranch?.name || "—"} ke cabang lain`
              : `Manage data shared from ${primaryBranch?.branch_name || primaryBranch?.name || "—"} to other branches`}
          </p>
        </div>
      </div>

      {nonPrimaryBranches.length === 0 ? (
        <div className="erp-card" style={{ marginTop: 20, padding: 32, textAlign: "center" }}>
          <p className="erp-empty">
            {isId ? "Belum ada cabang lain. Tambah cabang terlebih dahulu." : "No other branches yet. Add a branch first."}
          </p>
        </div>
      ) : (
        <div className="office-md-sections">
          {SECTIONS.map((section) => (
            <div key={section.keyId} className="office-md-section">
              <h2 className="office-md-section-title">
                {isId ? section.labelId : section.labelEn}
              </h2>
              <div className="office-md-grid">
                {section.sets.map(({ key, icon: Icon, labelId, labelEn, countKey }) => {
                  const count = state.primaryDataCounts[countKey];
                  const label = isId ? labelId : labelEn;

                  return (
                    <div key={key} className="office-md-card">
                      <div className="office-md-card-header">
                        <div className="office-md-card-icon">
                          <Icon />
                        </div>
                        <div>
                          <div className="office-md-card-title">{label}</div>
                          <div className="office-md-card-count">
                            {count} {isId ? "data" : count === 1 ? "record" : "records"}
                          </div>
                        </div>
                      </div>

                      <div className="office-md-branch-list">
                        {nonPrimaryBranches.map((branch) => {
                          const linked = isLinked(key, branch.id);
                          const isPending = pendingKey === `${key}::${branch.id}`;
                          const branchName = branch.branch_name || branch.name;

                          return (
                            <div key={branch.id} className="office-md-branch-row">
                              <span className="office-md-branch-name">{branchName}</span>
                              <button
                                className={`office-md-toggle${linked ? " office-md-toggle--on" : ""}`}
                                disabled={isPending}
                                onClick={() => handleToggle(key, branch.id, branchName)}
                                title={linked
                                  ? isId ? "Putuskan tautan" : "Unlink"
                                  : isId ? "Tautkan" : "Link"
                                }
                              >
                                {isPending ? (
                                  <span className="office-md-toggle-spinner" />
                                ) : (
                                  <span className="office-md-toggle-knob" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmUnlink !== null}
        title={isId ? "Putuskan Tautan?" : "Unlink Data?"}
        message={
          confirmUnlink
            ? isId
              ? `Data yang sesuai di ${confirmUnlink.branchName} akan dihapus. Data yang dibuat manual di cabang tersebut tidak terpengaruh.`
              : `Matching data at ${confirmUnlink.branchName} will be removed. Manually created data at that branch is not affected.`
            : ""
        }
        confirmLabel={isId ? "Putuskan" : "Unlink"}
        onConfirm={() => confirmUnlink && doUnlink(confirmUnlink.dataType, confirmUnlink.branchId)}
        onCancel={() => setConfirmUnlink(null)}
      />
    </div>
  );
}

// ── Icons (SVG, no emoji) ─────────────────────────────────────────

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

function VendorsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function RawMaterialsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  );
}

function VariantIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function MenuItemsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
