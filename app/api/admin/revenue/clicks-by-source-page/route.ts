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

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["sourcePage"],
      where: {
        clickedAt: { gte, lt },
        sourcePage: { not: null },
      },
      _count: { _all: true },
      orderBy: { sourcePage: "asc" },
    });

    const rows = grouped
      .map((r) => ({
        sourcePage: r.sourcePage,
        clicks: Number(r._count?._all ?? 0),
      }))
      .sort((a, b) => b.clicks - a.clicks);

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