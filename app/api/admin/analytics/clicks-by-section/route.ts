import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutRow = {
  sectionId: string | null;
  sectionKey: string | null;
  sectionTitle: string | null;
  sectionType: string | null;
  targetCountryCode: string | null;
  clicks: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") || 50)));

    const { gte, lt } = rangeWindow(range);

    const grouped = await prisma.affiliateClick.groupBy({
      by: ["sectionId", "sectionKey"],
      where: {
        clickedAt: { gte, lt },
        sectionKey: { not: null },
      },
      _count: { _all: true },
      orderBy: { sectionKey: "asc" },
      take: 1000,
    });

    const sorted = [...grouped]
      .map((r) => ({
        sectionId: r.sectionId,
        sectionKey: r.sectionKey,
        clicks: Number(r._count?._all ?? 0),
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, take);

    const sectionIds = sorted
      .map((r) => r.sectionId)
      .filter((v): v is string => Boolean(v));

    const sections = sectionIds.length
      ? await prisma.storefrontSection.findMany({
          where: { id: { in: sectionIds } },
          select: {
            id: true,
            key: true,
            title: true,
            type: true,
            targetCountryCode: true,
          },
        })
      : [];

    const sectionMap = new Map(sections.map((s) => [s.id, s]));

    const rows: OutRow[] = sorted.map((r) => {
      const section = r.sectionId ? sectionMap.get(r.sectionId) : null;

      return {
        sectionId: r.sectionId,
        sectionKey: section?.key ?? r.sectionKey ?? null,
        sectionTitle: section?.title ?? r.sectionKey ?? "Unknown section",
        sectionType: section?.type ?? null,
        targetCountryCode: section?.targetCountryCode ?? null,
        clicks: r.clicks,
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