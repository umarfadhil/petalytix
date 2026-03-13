import { JWTPayload, SignJWT, jwtVerify } from "jose";

export const ERP_COOKIE_NAME = "ayakasir_erp_session";

export interface ErpSessionPayload extends JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: "OWNER" | "CASHIER";
  name: string;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set.");
  }
  return new TextEncoder().encode(secret);
}

export async function createErpSessionToken(payload: ErpSessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyErpSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as ErpSessionPayload;
  } catch {
    return null;
  }
}
