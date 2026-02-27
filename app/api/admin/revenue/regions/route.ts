import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { parseRange, rangeWindow, monthWindowForRange } from "@/lib/revenue/ranges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireAdminSession();

  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range"));
  const { gte, lt } = rangeWindow(range);
  const { gteMonth, ltMonth } = monthWindowForRange(gte, lt);

  // clicks by region (filtered)
  const clicks = await prisma.$queryRaw<Array<{ region: string | null; clicks: bigint }>>`
    select b."baseRegion" as region, count(*)::bigint as clicks
    from "AffiliateClick" c
    join "Brand" b on b.id = c."brandId"
    where c."clickedAt" >= ${gte} and c."clickedAt" < ${lt}
    group by 1
    order by clicks desc
  `;

  // earnings by region (filtered by month window)
  let earnings: Array<{ region: string | null; amount: bigint | number | string }> = [];
  try {
    earnings = await prisma.$queryRaw<any>`
      select b."baseRegion" as region, coalesce(sum(e."amount"), 0) as amount
      from "AffiliateEarning" e
      join "Brand" b on b.id = e."brandId"
      where e."month" >= ${gteMonth} and e."month" < ${ltMonth}
      group by 1
      order by amount desc
    `;
  } catch {
    // keep empty if schema differs
  }

  const brandCounts = await prisma.brand.groupBy({
    by: ["baseRegion"],
    _count: { _all: true },
  });

  return NextResponse.json({
    ok: true,
    range,
    from: gte,
    to: lt,
    clicks: clicks.map((r) => ({ region: r.region ?? "UNKNOWN", clicks: Number(r.clicks) })),
    earnings: earnings.map((r: any) => ({
      region: r.region ?? "UNKNOWN",
      amount: Number(r.amount ?? 0),
    })),
    brands: brandCounts.map((r) => ({
      region: r.baseRegion ?? "UNKNOWN",
      brands: r._count._all,
    })),
  });
}