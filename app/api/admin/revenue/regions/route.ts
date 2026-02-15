import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();

  // clicks by region
  const clicks = await prisma.$queryRaw<Array<{ region: string | null; clicks: bigint }>>`
    select b."baseRegion" as region, count(*)::bigint as clicks
    from "AffiliateClick" c
    join "Brand" b on b.id = c."brandId"
    group by 1
    order by clicks desc
  `;

  // earnings by region (if table exists)
  let earnings: Array<{ region: string | null; amount: bigint | number | string }> = [];
  try {
    earnings = await prisma.$queryRaw<any>`
      select b."baseRegion" as region, coalesce(sum(e."amount"), 0) as amount
      from "AffiliateEarning" e
      join "Brand" b on b.id = e."brandId"
      group by 1
      order by amount desc
    `;
  } catch {
    // If you don’t have AffiliateEarning.amount or the table differs, we’ll adjust.
  }

  const brandCounts = await prisma.brand.groupBy({
    by: ["baseRegion"],
    _count: { _all: true },
  });

  return NextResponse.json({
    ok: true,
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
