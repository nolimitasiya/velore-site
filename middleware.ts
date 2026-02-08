import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const launchMode = process.env.LAUNCH_MODE === "true"; // true = locked / gate

  // ---------------------------
  // PUBLIC LOCKDOWN (only when launchMode = true)
  // ---------------------------
  if (launchMode) {
    
    const isGate = pathname === "/";
    const isThanks = pathname === "/thanks" || pathname.startsWith("/thanks/");

    
    // ✅ allow admin + admin APIs during launch
const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
const isAdminApi = pathname.startsWith("/api/admin");

// ✅ allow brand portal + brand APIs too (optional but usually desired)
const isBrand = pathname === "/brand" || pathname.startsWith("/brand/");
const isBrandApi = pathname.startsWith("/api/brand");

    // pages you want visible during launch
    const isBrandApplyPage =
      pathname === "/brand-apply" ||
      pathname.startsWith("/brand-apply/") ||
      pathname === "/brands/apply" ||
      pathname.startsWith("/brands/apply/");

    const isNextAsset = pathname.startsWith("/_next");

    // ✅ allow specific public APIs during launch
    const isPublicApi =
      pathname === "/api/waitlist" ||
      pathname.startsWith("/api/waitlist/") ||
      pathname === "/api/brand-apply" ||
      pathname.startsWith("/api/brand-apply/");

    const isPublicFile =
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml";

    // ✅ allow all APIs if you prefer (you previously did this)
    // const isApi = pathname.startsWith("/api");


const allowPublic =
  isGate ||
  isThanks ||
  isBrandApplyPage ||
  isNextAsset ||
  isPublicApi ||
  isPublicFile ||
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
    // ✅ public brand application endpoint (yours)
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
