import {
  NextResponse,
} from "next/server";

import {
  ANALYTICS_SESSION_COOKIE,
} from "@/lib/analytics/session";

export async function POST() {
  const res =
    NextResponse.json({
      ok: true,
    });

  /*
   * Remove authenticated shopper.
   */
  res.cookies.set(
    "shopper_authed",
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite:
        "lax",
      path:
        "/",
      maxAge:
        0,
    }
  );

  /*
   * Logout also changes analytics
   * identity.
   *
   * The next anonymous event should
   * therefore start a new session.
   */
  res.cookies.set(
    ANALYTICS_SESSION_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite:
        "lax",
      path:
        "/",
      maxAge:
        0,
    }
  );

  return res;
}