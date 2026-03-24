import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import CountryHeatmapGrid from "@/components/analytics/CountryHeatmapGrid";
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

// returns { gte, lt } with lt exclusive
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
  // 30d
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
        "rounded-full border px-3 py-1.5 text-sm",
        active ? "bg-black text-white border-black" : "hover:bg-black/5",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

export default async function BrandRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);

  const { brandId } = await requireBrandContext();

  // --------
  // Cards (fixed windows)
  // --------
  const todayStart = startOfDay(new Date());
  const last7Start = startOfDay(addDays(new Date(), -6));
  const last30Start = startOfDay(addDays(new Date(), -29));

  const [cToday, c7, c30] = await Promise.all([
    prisma.affiliateClick.count({ where: { brandId, clickedAt: { gte: todayStart } } }),
    prisma.affiliateClick.count({ where: { brandId, clickedAt: { gte: last7Start } } }),
    prisma.affiliateClick.count({ where: { brandId, clickedAt: { gte: last30Start } } }),
  ]);

  // --------
  // Top products (range-aware)
  // --------
  const { gte, lt } = rangeWindow(range);

  const grouped = await prisma.affiliateClick.groupBy({
    by: ["productId"],
    where: {
      brandId,
      productId: { not: null },
      clickedAt: { gte, lt },
    },
    _count: { _all: true },
    orderBy: { productId: "asc" }, // required when using take
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

  // --------
  // Clicks by country (range-aware)
  // --------
  const groupedCountries = await prisma.affiliateClick.groupBy({
    by: ["countryCode"],
    where: {
      brandId,
      clickedAt: { gte, lt },
      countryCode: { not: null },
    },
    _count: { _all: true },
    orderBy: { countryCode: "asc" },
    take: 5000,
  });

  

  const byCountry = groupedCountries
    .map((g) => ({
      countryCode: g.countryCode!,
      clicks: Number(g._count._all ?? 0),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20);

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
  .slice(0, 20);
  const maxClicks = Math.max(1, ...byShopperCountry.map((r) => r.clicks));

  // ✅ ISO2 → ISO3 for choropleth input
 const numericData: Record<string, number> = {};
for (const r of byShopperCountry) {
  const id = iso2ToIsoNumeric(r.countryCode);
  if (!id) continue;
  numericData[id] = (numericData[id] ?? 0) + r.clicks;
}

  const qs = (r: RangeKey) => (r === "30d" ? "" : `?range=${r}`);

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Analytics</h1>

        <a
          href={`/api/brand/revenue/export/clicks-by-product?range=${range}&take=1000`}
          className="rounded-lg px-4 py-2 text-sm border border-black/10 hover:bg-black/5"
        >
          Download products CSV ({range})
        </a>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Clicks today</div>
          <div className="text-3xl font-semibold">{cToday}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Last 7 days</div>
          <div className="text-3xl font-semibold">{c7}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Last 30 days</div>
          <div className="text-3xl font-semibold">{c30}</div>
        </div>
      </div>

      {/* Range toggle */}
      <div className="flex flex-wrap gap-2">
        <RangeLink href={`/brand/revenue${qs("today")}`} label="Today" active={range === "today"} />
        <RangeLink href={`/brand/revenue${qs("7d")}`} label="Last 7 days" active={range === "7d"} />
        <RangeLink href={`/brand/revenue${qs("30d")}`} label="Last 30 days" active={range === "30d"} />
      </div>

      {/* Top products */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <a
              href={`/brand/revenue/products${qs(range)}`}
              className="font-semibold underline underline-offset-4"
            >
              Top products
            </a>
            <div className="text-xs text-neutral-500">Range: {range}</div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3 text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {topRows.map((r) => (
              <tr key={r.productId} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border bg-neutral-50 flex items-center justify-center">
                      {r.imageUrl ? (
                        <img src={r.imageUrl} alt={r.title} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-neutral-400">No image</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      {r.sourceUrl ? (
                        <a
                          className="text-xs text-neutral-500 underline underline-offset-2"
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Source
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 text-neutral-700">
                  {r.price ? `${r.currency} ${r.price}` : <span className="text-neutral-400">—</span>}
                </td>

                <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
              </tr>
            ))}

            {topRows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                  No product-level clicks yet (productId may be null).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Clicks by country table */}
      <div className="rounded-2xl border bg-white overflow-hidden">
        <div className="px-4 py-3 border-b">
          <div className="font-semibold">Shopper preference country</div>
          <div className="text-xs text-neutral-500">Range: {range}</div>
          
        </div>

        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3">Intensity</th>
            </tr>
          </thead>
          <tbody>
            {byShopperCountry.map((r) => (
              <tr key={countryLabel(r.countryCode)} className="border-t">
                <td className="px-4 py-3 font-medium">{countryLabel(r.countryCode)}</td>
                <td className="px-4 py-3 text-right">{r.clicks}</td>
                <td className="px-4 py-3">
                  <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-2 bg-black/70"
                      style={{
                        width: `${Math.max(5, Math.round((r.clicks / maxClicks) * 100))}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}

            {byShopperCountry.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                  No geo clicks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CountryHeatmapGrid
  rows={byShopperCountry}
  title="Shopper preference heatmap (top countries)"
/>

<div className="text-xs text-neutral-500">
  Country boundaries may include overseas territories depending on the map dataset.
</div>

      {/* ✅ Client-only choropleth */}
      <WorldChoropleth
  title={`Shopper preference country heatmap (${range})`}
  data={numericData}
/>
    </div>
  );
}