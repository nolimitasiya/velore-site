import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { adminError } from "@/lib/auth/http";
import { rangeWindow, customRangeWindow } from "@/lib/revenue/ranges";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const url = new URL(req.url);
    const range = url.searchParams.get("range") ?? "30d";
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const wToday = rangeWindow("today");
    const w7 = rangeWindow("7d");
    const w30 = rangeWindow("30d");
    const wCustom =
      range === "custom" && fromParam && toParam
        ? customRangeWindow(fromParam, toParam)
        : null;

    const [
  cToday, c7, c30, cCustom,
  vToday, v7, v30, vCustom,
  brandCount, productCount,
] = await Promise.all([
  // Shop at clicks (NOT product views)
  prisma.affiliateClick.count({ where: { NOT: { type: "PRODUCT_VIEW" }, clickedAt: { gte: wToday.gte, lt: wToday.lt } } }),
  prisma.affiliateClick.count({ where: { NOT: { type: "PRODUCT_VIEW" }, clickedAt: { gte: w7.gte, lt: w7.lt } } }),
  prisma.affiliateClick.count({ where: { NOT: { type: "PRODUCT_VIEW" }, clickedAt: { gte: w30.gte, lt: w30.lt } } }),
  wCustom
    ? prisma.affiliateClick.count({ where: { NOT: { type: "PRODUCT_VIEW" }, clickedAt: { gte: wCustom.gte, lt: wCustom.lt } } })
    : Promise.resolve(null),
  // Product views
  prisma.affiliateClick.count({ where: { type: "PRODUCT_VIEW", clickedAt: { gte: wToday.gte, lt: wToday.lt } } }),
  prisma.affiliateClick.count({ where: { type: "PRODUCT_VIEW", clickedAt: { gte: w7.gte, lt: w7.lt } } }),
  prisma.affiliateClick.count({ where: { type: "PRODUCT_VIEW", clickedAt: { gte: w30.gte, lt: w30.lt } } }),
  wCustom
    ? prisma.affiliateClick.count({ where: { type: "PRODUCT_VIEW", clickedAt: { gte: wCustom.gte, lt: wCustom.lt } } })
    : Promise.resolve(null),
  prisma.brand.count({ where: { affiliateStatus: "ACTIVE" } }),
  prisma.product.count({ where: { isActive: true } }),
]);

    // After your existing counts, add:
const snapshotFrom = await prisma.platformSnapshot.findFirst({
  where: { date: { gte: wCustom?.gte ?? w30.gte } },
  orderBy: { date: "asc" },
});

const snapshotTo = await prisma.platformSnapshot.findFirst({
  where: { date: { lte: wCustom?.lt ?? w30.lt } },
  orderBy: { date: "desc" },
});



return NextResponse.json({
  ok: true,
  clicks: { today: cToday, last7: c7, last30: c30, custom: cCustom },
  views: { today: vToday, last7: v7, last30: v30, custom: vCustom },
  brandCount: snapshotTo?.brandCount ?? brandCount,
  productCount: snapshotTo?.productCount ?? productCount,
  brandCountAtRangeStart: snapshotFrom?.brandCount ?? null,
  productCountAtRangeStart: snapshotFrom?.productCount ?? null,
});
  } catch (e) {
    return adminError(e);
  }
}