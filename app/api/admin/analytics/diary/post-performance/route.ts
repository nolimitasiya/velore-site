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
    const { gte, lt } = rangeWindow(range);

    const posts = await prisma.diaryPost.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        readCount: true,
        publishedAt: true,
      },
    });

    const groupedClicks = await prisma.affiliateClick.groupBy({
      by: ["diaryPostId"],
      where: {
        clickedAt: { gte, lt },
        sourcePage: "DIARY",
        diaryPostId: { not: null },
      },
      _count: { _all: true },
    });

    const clickMap = new Map(
      groupedClicks.map((row) => [row.diaryPostId, Number(row._count._all ?? 0)])
    );

    const rows = posts
      .map((post) => {
        const productClicks = clickMap.get(post.id) ?? 0;
        const ctr = post.readCount > 0 ? (productClicks / post.readCount) * 100 : 0;

        return {
          ...post,
          productClicks,
          ctr,
        };
      })
      .sort((a, b) => b.productClicks - a.productClicks);

    return NextResponse.json({ ok: true, range, from: gte, to: lt, rows });
  } catch (e) {
    return adminError(e);
  }
}