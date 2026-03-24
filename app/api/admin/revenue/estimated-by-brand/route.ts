import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_COMMISSION_RATE = 0.15;
const DEFAULT_AOV = 75;
const DEFAULT_CONVERSION_RATE = 0.02;

type OutRow = {
  brandId: string;
  brand: {
    id: string;
    name: string;
    slug: string;
  } | null;
  clicks: number;
  assumedConversionRate: number;
  commissionRate: number;
  aov: number;
  estimatedCommission: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || 20)));

    const { gte, lt } = rangeWindow(range);

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["brandId"],
      where: {
        clickedAt: { gte, lt },
      },
      _count: { _all: true },
      orderBy: { brandId: "asc" },
      take: 5000,
    });

    const brandIds = grouped.map((r) => r.brandId);

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

    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const rows: OutRow[] = grouped
      .map((r) => {
        const brand = brandMap.get(r.brandId) ?? null;
        const clicks = Number(r._count?._all ?? 0);

        const commissionRate =
          brand?.defaultCommissionRate != null
            ? Number(brand.defaultCommissionRate)
            : DEFAULT_COMMISSION_RATE;

        const aov =
          brand?.aovEstimate != null
            ? Number(brand.aovEstimate)
            : DEFAULT_AOV;

        const estimatedCommission =
          clicks * DEFAULT_CONVERSION_RATE * aov * commissionRate;

        return {
          brandId: r.brandId,
          brand: brand
            ? {
                id: brand.id,
                name: brand.name,
                slug: brand.slug,
              }
            : null,
          clicks,
          assumedConversionRate: DEFAULT_CONVERSION_RATE,
          commissionRate,
          aov,
          estimatedCommission,
        };
      })
      .sort((a, b) => b.estimatedCommission - a.estimatedCommission)
      .slice(0, take);

    return NextResponse.json({
      ok: true,
      range,
      window: { gte, lt },
      assumptions: {
        defaultCommissionRate: DEFAULT_COMMISSION_RATE,
        defaultAov: DEFAULT_AOV,
        defaultConversionRate: DEFAULT_CONVERSION_RATE,
      },
      rows,
    });
  } catch (e) {
    return adminError(e);
  }
}