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
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 20)));

    const { gte, lt } = rangeWindow(range);

    const grouped = await prisma.affiliateClick.groupBy({
  by: ["diaryPostId", "productId", "brandId", "position"],
  where: {
    clickedAt: { gte, lt },
    sourcePage: "DIARY",
    diaryPostId: { not: null },
    productId: { not: null },
  },
  _count: { _all: true },
});

    const top = grouped
      .sort((a, b) => Number(b._count._all) - Number(a._count._all))
      .slice(0, take);

    const diaryPostIds = top.map((r) => r.diaryPostId!).filter(Boolean);
    const productIds = top.map((r) => r.productId!).filter(Boolean);
    const brandIds = top.map((r) => r.brandId).filter(Boolean);

    const [posts, products, brands] = await Promise.all([
      prisma.diaryPost.findMany({
        where: { id: { in: diaryPostIds } },
        select: { id: true, title: true, slug: true, readCount: true },
      }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          currency: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      }),
      prisma.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const postMap = new Map(posts.map((p) => [p.id, p]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const rows = top.map((row) => {
      const post = postMap.get(row.diaryPostId!);
      const product = productMap.get(row.productId!);
      const brand = brandMap.get(row.brandId);

      return {
        diaryPostId: row.diaryPostId,
        productId: row.productId,
        brandId: row.brandId,
        position: row.position,
        clicks: Number(row._count._all ?? 0),
        post,
        product: product
          ? {
              id: product.id,
              title: product.title,
              slug: product.slug,
              price: product.price ? product.price.toString() : null,
              currency: product.currency,
              imageUrl: product.images[0]?.url ?? null,
            }
          : null,
        brand,
      };
    });

    return NextResponse.json({ ok: true, range, from: gte, to: lt, rows });
  } catch (e) {
    return adminError(e);
  }
}