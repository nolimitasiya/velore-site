import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (token !== process.env.ADMIN_IMPORT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.brandInvite.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true,
      company: { select: { name: true, slug: true } },
    },
    take: 100,
  });

  return NextResponse.json({ ok: true, invites });
}
