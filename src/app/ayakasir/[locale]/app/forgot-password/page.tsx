"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { getErpCopy } from "@/components/ayakasir/erp/i18n";
import { useBasePath } from "@/components/ayakasir/erp/useBasePath";
import { requestPasswordResetAction } from "@/app/ayakasir/actions/auth";

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const base = useBasePath();
  const { auth: authCopy } = getErpCopy(locale);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const result = await requestPasswordResetAction({
      email,
      locale,
      origin: window.location.origin,
    });

    if (!result.ok) {
      setStatus("error");
      setMessage(result.message || authCopy.genericError);
      return;
    }

    setStatus("success");
    setMessage(result.message || authCopy.forgotSuccess);
  }

  return (
    <div className="erp-auth">
      <div className="erp-auth-orb erp-auth-orb--1" />
      <div className="erp-auth-orb erp-auth-orb--2" />
      <div className="erp-auth-orb erp-auth-orb--3" />
      <div className="erp-auth-card">
        <a className="erp-auth-logo" href="https://ayakasir.petalytix.id">AyaKa$ir</a>
        <p className="erp-auth-subtitle">{authCopy.forgotSubtitle}</p>

        <form onSubmit={handleSubmit}>
          {status !== "idle" && (
            <div
              className={`erp-alert ${
                status === "error" ? "erp-alert--error" : status === "success" ? "erp-alert--success" : ""
              }`}
            >
              {message}
            </div>
          )}

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.emailLabel}</label>
            <input
              className="erp-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={authCopy.emailPlaceholder}
              required
              autoComplete="email"
            />
          </div>

          <button
            className="erp-btn erp-btn--primary erp-btn--full"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? authCopy.loading : authCopy.forgotButton}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--erp-muted)" }}>
          <a
            href={`${base}/${locale}/app/login`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {authCopy.backToLogin}
          </a>
        </p>
      </div>
    </div>
  );
}
