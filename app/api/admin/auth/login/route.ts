import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing credentials" }, { status: 400 });
    }

    // quick environment sanity (prints in Vercel function logs)
    console.log("[admin-login] NODE_ENV:", process.env.NODE_ENV);
    console.log("[admin-login] DATABASE_URL exists:", Boolean(process.env.DATABASE_URL));
    console.log("[admin-login] DIRECT_URL exists:", Boolean(process.env.DIRECT_URL));

    const user = await prisma.adminUser.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set("admin_authed", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch (err: any) {
    console.error("[admin-login] ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Server error", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
