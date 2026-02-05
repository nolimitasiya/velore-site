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

type OutRow = {
  brandId: string;
  brand: { id: string; name: string; slug: string } | null;
  clicks: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const window = url.searchParams.get("window") ?? "30"; // "7" | "30"
    const from = window === "7" ? daysAgo(6) : daysAgo(29);

    const groupByArgs = Prisma.validator<Prisma.AffiliateClickGroupByArgs>()({
      by: ["brandId"],
      where: { clickedAt: { gte: from } },
      _count: { _all: true },
      orderBy: { brandId: "asc" }, // required when using take
      take: 500,
    });

    const grouped = await prisma.affiliateClick.groupBy(groupByArgs);

    // sort by click count in JS (Prisma typings don’t like _count orderBy)
    const sorted = [...grouped].sort(
      (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
    );

    const top = sorted.slice(0, 100);
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

    return NextResponse.json({ ok: true, from, window, rows: out });
    } catch (e) {
    return adminError(e);
  }
}

