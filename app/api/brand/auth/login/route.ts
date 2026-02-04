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

  // ✅ Option A: user -> brand via BrandMembership
  const membership = await prisma.brandMembership.findFirst({
    where: { userId: user.id },
    select: {
      role: true,
      brand: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { id: "asc" },
  });

  if (!membership?.brand) {
    return NextResponse.json({ ok: false, error: "No brand access" }, { status: 403 });
  }

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
