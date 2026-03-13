import { createHash, randomBytes, timingSafeEqual } from "crypto";

export function generatePasswordSalt() {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}${password}`, "utf8").digest("hex");
}

export function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
) {
  const actualHash = hashPassword(password, salt);
  const actualBuffer = Buffer.from(actualHash, "utf8");
  const expectedBuffer = Buffer.from(expectedHash, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
