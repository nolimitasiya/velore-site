import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = startOfDay(new Date());
  x.setDate(x.getDate() - n);
  return x;
}

export async function GET() {
  try {
    await requireAdminSession();

    const today = startOfDay(new Date());
    const last7 = daysAgo(6);
    const last30 = daysAgo(29);

    const [cToday, c7, c30] = await Promise.all([
      prisma.affiliateClick.count({ where: { clickedAt: { gte: today } } }),
      prisma.affiliateClick.count({ where: { clickedAt: { gte: last7 } } }),
      prisma.affiliateClick.count({ where: { clickedAt: { gte: last30 } } }),
    ]);

    return NextResponse.json({
      ok: true,
      clicks: { today: cToday, last7: c7, last30: c30 },
    });
  } catch (e) {
    return adminError(e);
  }
}
