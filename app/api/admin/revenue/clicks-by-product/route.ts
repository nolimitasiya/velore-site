import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutRow = {
  productId: string;
  product: {
    id: string;
    title: string;
    slug: string;
    imageUrl: string;
    productType: string | null;
    price: string | null;
    currency: string;
    badges: string[];
    primaryColour: string | null;
    primaryStyle: string | null;
    priceBand: string | null;
  } | null;
  brand: { id: string; name: string; slug: string } | null;
  clicks: number;
};

function getPriceBand(price: number | null) {
  if (price == null || Number.isNaN(price)) return null;
  if (price < 50) return "Under 50";
  if (price < 100) return "50–99";
  if (price < 150) return "100–149";
  if (price < 200) return "150–199";
  return "200+";
}

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(500, Math.max(1, Number(url.searchParams.get("take") || 100)));

    const { gte, lt } = rangeWindow(range);

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["productId", "brandId"],
      where: {
        clickedAt: { gte, lt },
        productId: { not: null },
      },
      _count: { _all: true },
      orderBy: { brandId: "asc" },
      take: 5000,
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
        select: {
          id: true,
          title: true,
          slug: true,
          brandId: true,
          productType: true,
          price: true,
          currency: true,
          badges: true,
          images: {
            select: { url: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
          productColours: {
            select: {
              colour: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
          productStyles: {
            select: {
              style: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
        },
      }),
      prisma.brand.findMany({
        where: { id: { in: brandIds } },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const brandMap = new Map(brands.map((b) => [b.id, b]));

    const out: OutRow[] = top.map((r) => {
      const p = productMap.get(r.productId!);
      const b = brandMap.get(r.brandId);

      const numericPrice = p?.price != null ? Number(p.price) : null;

      return {
        productId: r.productId!,
        product: p
          ? {
              id: p.id,
              title: p.title,
              slug: p.slug,
              imageUrl: p.images?.[0]?.url ?? "",
              productType: p.productType ?? null,
              price: p.price ? p.price.toString() : null,
              currency: String(p.currency),
              badges: (p.badges ?? []) as string[],
              primaryColour: p.productColours?.[0]?.colour?.name ?? null,
              primaryStyle: p.productStyles?.[0]?.style?.name ?? null,
              priceBand: getPriceBand(numericPrice),
            }
          : null,
        brand: b
          ? {
              id: b.id,
              name: b.name,
              slug: b.slug,
            }
          : null,
        clicks: Number(r._count?._all ?? 0),
      };
    });

    return NextResponse.json({ ok: true, range, from: gte, to: lt, rows: out });
  } catch (e) {
    return adminError(e);
  }
}