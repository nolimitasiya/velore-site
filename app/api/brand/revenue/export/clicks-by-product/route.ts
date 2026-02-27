import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unified range keys */
type RangeKey = "today" | "7d" | "30d";

function parseRange(input: string | null | undefined): RangeKey {
  const r = String(input ?? "").toLowerCase();
  if (r === "today" || r === "7d" || r === "30d") return r;
  return "30d";
}

// returns a { gte, lt } window (lt is exclusive)
function rangeWindow(range: RangeKey) {
  const now = new Date();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d: Date, days: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  };

  if (range === "today") {
    const gte = startOfDay(now);
    const lt = addDays(gte, 1);
    return { gte, lt };
  }

  if (range === "7d") {
    const gte = startOfDay(addDays(now, -6));
    const lt = addDays(startOfDay(now), 1);
    return { gte, lt };
  }

  // 30d
  const gte = startOfDay(addDays(now, -29));
  const lt = addDays(startOfDay(now), 1);
  return { gte, lt };
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtISO(d?: Date | null) {
  return d ? d.toISOString() : "";
}

export async function GET(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

    const url = new URL(req.url);
    const range = parseRange(url.searchParams.get("range"));
    const take = Math.min(1000, Math.max(1, Number(url.searchParams.get("take") || 200)));

    const { gte, lt } = rangeWindow(range);

    // Group clicks by product for this brand within range
    const grouped = await prisma.affiliateClick.groupBy({
      by: ["productId"],
      where: {
        brandId,
        productId: { not: null },
        clickedAt: { gte, lt },
      },
      _count: { _all: true },
      _min: { clickedAt: true },
      _max: { clickedAt: true },
      orderBy: { productId: "asc" },
      take: 5000,
    });

    // Sort by clicks desc
    const sorted = [...grouped].sort(
      (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
    );

    const top = sorted.slice(0, take);
    const productIds = top.map((r) => r.productId!).filter(Boolean);

    // Pull product metadata (only for this brand)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, brandId },
      select: {
        id: true,
        title: true,
        slug: true,
        sourceUrl: true,
        affiliateUrl: true,
        status: true,
        isActive: true,
        currency: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Optional: destination URL samples (top 3) per product in this range for this brand
    // (helps verify redirect destinations / UTM issues)
    const destRows = await prisma.$queryRaw<Array<{ productId: string; destinationUrl: string | null; clicks: bigint }>>`
      select
        c."productId" as "productId",
        c."destinationUrl" as "destinationUrl",
        count(*)::bigint as clicks
      from "AffiliateClick" c
      where c."brandId" = ${brandId}
        and c."productId" is not null
        and c."clickedAt" >= ${gte}
        and c."clickedAt" < ${lt}
      group by 1, 2
      order by 1 asc, clicks desc
    `;

    // Build productId -> top destinations list
    const destMap = new Map<string, string[]>();
    for (const r of destRows) {
      const pid = r.productId;
      const url = r.destinationUrl ?? "";
      if (!url) continue;
      const arr = destMap.get(pid) ?? [];
      if (arr.length < 3) {
        arr.push(url);
        destMap.set(pid, arr);
      }
    }

    const header = [
      "range",
      "from_gte",
      "to_lt",
      "brand_id",
      "product_id",
      "product_title",
      "product_slug",
      "category_name",
      "category_slug",
      "status",
      "is_active",
      "currency",
      "price",
      "clicks",
      "first_click_at",
      "last_click_at",
      "published_at",
      "product_created_at",
      "product_updated_at",
      "source_url",
      "affiliate_url",
      "top_destination_urls", // up to 3, separated by " | "
    ].join(",");

    const lines = top.map((r) => {
      const pid = r.productId!;
      const p = productMap.get(pid) ?? null;

      const row = [
        range,
        fmtISO(gte),
        fmtISO(lt),
        brandId,
        pid,
        p?.title ?? "",
        p?.slug ?? "",
        p?.category?.name ?? "",
        p?.category?.slug ?? "",
        p?.status ?? "",
        p?.isActive ?? "",
        p?.currency ?? "",
        p?.price ?? "",
        Number(r._count?._all ?? 0),
        fmtISO((r as any)._min?.clickedAt ?? null),
        fmtISO((r as any)._max?.clickedAt ?? null),
        fmtISO(p?.publishedAt ?? null),
        fmtISO(p?.createdAt ?? null),
        fmtISO(p?.updatedAt ?? null),
        p?.sourceUrl ?? "",
        p?.affiliateUrl ?? "",
        (destMap.get(pid) ?? []).join(" | "),
      ];

      return row.map(csvEscape).join(",");
    });

    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="veilora-clicks-by-product-${range}.csv"`,
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Failed";
    const status = msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}