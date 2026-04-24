import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutRow = {
  brandId: string;
  brand: { id: string; name: string; slug: string } | null;
  clicks: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(500, Math.max(1, Number(url.searchParams.get("take") || 100)));

    const { gte, lt } = rangeWindow(range);

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["brandId"],
      where: { clickedAt: { gte, lt } },
      _count: { _all: true },
      // Prisma groupBy ordering support can be finicky; keep your proven pattern:
      orderBy: { brandId: "asc" },
      take: 500,
    });

    const sorted = [...grouped].sort(
      (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
    );

    const top = sorted.slice(0, take);
    const brandIds = top.map((r) => r.brandId);

    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true, slug: true },
    });

    const map = new Map(brands.map((b) => [b.id, b]));

    const out: OutRow[] = top.map((r) => ({
      brandId: r.brandId,
      brand: map.get(r.brandId) ?? null,
      clicks: Number(r._count?._all ?? 0),
    }));

    return NextResponse.json({ ok: true, range, from: gte, to: lt, rows: out });
  } catch (e) {
    return adminError(e);
  }
}