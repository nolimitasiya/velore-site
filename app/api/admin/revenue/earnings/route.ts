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

    const rows = await prisma.affiliateEarning.findMany({
      where: { month },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        brandId: true,
        month: true,
        amount: true,
        currency: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
        brand: { select: { id: true, name: true, slug: true } },
      },
      take: 500,
    });

    // total confirmed earnings for that month (note: assumes same currency, or you’ll sum by currency later)
    const totals = rows.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.amount += Number(r.amount);
        return acc;
      },
      { count: 0, amount: 0 }
    );

    return NextResponse.json({ ok: true, month, totals, rows });
   } catch (e) {
    return adminError(e);
  }
}
