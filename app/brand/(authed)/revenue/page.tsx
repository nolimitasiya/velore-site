import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { iso2ToIsoNumeric } from "@/lib/geo/iso";
import WorldChoropleth from "@/components/analytics/WorldChoropleth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryLabel(code: string) {
  return regionNames.of(String(code ?? "").toUpperCase()) ?? code;
}

type RangeKey = "today" | "7d" | "30d";

function parseRange(input?: string): RangeKey {
  const r = String(input ?? "").toLowerCase();
  if (r === "today" || r === "7d" || r === "30d") return r;
  return "30d";
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function rangeWindow(range: RangeKey) {
  const now = new Date();

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

  const gte = startOfDay(addDays(now, -29));
  const lt = addDays(startOfDay(now), 1);
  return { gte, lt };
}

function RangeLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={[
        "rounded-full border px-3.5 py-1.5 text-sm transition",
        active
          ? "border-black bg-black text-white shadow-sm"
          : "border-black/10 bg-white text-black hover:bg-black/[0.03]",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

function percent(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export default async function BrandRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);

  const { brandId } = await requireBrandContext();

  const todayStart = startOfDay(new Date());
  const last7Start = startOfDay(addDays(new Date(), -6));
  const last30Start = startOfDay(addDays(new Date(), -29));

  const [cToday, c7, c30] = await Promise.all([
    prisma.affiliateClick.count({
      where: { brandId, clickedAt: { gte: todayStart } },
    }),
    prisma.affiliateClick.count({
      where: { brandId, clickedAt: { gte: last7Start } },
    }),
    prisma.affiliateClick.count({
      where: { brandId, clickedAt: { gte: last30Start } },
    }),
  ]);

  const { gte, lt } = rangeWindow(range);

  const grouped = await prisma.affiliateClick.groupBy({
    by: ["productId"],
    where: {
      brandId,
      productId: { not: null },
      clickedAt: { gte, lt },
    },
    _count: { _all: true },
    orderBy: { productId: "asc" },
    take: 5000,
  });

  const sorted = [...grouped].sort(
    (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
  );

  const top = sorted.slice(0, 5);
  const productIds = top.map((r) => r.productId!).filter(Boolean);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, brandId },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      sourceUrl: true,
      affiliateUrl: true,
      images: {
        select: { url: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  const pMap = new Map(products.map((p) => [p.id, p]));

  const topRows = top.map((r) => {
    const p = pMap.get(r.productId!) ?? null;

    return {
      productId: r.productId!,
      title: p?.title ?? "Unknown product",
      imageUrl: p?.images?.[0]?.url ?? "",
      clicks: Number(r._count?._all ?? 0),
      sourceUrl: p?.sourceUrl ?? "",
      affiliateUrl: p?.affiliateUrl ?? "",
      price: p?.price ? String(p.price) : "",
      currency: p?.currency ?? "",
    };
  });

  const groupedShopperCountries = await prisma.affiliateClick.groupBy({
    by: ["shopperCountryCode"],
    where: {
      brandId,
      clickedAt: { gte, lt },
      shopperCountryCode: { not: null },
    },
    _count: { _all: true },
    orderBy: { shopperCountryCode: "asc" },
    take: 5000,
  });

  const byShopperCountry = groupedShopperCountries
    .map((g) => ({
      countryCode: g.shopperCountryCode!,
      clicks: Number(g._count._all ?? 0),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);

  const totalGeoClicks = byShopperCountry.reduce((sum, r) => sum + r.clicks, 0);
  const maxClicks = Math.max(1, ...byShopperCountry.map((r) => r.clicks));
  const topCountry = byShopperCountry[0] ?? null;

  const numericData: Record<string, number> = {};
  for (const r of byShopperCountry) {
    const id = iso2ToIsoNumeric(r.countryCode);
    if (!id) continue;
    numericData[id] = (numericData[id] ?? 0) + r.clicks;
  }

  const qs = (r: RangeKey) => (r === "30d" ? "" : `?range=${r}`);

  return (
    <div className="space-y-8 bg-[#fcfbf8] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Understand which products attract clicks and where shopper interest is strongest.
          </p>
        </div>

        <a
          href={`/api/brand/revenue/export/clicks-by-product?range=${range}&take=1000`}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm shadow-sm transition hover:bg-black/[0.03]"
        >
          Download products CSV
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-black/8 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-sm text-neutral-500">Clicks today</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{cToday}</div>
        </div>

        <div className="rounded-[24px] border border-black/8 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-sm text-neutral-500">Last 7 days</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{c7}</div>
        </div>

        <div className="rounded-[24px] border border-black/8 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-sm text-neutral-500">Last 30 days</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{c30}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <RangeLink href={`/brand/revenue${qs("today")}`} label="Today" active={range === "today"} />
        <RangeLink href={`/brand/revenue${qs("7d")}`} label="Last 7 days" active={range === "7d"} />
        <RangeLink href={`/brand/revenue${qs("30d")}`} label="Last 30 days" active={range === "30d"} />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
          <div>
            <a
              href={`/brand/revenue/products${qs(range)}`}
              className="font-semibold underline underline-offset-4"
            >
              Top products
            </a>
            <div className="mt-1 text-xs text-neutral-500">Range: {range}</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#faf8f4] text-left text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((r) => (
                <tr key={r.productId} className="border-t border-black/6">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-black/8 bg-[#faf8f4]">
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.title} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-neutral-400">No image</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-medium text-neutral-900">{r.title}</div>
                        {r.sourceUrl ? (
                          <a
                            className="mt-1 inline-block text-xs text-neutral-500 underline underline-offset-2"
                            href={r.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View source
                          </a>
                        ) : (
                          <span className="mt-1 inline-block text-xs text-neutral-400">—</span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-neutral-700">
                    {r.price ? `${r.currency} ${r.price}` : <span className="text-neutral-400">—</span>}
                  </td>

                  <td className="px-5 py-4 text-right font-medium text-neutral-900">{r.clicks}</td>
                </tr>
              ))}

              {topRows.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-neutral-500" colSpan={3}>
                    No product-level clicks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-black/6 bg-[linear-gradient(180deg,#fff_0%,#fbf8f2_100%)] px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                Geography
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
                Shopper preference geography
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Based on shopper-selected country preference across tracked clicks in the selected range.
              </p>
            </div>

            <div className="min-w-[220px] rounded-[24px] border border-black/8 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
              <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">Top market</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                {topCountry ? countryLabel(topCountry.countryCode) : "—"}
              </div>
              <div className="mt-1 text-sm text-neutral-500">
                {topCountry
                  ? `${topCountry.clicks} clicks • ${percent(topCountry.clicks, totalGeoClicks)}`
                  : "No geo data yet"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-4 md:p-6">
          <div className="rounded-[28px] border border-black/6 bg-[#f9f6ef] p-2 md:p-3">
            <WorldChoropleth
              title={`Shopper preference country map (${range})`}
              data={numericData}
            />
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/6">
            <table className="w-full text-sm">
              <thead className="bg-[#faf8f4] text-left text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Country</th>
                  <th className="px-5 py-3 text-right font-medium">Clicks</th>
                  <th className="px-5 py-3 text-right font-medium">Share</th>
                  <th className="px-5 py-3 font-medium">Relative intensity</th>
                </tr>
              </thead>
              <tbody>
                {byShopperCountry.map((r) => (
                  <tr key={r.countryCode} className="border-t border-black/6">
                    <td className="px-5 py-4 font-medium text-neutral-900">
                      {countryLabel(r.countryCode)}
                    </td>
                    <td className="px-5 py-4 text-right text-neutral-800">{r.clicks}</td>
                    <td className="px-5 py-4 text-right text-neutral-600">
                      {percent(r.clicks, totalGeoClicks)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#ece7dc]">
                        <div
                          className="h-2.5 rounded-full bg-[#2b241d]"
                          style={{
                            width: `${Math.max(4, Math.round((r.clicks / maxClicks) * 100))}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {byShopperCountry.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-neutral-500" colSpan={4}>
                      No geo clicks yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-neutral-400">
            Country boundaries may include overseas territories depending on the underlying map dataset.
          </div>
        </div>
      </section>
    </div>
  );
}