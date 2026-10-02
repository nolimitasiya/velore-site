import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ShopperSessionRevocationReason,
} from "@prisma/client";

import {
  clearShopperSessionCookie,
  revokeCurrentShopperSession,
} from "@/lib/auth/ShopperSession";

import {
  ANALYTICS_SESSION_COOKIE,
} from "@/lib/analytics/session";

export async function POST(
  request: NextRequest
) {
  /*
   * Revoke the server-side session before
   * removing the browser credential.
   *
   * Logout remains safe and idempotent if
   * the cookie is already missing or the
   * session has already been revoked.
   */
  await revokeCurrentShopperSession(
    request,
    ShopperSessionRevocationReason.LOGOUT
  );

  const res =
    NextResponse.json({
      ok: true,
    });

  /*
   * Remove the shopper's opaque session
   * token from the browser.
   */
  clearShopperSessionCookie(res);

  /*
   * Authentication identity has changed.
   * The next anonymous analytics event
   * should start a fresh analytics session.
   */
  res.cookies.set(
    ANALYTICS_SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );

  return res;
}