import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  const isBrandPage = pathname.startsWith("/brand");
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

  // ✅ Admin protection
  if ((isAdminPage || isAdminApi) && !allowUnauthed) {
    const authed = Boolean(req.cookies.get("admin_authed")?.value);
    if (!authed) {
      if (isAdminPage) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // ✅ Brand protection
  if ((isBrandPage || isBrandApi) && !allowUnauthed) {
    const authed = Boolean(req.cookies.get("brand_authed")?.value);
    if (!authed) {
      if (isBrandPage) {
        const url = req.nextUrl.clone();
        url.pathname = "/brand/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/brand/:path*", "/api/brand/:path*"],
};
