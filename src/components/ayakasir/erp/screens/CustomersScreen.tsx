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

/** Parse YYYY-MM-DD as local midnight to avoid UTC-shift off-by-one-day. */
function parseDateLocal(str: string): number | null {
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  const ts = new Date(y, m - 1, d).getTime();
  return isNaN(ts) ? null : ts;
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

  // ── Pagination ─────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);

  // ── Bulk select ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // ── Delete confirm ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ type: "customer" | "category"; id: string; name: string; customerCount?: number } | null>(null);

  // ── CSV import ─────────────────────────────────────────────
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  type ImportRow = {
    name: string;
    phone: string | null;
    email: string | null;
    birthday: number | null;
    birthdayDisplay: string;
    gender: Gender | null;
    categoryName: string;
    categoryIsNew: boolean;
    notes: string | null;
    phoneIsDuplicate: boolean;
  };
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [importSaving, setImportSaving] = useState(false);

  // ── Derived data ───────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    let list = [...state.customers];
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
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [state.customers, selectedCategoryId, search]);

  const pagedCustomers = useMemo(() => {
    const start = page * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

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
    const phoneVal = formPhone.trim() || null;
    if (phoneVal) {
      const normNew = phoneVal.replace(/\s/g, "");
      const dup = state.customers.find(
        (c) => c.id !== editingCustomer?.id && c.phone?.replace(/\s/g, "") === normNew
      );
      if (dup) { setFormError(copy.customers.duplicatePhone); return; }
    }
    setFormLoading(true);
    setFormError("");
    try {
      const email = formEmail.trim().toLowerCase() || null;
      const birthday = formBirthday ? parseDateLocal(formBirthday) : null;
      const gender = formGender || null;
      const category_id = formCategoryId || null;
      const notes = formNotes.trim() || null;
      const phone = phoneVal;

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
  async function handleConfirmDelete(includeCustomers?: boolean) {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "customer") {
        await deleteCustomer(supabase, deleteTarget.id);
        dispatch({ type: "DELETE", table: "customers", id: deleteTarget.id });
        if (detailCustomer?.id === deleteTarget.id) setDetailCustomer(null);
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(deleteTarget.id); return s; });
      } else {
        // Category delete: handle customers under it
        const underCategory = state.customers.filter((c) => c.category_id === deleteTarget.id);
        if (includeCustomers) {
          for (const c of underCategory) {
            await deleteCustomer(supabase, c.id);
            dispatch({ type: "DELETE", table: "customers", id: c.id });
            if (detailCustomer?.id === c.id) setDetailCustomer(null);
          }
          setSelectedIds((prev) => {
            const s = new Set(prev);
            underCategory.forEach((c) => s.delete(c.id));
            return s;
          });
        } else {
          // Keep customers but strip their category_id
          for (const c of underCategory) {
            const updated = await updateCustomer(supabase, c.id, { category_id: null });
            dispatch({ type: "UPSERT", table: "customers", payload: updated as unknown as Record<string, unknown> });
          }
        }
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

  // ── Bulk delete handler ────────────────────────────────────
  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteCustomer(supabase, id);
        dispatch({ type: "DELETE", table: "customers", id });
        if (detailCustomer?.id === id) setDetailCustomer(null);
      }
      setSelectedIds(new Set());
    } catch (e) {
      alert(e instanceof Error ? e.message : copy.common.error);
    } finally {
      setBulkDeleting(false);
      setShowBulkConfirm(false);
    }
  }

  // ── CSV helpers ────────────────────────────────────────────

  /** Parse a single CSV line into an array of field strings.
   *  Handles quoted fields (including embedded commas and escaped quotes ""). */
  function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let i = 0;
    while (i <= line.length) {
      if (line[i] === '"') {
        // Quoted field
        let field = "";
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { field += line[i++]; }
        }
        fields.push(field.trim());
        if (line[i] === ",") i++; // skip comma
      } else {
        // Unquoted field — read until next comma
        const end = line.indexOf(",", i);
        if (end === -1) { fields.push(line.slice(i).trim()); break; }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return fields;
  }

  // ── CSV template download ──────────────────────────────────
  function handleDownloadTemplate() {
    const headers = ["name", "phone", "email", "birthday", "gender", "category", "notes"];
    const example = ["Budi Santoso", "08123456789", "budi@email.com", "1990-05-20", "MALE", "Member Gold", ""];
    const csv = "\uFEFF" + headers.join(",") + "\n" + example.map((v) => `"${v}"`).join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ayakasir_customers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Step 1: parse file → show preview ─────────────────────
  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportLoading(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const content = text.startsWith("\uFEFF") ? text.slice(1) : text;
      const lines = content.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error(copy.customers.importError);

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const idx = (key: string) => headers.indexOf(key);

      const catByName = new Map<string, string>();
      for (const cat of state.customerCategories) {
        catByName.set(cat.name.toLowerCase(), cat.id);
      }

      // Existing phones for duplicate detection (normalised)
      const existingPhones = new Set(
        state.customers.map((c) => c.phone?.replace(/\s/g, "") ?? "").filter(Boolean)
      );

      const rows: ImportRow[] = [];
      const batchPhones = new Set<string>(); // track duplicates within the CSV itself
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const name = idx("name") >= 0 ? cols[idx("name")] ?? "" : "";
        if (!name) continue;

        const rawPhone = idx("phone") >= 0 ? cols[idx("phone")] || null : null;
        const phone = rawPhone && rawPhone.startsWith("8") ? "0" + rawPhone : rawPhone;
        const normPhone = phone?.replace(/\s/g, "") ?? "";
        const phoneIsDuplicate = !!normPhone && (existingPhones.has(normPhone) || batchPhones.has(normPhone));
        if (normPhone) batchPhones.add(normPhone);

        const email = idx("email") >= 0 ? cols[idx("email")] || null : null;
        const birthdayStr = idx("birthday") >= 0 ? cols[idx("birthday")] ?? "" : "";
        const birthday = birthdayStr ? parseDateLocal(birthdayStr) : null;
        const genderRaw = (idx("gender") >= 0 ? cols[idx("gender")] ?? "" : "").toUpperCase();
        const gender = (["MALE", "FEMALE", "OTHER"] as const).includes(genderRaw as "MALE") ? genderRaw as Gender : null;
        const categoryName = idx("category") >= 0 ? cols[idx("category")] ?? "" : "";
        const categoryIsNew = !!categoryName && !catByName.has(categoryName.toLowerCase());
        const notes = idx("notes") >= 0 ? cols[idx("notes")] || null : null;

        rows.push({ name, phone, email, birthday, birthdayDisplay: birthdayStr, gender, categoryName, categoryIsNew, notes, phoneIsDuplicate });
      }

      if (rows.length === 0) throw new Error(copy.customers.importError);
      setImportPreview(rows);
    } catch (err) {
      setImportMsg({ text: err instanceof Error ? err.message : copy.customers.importError, ok: false });
    } finally {
      setImportLoading(false);
    }
  }

  // ── Step 2: user confirms preview → save to Supabase ──────
  async function handleConfirmImport() {
    if (!importPreview) return;
    setImportSaving(true);
    try {
      // Build live category map (may have been updated since parse)
      const catByName = new Map<string, string>();
      for (const cat of state.customerCategories) {
        catByName.set(cat.name.toLowerCase(), cat.id);
      }

      let imported = 0;
      let skippedDup = 0;
      for (const row of importPreview) {
        if (row.phoneIsDuplicate) { skippedDup++; continue; }
        // Create missing category on the fly
        let category_id: string | null = null;
        if (row.categoryName) {
          const existing = catByName.get(row.categoryName.toLowerCase());
          if (existing) {
            category_id = existing;
          } else {
            const newCat = await createCustomerCategory(supabase, tenantId, row.categoryName, genId());
            dispatch({ type: "UPSERT", table: "customerCategories", payload: newCat as unknown as Record<string, unknown> });
            catByName.set(row.categoryName.toLowerCase(), newCat.id);
            category_id = newCat.id;
          }
        }

        const created = await createCustomer(supabase, {
          id: genId(), tenant_id: tenantId,
          name: row.name, phone: row.phone, email: row.email,
          birthday: row.birthday, gender: row.gender, category_id, notes: row.notes,
        });
        dispatch({ type: "UPSERT", table: "customers", payload: created as unknown as Record<string, unknown> });
        imported++;
      }

      setImportPreview(null);
      setImportMsg({
        text: `${copy.customers.importSuccess} (${imported})${skippedDup ? ` — ${skippedDup} ${copy.customers.importDuplicatePhone}` : ""}`,
        ok: true,
      });
    } catch (err) {
      setImportMsg({ text: err instanceof Error ? err.message : copy.customers.importError, ok: false });
    } finally {
      setImportSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div>
      <div className="erp-page-header">
        <h1 className="erp-page-title">{copy.customers.title}</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={handleDownloadTemplate}>
            ↓ {copy.customers.downloadTemplate}
          </button>
          <label className={`erp-btn erp-btn--ghost erp-btn--sm${importLoading ? " erp-btn--disabled" : ""}`} style={{ cursor: importLoading ? "default" : "pointer", margin: 0 }}>
            {importLoading ? copy.common.loading : `↑ ${copy.customers.importCsv}`}
            <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportCsv} disabled={importLoading} />
          </label>
          <button className="erp-btn erp-btn--primary erp-btn--sm" onClick={openAddCustomer}>
            + {copy.customers.addCustomer}
          </button>
        </div>
      </div>
      {importMsg && (
        <div className={`erp-import-msg${importMsg.ok ? " erp-import-msg--ok" : " erp-import-msg--err"}`}>
          {importMsg.text}
          <button className="erp-btn erp-btn--ghost erp-btn--sm erp-btn--icon" onClick={() => setImportMsg(null)} style={{ marginLeft: 8 }}>✕</button>
        </div>
      )}

      {/* Category filter chips */}
      <div className="erp-filter-bar" style={{ marginBottom: 12 }}>
        <span
          className={`erp-chip${selectedCategoryId === null ? " erp-chip--active" : ""}`}
          onClick={() => { setSelectedCategoryId(null); setPage(0); setSelectedIds(new Set()); }}
        >
          {copy.customers.allCategories}
        </span>
        {state.customerCategories.map((cat) => (
          <span
            key={cat.id}
            className={`erp-chip${selectedCategoryId === cat.id ? " erp-chip--active" : ""}`}
            onClick={() => { setSelectedCategoryId(cat.id); setPage(0); setSelectedIds(new Set()); }}
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
              onChange={(e) => { setSearch(e.target.value); setPage(0); setSelectedIds(new Set()); }}
            />
          </div>

          {/* Bulk action bar */}
          {isOwner && selectedIds.size > 0 && (
            <div className="erp-bulk-bar">
              <span style={{ fontSize: 13 }}>{selectedIds.size} {copy.common.selected}</span>
              <button className="erp-btn erp-btn--danger erp-btn--sm" onClick={() => setShowBulkConfirm(true)}>
                {copy.customers.bulkDelete}
              </button>
            </div>
          )}

          <div className="erp-table-wrap">
            <table className="erp-table">
              <thead>
                <tr>
                  {isOwner && (
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={pagedCustomers.length > 0 && pagedCustomers.every((c) => selectedIds.has(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds((prev) => { const s = new Set(prev); pagedCustomers.forEach((c) => s.add(c.id)); return s; });
                          } else {
                            setSelectedIds((prev) => { const s = new Set(prev); pagedCustomers.forEach((c) => s.delete(c.id)); return s; });
                          }
                        }}
                      />
                    </th>
                  )}
                  <th>{copy.customers.name}</th>
                  <th>{copy.customers.phone}</th>
                  <th>{copy.customers.category}</th>
                  <th>{copy.customers.transactions}</th>
                  <th>{copy.customers.totalSpent}</th>
                  <th style={{ textAlign: "right" }}>{copy.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {pagedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={isOwner ? 7 : 6}>
                      <div className="erp-empty">
                        <p>{copy.customers.noCustomers}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedCustomers.map((c) => {
                    const stats = customerStats.get(c.id);
                    const isDetailSelected = detailCustomer?.id === c.id;
                    const isChecked = selectedIds.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`erp-customers-row${isDetailSelected ? " erp-customers-row--active" : ""}`}
                        onClick={() => setDetailCustomer(isDetailSelected ? null : c)}
                        style={{ cursor: "pointer" }}
                      >
                        {isOwner && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSelectedIds((prev) => {
                                  const s = new Set(prev);
                                  e.target.checked ? s.add(c.id) : s.delete(c.id);
                                  return s;
                                });
                              }}
                            />
                          </td>
                        )}
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

          {/* Pagination */}
          <div className="erp-table-pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--erp-ink-secondary)" }}>
              <span>{copy.customers.rowsPerPage}:</span>
              {([10, 25, 50] as const).map((n) => (
                <span
                  key={n}
                  className={`erp-chip${pageSize === n ? " erp-chip--active" : ""}`}
                  style={{ padding: "2px 10px", fontSize: 12 }}
                  onClick={() => { setPageSize(n); setPage(0); setSelectedIds(new Set()); }}
                >
                  {n}
                </span>
              ))}
              <span style={{ marginLeft: 8 }}>
                {filteredCustomers.length > 0
                  ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filteredCustomers.length)} / ${filteredCustomers.length}`
                  : "0"}
              </span>
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: 4 }}>
                <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
                <button className="erp-btn erp-btn--ghost erp-btn--sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>›</button>
              </div>
            )}
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
                              onClick={() => setDeleteTarget({
                                type: "category", id: cat.id, name: cat.name,
                                customerCount: state.customers.filter((c) => c.category_id === cat.id).length,
                              })}
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

      {/* ── Bulk delete confirm dialog ───────────────────────── */}
      {showBulkConfirm && (
        <div className="erp-overlay" onClick={() => !bulkDeleting && setShowBulkConfirm(false)}>
          <div className="erp-dialog erp-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.customers.bulkDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setShowBulkConfirm(false)} disabled={bulkDeleting}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              <p style={{ margin: 0 }}>{copy.customers.bulkDeleteConfirm}</p>
              <p style={{ fontWeight: 600, marginTop: 8, marginBottom: 0 }}>{selectedIds.size} {copy.common.selected}</p>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setShowBulkConfirm(false)} disabled={bulkDeleting}>{copy.common.cancel}</button>
              <button className="erp-btn erp-btn--danger" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? copy.common.loading : copy.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV import preview dialog ────────────────────────── */}
      {importPreview && (
        <div className="erp-overlay" onClick={() => !importSaving && setImportPreview(null)}>
          <div className="erp-dialog erp-dialog--wide" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>{copy.customers.importPreviewTitle} ({importPreview.length})</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setImportPreview(null)} disabled={importSaving}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body" style={{ padding: 0 }}>
              <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", padding: "12px 16px 0", margin: 0 }}>
                {copy.customers.importPreviewHint}
              </p>
              <div className="erp-table-wrap" style={{ maxHeight: 360, overflowY: "auto" }}>
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>{copy.customers.name}</th>
                      <th>{copy.customers.phone}</th>
                      <th>{copy.customers.email}</th>
                      <th>{copy.customers.birthday}</th>
                      <th>{copy.customers.gender}</th>
                      <th>{copy.customers.category}</th>
                      <th>{copy.customers.notes}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500, opacity: row.phoneIsDuplicate ? 0.45 : 1 }}>{row.name}</td>
                        <td>
                          {row.phone || "—"}
                          {row.phoneIsDuplicate && (
                            <span className="erp-badge erp-badge--danger" style={{ marginLeft: 4, fontSize: 10 }}>
                              {copy.customers.importDuplicatePhone}
                            </span>
                          )}
                        </td>
                        <td>{row.email || "—"}</td>
                        <td>{row.birthdayDisplay || "—"}</td>
                        <td>{row.gender || "—"}</td>
                        <td>
                          {row.categoryName ? (
                            <>
                              {row.categoryName}
                              {row.categoryIsNew && (
                                <span className="erp-badge erp-badge--warning" style={{ marginLeft: 4, fontSize: 10 }}>
                                  {copy.customers.importNewCategory}
                                </span>
                              )}
                            </>
                          ) : "—"}
                        </td>
                        <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--secondary" onClick={() => setImportPreview(null)} disabled={importSaving}>
                {copy.common.cancel}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleConfirmImport} disabled={importSaving}>
                {importSaving ? copy.common.loading : `${copy.customers.importConfirm} (${importPreview.filter((r) => !r.phoneIsDuplicate).length})`}
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
              <h3>{deleteTarget.type === "category" ? copy.customers.deleteCategoryTitle : copy.common.confirmDelete}</h3>
              <button className="erp-btn erp-btn--ghost erp-btn--sm" onClick={() => setDeleteTarget(null)}>
                {copy.common.close}
              </button>
            </div>
            <div className="erp-dialog-body">
              {deleteTarget.type === "category" ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>{deleteTarget.name}</p>
                  {(deleteTarget.customerCount ?? 0) > 0 && (
                    <p style={{ fontSize: 13, color: "var(--erp-ink-secondary)", marginBottom: 16 }}>
                      {deleteTarget.customerCount} {copy.customers.deleteCategoryCustomerCount}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(deleteTarget.customerCount ?? 0) > 0 && (
                      <button className="erp-btn erp-btn--danger" onClick={() => handleConfirmDelete(true)}>
                        {copy.customers.deleteCategoryWithCustomers}
                      </button>
                    )}
                    <button className="erp-btn erp-btn--secondary" onClick={() => handleConfirmDelete(false)}>
                      {copy.customers.deleteCategoryKeepCustomers}
                    </button>
                    <button className="erp-btn erp-btn--ghost" onClick={() => setDeleteTarget(null)}>
                      {copy.common.cancel}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ marginBottom: 8 }}>{copy.common.deleteWarning}</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{deleteTarget.name}</p>
                </>
              )}
            </div>
            {deleteTarget.type === "customer" && (
              <div className="erp-dialog-footer">
                <button className="erp-btn erp-btn--secondary" onClick={() => setDeleteTarget(null)}>{copy.common.cancel}</button>
                <button className="erp-btn erp-btn--danger" onClick={() => handleConfirmDelete()}>{copy.common.delete}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
