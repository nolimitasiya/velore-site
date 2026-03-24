import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(Number(url.searchParams.get("take") ?? 80), 300);

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

    const sorted = grouped
      .map((g) => ({
        countryCode: g.shopperCountryCode!,
        clicks: Number(g._count._all ?? 0),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, take);

    return NextResponse.json({
      ok: true,
      range,
      dimension: "shopper_preference_country",
      window: { gte, lt },
      rows: sorted,
    });
  } catch (e) {
    return adminError(e);
  }
}