import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { Prisma } from "@prisma/client";

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

export async function GET(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

    const url = new URL(req.url);
    const window = url.searchParams.get("window") ?? "30";
    const from = window === "7" ? daysAgo(6) : daysAgo(29);

    const args = Prisma.validator<Prisma.AffiliateClickGroupByArgs>()({
      by: ["productId"],
      where: { brandId, clickedAt: { gte: from }, productId: { not: null } },
      _count: { _all: true },
      orderBy: { productId: "asc" },
      take: 2000,
    });

    const grouped = await prisma.affiliateClick.groupBy(args);

    const sorted = [...grouped].sort(
      (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
    );

    const top = sorted.slice(0, 20);
    const productIds = top.map((r) => r.productId!).filter(Boolean);

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, slug: true, affiliateUrl: true },
    });

    const map = new Map(products.map((p) => [p.id, p]));

    const rows = top.map((r) => ({
      productId: r.productId,
      product: map.get(r.productId!) ?? null,
      clicks: Number(r._count?._all ?? 0),
    }));

    return NextResponse.json({ ok: true, from, window, rows });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
