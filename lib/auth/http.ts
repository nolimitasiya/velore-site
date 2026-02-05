import { NextResponse } from "next/server";

export function adminError(e: any) {
  const msg = e?.message ?? "Error";
  const status = msg === "UNAUTHENTICATED" ? 401 : 500;
  return NextResponse.json({ ok: false, error: msg }, { status });
}
