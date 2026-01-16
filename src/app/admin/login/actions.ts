"use server";

import { createSession, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";

type LoginState = { ok: boolean; message: string };

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const adminEmail = process.env.ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";

  if (!adminEmail || !adminPassword) {
    return {
      ok: false,
      message: "Admin credentials are not configured."
    };
  }

  if (!safeEqual(email, adminEmail) || !safeEqual(password, adminPassword)) {
    return { ok: false, message: "Invalid email or password." };
  }

  const token = await createSession(email);
  setSessionCookie(token);
  redirect("/admin");
}
