import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();

    const wToday = rangeWindow("today");
    const w7 = rangeWindow("7d");
    const w30 = rangeWindow("30d");

    const [cToday, c7, c30] = await Promise.all([
      prisma.affiliateClick.count({ where: { clickedAt: { gte: wToday.gte, lt: wToday.lt } } }),
      prisma.affiliateClick.count({ where: { clickedAt: { gte: w7.gte, lt: w7.lt } } }),
      prisma.affiliateClick.count({ where: { clickedAt: { gte: w30.gte, lt: w30.lt } } }),
    ]);

    return NextResponse.json({
      ok: true,
      clicks: { today: cToday, last7: c7, last30: c30 },
    });
  } catch (e) {
    return adminError(e);
  }
}