import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutRow = {
  productId: string;
  product: { id: string; title: string; slug: string } | null;
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

    // product-level clicks only
    const grouped = await prisma.affiliateClick.groupBy({
      by: ["productId", "brandId"],
      where: {
        clickedAt: { gte, lt },
        productId: { not: null },
      },
      _count: { _all: true },
      orderBy: { brandId: "asc" },
      take: 500,
    });

    const sorted = [...grouped].sort(
      (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
    );

    const top = sorted.slice(0, take);

    const productIds = top.map((r) => r.productId!).filter(Boolean);
    const brandIds = top.map((r) => r.brandId);

    const [products, brands] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, slug: true, brandId: true },
      }),
      prisma.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const out: OutRow[] = top.map((r) => ({
      productId: r.productId!,
      product: (() => {
        const p = productMap.get(r.productId!);
        return p ? { id: p.id, title: p.title, slug: p.slug } : null;
      })(),
      brand: brandMap.get(r.brandId)
        ? { id: r.brandId, name: brandMap.get(r.brandId)!.name, slug: brandMap.get(r.brandId)!.slug }
        : null,
      clicks: Number(r._count?._all ?? 0),
    }));

    return NextResponse.json({ ok: true, range, from: gte, to: lt, rows: out });
  } catch (e) {
    return adminError(e);
  }
}