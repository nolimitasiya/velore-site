import { NextResponse } from "next/server";
import { isAllowedBrandCurrency } from "@/lib/currency/codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const code = String(body.currency || "")
    .trim()
    .toUpperCase();

  if (!isAllowedBrandCurrency(code)) {
    return NextResponse.json(
      { ok: false, error: "Invalid currency" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("vc_currency", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  res.cookies.set("dalra_currency", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
