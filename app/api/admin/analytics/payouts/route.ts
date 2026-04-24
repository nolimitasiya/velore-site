import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { toMonthStartUTC } from "@/lib/date/month";
import { adminError } from "@/lib/auth/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month");

    if (!monthParam) {
      return NextResponse.json({ ok: false, error: "month is required" }, { status: 400 });
    }

    const month = toMonthStartUTC(monthParam);

    const rows = await prisma.brandPayout.findMany({
      where: { month },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        brandId: true,
        month: true,
        status: true,
        method: true,
        notes: true,
        updatedAt: true,
        createdAt: true,
        brand: { select: { id: true, name: true, slug: true } },
      },
      take: 500,
    });

    return NextResponse.json({ ok: true, month, rows });
  } catch (e) {
    return adminError(e);
  }
}
