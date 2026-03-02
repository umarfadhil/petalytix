import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isAyaKasir =
    host.startsWith("ayakasir.") || host.startsWith("ayakasir:");

  if (!isAyaKasir) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Rewrite bare / directly to /ayakasir/en (no redirect, avoids cache bypass issue)
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/ayakasir/en";
    return NextResponse.rewrite(url);
  }

  // Rewrite /en or /id (with optional subpath) to /ayakasir/en or /ayakasir/id
  const localeMatch = pathname.match(/^\/(en|id)(\/.*)?$/);
  if (localeMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/ayakasir${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|images/).*)"]
};
