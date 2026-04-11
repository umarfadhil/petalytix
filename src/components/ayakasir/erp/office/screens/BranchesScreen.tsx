"use client";

import { useState } from "react";
import { useOffice } from "../store";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import {
  createBranchAction,
  updateBranchAction,
  syncBranchStaffAction,
  deleteBranchAction,
} from "@/app/ayakasir/actions/auth";
import type { DbTenant, DbUser, TenantPlan } from "@/lib/supabase/types";
import provincesData from "@/data/indonesia-provinces.json";

const provinces = Object.keys(provincesData).sort();
const citiesByProvince = provincesData as Record<string, string[]>;

interface BranchForm {
  branchName: string;
  province: string;
  city: string;
  assignedStaffIds: string[]; // CASHIER user IDs to assign to this branch
}

const EMPTY_FORM: BranchForm = {
  branchName: "",
  province: "",
  city: "",
  assignedStaffIds: [],
};

export default function BranchesScreen() {
  const { state, dispatch, locale } = useOffice();
  const isId = locale === "id";

  const planExpired =
    state.organization?.plan_expires_at != null &&
    Date.now() > (state.organization.plan_expires_at ?? 0);
  const effectivePlan = planExpired
    ? "PERINTIS"
    : ((state.organization?.plan ?? "PERINTIS") as TenantPlan);
  const limits = getPlanLimits(effectivePlan);
  const canCreateBranch = state.branches.length < limits.maxBranches;

  // All CASHIER users across the org
  const allCashiers = state.orgUsers.filter((u) => u.role === "CASHIER");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<DbTenant | null>(null);
  const [form, setForm] = useState<BranchForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirmation state (two-step: confirm → password)
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "password">("idle");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const cities = form.province ? (citiesByProvince[form.province] || []) : [];

  // Staff currently assigned to the branch being edited
  function staffForBranch(branchId: string): DbUser[] {
    return allCashiers.filter((u) => u.tenant_id === branchId);
  }

  function openAddDialog() {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(branch: DbTenant) {
    setEditingBranch(branch);
    setForm({
      branchName: branch.branch_name || branch.name,
      province: branch.province || "",
      city: branch.city || "",
      // Pre-select staff currently assigned to this branch
      assignedStaffIds: staffForBranch(branch.id).map((u) => u.id),
    });
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDeleteStep("idle");
    setDeletePassword("");
    setDeleteError("");
  }

  async function handleDelete() {
    if (!editingBranch || !deletePassword) return;
    setDeleting(true);
    setDeleteError("");
    const result = await deleteBranchAction(editingBranch.id, deletePassword);
    setDeleting(false);
    if (!result.ok) {
      setDeleteError(result.message || (isId ? "Terjadi kesalahan." : "An error occurred."));
      return;
    }
    // Unassign staff from deleted branch in local state (tenant_id = null)
    staffForBranch(editingBranch.id).forEach((u) => {
      dispatch({ type: "UPSERT_USER", payload: { ...u, tenant_id: null } });
    });
    dispatch({ type: "DELETE_BRANCH", id: editingBranch.id });
    closeDialog();
  }

  function setField<K extends keyof BranchForm>(field: K, value: BranchForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "province") (next as BranchForm).city = "";
      return next;
    });
  }

  function toggleStaff(userId: string) {
    setForm((prev) => {
      const ids = prev.assignedStaffIds.includes(userId)
        ? prev.assignedStaffIds.filter((id) => id !== userId)
        : [...prev.assignedStaffIds, userId];
      return { ...prev, assignedStaffIds: ids };
    });
  }

  async function handleSave() {
    if (!form.branchName.trim() || !form.province || !form.city) {
      setFormError(isId ? "Semua kolom wajib diisi." : "All fields are required.");
      return;
    }
    setSaving(true);
    setFormError("");

    // 1. Create or update the branch
    const result = editingBranch
      ? await updateBranchAction(editingBranch.id, form)
      : await createBranchAction(form);

    if (!result.ok) {
      setSaving(false);
      setFormError(result.message || (isId ? "Terjadi kesalahan." : "An error occurred."));
      return;
    }

    // 2. Resolve the actual branch ID
    const targetBranchId: string | null =
      editingBranch?.id ?? (result as { tenantId?: string }).tenantId ?? null;

    // 3. Sync staff assignments server-side (DB diff — unassigns removed, assigns new)
    if (targetBranchId) {
      const syncResult = await syncBranchStaffAction(targetBranchId, form.assignedStaffIds);
      if (syncResult.ok) {
        // Update unassigned staff in local state → no branch
        syncResult.unassignedIds.forEach((userId) => {
          const u = state.orgUsers.find((x) => x.id === userId);
          if (u) dispatch({ type: "UPSERT_USER", payload: { ...u, tenant_id: null } });
        });
        // Update newly assigned staff in local state → this branch
        syncResult.assignedIds.forEach((userId) => {
          const u = state.orgUsers.find((x) => x.id === userId);
          if (u) dispatch({ type: "UPSERT_USER", payload: { ...u, tenant_id: targetBranchId! } });
        });
      }
    }

    setSaving(false);

    // 4. Optimistic local update for the branch row
    const now = Date.now();
    if (editingBranch) {
      dispatch({
        type: "UPSERT_BRANCH",
        payload: {
          ...editingBranch,
          name: form.branchName.trim(),
          branch_name: form.branchName.trim(),
          province: form.province,
          city: form.city,
          updated_at: now,
        },
      });
    } else if (targetBranchId) {
      // Build an optimistic row for the new branch using data from the primary branch
      const primary = state.branches.find((b) => b.is_primary);
      const optimisticBranch: DbTenant = {
        id: targetBranchId,
        name: form.branchName.trim(),
        branch_name: form.branchName.trim(),
        owner_email: primary?.owner_email ?? "",
        owner_phone: primary?.owner_phone ?? "",
        province: form.province,
        city: form.city,
        is_active: true,
        is_primary: false,
        organization_id: state.organization?.id ?? null,
        qris_image_url: null,
        qris_merchant_name: null,
        enabled_payment_methods: primary?.enabled_payment_methods ?? "CASH,QRIS,TRANSFER,UTANG",
        plan: primary?.plan ?? "TUMBUH",
        plan_started_at: primary?.plan_started_at ?? null,
        plan_expires_at: primary?.plan_expires_at ?? null,
        sync_status: "SYNCED",
        updated_at: now,
        created_at: now,
      };
      dispatch({ type: "UPSERT_BRANCH", payload: optimisticBranch });
    }

    closeDialog();
  }

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <div>
          <h1 className="erp-screen-title">{isId ? "CABANG" : "BRANCHES"}</h1>
          <p className="erp-screen-subtitle">
            {state.branches.length} /{" "}
            {limits.maxBranches === Infinity ? "∞" : limits.maxBranches}{" "}
            {isId ? "cabang" : "branches"}
          </p>
        </div>
        <button
          className="erp-btn erp-btn--primary"
          disabled={!canCreateBranch}
          title={
            !canCreateBranch
              ? isId
                ? "Batas cabang tercapai"
                : "Branch limit reached"
              : undefined
          }
          onClick={openAddDialog}
        >
          {isId ? "+ Tambah Cabang" : "+ Add Branch"}
        </button>
      </div>

      {!canCreateBranch && (
        <div className="erp-info-banner erp-info-banner--warning" style={{ marginTop: 12, fontSize: 12 }}>
          {isId
            ? `Batas cabang plan ${effectivePlan} (${limits.maxBranches}) telah tercapai. Upgrade untuk menambah lebih banyak cabang.`
            : `Branch limit for ${effectivePlan} plan (${limits.maxBranches}) reached. Upgrade to add more branches.`}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div className="erp-card">
          <table className="erp-table">
            <thead>
              <tr>
                <th>{isId ? "Nama Cabang" : "Branch Name"}</th>
                <th>{isId ? "Provinsi" : "Province"}</th>
                <th>{isId ? "Kota" : "City"}</th>
                <th>{isId ? "Karyawan" : "Staff"}</th>
                <th>{isId ? "Status" : "Status"}</th>
                <th>{isId ? "Tipe" : "Type"}</th>
                <th>{isId ? "Aksi" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {state.branches.map((branch) => {
                const summary = state.branchSummaries.find(
                  (s) => s.tenantId === branch.id
                );
                const isCurrent = branch.id === state.activeTenantId;
                const branchStaff = staffForBranch(branch.id);

                return (
                  <tr key={branch.id}>
                    <td>
                      <span className="office-branch-name">
                        {branch.branch_name || branch.name}
                      </span>
                      {isCurrent && (
                        <span
                          className="office-badge office-badge--primary"
                          style={{ marginLeft: 8 }}
                        >
                          {isId ? "Aktif" : "Current"}
                        </span>
                      )}
                    </td>
                    <td>{branch.province || "—"}</td>
                    <td>{branch.city || "—"}</td>
                    <td>
                      {branchStaff.length === 0 ? (
                        <span className="erp-muted" style={{ fontSize: 13 }}>—</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {branchStaff.map((u) => (
                            <span key={u.id} style={{ fontSize: 13 }}>{u.name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {summary?.activeSession ? (
                        <span className="office-badge office-badge--success">
                          {isId ? "Kasir Aktif" : "Shift Open"}
                        </span>
                      ) : (
                        <span className="office-badge office-badge--muted">
                          {isId ? "Tutup" : "Closed"}
                        </span>
                      )}
                    </td>
                    <td>
                      {branch.is_primary ? (
                        <span className="office-badge office-badge--primary">
                          {isId ? "Utama" : "Primary"}
                        </span>
                      ) : (
                        <span className="office-badge office-badge--muted">
                          {isId ? "Cabang" : "Branch"}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="erp-btn erp-btn--ghost erp-btn--sm"
                        onClick={() => openEditDialog(branch)}
                      >
                        {isId ? "Edit" : "Edit"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit dialog */}
      {dialogOpen && (
        <div className="erp-overlay" onClick={closeDialog}>
          <div className="erp-dialog erp-dialog--lg" onClick={(e) => e.stopPropagation()}>
            <div className="erp-dialog-header">
              <h3>
                {editingBranch
                  ? isId ? "Edit Cabang" : "Edit Branch"
                  : isId ? "Tambah Cabang Baru" : "Add New Branch"}
              </h3>
              <button className="erp-dialog-close" onClick={closeDialog}>✕</button>
            </div>

            <div className="erp-dialog-body">
              {/* Branch info */}
              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Nama Cabang" : "Branch Name"}</label>
                <input
                  className="erp-input"
                  placeholder={isId ? "Contoh: Cabang Sudirman" : "e.g. Sudirman Branch"}
                  value={form.branchName}
                  onChange={(e) => setField("branchName", e.target.value)}
                  autoFocus
                />
              </div>

              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Provinsi" : "Province"}</label>
                <select
                  className="erp-input"
                  value={form.province}
                  onChange={(e) => setField("province", e.target.value)}
                >
                  <option value="">{isId ? "— Pilih provinsi —" : "— Select province —"}</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="erp-form-group">
                <label className="erp-label">{isId ? "Kota" : "City"}</label>
                <select
                  className="erp-input"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  disabled={!form.province}
                >
                  <option value="">{isId ? "— Pilih kota —" : "— Select city —"}</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Staff assignment */}
              {allCashiers.length > 0 && (
                <div className="erp-form-group">
                  <label className="erp-label">
                    {isId ? "Tugaskan Karyawan" : "Assign Staff"}
                    {limits.maxStaff !== Infinity && (
                      <span className="erp-input-hint" style={{ marginLeft: 8, display: "inline" }}>
                        ({form.assignedStaffIds.length}/{limits.maxStaff}{" "}
                        {isId ? "maks." : "max."})
                      </span>
                    )}
                  </label>
                  <p className="erp-input-hint" style={{ marginBottom: 8 }}>
                    {isId
                      ? `Pilih kasir yang akan bertugas di cabang ini.${limits.maxStaff !== Infinity ? ` Maks. ${limits.maxStaff} karyawan per cabang (plan ${effectivePlan}).` : ""}`
                      : `Select cashiers to assign to this branch.${limits.maxStaff !== Infinity ? ` Max. ${limits.maxStaff} staff per branch (${effectivePlan} plan).` : ""}`}
                  </p>
                  <div className="office-staff-checklist">
                    {allCashiers.map((u) => {
                      const currentBranch = state.branches.find((b) => b.id === u.tenant_id);
                      const isChecked = form.assignedStaffIds.includes(u.id);
                      // Disable unchecked items when the branch is already at the limit
                      const atLimit =
                        limits.maxStaff !== Infinity &&
                        form.assignedStaffIds.length >= limits.maxStaff &&
                        !isChecked;
                      return (
                        <label
                          key={u.id}
                          className={`office-staff-check-item${atLimit ? " office-staff-check-item--disabled" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={atLimit}
                            onChange={() => { if (!atLimit) toggleStaff(u.id); }}
                          />
                          <span className="office-staff-check-name">{u.name}</span>
                          {currentBranch && currentBranch.id !== editingBranch?.id && (
                            <span className="office-badge office-badge--muted" style={{ fontSize: 11 }}>
                              {isId ? "Di" : "At"}{" "}
                              {currentBranch.branch_name || currentBranch.name}
                            </span>
                          )}
                          {!u.tenant_id && (
                            <span className="office-badge office-badge--warning" style={{ fontSize: 11 }}>
                              {isId ? "Belum ditugaskan" : "Unassigned"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {limits.maxStaff !== Infinity && form.assignedStaffIds.length >= limits.maxStaff && (
                    <p className="erp-input-hint erp-input-hint--error" style={{ marginTop: 6 }}>
                      {isId
                        ? `Batas ${limits.maxStaff} karyawan per cabang tercapai.`
                        : `Limit of ${limits.maxStaff} staff per branch reached.`}
                    </p>
                  )}
                </div>
              )}

              {allCashiers.length === 0 && (
                <p className="erp-input-hint">
                  {isId
                    ? "Belum ada karyawan. Tambahkan karyawan di halaman Karyawan terlebih dahulu."
                    : "No staff yet. Add staff from the Staff page first."}
                </p>
              )}

              {formError && (
                <p className="erp-input-hint erp-input-hint--error">{formError}</p>
              )}

              {/* Delete section — only for non-primary branches in edit mode */}
              {editingBranch && !editingBranch.is_primary && (
                <div className="office-delete-zone">
                  {deleteStep === "idle" && (
                    <button
                      className="erp-btn erp-btn--ghost office-delete-trigger"
                      onClick={() => setDeleteStep("confirm")}
                      disabled={saving}
                      type="button"
                    >
                      {isId ? "Hapus Cabang" : "Delete Branch"}
                    </button>
                  )}

                  {deleteStep === "confirm" && (
                    <div className="office-delete-confirm">
                      <p className="office-delete-confirm-text">
                        {isId
                          ? `Hapus cabang "${editingBranch.branch_name || editingBranch.name}"? Semua karyawan akan dipindahkan ke cabang utama. Tindakan ini tidak dapat dibatalkan.`
                          : `Delete branch "${editingBranch.branch_name || editingBranch.name}"? All staff will be moved to the primary branch. This cannot be undone.`}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="erp-btn erp-btn--ghost erp-btn--sm"
                          onClick={() => setDeleteStep("idle")}
                          type="button"
                        >
                          {isId ? "Batal" : "Cancel"}
                        </button>
                        <button
                          className="erp-btn erp-btn--sm office-delete-btn"
                          onClick={() => { setDeleteStep("password"); setDeleteError(""); }}
                          type="button"
                        >
                          {isId ? "Ya, Lanjutkan" : "Yes, Continue"}
                        </button>
                      </div>
                    </div>
                  )}

                  {deleteStep === "password" && (
                    <div className="office-delete-confirm">
                      <p className="office-delete-confirm-text">
                        {isId
                          ? "Masukkan password akun Anda untuk mengonfirmasi penghapusan."
                          : "Enter your account password to confirm deletion."}
                      </p>
                      <input
                        className={`erp-input${deleteError ? " erp-input--error" : ""}`}
                        type="password"
                        placeholder={isId ? "Password" : "Password"}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleDelete(); }}
                        autoFocus
                      />
                      {deleteError && (
                        <p className="erp-input-hint erp-input-hint--error" style={{ marginTop: 6 }}>
                          {deleteError}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          className="erp-btn erp-btn--ghost erp-btn--sm"
                          onClick={() => { setDeleteStep("idle"); setDeletePassword(""); setDeleteError(""); }}
                          disabled={deleting}
                          type="button"
                        >
                          {isId ? "Batal" : "Cancel"}
                        </button>
                        <button
                          className="erp-btn erp-btn--sm office-delete-btn"
                          onClick={handleDelete}
                          disabled={deleting || !deletePassword}
                          type="button"
                        >
                          {deleting
                            ? isId ? "Menghapus..." : "Deleting..."
                            : isId ? "Hapus Sekarang" : "Delete Now"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="erp-dialog-footer">
              <button className="erp-btn erp-btn--ghost" onClick={closeDialog} disabled={saving || deleting}>
                {isId ? "Batal" : "Cancel"}
              </button>
              <button className="erp-btn erp-btn--primary" onClick={handleSave} disabled={saving || deleting}>
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
