import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Contract acceptance is handled externally by Veilora Club's
 * legal provider.
 *
 * The founder verifies signed contracts and updates the
 * brand application's status to contract_signed.
 *
 * This legacy endpoint is intentionally disabled.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "CONTRACT_ACCEPTANCE_DISABLED",
    },
    {
      status: 410,
    },
  );
}