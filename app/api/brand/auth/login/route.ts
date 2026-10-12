import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { verifyLoginPassword } from "@/lib/auth/passwordVerification";

import { createBrandSession } from "@/lib/auth/brandDbSession";
import { rateLimit } from "@/lib/rateLimit";
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

    // 1. Validate credentials.
    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Missing credentials" },
        { status: 400 },
      );
    }

    // 2. Hash email before using it as a rate-limit key.
    const emailKey = crypto.createHash("sha256").update(email).digest("hex");

    // 3. Limit login attempts.
    const attemptLimit = await rateLimit({
      key: `brand_login:account:${emailKey}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!attemptLimit.ok) {
      await recordLoginAudit({
        type: "BRAND_LOGIN_RATE_LIMITED",
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

    // 4. Find the user.
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
      },
    });
    // 5. Verify password.
    const valid = await verifyLoginPassword(password, user?.password);

    if (!user || !valid) {
      await recordLoginAudit({
        type: "BRAND_LOGIN_FAILED",
        email,
        userId: user?.id,
      });
      return NextResponse.json(
        { ok: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // 6. Fetch all brand memberships.
    const memberships = await prisma.brandMembership.findMany({
      where: { userId: user.id },
      select: {
        role: true,
        brand: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    const validMemberships = memberships.filter(
      (membership) => membership.brand?.id,
    );

    if (validMemberships.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No brand access" },
        { status: 403 },
      );
    }

    // 7. Require explicit selection for multiple brands.
    if (validMemberships.length > 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Multiple brands found. Brand selection required.",
          brands: validMemberships.map((membership) => ({
            id: membership.brand.id,
            slug: membership.brand.slug,
            name: membership.brand.name,
            role: membership.role,
          })),
        },
        { status: 409 },
      );
    }

    // 8. Create a secure database-backed session.
    const membership = validMemberships[0];

    const token = await createBrandSession(user.id);
    await recordLoginAudit({
      type: "BRAND_LOGIN_SUCCEEDED",
      email,
      userId: user.id,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,
      },
      brand: {
        id: membership.brand.id,
        slug: membership.brand.slug,
        name: membership.brand.name,
      },
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookies.set("brand_authed", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    res.cookies.set("brand_id", membership.brand.id, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    console.error("[brand-login] Login request failed");

    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
