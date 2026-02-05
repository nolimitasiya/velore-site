import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

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
    const { brandId } = await requireBrandContext();

    const today = startOfDay(new Date());
    const last7 = daysAgo(6);
    const last30 = daysAgo(29);

    const [cToday, c7, c30] = await Promise.all([
      prisma.affiliateClick.count({ where: { brandId, clickedAt: { gte: today } } }),
      prisma.affiliateClick.count({ where: { brandId, clickedAt: { gte: last7 } } }),
      prisma.affiliateClick.count({ where: { brandId, clickedAt: { gte: last30 } } }),
    ]);

    return NextResponse.json({
      ok: true,
      brandId,
      clicks: { today: cToday, last7: c7, last30: c30 },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
