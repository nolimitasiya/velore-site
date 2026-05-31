
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/images/")) return true;
  if (pathname.startsWith("/maps/")) return true;

  if (
    pathname === "/favicon.ico" ||
    pathname === "/icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  return /\.(png|jpg|jpeg|webp|svg|ico|css|js|map|txt|xml|json|geojson|topojson)$/.test(
    pathname
  );
}

function isAdminPage(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApi(pathname: string) {
  return pathname.startsWith("/api/admin");
}

function isBrandPage(pathname: string) {
  return pathname === "/brand" || pathname.startsWith("/brand/");
}

function isBrandApi(pathname: string) {
  return pathname.startsWith("/api/brand");
}

function isAccountPage(pathname: string) {
  return pathname === "/account" || pathname.startsWith("/account/");
}

function isAccountApi(pathname: string) {
  return pathname.startsWith("/api/account");
}

function isLaunchPublicPage(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/shipping-returns" ||
    pathname === "/b" ||
    pathname.startsWith("/b/") ||
    pathname === "/" ||
    pathname === "/contact" ||
    pathname === "/" ||
    pathname === "/cookie-policy" ||
    pathname === "/" ||
    pathname === "/terms" ||
    pathname === "/" ||
    pathname === "/privacy-policy" ||
    pathname === "/" ||
    pathname === "/ethics" ||
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/" ||
    pathname === "/thanks" ||
    pathname.startsWith("/thanks/") ||
    pathname === "/contact/thanks" ||
    pathname.startsWith("/contact/thanks/") ||
    pathname === "/brand-apply" ||
    pathname.startsWith("/brand-apply/") ||
    pathname === "/brands/apply" ||
    pathname.startsWith("/brands/apply/") ||
    pathname === "/categories" ||
    pathname.startsWith("/categories/") ||
    pathname === "/p" ||
    pathname.startsWith("/p/") ||
    pathname === "/out" ||
    pathname.startsWith("/out/") ||
    pathname === "/continent" ||
    pathname.startsWith("/continent/") ||
    pathname === "/sale" ||
    pathname.startsWith("/sale/") ||
    pathname === "/new-in" ||
    pathname.startsWith("/new-in/") ||
    pathname === "/search" ||
    pathname.startsWith("/search/") ||
    pathname === "/storefront" ||
    pathname.startsWith("/storefront/")||
    pathname === "/brands" ||
    pathname.startsWith("/brands/") ||
    pathname === "/newsletter/confirm" ||
    pathname.startsWith("/newsletter/confirm") ||
    pathname === "/newsletter/unsubscribe" ||
    pathname.startsWith("/newsletter/unsubscribe") ||
    pathname === "/newsletter/unsubscribed" ||
    pathname.startsWith("/newsletter/unsubscribed") ||
    pathname === "/diary" ||
    pathname.startsWith("/diary/")
    
    
  );
}

function isLaunchPublicApi(pathname: string) {
  return (
    pathname === "/api/waitlist" ||
    pathname.startsWith("/api/waitlist/") ||
    pathname === "/api/brand-apply" ||
    pathname.startsWith("/api/brand-apply/") ||
    pathname === "/api/contact" ||
    pathname.startsWith("/api/contact/") ||
    pathname.startsWith("/api/currency/") ||
    pathname.startsWith("/api/shopper-preferences/") ||
    pathname === "/api/search" ||
    pathname.startsWith("/api/search/") ||
    pathname.startsWith("/api/storefront/") ||
    pathname.startsWith("/api/account/") ||
    pathname.startsWith("/api/diary/")||
    pathname.startsWith("/api/newsletter/") ||
    pathname.startsWith("/api/clicks/")
  );
}

function isUnauthedAllowedRoute(pathname: string) {
  return (
    // admin auth
    pathname === "/admin/login" ||
    pathname === "/admin/forgot" ||
    pathname === "/admin/reset" ||
    pathname === "/api/admin/auth/login" ||
    pathname === "/api/admin/auth/logout" ||
    pathname === "/api/admin/auth/forgot" ||
    pathname === "/api/admin/auth/reset" ||

    // brand auth
    pathname === "/brand/login" ||
    pathname === "/brand/forgot" ||
    pathname === "/brand/reset" ||
    pathname === "/api/brand/auth/login" ||
    pathname === "/api/brand/auth/logout" ||
    pathname === "/api/brand/auth/forgot" ||
    pathname === "/api/brand/auth/reset" ||

    // shopper auth
    pathname === "/account/login" ||
    pathname === "/account/register" ||
    pathname === "/account/forgot" ||
    pathname === "/account/reset" ||
    pathname === "/api/account/auth/login" ||
    pathname === "/api/account/auth/logout" ||
    pathname === "/api/account/auth/register" ||
    pathname === "/api/account/auth/forgot" ||
    pathname === "/api/account/auth/reset" ||

    // onboarding / apply
    pathname === "/brand/onboarding" ||
    pathname === "/api/brand/onboarding" ||
    pathname === "/api/brand-apply" ||
    pathname.startsWith("/api/brand-apply/") ||

    // public utility APIs used before login
    pathname.startsWith("/api/currency/") ||
    pathname.startsWith("/api/shopper-preferences/")

    
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const launchMode = process.env.LAUNCH_MODE === "true";

  // Always allow assets and technical/public infrastructure routes
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }
  // ---------------------------
  // PUBLIC LOCKDOWN (launch mode)
  // ---------------------------
  if (launchMode) {
    const allowPublic =
      isLaunchPublicPage(pathname) ||
      isLaunchPublicApi(pathname) ||
      isAdminPage(pathname) ||
      isAdminApi(pathname) ||
      isBrandPage(pathname) ||
      isBrandApi(pathname) ||
      isAccountPage(pathname) ||   
      isAccountApi(pathname);       

    if (!allowPublic) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("locked", "1");
      url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  // ---------------------------
  // ADMIN / BRAND AUTH
  // ---------------------------
  const adminRoute = isAdminPage(pathname) || isAdminApi(pathname);
  const brandRoute = isBrandPage(pathname) || isBrandApi(pathname);
  const allowUnauthed = isUnauthedAllowedRoute(pathname);
  const accountRoute = isAccountPage(pathname) || isAccountApi(pathname);
  const isPublicAccountRoute = isUnauthedAllowedRoute(pathname);

  if (adminRoute && !allowUnauthed) {
    const authed = Boolean(req.cookies.get("admin_authed")?.value);

    if (!authed) {
      if (isAdminPage(pathname)) {
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

  if (brandRoute && !allowUnauthed) {
    const authed = Boolean(req.cookies.get("brand_authed")?.value);

    if (!authed) {
      if (isBrandPage(pathname)) {
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

  

  if (accountRoute && !isPublicAccountRoute) {
    const authed = Boolean(req.cookies.get("shopper_authed")?.value);
    if (!authed) {
      if (isAccountPage(pathname)) {
        const url = req.nextUrl.clone();
        url.pathname = "/account/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
      const res = NextResponse.json({ ok: false }, { status: 401 });
      res.headers.set("x-mw-block", "shopper");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml|api/cron).*)",
  ],
};