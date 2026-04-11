"use client";

import { useOffice } from "../store";
import { getPlanLimits } from "@/lib/ayakasir-plan";
import { formatRupiah } from "../../utils";
import type { TenantPlan } from "@/lib/supabase/types";
import { APP_VERSION } from "@/lib/ayakasir-plan";

export default function OfficeSettingsScreen() {
  const { state, locale } = useOffice();
  const isId = locale === "id";

  const org = state.organization;
  const planExpired =
    org?.plan_expires_at != null && Date.now() > (org.plan_expires_at ?? 0);
  const effectivePlan = planExpired ? "PERINTIS" : (org?.plan ?? "PERINTIS") as TenantPlan;
  const limits = getPlanLimits(effectivePlan);

  const planExpiryDate = org?.plan_expires_at
    ? new Date(org.plan_expires_at).toLocaleDateString(isId ? "id-ID" : "en-GB")
    : null;

  const daysLeft = org?.plan_expires_at
    ? Math.max(0, Math.ceil((org.plan_expires_at - Date.now()) / 86400000))
    : null;

  return (
    <div className="erp-screen">
      <div className="erp-screen-header">
        <h1 className="erp-screen-title">{isId ? "PENGATURAN KANTOR" : "OFFICE SETTINGS"}</h1>
      </div>

      {/* Org profile */}
      <section className="office-settings-section">
        <h2 className="office-section-title">{isId ? "Profil Organisasi" : "Organization Profile"}</h2>
        <div className="erp-card office-settings-card">
          <div className="office-settings-row">
            <span className="office-settings-label">{isId ? "Nama Organisasi" : "Organization Name"}</span>
            <span className="office-settings-value">{org?.name || "—"}</span>
          </div>
          <div className="office-settings-row">
            <span className="office-settings-label">{isId ? "Email Pemilik" : "Owner Email"}</span>
            <span className="office-settings-value">{org?.owner_email || "—"}</span>
          </div>
        </div>
      </section>

      {/* Plan info */}
      <section className="office-settings-section">
        <h2 className="office-section-title">{isId ? "Paket Langganan" : "Subscription Plan"}</h2>
        <div className="erp-card office-settings-card">
          <div className="office-settings-row">
            <span className="office-settings-label">{isId ? "Paket Aktif" : "Active Plan"}</span>
            <span className={`office-badge ${effectivePlan === "PERINTIS" ? "office-badge--muted" : effectivePlan === "TUMBUH" ? "office-badge--primary" : "office-badge--success"}`}>
              {effectivePlan}{planExpired ? (isId ? " (Kadaluarsa)" : " (Expired)") : ""}
            </span>
          </div>
          {planExpiryDate && (
            <div className="office-settings-row">
              <span className="office-settings-label">{isId ? "Berlaku hingga" : "Valid until"}</span>
              <span className="office-settings-value">
                {planExpiryDate}
                {daysLeft !== null && daysLeft <= 30 && (
                  <span className="office-badge office-badge--warning" style={{ marginLeft: 8 }}>
                    {daysLeft} {isId ? "hari lagi" : "days left"}
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="office-plan-usage">
            <div className="office-plan-usage-item">
              <span>{isId ? "Cabang" : "Branches"}</span>
              <span>{state.branches.length} / {limits.maxBranches === Infinity ? "∞" : limits.maxBranches}</span>
            </div>
            <div className="office-plan-usage-item">
              <span>{isId ? "Karyawan" : "Staff"}</span>
              <span>{state.orgUsers.filter((u) => u.role === "CASHIER").length} / {limits.maxStaff === Infinity ? "∞" : limits.maxStaff}</span>
            </div>
            <div className="office-plan-usage-item">
              <span>{isId ? "Pelanggan" : "Customers"}</span>
              <span>{state.orgCustomers.length} / {limits.maxCustomers === Infinity ? "∞" : limits.maxCustomers}</span>
            </div>
          </div>

          {effectivePlan !== "MAPAN" && (
            <div className="office-upgrade-cta">
              <a
                href="mailto:developer@petalytix.id?subject=AyaKasir%20Upgrade"
                className="erp-btn erp-btn--primary"
              >
                {isId ? "Hubungi Developer untuk Upgrade" : "Contact Developer to Upgrade"}
              </a>
            </div>
          )}
        </div>
      </section>

      <div className="erp-watermark-text">
        © 2026 AyaKasir by Petalytix | v{APP_VERSION}
      </div>
    </div>
  );
}
