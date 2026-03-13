import { cookies } from "next/headers";
import {
  ERP_COOKIE_NAME,
  ErpSessionPayload,
  createErpSessionToken,
  verifyErpSessionToken,
} from "./erp-auth-token";

export async function createErpSession(payload: ErpSessionPayload) {
  return createErpSessionToken(payload);
}

export async function getErpSession() {
  const token = cookies().get(ERP_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifyErpSessionToken(token);
}

export function setErpSessionCookie(token: string) {
  cookies().set(ERP_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearErpSessionCookie() {
  cookies().set(ERP_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}
