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
      by: ["isExpandedPageOne", "pageNumber"],
      where: {
        clickedAt: { gte, lt },
        pageNumber: { not: null },
      },
      _count: { _all: true },
      orderBy: [{ pageNumber: "asc" }, { isExpandedPageOne: "asc" }],
    });

    const rows = grouped.map((r) => {
      let label = "Other";

      if (r.pageNumber === 1 && r.isExpandedPageOne === false) {
        label = "Page 1 (default 24)";
      } else if (r.pageNumber === 1 && r.isExpandedPageOne === true) {
        label = "Page 1 (expanded 48)";
      } else if ((r.pageNumber ?? 0) >= 2) {
        label = `Page ${r.pageNumber}`;
      }

      return {
        pageNumber: r.pageNumber,
        isExpandedPageOne: r.isExpandedPageOne,
        label,
        clicks: Number(r._count?._all ?? 0),
      };
    });

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