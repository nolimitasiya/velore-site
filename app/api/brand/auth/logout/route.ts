import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeBrandSession } from "@/lib/auth/brandDbSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get("brand_authed")?.value;

  if (token) {
    await revokeBrandSession(token);
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("brand_authed", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  res.cookies.set("brand_id", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}