import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutRow = {
  styleId: string;
  styleName: string;
  styleSlug: string;
  clicks: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 20)));

    const { gte, lt } = rangeWindow(range);

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["productId"],
      where: {
        clickedAt: { gte, lt },
        productId: { not: null },
      },
      _count: { _all: true },
      orderBy: { productId: "asc" },
      take: 5000,
    });

    const clicksByProductId = new Map<string, number>();
    for (const row of grouped) {
      if (!row.productId) continue;
      clicksByProductId.set(row.productId, Number(row._count?._all ?? 0));
    }

    const productIds = [...clicksByProductId.keys()];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        productStyles: {
          select: {
            style: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    const totals = new Map<string, OutRow>();

    for (const product of products) {
      const productClicks = clicksByProductId.get(product.id) ?? 0;
      if (!productClicks) continue;

      for (const ps of product.productStyles) {
        const style = ps.style;
        const existing = totals.get(style.id);

        if (existing) {
          existing.clicks += productClicks;
        } else {
          totals.set(style.id, {
            styleId: style.id,
            styleName: style.name,
            styleSlug: style.slug,
            clicks: productClicks,
          });
        }
      }
    }

    const rows = [...totals.values()]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, take);

    return NextResponse.json({
      ok: true,
      range,
      window: { gte, lt },
      rows,
    });
  } catch (e) {
    return adminError(e);
  }
}