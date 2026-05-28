import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(req: Request, { params }: RouteProps) {
  try {
    await requireAdminSession();

    const { id } = await params;

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const { gte, lt } = rangeWindow(range);

    const post = await prisma.diaryPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        readCount: true,
        publishedAt: true,
        relatedProducts: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                currency: true,
                brand: {
                  select: { id: true, name: true, slug: true },
                },
                images: {
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { ok: false, error: "Diary post not found." },
        { status: 404 }
      );
    }

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["productId", "position"],
      where: {
        clickedAt: { gte, lt },
        sourcePage: "DIARY",
        diaryPostId: id,
        productId: { not: null },
      },
      _count: { _all: true },
    });

    const totalProductClicks = grouped.reduce(
      (sum, row) => sum + Number(row._count._all ?? 0),
      0
    );

    const rows = post.relatedProducts.map((item, index) => {
      const position = index + 1;

      const exactPositionClicks = grouped
        .filter((row) => row.productId === item.product.id && row.position === position)
        .reduce((sum, row) => sum + Number(row._count._all ?? 0), 0);

      const fallbackProductClicks = grouped
        .filter((row) => row.productId === item.product.id)
        .reduce((sum, row) => sum + Number(row._count._all ?? 0), 0);

      const clicks = exactPositionClicks || fallbackProductClicks;
      const share = totalProductClicks > 0 ? (clicks / totalProductClicks) * 100 : 0;

      return {
        position,
        clicks,
        share,
        product: {
          id: item.product.id,
          title: item.product.title,
          slug: item.product.slug,
          price: item.product.price ? item.product.price.toString() : null,
          currency: item.product.currency,
          imageUrl: item.product.images[0]?.url ?? null,
        },
        brand: item.product.brand,
      };
    });

    return NextResponse.json({
      ok: true,
      range,
      from: gte,
      to: lt,
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        readCount: post.readCount,
        publishedAt: post.publishedAt,
        productClicks: totalProductClicks,
        ctr: post.readCount > 0 ? (totalProductClicks / post.readCount) * 100 : 0,
      },
      rows,
    });
  } catch (e) {
    return adminError(e);
  }
}