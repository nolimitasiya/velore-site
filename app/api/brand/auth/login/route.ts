import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  }

  // ✅ deterministic: fetch all memberships
  const memberships = await prisma.brandMembership.findMany({
    where: { userId: user.id },
    select: {
      role: true,
      brand: { select: { id: true, slug: true, name: true } },
    },
  });

  const validMemberships = memberships.filter((m) => m.brand?.id);

  if (validMemberships.length === 0) {
    return NextResponse.json({ ok: false, error: "No brand access" }, { status: 403 });
  }

  // ✅ if more than 1 brand, force explicit selection (safer than guessing)
  if (validMemberships.length > 1) {
    return NextResponse.json(
      {
        ok: false,
        error: "Multiple brands found. Brand selection required.",
        brands: validMemberships.map((m) => ({
          id: m.brand.id,
          slug: m.brand.slug,
          name: m.brand.name,
          role: m.role,
        })),
      },
      { status: 409 }
    );
  }

  const membership = validMemberships[0];

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: membership.role },
    brand: { id: membership.brand.id, slug: membership.brand.slug, name: membership.brand.name },
  });

  const isProd = process.env.NODE_ENV === "production";

  res.cookies.set("brand_authed", user.id, {
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
}
