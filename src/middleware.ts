import { NextRequest, NextResponse } from "next/server";

// Add new product subdomains here. Key = subdomain prefix, value = app path segment.
const SUBDOMAIN_MAP: Record<string, string> = {
  ayakasir: "ayakasir",
};

export function middleware(request: NextRequest) {
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
    const url = request.nextUrl.clone();
    url.pathname = `/${matchedProduct}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|images/).*)"]
};
