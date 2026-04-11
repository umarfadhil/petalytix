"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOffice } from "../store";
import {
  upsertTenantUserAction,
  deleteTenantUserAction,
  verifyOwnerPasswordAction,
} from "@/app/ayakasir/actions/auth";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import type { DbUser, TenantPlan } from "@/lib/supabase/types";

const ALL_FEATURES = [
  "POS", "DASHBOARD", "MENU", "INVENTORY", "PURCHASING", "CUSTOMERS", "SETTINGS",
] as const;
type UserFeature = typeof ALL_FEATURES[number];
const DEFAULT_FEATURES: UserFeature[] = ["POS", "INVENTORY"];

const JOB_TITLES = [
  "Store Manager",
  "Supervisor",
  "Waiter",
  "Kitchen",
  "Cashier",
  "General Staff",
] as const;

function parseFeatures(raw: string | null | undefined): UserFeature[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter((s): s is UserFeature =>
    (ALL_FEATURES as readonly string[]).includes(s)
  );
}

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  password: string;
  pin: string;
  tenantId: string;       // which branch to assign
  featureAccess: UserFeature[];
  isActive: boolean;
}

const EMPTY_FORM: StaffForm = {
  name: "",
  email: "",
  phone: "",
  jobTitle: "",
  password: "",
  pin: "",
  tenantId: "",
  featureAccess: DEFAULT_FEATURES,
  isActive: true,
};

