"use client";

import { useState } from "react";
import { registerErpAction } from "@/app/ayakasir/actions/auth";
import { useParams } from "next/navigation";
import { getErpCopy } from "@/components/ayakasir/erp/i18n";
import provincesData from "@/data/indonesia-provinces.json";

export default function RegisterPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const copy = getErpCopy(locale);
  const authCopy = copy.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const provinces = provincesData as Record<string, string[]>;
  const provinceOptions = Object.keys(provinces);
  const cityOptions = province ? provinces[province] || [] : [];

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
        pin,
        province,
        city,
        password,
        locale,
        origin: window.location.origin,
      });

      if (!result.ok) {
        setError(result.message || authCopy.genericError);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError(authCopy.genericError);
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="erp-auth">
        <div className="erp-auth-orb erp-auth-orb--1" />
        <div className="erp-auth-orb erp-auth-orb--2" />
        <div className="erp-auth-orb erp-auth-orb--3" />
        <div className="erp-auth-card">
          <a className="erp-auth-logo" href="https://ayakasir.petalytix.id">AyaKa$ir</a>
          <div className="erp-alert erp-alert--success" style={{ marginTop: 24 }}>
            {authCopy.registerSuccess}
          </div>
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
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

  return (
    <div className="erp-auth">
      <div className="erp-auth-orb erp-auth-orb--1" />
      <div className="erp-auth-orb erp-auth-orb--2" />
      <div className="erp-auth-orb erp-auth-orb--3" />
      <div className="erp-auth-card">
        <div className="erp-auth-logo">AyaKa$ir</div>
        <p className="erp-auth-subtitle">
          {authCopy.registerTitle}
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className="erp-alert erp-alert--error">{error}</div>}

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.fullNameLabel}</label>
            <input
              className="erp-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.businessNameLabel}</label>
            <input
              className="erp-input"
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              required
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.provinceLabel}</label>
            <select
              className="erp-input"
              value={province}
              onChange={(e) => {
                const nextProvince = e.target.value;
                setProvince(nextProvince);
                setCity("");
              }}
              required
            >
              <option value="" disabled>
                {authCopy.provincePlaceholder}
              </option>
              {provinceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.cityLabel}</label>
            <select
              className="erp-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled={!province}
            >
              <option value="" disabled>
                {authCopy.cityPlaceholder}
              </option>
              {cityOptions.map((item) => (
                <option key={`${province}-${item}`} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

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
            <label className="erp-label">{authCopy.phoneLabel}</label>
            <input
              className="erp-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="erp-input-group">
            <label className="erp-label">{authCopy.passwordLabel}</label>
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
            <label className="erp-label">{authCopy.pinLabel}</label>
            <input
              className="erp-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/\D/g, "").slice(0, 6);
                setPin(nextValue);
              }}
              placeholder={authCopy.pinPlaceholder}
              required
              autoComplete="off"
            />
          </div>

          <button
            className="erp-btn erp-btn--primary erp-btn--full"
            type="submit"
            disabled={loading}
          >
            {loading ? authCopy.loading : authCopy.registerButton}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--erp-muted)" }}>
          {authCopy.haveAccount}{" "}
          <a
            href={`/${locale}/app/login`}
            style={{ color: "var(--erp-primary)", fontWeight: 500 }}
          >
            {authCopy.signIn}
          </a>
        </p>
      </div>
    </div>
  );
}
