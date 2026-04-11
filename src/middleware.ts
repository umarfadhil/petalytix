import { NextRequest, NextResponse } from "next/server";
import { ERP_COOKIE_NAME, verifyErpSessionToken } from "@/lib/erp-auth-token";

// Add new product subdomains here. Key = subdomain prefix, value = app path segment.
const SUBDOMAIN_MAP: Record<string, string> = {
  ayakasir: "ayakasir",
};

// ERP auth routes that don't require authentication
const PUBLIC_APP_PATHS = [
  "/app/login",
  "/app/register",
  "/app/confirm",
  "/app/forgot-password",
  "/app/reset-password",
];

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  let matchedProduct: string | undefined;
  for (const [subdomain, appPath] of Object.entries(SUBDOMAIN_MAP)) {
    if (host.startsWith(`${subdomain}.`) || host.startsWith(`${subdomain}:`)) {
      matchedProduct = appPath;
      break;
    }
  }

  if (!matchedProduct) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Rewrite bare / directly to /<product>/id (default locale: Indonesian)
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${matchedProduct}/id`;
    return NextResponse.rewrite(url);
  }

  // Rewrite /en or /id (with optional subpath) to /<product>/en or /<product>/id
  const localeMatch = pathname.match(/^\/(en|id)(\/.*)?$/);
  if (localeMatch) {
    const locale = localeMatch[1];
    const subpath = localeMatch[2] || "";

    // Check if this is an ERP /app/* route that needs auth protection
    const isAppRoute = subpath.startsWith("/app");
    const isPublicAppRoute = PUBLIC_APP_PATHS.some(
      (p) => subpath === p || subpath.startsWith(p + "/")
    );

    if (isAppRoute && !isPublicAppRoute) {
      // Refresh Supabase session and check auth
      const token = request.cookies.get(ERP_COOKIE_NAME)?.value;
      const session = token ? await verifyErpSessionToken(token) : null;

      if (!session) {
        // Redirect to login (external URL on the subdomain)
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = `/${locale}/app/login`;
        return NextResponse.redirect(loginUrl);
      }

      // /app/office is OWNER-only and requires organizationId
      const isOfficeRoute = subpath.startsWith("/app/office");
      if (isOfficeRoute) {
        if (session.role !== "OWNER" || !session.organizationId) {
          const dashUrl = request.nextUrl.clone();
          dashUrl.pathname = `/${locale}/app/dashboard`;
          return NextResponse.redirect(dashUrl);
        }
      }

      // Authenticated — rewrite to internal path and carry the refreshed cookies
      const url = request.nextUrl.clone();
      url.pathname = `/${matchedProduct}${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Non-app route or public app route — just rewrite
    if (isAppRoute && isPublicAppRoute) {
      const token = request.cookies.get(ERP_COOKIE_NAME)?.value;
      const session = token ? await verifyErpSessionToken(token) : null;

      if (session) {
        const dashUrl = request.nextUrl.clone();
        dashUrl.pathname = `/${locale}/app/dashboard`;
        return NextResponse.redirect(dashUrl);
      }

      const url = request.nextUrl.clone();
      url.pathname = `/${matchedProduct}${pathname}`;
      return NextResponse.rewrite(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/${matchedProduct}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|images/).*)"],
};
