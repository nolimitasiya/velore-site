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
      by: ["position"],
      where: {
        clickedAt: { gte, lt },
        position: { not: null },
      },
      _count: { _all: true },
      orderBy: { position: "asc" },
    });

    const rows = grouped
      .map((r) => ({
        position: r.position,
        clicks: Number(r._count?._all ?? 0),
      }))
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
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