import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { Prisma } from "@prisma/client";
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

type RowOut = {
  brandId: string;
  brand: { id: string; name: string; slug: string } | null;
  clicks: number;
  assumedConv: number;
  aovEstimate: number;
  commissionRate: number;
  estimatedCommission: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const window = url.searchParams.get("window") ?? "30"; // "7" | "30"

    const convRaw = Number(url.searchParams.get("conv") ?? "0.02");
    const assumedConv = Number.isFinite(convRaw) && convRaw >= 0 ? convRaw : 0.02;

    const from = window === "7" ? daysAgo(6) : daysAgo(29);

    const groupByArgs = Prisma.validator<Prisma.AffiliateClickGroupByArgs>()({
      by: ["brandId"],
      where: { clickedAt: { gte: from } },
      _count: { _all: true },
      orderBy: { brandId: "asc" }, // required when using take
      take: 500,
    });

    const grouped = await prisma.affiliateClick.groupBy(groupByArgs);

    const groupedSorted = [...grouped].sort(
      (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
    );

    const top = groupedSorted.slice(0, 200);
    const brandIds = top.map((c) => c.brandId);

    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        defaultCommissionRate: true,
        aovEstimate: true,
      },
    });

    const map = new Map(brands.map((b) => [b.id, b]));

    const rows: RowOut[] = top.map((c) => {
      const b = map.get(c.brandId);
      const clickCount = Number(c._count?._all ?? 0);

      const aov = b?.aovEstimate ? Number(b.aovEstimate) : 0;
      const rate = b?.defaultCommissionRate ? Number(b.defaultCommissionRate) : 0;

      return {
        brandId: c.brandId,
        brand: b ? { id: b.id, name: b.name, slug: b.slug } : null,
        clicks: clickCount,
        assumedConv,
        aovEstimate: aov,
        commissionRate: rate,
        estimatedCommission: clickCount * assumedConv * aov * rate,
      };
    });

    const totals = {
      clicks: rows.reduce((sum, r) => sum + r.clicks, 0),
      estimatedCommission: rows.reduce((sum, r) => sum + r.estimatedCommission, 0),
    };

    return NextResponse.json({ ok: true, from, window, totals, rows });
 } catch (e) {
    return adminError(e);
  }
}
