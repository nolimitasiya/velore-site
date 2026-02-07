import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const launchMode = process.env.LAUNCH_MODE === "true"; // true = locked / gate
  console.log("PROD LAUNCH_MODE:", process.env.LAUNCH_MODE);

  // ---------------------------
  // PUBLIC LOCKDOWN (only when launchMode = true)
  // ---------------------------
  if (launchMode) {
    const isGate = pathname === "/";

    // ✅ allow brand apply routes during launch
    const isBrandApply =
    
      pathname === "/brands/apply" ||
      pathname.startsWith("/brands/apply/");

    const isNextAsset = pathname.startsWith("/_next");
    const isApi = pathname.startsWith("/api");
    const isPublicFile =
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml";

    const allowPublic =
      isGate || isBrandApply || isNextAsset || isApi || isPublicFile;
      
      

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

  const allowUnauthed =
    pathname === "/admin/login" ||
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout" ||
    pathname === "/brand/login" ||
    pathname === "/api/brand/auth/login" ||
    pathname === "/api/brand/auth/logout" ||
    pathname === "/brand/onboarding" ||
    pathname === "/api/brand/onboarding";

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
      return NextResponse.json({ ok: false }, { status: 401 });
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
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
