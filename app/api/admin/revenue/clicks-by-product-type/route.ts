import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { parseRange, rangeWindow } from "@/lib/revenue/ranges";
import { ProductType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OutRow = {
  productType: ProductType | null;
  clicks: number;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(50, Math.max(1, Number(url.searchParams.get("take") || 20)));

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

    const productIds = grouped.map((r) => r.productId).filter((v): v is string => Boolean(v));

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        productType: true,
      },
    });

    const productTypeMap = new Map(products.map((p) => [p.id, p.productType ?? null]));
    const totals = new Map<string, number>();

    for (const row of grouped) {
      if (!row.productId) continue;
      const productType = productTypeMap.get(row.productId) ?? null;
      const key = productType ?? "__UNKNOWN__";
      totals.set(key, (totals.get(key) ?? 0) + Number(row._count?._all ?? 0));
    }

    const rows: OutRow[] = [...totals.entries()]
      .map(([key, clicks]) => ({
        productType: key === "__UNKNOWN__" ? null : (key as ProductType),
        clicks,
      }))
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