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

function percent(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function rangeWindow(range: string, fromParam: string, toParam: string) {
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

  if (range === "custom" && fromParam && toParam) {
    const gte = startOfDay(new Date(fromParam));
    const lt = addDays(startOfDay(new Date(toParam)), 1);
    if (!isNaN(gte.getTime()) && !isNaN(lt.getTime())) return { gte, lt };
  }

  // default: 30d
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
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-white bg-white text-[#7B2D3E] shadow-sm"
          : "border-white/25 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

export default async function BrandRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  const range =
    sp.range === "today" ||
    sp.range === "7d" ||
    sp.range === "30d" ||
    sp.range === "custom"
      ? sp.range
      : "today";

  const fromParam = sp.from ?? "";
  const toParam = sp.to ?? "";

  const { gte, lt } = rangeWindow(range, fromParam, toParam);

  const { brandId } = await requireBrandContext();

  const [productViews, shopAtClicks] = await Promise.all([
    prisma.affiliateClick.count({
      where: {
        brandId,
        type: "PRODUCT_VIEW",
        clickedAt: { gte, lt },
      },
    }),
    prisma.affiliateClick.count({
      where: {
        brandId,
        NOT: { type: "PRODUCT_VIEW" },
        clickedAt: { gte, lt },
      },
    }),
  ]);

  const grouped = await prisma.affiliateClick.groupBy({
    by: ["productId"],
    where: {
      brandId,
      productId: { not: null },
      NOT: { type: "PRODUCT_VIEW" },
      clickedAt: { gte, lt },
    },
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: 5000,
  });

  const [totalWishlistSaves, wishlistByShopperRaw, wishlistByProductRaw] = await Promise.all([
  prisma.wishlistItem.count({
    where: { product: { brandId } },
  }),
  prisma.wishlistItem.groupBy({
    by: ["shopperId"],
    where: { product: { brandId } },
  }),
  prisma.wishlistItem.groupBy({
    by: ["productId"],
    where: { product: { brandId } },
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: 5,
  }),
]);

const uniqueWishlistShoppers = wishlistByShopperRaw.length;
const wishlistProductIds = wishlistByProductRaw.map((r) => r.productId);

const wishlistProducts = await prisma.product.findMany({
  where: { id: { in: wishlistProductIds } },
  select: {
    id: true,
    title: true,
    price: true,
    currency: true,
    images: {
      orderBy: { sortOrder: "asc" },
      take: 1,
      select: { url: true },
    },
  },
});

const wMap = new Map(wishlistProducts.map((p) => [p.id, p]));

const topWishlistRows = wishlistByProductRaw.map((r) => {
  const p = wMap.get(r.productId) ?? null;
  return {
    productId: r.productId,
    title: p?.title ?? "Unknown product",
    imageUrl: p?.images?.[0]?.url ?? null,
    price: p?.price ? String(p.price) : null,
    currency: p?.currency ?? "",
    saves: Number(r._count._all),
  };
});

  const top = grouped.slice(0, 5);
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
      clicks: Number(r._count._all),
      sourceUrl: p?.sourceUrl ?? "",
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
      clicks: Number(g._count._all),
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

  const qs = (r: string) => (r === "today" ? "" : `?range=${r}`);

  const rangeLabel =
    range === "today"
      ? "Today"
      : range === "7d"
      ? "Last 7 days"
      : range === "custom" && fromParam && toParam
      ? `${fromParam} → ${toParam}`
      : "Last 30 days";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-white">Analytics</h1>
          </div>

          {/* Range pills — exactly like admin */}
          <div className="flex flex-wrap items-center gap-2">
            <RangeLink
              href={`/brand/revenue${qs("today")}`}
              label="Today"
              active={range === "today"}
            />
            <RangeLink
              href={`/brand/revenue${qs("7d")}`}
              label="Last 7 days"
              active={range === "7d"}
            />
            <RangeLink
              href={`/brand/revenue?range=30d`}
              label="Last 30 days"
              active={range === "30d"}
            />
            <RangeLink
              href={`/brand/revenue?range=custom`}
              label="Custom range"
              active={range === "custom"}
            />
          </div>
        </div>

        {/* Custom date picker — only shown when range=custom, inside hero like admin */}
        {range === "custom" && (
          <form
            method="GET"
            action="/brand/revenue"
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            <input type="hidden" name="range" value="custom" />
            <div className="flex items-center gap-2">
              <label
                htmlFor="from-date"
                className="text-[11px] uppercase tracking-[0.16em] text-white/50"
              >
                From
              </label>
              <input
                id="from-date"
                type="date"
                name="from"
                defaultValue={fromParam}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="to-date"
                className="text-[11px] uppercase tracking-[0.16em] text-white/50"
              >
                To
              </label>
              <input
                id="to-date"
                type="date"
                name="to"
                defaultValue={toParam}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#7B2D3E] transition hover:bg-white/90"
            >
              Apply
            </button>
          </form>
        )}
      </section>

      {/* Two stat cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Product views */}
        <div className="overflow-hidden rounded-[28px] border border-black/10 border-l-[3px] border-l-[#7B2D3E] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
              Discovery
            </div>
            <h2 className="mt-1 text-md font-medium text-black">Product views</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Shoppers who viewed your product detail page.
            </p>
          </div>
          <div className="px-6 py-6">
            <div className="text-4xl font-semibold tracking-tight text-black">
              {productViews.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-neutral-400">{rangeLabel}</div>
          </div>
        </div>

        {/* Shop at clicks */}
        <div className="overflow-hidden rounded-[28px] border border-black/10 border-l-[3px] border-l-[#7B2D3E] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">

          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
              Intent
            </div>
            <h2 className="mt-1 text-md font-medium text-black">Shop at clicks</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Shoppers who clicked through to your website.
            </p>
          </div>
          <div className="px-6 py-6">
            <div className="text-4xl font-semibold tracking-tight text-black">
              {shopAtClicks.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-neutral-400">{rangeLabel}</div>
          </div>
        </div>
      </div>

      {/* Wishlist snapshot */}
<div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
      Wishlist
    </div>
    <h2 className="mt-1 text-md font-medium text-black">Saved products</h2>
    <p className="mt-1 text-xs text-neutral-500">
       shoppers who have saved your products to their wishlist.
    </p>
  </div>

  {/* Two mini stats */}
  <div className="grid grid-cols-2 divide-x divide-[#e8ddd4] border-b border-[#e8ddd4]">
    <div className="px-6 py-5">
      <div className="text-xs text-neutral-400">Total saves</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-black">
        {totalWishlistSaves}
      </div>
    </div>
    <div className="px-6 py-5">
      <div className="text-xs text-neutral-400">Unique shoppers</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-black">
        {uniqueWishlistShoppers}
      </div>
    </div>
  </div>

  {/* Top wishlisted products */}
  {topWishlistRows.length > 0 ? (
    <table className="w-full text-sm">
      <thead className="bg-[#fdf7f4] text-left text-[#a89280]">
        <tr>
          <th className="px-5 py-3 font-medium">Product</th>
          <th className="px-5 py-3 font-medium">Price</th>
          <th className="px-5 py-3 text-right font-medium">Saves</th>
        </tr>
      </thead>
      <tbody>
        {topWishlistRows.map((r) => (
          <tr key={r.productId} className="border-t border-black/6">
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-[#faf8f4]">
                  {r.imageUrl ? (
                    <img
                      src={r.imageUrl}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">—</span>
                  )}
                </div>
                <div className="truncate font-medium text-neutral-900">{r.title}</div>
              </div>
            </td>
            <td className="px-5 py-4 text-neutral-700">
              {r.price ? (
                `${r.currency} ${r.price}`
              ) : (
                <span className="text-neutral-400">—</span>
              )}
            </td>
            <td className="px-5 py-4 text-right font-semibold text-[#7B2D3E]">
              {r.saves}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : (
    <div className="px-6 py-8 text-sm text-neutral-400">
      No products wishlisted yet.
    </div>
  )}
</div>

      {/* Top products table */}
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
              Performance
            </div>
           <h2 className="mt-1 text-md font-medium text-black">
  <a
    href={`/brand/revenue/products?range=${range}&from=${fromParam}&to=${toParam}`}
    className="text-black decoration-transparent hover:underline"
  >
    Top products
  </a>
</h2>
          </div>
          <div className="text-xs text-neutral-400">{rangeLabel}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fdf7f4] text-left text-[#a89280]">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 text-right font-medium">Shop at clicks</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((r) => (
                <tr key={r.productId} className="border-t border-black/6">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-black/8 bg-[#faf8f4]">
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={r.title}
                            className="h-full w-full object-cover"
                          />
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
                    {r.price ? (
                      `${r.currency} ${r.price}`
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-neutral-900">
                    {r.clicks}
                  </td>
                </tr>
              ))}
              {topRows.length === 0 && (
                <tr>
                  <td className="px-5 py-8 text-neutral-500" colSpan={3}>
                    No product-level clicks yet in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geography */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-5 md:px-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
              Geography
            </div>
            <h2 className="mt-1 text-md font-medium text-black">
              Shopper preference geography
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Based on shopper-selected country preference across tracked clicks in the selected range.
            </p>
          </div>
          <div className="min-w-[200px] rounded-[20px] border border-[#e8ddd4] bg-white px-4 py-3">
            <div className="text-xs uppercase tracking-[0.14em] text-neutral-400">Top market</div>
            <div className="mt-1.5 text-sm font-medium tracking-tight text-black">
  {topCountry ? countryLabel(topCountry.countryCode) : "—"}
</div>
            <div className="mt-0.5 text-xs text-neutral-500">
              {topCountry
                ? `${topCountry.clicks} clicks • ${percent(topCountry.clicks, totalGeoClicks)}`
                : "No geo data yet"}
            </div>
          </div>
        </div>
        <div className="space-y-6 p-4 md:p-6">
          <div className="rounded-[28px] border border-black/6 bg-[#f9f6ef] p-2 md:p-3">
            <WorldChoropleth
              title={`Shopper geography · ${rangeLabel}`}
              data={numericData}
            />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-black/6">
            <table className="w-full text-sm">
              <thead className="bg-[#fdf7f4] text-left text-[#a89280]">
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
                          className="h-2.5 rounded-full bg-[#7B2D3E]/70"
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
