import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";

import { createAdminSession } from "@/lib/auth/adminDbSession";
import { rateLimit } from "@/lib/rateLimit";
import { verifyLoginPassword } from "@/lib/auth/passwordVerification";
import { recordLoginAudit } from "@/lib/security/loginAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    // 1. Validate credentials before counting login attempts.
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing credentials" },
        { status: 400 },
      );
    }

    // 2. Hash the email so the rate-limit key doesn't expose it.
    const emailKey = crypto.createHash("sha256").update(email).digest("hex");

    // 3. Limit login attempts to five per 15 minutes.
    const attemptLimit = await rateLimit({
      key: `admin_login:account:${emailKey}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!attemptLimit.ok) {
      await recordLoginAudit({
        type: "ADMIN_LOGIN_RATE_LIMITED",
        email,
        rateLimitResetAt: attemptLimit.resetAt,
      });
      const retryAfter = Math.max(
        1,
        Math.ceil((attemptLimit.resetAt.getTime() - Date.now()) / 1000),
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Too many login attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    const valid = await verifyLoginPassword(password, user?.password);

    if (!user || !valid) {
      await recordLoginAudit({
        type: "ADMIN_LOGIN_FAILED",
        email,
        adminId: user?.id,
      });
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // 6. Create a secure database-backed session.
    const token = await createAdminSession(user.id);
    await recordLoginAudit({
      type: "ADMIN_LOGIN_SUCCEEDED",
      email,
      adminId: user.id,
    });

    const res = NextResponse.json({ ok: true });

    res.cookies.set("admin_authed", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (error) {
    console.error("[admin-login] Login request failed");

    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
