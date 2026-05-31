// app/api/admin/snapshots/daily/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [brandCount, productCount] = await Promise.all([
    prisma.brand.count({ where: { affiliateStatus: "ACTIVE" } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);

  await prisma.platformSnapshot.upsert({
    where: { date: today },
    update: { brandCount, productCount },
    create: { date: today, brandCount, productCount },
  });

  return NextResponse.json({ ok: true, date: today, brandCount, productCount });
}