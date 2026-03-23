"use client";

import { usePathname } from "next/navigation";

/**
 * Returns the base path prefix for AyaKasir routes.
 *
 * On the subdomain (ayakasir.petalytix.id), Next.js middleware rewrites
 * /{locale}/... → /ayakasir/{locale}/..., so the browser path has no prefix.
 * On localhost, there's no subdomain so the browser path already contains /ayakasir.
 *
 * Returns "/ayakasir" on localhost, "" on the subdomain.
 */
export function useBasePath(): string {
  const pathname = usePathname();
  return pathname.startsWith("/ayakasir") ? "/ayakasir" : "";
}
