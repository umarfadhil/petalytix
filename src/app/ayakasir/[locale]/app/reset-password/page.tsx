"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getErpCopy } from "@/components/ayakasir/erp/i18n";
import { createBrowserClient } from "@/lib/supabase/client";
import { resetErpPasswordAction } from "@/app/ayakasir/actions/auth";

export default function ResetPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const { auth: authCopy } = getErpCopy(locale);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (password.length < 6) {
      setStatus("error");
      setMessage(authCopy.resetInvalid);
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage(authCopy.resetMismatch);
      return;
    }

    const dbResult = await resetErpPasswordAction({
      newPassword: password,
      locale,
    });

    if (!dbResult.ok) {
      setStatus("error");
      setMessage(dbResult.message || authCopy.resetError);
      return;
    }

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(authCopy.resetError);
      return;
    }

    await supabase.auth.signOut();
    setStatus("success");
    setMessage(authCopy.resetSuccess);

    setTimeout(() => {
      router.replace(`/${locale}/app/login`);
    }, 1000);
  }

  return (
    <div className="erp-auth">
      <div className="erp-auth-orb erp-auth-orb--1" />
      <div className="erp-auth-orb erp-auth-orb--2" />
      <div className="erp-auth-orb erp-auth-orb--3" />
      <div className="erp-auth-card">
        <div className="erp-auth-logo">AyaKa$ir</div>
        <p className="erp-auth-subtitle">{authCopy.resetSubtitle}</p>

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
            <label className="erp-label">{authCopy.newPasswordLabel}</label>
            <input
              className="erp-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authCopy.passwordPlaceholder}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.confirmPasswordLabel}</label>
            <input
              className="erp-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={authCopy.passwordPlaceholder}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            className="erp-btn erp-btn--primary erp-btn--full"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? authCopy.loading : authCopy.resetButton}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--erp-muted)" }}>
          <a
            href={`/${locale}/app/login`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {authCopy.backToLogin}
          </a>
        </p>
      </div>
    </div>
  );
}
