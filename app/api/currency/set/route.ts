import { NextResponse } from "next/server";
import { Currency } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.currency || "").toUpperCase();

  const ok = (Object.values(Currency) as string[]).includes(code);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid currency" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true });

  // ✅ shopper currency (used by categories / product pages)
  res.cookies.set("vc_currency", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // ✅ legacy / internal (used by LocationSwitcher)
  res.cookies.set("dalra_currency", code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
