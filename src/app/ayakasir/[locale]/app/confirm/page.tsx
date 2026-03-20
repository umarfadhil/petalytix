"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { getErpCopy } from "@/components/ayakasir/erp/i18n";
import { activateAccountAction } from "@/app/ayakasir/actions/auth";

type ConfirmStatus = "loading" | "success" | "error";

export default function ConfirmPage() {
  const params = useParams();
  const locale = (params.locale as string) || "id";
  const { auth: authCopy } = getErpCopy(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type") || "";
  const nextParam = searchParams.get("next");
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState(authCopy.confirming);
  const [isSignup, setIsSignup] = useState(false);

  const redirectTarget = useMemo(() => {
    const effectiveType =
      (!otpType && tokenHash?.startsWith("pkce_")) ? "recovery" : otpType;
    const defaultTarget =
      effectiveType === "recovery"
        ? `/${locale}/app/reset-password`
        : `/${locale}/app/login`;

    if (nextParam) {
      if (nextParam.startsWith("/")) {
        return nextParam;
      }

      try {
        const nextUrl = new URL(nextParam);
        if (typeof window !== "undefined" && nextUrl.origin === window.location.origin) {
          return `${nextUrl.pathname}${nextUrl.search}`;
        }
      } catch {
        // ignore invalid URL
      }
    }

    return defaultTarget;
  }, [nextParam, locale, otpType]);

  useEffect(() => {
    let isActive = true;

    async function verify() {
      const supabase = createBrowserClient();
      let verifyError: Error | null = null;
      let resolvedType = otpType;

      if (!resolvedType && typeof window !== "undefined") {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const hashType = hashParams.get("type");
        if (hashType) resolvedType = hashType;
      }

      // PKCE reset-password links from Supabase may arrive with type="" — infer from token prefix
      if (!resolvedType && tokenHash?.startsWith("pkce_")) {
        resolvedType = "recovery";
      }

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: resolvedType as "signup" | "recovery" | "invite" | "magiclink" | "email_change",
        });
        verifyError = error || null;
      } else if (typeof window !== "undefined") {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const code = searchParams.get("code");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          verifyError = error || null;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          verifyError = error || null;
        }
      }

      if (!tokenHash && !verifyError) {
        const { data } = await supabase.auth.getSession();
        if (!data.session && resolvedType === "recovery") {
          verifyError = new Error("Missing recovery session");
        }
      }

      if (!isActive) return;

      if (verifyError) {
        setStatus("error");
        setMessage(
          resolvedType === "recovery"
            ? authCopy.confirmRecoveryError
            : authCopy.confirmError
        );
        return;
      }

      const isRecovery = resolvedType === "recovery";

      if (!isRecovery) {
        // Activate user + tenant in public.users / tenants
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;
        if (email) {
          await activateAccountAction(email);
        }
        if (isActive) setIsSignup(true);
      }

      setStatus("success");
      setMessage(
        isRecovery
          ? authCopy.confirmRecoverySuccess
          : authCopy.confirmActivated
      );

      if (isRecovery) {
        router.replace(redirectTarget);
      }
      // For signup: stay on page — user clicks the login button manually
    }

    verify();
    return () => {
      isActive = false;
    };
  }, [tokenHash, otpType, authCopy, router, redirectTarget]);

  return (
    <div className="erp-auth">
      <div className="erp-auth-orb erp-auth-orb--1" />
      <div className="erp-auth-orb erp-auth-orb--2" />
      <div className="erp-auth-orb erp-auth-orb--3" />
      <div className="erp-auth-card">
        <a className="erp-auth-logo" href="https://ayakasir.petalytix.id">AyaKa$ir</a>
        <p className="erp-auth-subtitle">{authCopy.confirmTitle}</p>

        <div
          className={`erp-alert ${
            status === "error" ? "erp-alert--error" : status === "success" ? "erp-alert--success" : ""
          }`}
        >
          {message}
        </div>

        {status === "success" && isSignup && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--erp-muted)", marginBottom: 16 }}>
              {authCopy.confirmActivatedHint}
            </p>
            <a
              href={`/${locale}/app/login`}
              className="erp-btn erp-btn--primary"
              style={{ display: "inline-block", textDecoration: "none" }}
            >
              {authCopy.confirmGoToLogin}
            </a>
          </div>
        )}

        {(status === "error" || (status === "success" && !isSignup)) && (
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 14 }}>
            <a
              href={redirectTarget}
              style={{ color: "var(--erp-primary)", fontWeight: 500 }}
            >
              {redirectTarget.includes("reset-password")
                ? authCopy.goToResetPassword
                : authCopy.backToLogin}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
