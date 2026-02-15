import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireBrandContext();
  const { searchParams } = new URL(req.url);
  const type = String(searchParams.get("type") || "TREND_SPOTLIGHT");

  const from = new Date(searchParams.get("from") || new Date().toISOString());
  const to = new Date(searchParams.get("to") || new Date(Date.now() + 1000*60*60*24*120).toISOString());

  const slots = await prisma.featureSlot.findMany({
    where: {
      type: type as any,
      startDate: { gte: from },
      endDate: { lte: to },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      capacity: true,
      bookedCount: true,
    },
  });

  const available = slots.map(s => ({
    ...s,
    remaining: Math.max(s.capacity - s.bookedCount, 0),
    isAvailable: s.bookedCount < s.capacity,
  }));

  return NextResponse.json({ ok: true, slots: available });
}
