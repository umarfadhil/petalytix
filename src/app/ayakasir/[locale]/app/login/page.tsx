"use client";

import { useState } from "react";
import { loginErpAction } from "@/app/ayakasir/actions/auth";
import { useParams, useRouter } from "next/navigation";

export default function LoginPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isId = locale === "id";

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
        setError(result.message || (isId ? "Terjadi kesalahan" : "An error occurred"));
        setLoading(false);
        return;
      }

      router.push(`/${locale}/app/dashboard`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Login error:", msg);
      setError(msg || (isId ? "Terjadi kesalahan" : "An error occurred"));
      setLoading(false);
    }
  }

  return (
    <div className="erp-auth">
      <div className="erp-auth-card">
        <div className="erp-auth-logo">AyaKa$ir</div>
        <p className="erp-auth-subtitle">
          {isId ? "Masuk ke dashboard ERP" : "Sign in to ERP dashboard"}
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="erp-alert erp-alert--error">{error}</div>}

          <div className="erp-input-group">
            <label className="erp-label">Email</label>
            <input
              className="erp-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">Password</label>
            <input
              className="erp-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            className="erp-btn erp-btn--primary erp-btn--full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? isId ? "Memuat..." : "Loading..."
              : isId ? "Masuk" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--erp-muted)" }}>
          {isId ? "Belum punya akun?" : "Don't have an account?"}{" "}
          <a
            href={`/${locale}/app/register`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {isId ? "Daftar" : "Register"}
          </a>
        </p>
      </div>
    </div>
  );
}
