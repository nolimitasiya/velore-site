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
  countryCode: string;
  clicks: number;
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
      by: ["shopperCountryCode"],
      where: {
        clickedAt: { gte, lt },
        shopperCountryCode: { not: null },
      },
      _count: { _all: true },
      orderBy: { shopperCountryCode: "asc" },
      take: 5000,
    });

    const rows: OutRow[] = grouped
      .map((r) => {
        const clicks = Number(r._count?._all ?? 0);

        return {
          countryCode: r.shopperCountryCode!,
          clicks,
          estimatedCommission:
            clicks * DEFAULT_CONVERSION_RATE * DEFAULT_AOV * DEFAULT_COMMISSION_RATE,
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
