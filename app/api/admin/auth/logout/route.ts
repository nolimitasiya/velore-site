import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeAdminSession } from "@/lib/auth/adminDbSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get("admin_authed")?.value;

  if (token) {
    await revokeAdminSession(token);
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_authed", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}