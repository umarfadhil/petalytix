"use client";

import { useState } from "react";
import { registerErpAction } from "@/app/ayakasir/actions/auth";
import { useParams } from "next/navigation";

export default function RegisterPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isId = locale === "id";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await registerErpAction({
        name,
        email,
        phone,
        restaurantName,
        password,
        locale,
      });

      if (!result.ok) {
        setError(result.message || (isId ? "Terjadi kesalahan" : "An error occurred"));
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError(isId ? "Terjadi kesalahan" : "An error occurred");
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="erp-auth">
        <div className="erp-auth-card">
          <div className="erp-auth-logo">AyaKa$ir</div>
          <div className="erp-alert erp-alert--success" style={{ marginTop: 24 }}>
            {isId
              ? "Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi akun."
              : "Registration successful! Please check your email to confirm your account."}
          </div>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
            <a
              href={`/${locale}/app/login`}
              style={{ color: "var(--erp-primary)", fontWeight: 500 }}
            >
              {isId ? "Kembali ke halaman masuk" : "Back to login"}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="erp-auth">
      <div className="erp-auth-card">
        <div className="erp-auth-logo">AyaKa$ir</div>
        <p className="erp-auth-subtitle">
          {isId ? "Daftar akun baru" : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="erp-alert erp-alert--error">{error}</div>}

          <div className="erp-input-group">
            <label className="erp-label">{isId ? "Nama Lengkap" : "Full Name"}</label>
            <input
              className="erp-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">{isId ? "Nama Restoran" : "Restaurant Name"}</label>
            <input
              className="erp-input"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              required
            />
          </div>

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
            <label className="erp-label">{isId ? "Telepon" : "Phone"}</label>
            <input
              className="erp-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">Password</label>
            <input
              className="erp-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            className="erp-btn erp-btn--primary erp-btn--full"
            type="submit"
            disabled={loading}
          >
            {loading
              ? isId ? "Memuat..." : "Loading..."
              : isId ? "Daftar" : "Register"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--erp-muted)" }}>
          {isId ? "Sudah punya akun?" : "Already have an account?"}{" "}
          <a
            href={`/${locale}/app/login`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {isId ? "Masuk" : "Sign In"}
          </a>
        </p>
      </div>
    </div>
  );
}
