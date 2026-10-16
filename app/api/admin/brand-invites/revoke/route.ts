import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing id" },
      { status: 400 }
    );
  }

  try {
    // Only revoke invitations that have not already been used or revoked.
    // updateMany makes this operation safe under concurrent requests.
    const result = await prisma.brandInvite.updateMany({
      where: {
        id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invitation not found or already used/revoked.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-brand-invite-revoke] Failed to revoke invitation");

    return NextResponse.json(
      { ok: false, error: "Failed to revoke invitation." },
      { status: 500 }
    );
  }
}