"use client";

import { useMemo, useState } from "react";
import { useErp } from "../store";
import { getErpCopy } from "../i18n";
import { formatRupiah, formatDateTime } from "../utils";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
} from "@/lib/supabase/repositories";
import type { DbCustomer, DbCustomerCategory } from "@/lib/supabase/types";

// ── Helpers ────────────────────────────────────────────────────

function genId() {
  return crypto.randomUUID();
}

type Gender = "MALE" | "FEMALE" | "OTHER";

function genderLabel(gender: string | null, copy: ReturnType<typeof getErpCopy>): string {
  if (gender === "MALE") return copy.customers.genderMale;
  if (gender === "FEMALE") return copy.customers.genderFemale;
  if (gender === "OTHER") return copy.customers.genderOther;
  return "—";
}

function formatBirthday(ts: number | null, locale: string): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Main Component ─────────────────────────────────────────────

export default function CustomersScreen() {
  const { state, dispatch, supabase, tenantId, locale } = useErp();
  const copy = getErpCopy(locale);
  const isOwner = state.user?.role === "OWNER";

  // ── Filters ────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // ── Detail panel ───────────────────────────────────────────
  const [detailCustomer, setDetailCustomer] = useState<DbCustomer | null>(null);

  // ── Customer form ──────────────────────────────────────────
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<DbCustomer | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formBirthday, setFormBirthday] = useState("");
  const [formGender, setFormGender] = useState<Gender | "">("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // ── Category form ──────────────────────────────────────────
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCustomerCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  // ── Delete confirm ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ type: "customer" | "category"; id: string; name: string } | null>(null);

  // ── Derived data ───────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    let list = state.customers;
    if (selectedCategoryId) {
      list = list.filter((c) => c.category_id === selectedCategoryId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      );
    }
    return list;
  }, [state.customers, selectedCategoryId, search]);

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const cat of state.customerCategories) m.set(cat.id, cat.name);
    return m;
  }, [state.customerCategories]);

  const customerStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    for (const tx of state.transactions) {
      if (!tx.customer_id || tx.status !== "COMPLETED") continue;
      const s = stats.get(tx.customer_id) || { count: 0, total: 0 };
      s.count += 1;
      s.total += tx.total;
      stats.set(tx.customer_id, s);
    }
    return stats;
  }, [state.transactions]);

  const detailTransactions = useMemo(() => {
    if (!detailCustomer) return [];
    return state.transactions
      .filter((tx) => tx.customer_id === detailCustomer.id && tx.status === "COMPLETED")
      .sort((a, b) => b.date - a.date);
  }, [state.transactions, detailCustomer]);

  // ── Customer form handlers ─────────────────────────────────
  function openAddCustomer() {
    setEditingCustomer(null);
    setFormName(""); setFormPhone(""); setFormEmail("");
    setFormBirthday(""); setFormGender(""); setFormCategoryId("");
    setFormNotes(""); setFormError("");
    setShowCustomerForm(true);
  }

  function openEditCustomer(c: DbCustomer) {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || "");
    setFormEmail(c.email || "");
    setFormBirthday(c.birthday ? new Date(c.birthday).toISOString().split("T")[0] : "");
    setFormGender((c.gender as Gender | null) || "");
    setFormCategoryId(c.category_id || "");
    setFormNotes(c.notes || "");
    setFormError("");
    setShowCustomerForm(true);
  }

  async function handleSaveCustomer() {
    if (!formName.trim()) {
      setFormError(locale === "id" ? "Nama pelanggan wajib diisi." : "Customer name is required.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const email = formEmail.trim().toLowerCase() || null;
      const birthday = formBirthday ? new Date(formBirthday).getTime() : null;
      const gender = formGender || null;
      const category_id = formCategoryId || null;
      const notes = formNotes.trim() || null;
      const phone = formPhone.trim() || null;

      if (editingCustomer) {
        const updated = await updateCustomer(supabase, editingCustomer.id, {
          name: formName.trim(), phone, email, birthday, gender, category_id, notes,
        });
        dispatch({ type: "UPSERT", table: "customers", payload: updated as unknown as Record<string, unknown> });
        if (detailCustomer?.id === editingCustomer.id) setDetailCustomer(updated);
      } else {
        const created = await createCustomer(supabase, {
          id: genId(), tenant_id: tenantId,
          name: formName.trim(), phone, email, birthday, gender, category_id, notes,
        });
        dispatch({ type: "UPSERT", table: "customers", payload: created as unknown as Record<string, unknown> });
      }
      setShowCustomerForm(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : copy.common.error);
    } finally {
      setFormLoading(false);
    }
  }

  // ── Category form handlers ─────────────────────────────────
  function openAddCategory() {
    setEditingCategory(null);
    setCatName(""); setCatError("");
    setShowCategoryForm(true);
  }

  function openEditCategory(cat: DbCustomerCategory) {
    setEditingCategory(cat);
    setCatName(cat.name); setCatError("");
    setShowCategoryForm(true);
  }

  async function handleSaveCategory() {
    if (!catName.trim()) {
      setCatError(locale === "id" ? "Nama kategori wajib diisi." : "Category name is required.");
      return;
    }
    const duplicate = state.customerCategories.some(
      (c) => c.name.toLowerCase() === catName.trim().toLowerCase() && c.id !== editingCategory?.id
    );
    if (duplicate) { setCatError(copy.customers.duplicateCategory); return; }
    setCatLoading(true);
    setCatError("");
    try {
      if (editingCategory) {
        const updated = await updateCustomerCategory(supabase, editingCategory.id, catName.trim());
        dispatch({ type: "UPSERT", table: "customerCategories", payload: updated as unknown as Record<string, unknown> });
      } else {
        const created = await createCustomerCategory(supabase, tenantId, catName.trim(), genId());
        dispatch({ type: "UPSERT", table: "customerCategories", payload: created as unknown as Record<string, unknown> });
      }
      setShowCategoryForm(false);
    } catch (e) {
      setCatError(e instanceof Error ? e.message : copy.common.error);
    } finally {
      setCatLoading(false);
    }
  }

  // ── Delete handlers ────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "customer") {
        await deleteCustomer(supabase, deleteTarget.id);
        dispatch({ type: "DELETE", table: "customers", id: deleteTarget.id });
        if (detailCustomer?.id === deleteTarget.id) setDetailCustomer(null);
      } else {
        await deleteCustomerCategory(supabase, deleteTarget.id);
        dispatch({ type: "DELETE", table: "customerCategories", id: deleteTarget.id });
        if (selectedCategoryId === deleteTarget.id) setSelectedCategoryId(null);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : copy.common.error);
    } finally {
      setDeleteTarget(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.customers.title}</h1>
        <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openAddCustomer}>
          + {copy.customers.addCustomer}
        </button>
      </div>

      {/* Category filter chips */}
      <div className="erp-filter-bar" style={{ marginBottom: 12 }}>
        <span
          className={`erp-chip${selectedCategoryId === null ? " erp-chip--active" : ""}`}
          onClick={() => setSelectedCategoryId(null)}
        >
          {copy.customers.allCategories}
        </span>
        {state.customerCategories.map((cat) => (
          <span
            key={cat.id}
            className={`erp-chip${selectedCategoryId === cat.id ? " erp-chip--active" : ""}`}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </span>
        ))}
      </div>

      <div className="erp-customers-layout">
        {/* ── Left: search + customer table ── */}
        <div className="erp-customers-main">
          <div className="erp-search" style={{ marginBottom: 12 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={copy.customers.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>{copy.customers.name}</th>
                  <th>{copy.customers.phone}</th>
                  <th>{copy.customers.category}</th>
                  <th>{copy.customers.transactions}</th>
                  <th>{copy.customers.totalSpent}</th>
                  <th style={{ textAlign: "right" }}>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="erp-empty">
                        <p>{copy.customers.noCustomers}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const stats = customerStats.get(c.id);
                    const isSelected = detailCustomer?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={`erp-customers-row${isSelected ? " erp-customers-row--active" : ""}`}
                        onClick={() => setDetailCustomer(isSelected ? null : c)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          {c.notes && (
                            <div style={{ fontSize: 12, color: "var(--erp-muted)", marginTop: 2, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ color: "var(--erp-ink-secondary)" }}>{c.phone || "—"}</td>
                        <td>
                          {c.category_id && categoryMap.has(c.category_id) ? (
                            <span className="erp-badge erp-badge--info">{categoryMap.get(c.category_id)}</span>
                          ) : (
                            <span style={{ color: "var(--erp-muted)" }}>—</span>
                          )}
                        </td>
                        <td>{stats?.count ?? 0}</td>
                        <td>{stats ? formatRupiah(stats.total) : "—"}</td>
                        <td className="erp-td-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditCustomer(c)}>
                            {copy.common.edit}
                          </button>
                          {isOwner && (
                            <button
                              className="erp-btn erp-btn--danger erp-btn--sm"
                              style={{ marginLeft: 4 }}
                              onClick={() => setDeleteTarget({ type: "customer", id: c.id, name: c.name })}
                            >
                              {copy.common.delete}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="erp-customers-side">
          {detailCustomer ? (
            /* Customer detail */
            <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="erp-customers-detail-header">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{detailCustomer.name}</div>
                  {detailCustomer.category_id && categoryMap.has(detailCustomer.category_id) && (
                    <span className="erp-badge erp-badge--info">{categoryMap.get(detailCustomer.category_id)}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditCustomer(detailCustomer)}>
                    {copy.common.edit}
                  </button>
                  <button className="erp-btn erp-btn--ghost erp-btn--sm erp-btn--icon" onClick={() => setDetailCustomer(null)} title={copy.common.close}>
                    ✕
                  </button>
                </div>
              </div>

              <div className="erp-customers-detail-body">
                {/* Contact info */}
                <div className="erp-customers-info-list">
                  {[
                    { label: copy.customers.phone, value: detailCustomer.phone || "—" },
                    { label: copy.customers.email, value: detailCustomer.email || "—" },
                    { label: copy.customers.birthday, value: formatBirthday(detailCustomer.birthday, locale) },
                    { label: copy.customers.gender, value: genderLabel(detailCustomer.gender, copy) },
                    ...(detailCustomer.notes ? [{ label: copy.customers.notes, value: detailCustomer.notes }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="erp-customers-info-row">
                      <span className="erp-customers-info-label">{label}</span>
                      <span style={{ fontSize: 14, color: "var(--erp-ink)" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                {(() => {
                  const s = customerStats.get(detailCustomer.id);
                  if (!s) return null;
                  return (
                    <div className="erp-stats-grid erp-stats-grid--2" style={{ margin: 0 }}>
                      <div className="erp-card erp-card--stat">
                        <div className="erp-card-label">{copy.customers.transactions}</div>
                        <div className="erp-card-value">{s.count}</div>
                      </div>
                      <div className="erp-card erp-card--stat">
                        <div className="erp-card-label">{copy.customers.totalSpent}</div>
                        <div className="erp-card-value" style={{ fontSize: 16 }}>{formatRupiah(s.total)}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Transaction history */}
                <div>
                  <div className="erp-customers-section-title">{copy.customers.transactionHistory}</div>
                  {detailTransactions.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--erp-muted)", margin: 0 }}>{copy.common.noData}</p>
                  ) : (
                    <div className="erp-customers-tx-list">
                      {detailTransactions.map((tx) => (
                        <div key={tx.id} className="erp-customers-tx-row">
                          <div>
                            <div style={{ fontSize: 12, color: "var(--erp-muted)" }}>{formatDateTime(tx.date, locale)}</div>
                            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                              <span className="erp-badge erp-badge--info" style={{ fontSize: 11 }}>{tx.payment_method}</span>
                              {tx.debt_status === "UNPAID" && (
                                <span className="erp-badge erp-badge--warning" style={{ fontSize: 11 }}>UNPAID</span>
                              )}
                              {tx.debt_status === "SETTLED" && (
                                <span className="erp-badge erp-badge--success" style={{ fontSize: 11 }}>SETTLED</span>
                              )}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{formatRupiah(tx.total)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Category management */
            <div className="erp-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="erp-customers-detail-header">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{copy.customers.categories}</span>
                {isOwner && (
                  <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openAddCategory}>
                    + {copy.customers.addCategory}
                  </button>
                )}
              </div>
              <div className="erp-customers-detail-body">
                {state.customerCategories.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--erp-muted)", margin: 0 }}>{copy.customers.noCategories}</p>
                ) : (
                  <div className="erp-customers-cat-list">
                    {state.customerCategories.map((cat) => (
                      <div key={cat.id} className="erp-customers-cat-row">
                        <span style={{ fontSize: 14 }}>{cat.name}</span>
                        {isOwner && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => openEditCategory(cat)}>
                              {copy.common.edit}
                            </button>
                            <button
                              className="erp-btn erp-btn--danger erp-btn--sm"
                              onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })}
                            >
                              {copy.common.delete}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Customer form dialog ─────────────────────────────── */}
      {showCustomerForm && (
        <div className="erp-overlay" onClick={() => setShowCustomerForm(false)}>
          <div className="erp-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editingCustomer ? copy.customers.editCustomer : copy.customers.addCustomer}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCustomerForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.name} *</label>
                <input className="erp-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.phone}</label>
                <input className="erp-input" type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.email}</label>
                <input className="erp-input" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.birthday}</label>
                <input className="erp-input" type="date" value={formBirthday} onChange={(e) => setFormBirthday(e.target.value)} />
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.gender}</label>
                <select className="erp-input" value={formGender} onChange={(e) => setFormGender(e.target.value as Gender | "")}>
                  <option value="">{copy.customers.genderNone}</option>
                  <option value="MALE">{copy.customers.genderMale}</option>
                  <option value="FEMALE">{copy.customers.genderFemale}</option>
                  <option value="OTHER">{copy.customers.genderOther}</option>
                </select>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.category}</label>
                <select className="erp-input" value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)}>
                  <option value="">{copy.customers.noCategory}</option>
                  {state.customerCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.notes}</label>
                <textarea className="erp-input" rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
              {formError && <p className="erp-input-hint erp-input-hint--error">{formError}</p>}
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowCustomerForm(false)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveCustomer} disabled={formLoading}>
                {formLoading ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category form dialog ─────────────────────────────── */}
      {showCategoryForm && (
        <div className="erp-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{editingCategory ? copy.customers.editCategory : copy.customers.addCategory}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowCategoryForm(false)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <div className="erp-input-group">
                <label className="erp-label">{copy.customers.categoryName} *</label>
                <input className="erp-input" value={catName} onChange={(e) => setCatName(e.target.value)} />
              </div>
              {catError && <p className="erp-input-hint erp-input-hint--error">{catError}</p>}
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowCategoryForm(false)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--primary" onClick={handleSaveCategory} disabled={catLoading}>
                {catLoading ? copy.common.loading : copy.common.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm dialog ────────────────────────────── */}
      {deleteTarget && (
        <div className="erp-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.common.confirmDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setDeleteTarget(null)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ marginBottom: 8 }}>{copy.common.deleteWarning}</p>
              <p style={{ fontWeight: 600, margin: 0 }}>{deleteTarget.name}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setDeleteTarget(null)}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--danger" onClick={handleConfirmDelete}>{copy.common.delete}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