export default function StaffScreen() {
  const { state, dispatch, locale } = useOffice();
  const router = useRouter();
  const isId = locale === "id";

  // Plan limits
  const planExpired =
    state.organization?.plan_expires_at != null &&
    Date.now() > (state.organization.plan_expires_at ?? 0);
  const effectivePlan = planExpired
    ? "PERINTIS"
    : ((state.organization?.plan ?? "PERINTIS") as TenantPlan);
  const limits = getPlanLimits(effectivePlan);
  // maxStaff is per branch (e.g. Tumbuh = 2 per branch)
  const maxStaffPerBranch = limits.maxStaff;

  const branchMap = Object.fromEntries(
    state.branches.map((b) => [b.id, b.branch_name || b.name])
  );

  // Only CASHIER users in the table (OWNER shown separately at bottom)
  const cashiers = state.orgUsers.filter((u) => u.role === "CASHIER");
  const owners = state.orgUsers.filter((u) => u.role === "OWNER");

  // Per-branch staff counts
  const staffPerBranch = Object.fromEntries(
    state.branches.map((b) => [
      b.id,
      cashiers.filter((u) => u.tenant_id === b.id).length,
    ])
  );
  const totalCashiers = cashiers.length;
  const totalBranches = state.branches.length;
  const maxStaffTotal =
    maxStaffPerBranch === Infinity ? Infinity : maxStaffPerBranch * totalBranches;

  // Org-wide limit: maxStaff per branch × number of branches
  // Unassigned staff (null tenant_id) also count toward the total
  const orgStaffTotal = cashiers.length; // all CASHIER users in the org
  const canAddStaff =
    maxStaffTotal === Infinity || orgStaffTotal < maxStaffTotal;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<DbUser | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation state
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const FEATURE_LABELS: Record<UserFeature, { id: string; en: string }> = {
    POS:        { id: "Kasir (POS)",   en: "Cashier (POS)" },
    DASHBOARD:  { id: "Dashboard",     en: "Dashboard" },
    MENU:       { id: "Produk",        en: "Products" },
    INVENTORY:  { id: "Inventori",     en: "Inventory" },
    PURCHASING: { id: "Pembelian",     en: "Purchasing" },
    CUSTOMERS:  { id: "Pelanggan",     en: "Customers" },
    SETTINGS:   { id: "Pengaturan",    en: "Settings" },
  };

  function openAddDialog() {
    if (!canAddStaff) return;
    setEditingUser(null);
    // Pre-select first branch that still has capacity
    const firstAvailable = state.branches.find((b) =>
      maxStaffPerBranch === Infinity || (staffPerBranch[b.id] ?? 0) < maxStaffPerBranch
    );
    setForm({
      ...EMPTY_FORM,
      tenantId: firstAvailable?.id ?? state.branches.find((b) => b.is_primary)?.id ?? state.branches[0]?.id ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(user: DbUser) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email ?? "",
      phone: user.phone ?? "",
      jobTitle: user.job_title || "",
      password: "",
      pin: "",
      tenantId: user.tenant_id ?? (state.branches.find((b) => b.is_primary)?.id ?? ""),
      featureAccess: parseFeatures(user.feature_access).length > 0
        ? parseFeatures(user.feature_access)
        : DEFAULT_FEATURES,
      isActive: user.is_active,
    });
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDeleteStep("idle");
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleDelete() {
    if (!editingUser) return;
    if (!deletePassword) {
      setDeleteError(isId ? "Masukkan password Anda." : "Enter your password.");
      return;
    }
    setDeleting(true);
    setDeleteError("");

    const verify = await verifyOwnerPasswordAction(deletePassword);
    if (!verify.ok) {
      setDeleting(false);
      setDeleteError(
        isId ? "Password salah. Coba lagi." : "Incorrect password. Try again."
      );
      return;
    }

    const result = await deleteTenantUserAction(editingUser.id);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.message || (isId ? "Terjadi kesalahan." : "An error occurred."));
      return;
    }

    dispatch({ type: "DELETE_USER", id: editingUser.id });
    closeDialog();
    router.refresh();
  }

  function toggleFeature(feat: UserFeature) {
    setForm((prev) => ({
      ...prev,
      featureAccess: prev.featureAccess.includes(feat)
        ? prev.featureAccess.filter((f) => f !== feat)
        : [...prev.featureAccess, feat],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError(isId ? "Nama wajib diisi." : "Name is required.");
      return;
    }
    if (!form.email.trim()) {
      setFormError(isId ? "Email wajib diisi." : "Email is required.");
      return;
    }
    if (!form.email.includes("@")) {
      setFormError(isId ? "Format email tidak valid." : "Invalid email format.");
      return;
    }
    if (!form.tenantId) {
      setFormError(isId ? "Pilih cabang terlebih dahulu." : "Please select a branch.");
      return;
    }

    // When adding a new staff, check org-wide total limit
    if (!editingUser && !canAddStaff) {
      setFormError(
        isId
          ? `Batas karyawan organisasi tercapai (${maxStaffTotal} karyawan).`
          : `Organization staff limit reached (${maxStaffTotal} staff).`
      );
      return;
    }

    // Check per-branch limit for the selected branch
    if (maxStaffPerBranch !== Infinity) {
      const branchCurrentCount = staffPerBranch[form.tenantId] ?? 0;
      const isMovingFromOtherBranch = editingUser && editingUser.tenant_id !== form.tenantId;
      const willAdd = !editingUser || isMovingFromOtherBranch;
      if (willAdd && branchCurrentCount >= maxStaffPerBranch) {
        const branchName = state.branches.find((b) => b.id === form.tenantId)?.branch_name
          || state.branches.find((b) => b.id === form.tenantId)?.name
          || form.tenantId;
        setFormError(
          isId
            ? `Cabang "${branchName}" sudah mencapai batas karyawan (${maxStaffPerBranch}).`
            : `Branch "${branchName}" has reached its staff limit (${maxStaffPerBranch}).`
        );
        return;
      }
    }
    if (!editingUser && (!form.password || form.password.length < 6)) {
      setFormError(isId ? "Password minimal 6 karakter." : "Password must be at least 6 characters.");
      return;
    }
    if (!editingUser && (!form.pin || form.pin.length !== 6)) {
      setFormError(isId ? "PIN harus tepat 6 digit." : "PIN must be exactly 6 digits.");
      return;
    }

    setSaving(true);
    setFormError("");

    const result = await upsertTenantUserAction({
      id: editingUser?.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: "CASHIER",
      jobTitle: form.jobTitle || undefined,
      password: form.password || undefined,
      pin: form.pin || undefined,
      isActive: form.isActive,
      tenantId: form.tenantId,
      featureAccess: form.featureAccess.join(",") || null,
    });

    setSaving(false);

    if (!result.ok) {
      setFormError(result.message || (isId ? "Terjadi kesalahan." : "An error occurred."));
      return;
    }

    // Optimistic local update so the table reflects changes immediately
    const now = Date.now();
    if (editingUser) {
      dispatch({
        type: "UPSERT_USER",
        payload: {
          ...editingUser,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase() || null,
          phone: form.phone.trim() || null,
          job_title: form.jobTitle.trim(),
          tenant_id: form.tenantId,
          is_active: form.isActive,
          feature_access: form.featureAccess.join(",") || null,
          sync_status: "SYNCED",
          updated_at: now,
        },
      });
    } else if (result.userId) {
      // New user — we don't have organization_id client-side, router.refresh() will fill it in
      dispatch({
        type: "UPSERT_USER",
        payload: {
          id: result.userId,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase() || null,
          phone: form.phone.trim() || null,
          job_title: form.jobTitle.trim(),
          pin_hash: "",
          pin_salt: "",
          password_hash: null,
          password_salt: null,
          role: "CASHIER",
          tenant_id: form.tenantId,
          organization_id: state.organization?.id ?? null,
          is_active: form.isActive,
          feature_access: form.featureAccess.join(",") || null,
          sync_status: "SYNCED",
          updated_at: now,
          created_at: now,
        },
      });
    }

    router.refresh();
    closeDialog();
  }

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <div>
          <h1 className="erp-screen-title">{isId ? "KARYAWAN" : "STAFF"}</h1>
          <p className="erp-screen-subtitle">
            {totalCashiers} /{" "}
            {maxStaffTotal === Infinity ? "∞" : maxStaffTotal}{" "}
            {isId ? "karyawan" : "staff"}
            {maxStaffPerBranch !== Infinity && (
              <> &middot; {isId
                ? `maks. ${maxStaffPerBranch} per cabang`
                : `max. ${maxStaffPerBranch} per branch`}
              </>
            )}
          </p>
        </div>
        <button
          className="erp-btn erp-btn--primary"
          onClick={openAddDialog}
          disabled={!canAddStaff}
          title={
            !canAddStaff
              ? isId
                ? `Batas karyawan organisasi tercapai (${maxStaffTotal})`
                : `Organization staff limit reached (${maxStaffTotal})`
              : undefined
          }
        >
          {isId ? "+ Tambah Karyawan" : "+ Add Staff"}
        </button>
      </div>

      {/* Per-branch staff usage summary */}
      <div className="office-stat-row" style={{ marginTop: 16 }}>
        {state.branches.map((b) => {
          const count = staffPerBranch[b.id] ?? 0;
          const atLimit = maxStaffPerBranch !== Infinity && count >= maxStaffPerBranch;
          return (
            <div
              key={b.id}
              className={`erp-card office-stat-card${atLimit ? " office-stat-card--danger" : ""}`}
            >
              <div className="office-stat-label">
                {b.branch_name || b.name}
                {b.is_primary && (
                  <span className="office-badge office-badge--primary" style={{ marginLeft: 6 }}>
                    {isId ? "Utama" : "Primary"}
                  </span>
                )}
              </div>
              <div className="office-stat-value">
                {count}
                <span style={{ fontSize: 14, fontWeight: 400, color: "var(--erp-muted)", marginLeft: 4 }}>
                  / {maxStaffPerBranch === Infinity ? "∞" : maxStaffPerBranch}
                </span>
              </div>
              {atLimit && (
                <div style={{ fontSize: 11, color: "var(--erp-danger)", marginTop: 4 }}>
                  {isId ? "Batas tercapai" : "Limit reached"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        {/* Cashiers table */}
        <div className="erp-card">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{isId ? "Nama" : "Name"}</th>
                <th>{isId ? "Email" : "Email"}</th>
                <th>{isId ? "Jabatan" : "Job Title"}</th>
                <th>{isId ? "Cabang" : "Branch"}</th>
                <th>{isId ? "Akses Fitur" : "Feature Access"}</th>
                <th>{isId ? "Status" : "Status"}</th>
                <th>{isId ? "Aksi" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.map((user) => (
                <tr key={user.id}>
                  <td data-label={isId ? "Nama" : "Name"}>{user.name}</td>
                  <td data-label="Email">{user.email || "—"}</td>
                  <td data-label={isId ? "Jabatan" : "Job Title"}>{user.job_title || "—"}</td>
                  <td data-label={isId ? "Cabang" : "Branch"}>
                    {user.tenant_id ? (branchMap[user.tenant_id] || "—") : "—"}
                  </td>
                  <td data-label={isId ? "Akses Fitur" : "Feature Access"}>
                    <span className="office-feature-access">
                      {user.feature_access || "—"}
                    </span>
                  </td>
                  <td data-label="Status">
                    {user.is_active ? (
                      <span className="office-badge office-badge--success">
                        {isId ? "Aktif" : "Active"}
                      </span>
                    ) : (
                      <span className="office-badge office-badge--danger">
                        {isId ? "Nonaktif" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td data-label={isId ? "Aksi" : "Actions"}>
                    <button
                      className="erp-btn erp-btn--ghost erp-btn--sm"
                      onClick={() => openEditDialog(user)}
                    >
                      {isId ? "Edit" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cashiers.length === 0 && (
            <p className="erp-empty">
              {isId ? "Belum ada karyawan." : "No staff yet."}
            </p>
          )}
        </div>

        {/* Owner rows — read-only, below cashier table */}
        {owners.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className="office-section-title" style={{ marginBottom: 8 }}>
              {isId ? "Pemilik" : "Owner"}
            </p>
            <div className="erp-card">
              <table className="erp-table">
                <tbody>
                  {owners.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email || "—"}</td>
                      <td colSpan={3}>
                        <span className="office-badge office-badge--primary">
                          {isId ? "Pemilik — akses penuh" : "Owner — full access"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      {dialogOpen && (
        <div className="erp-overlay" onClick={closeDialog}>
          <div className="erp-dialog erp-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>
                {editingUser
                  ? isId ? "Edit Karyawan" : "Edit Staff"
                  : isId ? "Tambah Karyawan Baru" : "Add New Staff"}
              </h3>
              <button className="erp-dialog-close" onClick={closeDialog}>✕</button>
            </div>

            <div className="erp-dialog-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Nama" : "Name"}</label>
                <input
                  className="erp-input"
                  placeholder={isId ? "Nama lengkap" : "Full name"}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-label">Email</label>
                <input
                  className="erp-input"
                  type="email"
                  placeholder="email@contoh.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-label">
                  {isId ? "No. Telepon (opsional)" : "Phone (optional)"}
                </label>
                <input
                  className="erp-input"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Jabatan" : "Job Title"}</label>
                <select
                  className="erp-input"
                  value={form.jobTitle}
                  onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                >
                  <option value="">{isId ? "— Pilih jabatan —" : "— Select job title —"}</option>
                  {JOB_TITLES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-label">
                  {editingUser
                    ? isId ? "Password baru (kosongkan jika tidak diubah)" : "New password (leave blank to keep)"
                    : isId ? "Password" : "Password"}
                </label>
                <input
                  className="erp-input"
                  type="password"
                  placeholder={editingUser ? "••••••" : isId ? "Min. 6 karakter" : "Min. 6 characters"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-label">
                  {editingUser
                    ? isId ? "PIN baru (kosongkan jika tidak diubah)" : "New PIN (leave blank to keep)"
                    : isId ? "PIN (6 digit)" : "PIN (6 digits)"}
                </label>
                <input
                  className="erp-input"
                  type="password"
                  inputMode="numeric"
                  placeholder={editingUser ? "••••••" : "6 digit"}
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  maxLength={6}
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Cabang" : "Branch"}</label>
                <select
                  className="erp-input"
                  value={form.tenantId}
                  onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                >
                  <option value="">
                    {isId ? "— Pilih cabang —" : "— Select branch —"}
                  </option>
                  {state.branches.map((b) => {
                    const count = staffPerBranch[b.id] ?? 0;
                    const branchAtLimit = maxStaffPerBranch !== Infinity && count >= maxStaffPerBranch;
                    // Allow selecting the branch when editing and it's the same branch (not adding a new slot)
                    const isCurrentBranch = editingUser?.tenant_id === b.id;
                    const disabled = branchAtLimit && !isCurrentBranch;
                    return (
                      <option key={b.id} value={b.id} disabled={disabled}>
                        {b.branch_name || b.name}
                        {maxStaffPerBranch !== Infinity ? ` (${count}/${maxStaffPerBranch})` : ""}
                        {branchAtLimit && !isCurrentBranch ? (isId ? " — penuh" : " — full") : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Akses Fitur" : "Feature Access"}</label>
                <p className="erp-input-hint" style={{ marginBottom: 8 }}>
                  {isId
                    ? "Pilih fitur yang dapat diakses oleh karyawan ini."
                    : "Select the features this staff member can access."}
                </p>
                <div className="office-staff-checklist">
                  {ALL_FEATURES.map((feat) => (
                    <label key={feat} className="office-staff-check-item">
                      <input
                        type="checkbox"
                        checked={form.featureAccess.includes(feat)}
                        onChange={() => toggleFeature(feat)}
                      />
                      <span className="office-staff-check-name">
                        {isId ? FEATURE_LABELS[feat].id : FEATURE_LABELS[feat].en}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="erp-form-group">
                <label className="office-staff-check-item" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span className="office-staff-check-name">
                    {isId ? "Akun aktif" : "Account active"}
                  </span>
                </label>
              </div>

              {formError && (
                <p className="erp-input-hint erp-input-hint--error">{formError}</p>
              )}

              {/* Delete zone — only shown when editing an existing staff */}
              {editingUser && deleteStep === "idle" && (
                <div className="office-delete-zone">
                  <button
                    className="erp-btn erp-btn--ghost office-delete-trigger"
                    type="button"
                    onClick={() => {
                      setDeleteStep("confirm");
                      setDeletePassword("");
                      setDeleteError("");
                    }}
                  >
                    {isId ? "Hapus karyawan ini" : "Delete this staff"}
                  </button>
                </div>
              )}

              {/* Delete confirmation step */}
              {editingUser && deleteStep === "confirm" && (
                <div className="office-delete-zone office-delete-confirm">
                  <p className="office-delete-confirm-text">
                    {isId
                      ? `Anda akan menghapus akun "${editingUser.name}" secara permanen. Tindakan ini tidak dapat dibatalkan.`
                      : `You are about to permanently delete "${editingUser.name}". This action cannot be undone.`}
                  </p>
                  <div className="erp-form-group" style={{ margin: 0 }}>
                    <label className="erp-label">
                      {isId ? "Konfirmasi dengan password Anda" : "Confirm with your password"}
                    </label>
                    <input
                      className="erp-input"
                      type="password"
                      autoFocus
                      placeholder="••••••"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
                    />
                  </div>
                  {deleteError && (
                    <p className="erp-input-hint erp-input-hint--error">{deleteError}</p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="erp-btn erp-btn--ghost"
                      type="button"
                      disabled={deleting}
                      onClick={() => { setDeleteStep("idle"); setDeletePassword(""); setDeleteError(""); }}
                    >
                      {isId ? "Batal" : "Cancel"}
                    </button>
                    <button
                      className="erp-btn office-delete-btn"
                      type="button"
                      disabled={deleting || !deletePassword}
                      onClick={handleDelete}
                    >
                      {deleting
                        ? isId ? "Menghapus..." : "Deleting..."
                        : isId ? "Hapus Permanen" : "Delete Permanently"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--ghost" onClick={closeDialog} disabled={saving || deleting}>
                {isId ? "Batal" : "Cancel"}
              </button>
              <button
                className="erp-btn erp-btn--primary"
                onClick={handleSave}
                disabled={saving || deleting || deleteStep === "confirm"}
              >
                {saving
                  ? isId ? "Menyimpan..." : "Saving..."
                  : isId ? "Simpan" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
