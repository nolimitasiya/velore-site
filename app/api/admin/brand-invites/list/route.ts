import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();

    const invites = await prisma.brandInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        brandId: true,
        brand: { select: { name: true, slug: true } },
      },
    });

    return NextResponse.json({ ok: true, invites });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unauthorized" }, { status: 401 });
  }
}
