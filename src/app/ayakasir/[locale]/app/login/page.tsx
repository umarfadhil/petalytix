"use client";

import { useState } from "react";
import { loginErpAction } from "@/app/ayakasir/actions/auth";
import { useParams, useRouter } from "next/navigation";
import { getErpCopy } from "@/components/ayakasir/erp/i18n";

export default function LoginPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const router = useRouter();
  const { auth: authCopy } = getErpCopy(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginErpAction({
        email,
        password,
        locale,
      });

      if (!result.ok) {
        setError(result.message || authCopy.genericError);
        setLoading(false);
        return;
      }

      router.push(`/${locale}/app/dashboard`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Login error:", msg);
      setError(msg || authCopy.genericError);
      setLoading(false);
    }
  }

  return (
    <div className="erp-auth">
      <div className="erp-auth-orb erp-auth-orb--1" />
      <div className="erp-auth-orb erp-auth-orb--2" />
      <div className="erp-auth-orb erp-auth-orb--3" />
      <div className="erp-auth-card">
        <a className="erp-auth-logo" href="https://ayakasir.petalytix.id">AyaKa$ir</a>
        <p className="erp-auth-subtitle">
          {authCopy.loginSubtitle}
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="erp-alert erp-alert--error">{error}</div>}

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

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.passwordLabel}</label>
            <input
              className="erp-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={authCopy.passwordMask}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            className="erp-btn erp-btn--primary erp-btn--full"
            type="submit"
            disabled={loading}
          >
            {loading ? authCopy.loading : authCopy.loginButton}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 14, fontSize: 14 }}>
          <a
            href={`/${locale}/app/forgot-password`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {authCopy.forgotPassword}
          </a>
        </p>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--erp-muted)" }}>
          {authCopy.noAccount}{" "}
          <a
            href={`/${locale}/app/register`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {authCopy.registerLink}
          </a>
        </p>
      </div>
    </div>
  );
}
