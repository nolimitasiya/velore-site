// app/api/admin/brand-invites/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (token !== process.env.ADMIN_IMPORT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.brandInvite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,

      // ✅ new world: invite belongs to Brand
      brandId: true,
      brand: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({ ok: true, invites });
}
