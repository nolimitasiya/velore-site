import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  // Allow Next internals + common static assets
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/images/")) return true;

  // Explicit public files
  if (
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  // Any static file extension
  return /\.(png|jpg|jpeg|webp|svg|ico|css|js|map|txt|xml)$/.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const launchMode = process.env.LAUNCH_MODE === "true"; // true = locked / gate

  // ✅ Always allow static/public assets (prevents favicon/icon being blocked)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ---------------------------
  // PUBLIC LOCKDOWN (only when launchMode = true)
  // ---------------------------
  if (launchMode) {
    const isGate = pathname === "/";
    const isThanks = pathname === "/thanks" || pathname.startsWith("/thanks/");

    // ✅ allow admin + admin APIs during launch
    const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
    const isAdminApi = pathname.startsWith("/api/admin");

    // ✅ allow brand portal + brand APIs during launch
    const isBrand = pathname === "/brand" || pathname.startsWith("/brand/");
    const isBrandApi = pathname.startsWith("/api/brand");

    // pages you want visible during launch
    const isBrandApplyPage =
      pathname === "/brand-apply" ||
      pathname.startsWith("/brand-apply/") ||
      pathname === "/brands/apply" ||
      pathname.startsWith("/brands/apply/");

    // ✅ allow specific public APIs during launch
    const isPublicApi =
      pathname === "/api/waitlist" ||
      pathname.startsWith("/api/waitlist/") ||
      pathname === "/api/brand-apply" ||
      pathname.startsWith("/api/brand-apply/");

    const allowPublic =
      isGate ||
      isThanks ||
      isBrandApplyPage ||
      isPublicApi ||
      isAdmin ||
      isAdminApi ||
      isBrand ||
      isBrandApi;

    if (!allowPublic) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("locked", "1");
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // ---------------------------
  // ADMIN / BRAND AUTH (ALWAYS ON)
  // ---------------------------
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin");

  const isBrandPage = pathname === "/brand" || pathname.startsWith("/brand/");
  const isBrandApi = pathname.startsWith("/api/brand");

  // ✅ routes that must be accessible without auth
  const allowUnauthed =
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout" ||
    pathname === "/brand/login" ||
    pathname === "/api/brand/auth/login" ||
    pathname === "/api/brand/auth/logout" ||
    pathname === "/brand/onboarding" ||
    pathname === "/api/brand/onboarding" ||
    pathname === "/api/brand-apply" ||
    pathname.startsWith("/api/brand-apply/");

  // Admin protection
  if ((isAdminPage || isAdminApi) && !allowUnauthed) {
    const authed = Boolean(req.cookies.get("admin_authed")?.value);
    if (!authed) {
      if (isAdminPage) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      const res = NextResponse.json({ ok: false }, { status: 401 });
      res.headers.set("x-mw-block", "admin");
      return res;
    }
  }

  // Brand protection
  if ((isBrandPage || isBrandApi) && !allowUnauthed) {
    const authed = Boolean(req.cookies.get("brand_authed")?.value);
    if (!authed) {
      if (isBrandPage) {
        const url = req.nextUrl.clone();
        url.pathname = "/brand/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      const res = NextResponse.json({ ok: false }, { status: 401 });
      res.headers.set("x-mw-block", "brand");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)",
  ],
};
