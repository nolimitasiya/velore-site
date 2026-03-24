import WorldChoropleth from "@/components/analytics/WorldChoropleth";
import { iso2ToIsoNumeric } from "@/lib/geo/iso";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryLabel(code: string) {
  return regionNames.of(String(code ?? "").toUpperCase()) ?? code;
}

function money(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}

async function getJSON(path: string) {
  const jar = await cookies();

  const res = await fetch(absoluteUrl(path), {
    cache: "no-store",
    headers: {
      cookie: jar.toString(),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed: ${path} (${res.status}) ${text}`);
  }

  return res.json();
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

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  ABAYA: "Abayas",
  DRESS: "Dresses",
  SKIRT: "Skirts",
  TOP: "Tops",
  HIJAB: "Hijabs",
  ACTIVEWEAR: "Activewear",
  SETS: "Sets",
  MATERNITY: "Maternity",
  KHIMAR: "Khimars",
  JILBAB: "Jilbabs",
  COATS_JACKETS: "Coats & Jackets",
};

function productTypeLabel(value: string | null) {
  if (!value) return "Unknown";
  return PRODUCT_TYPE_LABELS[value] ?? value.replaceAll("_", " ");
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range =
    sp.range === "today" || sp.range === "7d" || sp.range === "30d"
      ? sp.range
      : "30d";

  const summary = await getJSON(`/api/admin/revenue/summary`);
  const topBrands = await getJSON(`/api/admin/revenue/clicks-by-brand?range=${range}&take=5`);
  const topProducts = await getJSON(`/api/admin/revenue/clicks-by-product?range=${range}&take=5`);
  const byShopperCountry = await getJSON(
    `/api/admin/revenue/clicks-by-shopper-country?range=${range}&take=20`
  );

const bySourcePage = await getJSON(`/api/admin/revenue/clicks-by-source-page?range=${range}`);
const bySection = await getJSON(`/api/admin/revenue/clicks-by-section?range=${range}&take=10`);

const byProductType = await getJSON(`/api/admin/revenue/clicks-by-product-type?range=${range}&take=10`);
const byStyle = await getJSON(`/api/admin/revenue/clicks-by-style?range=${range}&take=10`);
const byColour = await getJSON(`/api/admin/revenue/clicks-by-colour?range=${range}&take=10`);


const estimatedByBrand = await getJSON(
  `/api/admin/revenue/estimated-by-brand?range=${range}&take=10`
);
const estimatedByProduct = await getJSON(
  `/api/admin/revenue/estimated-by-product?range=${range}&take=10`
);
const estimatedByShopperCountry = await getJSON(
  `/api/admin/revenue/estimated-by-shopper-country?range=${range}&take=10`
);


  const numericData: Record<string, number> = {};
  for (const r of byShopperCountry?.rows ?? []) {
    const id = iso2ToIsoNumeric(r.countryCode);
    if (!id) continue;
    numericData[id] = (numericData[id] ?? 0) + Number(r.clicks ?? 0);
  }

  const qs = (r: string) => (r === "30d" ? "" : `?range=${r}`);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Clicks today</div>
          <div className="text-3xl font-semibold">{summary?.clicks?.today ?? 0}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Last 7 days</div>
          <div className="text-3xl font-semibold">{summary?.clicks?.last7 ?? 0}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Last 30 days</div>
          <div className="text-3xl font-semibold">{summary?.clicks?.last30 ?? 0}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <RangeLink href={`/admin/revenue${qs("today")}`} label="Today" active={range === "today"} />
        <RangeLink href={`/admin/revenue${qs("7d")}`} label="Last 7 days" active={range === "7d"} />
        <RangeLink href={`/admin/revenue${qs("30d")}`} label="Last 30 days" active={range === "30d"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/admin/revenue/export/clicks-by-brand?range=${range}&take=1000`}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
        >
          Download brands report
        </a>

        <a
          href={`/api/admin/revenue/export/clicks-by-product?range=${range}&take=1000`}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
        >
          Download products report
        </a>

        <a
          href={`/api/admin/revenue/export/raw-clicks?range=${range}&take=20000`}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
        >
          Download raw clicks report
        </a>
      </div>
      <div className="space-y-6">
  <section className="space-y-3">
    <div>
      <h2 className="text-lg font-semibold">Traffic intelligence</h2>
      <p className="text-sm text-neutral-500">
        Where product discovery is happening across the platform.
      </p>
    </div>

    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Clicks by source page</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3 text-right">Clicks</th>
            <th className="px-4 py-3">Intensity</th>
          </tr>
        </thead>
        <tbody>
          {(bySourcePage?.rows ?? []).map((r: any) => (
            <tr key={r.sourcePage} className="border-t">
              <td className="px-4 py-3 font-medium">
                {r.sourcePage === "HOME"
                  ? "Homepage"
                  : r.sourcePage === "SEARCH"
                  ? "Search"
                  : r.sourcePage === "BRAND"
                  ? "Brand page"
                  : r.sourcePage}
              </td>
              <td className="px-4 py-3 text-right">{r.clicks}</td>
              <td className="px-4 py-3">
                <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-2 bg-black/70"
                    style={{
                      width:
                        bySourcePage?.rows?.[0]?.clicks
                          ? `${Math.max(
                              5,
                              Math.round((r.clicks / bySourcePage.rows[0].clicks) * 100)
                            )}%`
                          : "0%",
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}

          {(bySourcePage?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                No source-page click data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>

  <section className="space-y-3">
    <div>
      <h2 className="text-lg font-semibold">Storefront performance</h2>
      <p className="text-sm text-neutral-500">
        Which homepage sections are driving outbound product interest.
      </p>
    </div>

    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Top storefront sections</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Target country</th>
            <th className="px-4 py-3 text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(bySection?.rows ?? []).map((r: any) => (
            <tr key={`${r.sectionId ?? "none"}:${r.sectionKey ?? "key"}`} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium">{r.sectionTitle ?? "Unknown section"}</div>
                {r.sectionKey ? (
                  <div className="text-xs text-neutral-500">{r.sectionKey}</div>
                ) : null}
              </td>
              <td className="px-4 py-3">{r.sectionType ?? "—"}</td>
              <td className="px-4 py-3">{r.targetCountryCode ?? "All / n.a."}</td>
              <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
            </tr>
          ))}

          {(bySection?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={4}>
                No storefront-section click data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold">Top brands</div>
            <div className="text-xs text-neutral-500">Range: {range}</div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {(topBrands?.rows ?? []).map((r: any) => (
                <tr key={r.brandId} className="border-t">
                  <td className="px-4 py-3">{r.brand?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
                </tr>
              ))}

              {(topBrands?.rows ?? []).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                    No clicks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        

        

        
      </div>
      <section className="space-y-3">
  <div>
    <h2 className="text-lg font-semibold">Product intelligence</h2>
    <p className="text-sm text-neutral-500">
      What kinds of products, styles, and colours are attracting the most shopper interest.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Top product types</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3 text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(byProductType?.rows ?? []).map((r: any) => (
            <tr key={r.productType ?? "unknown"} className="border-t">
              <td className="px-4 py-3 font-medium">{productTypeLabel(r.productType)}</td>
              <td className="px-4 py-3 text-right">{r.clicks}</td>
            </tr>
          ))}

          {(byProductType?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                No product-type click data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Top styles</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Style</th>
            <th className="px-4 py-3 text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(byStyle?.rows ?? []).map((r: any) => (
            <tr key={r.styleId} className="border-t">
              <td className="px-4 py-3 font-medium">{r.styleName}</td>
              <td className="px-4 py-3 text-right">{r.clicks}</td>
            </tr>
          ))}

          {(byStyle?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                No style click data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Top colours</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Colour</th>
            <th className="px-4 py-3 text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(byColour?.rows ?? []).map((r: any) => (
            <tr key={r.colourId} className="border-t">
              <td className="px-4 py-3 font-medium">{r.colourName}</td>
              <td className="px-4 py-3 text-right">{r.clicks}</td>
            </tr>
          ))}

          {(byColour?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                No colour click data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>

  <div className="rounded-2xl border bg-white overflow-hidden">
    <div className="px-4 py-3 border-b">
      <div className="font-semibold">Top products</div>
      <div className="text-xs text-neutral-500">Range: {range}</div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[1100px]">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Colour</th>
            <th className="px-4 py-3">Style</th>
            <th className="px-4 py-3">Price band</th>
            <th className="px-4 py-3">Badges</th>
            <th className="px-4 py-3 text-right">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(topProducts?.rows ?? []).map((r: any) => (
            <tr key={`${r.brand?.id ?? "b"}:${r.productId}`} className="border-t align-top">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg border bg-neutral-50 flex items-center justify-center shrink-0">
                    {r.product?.imageUrl ? (
                      <img
                        src={r.product.imageUrl}
                        alt={r.product?.title ?? "Product image"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">No image</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {r.product?.title ?? "Unknown product"}
                    </div>
                    {r.product?.price ? (
                      <div className="text-xs text-neutral-500">
                        {r.product.price} {r.product.currency}
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">{r.brand?.name ?? "Unknown"}</td>
              <td className="px-4 py-3">{productTypeLabel(r.product?.productType ?? null)}</td>
              <td className="px-4 py-3">{r.product?.primaryColour ?? "—"}</td>
              <td className="px-4 py-3">{r.product?.primaryStyle ?? "—"}</td>
              <td className="px-4 py-3">{r.product?.priceBand ?? "—"}</td>
              <td className="px-4 py-3">
                {r.product?.badges?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {r.product.badges.map((badge: string) => (
                      <span
                        key={badge}
                        className="rounded-full border px-2 py-0.5 text-[11px] text-neutral-700"
                      >
                        {badge.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
            </tr>
          ))}

          {(topProducts?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={8}>
                No product-level clicks yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</section>

<section className="space-y-3">
  <div>
    <h2 className="text-lg font-semibold">Commercial intelligence</h2>
    <p className="text-sm text-neutral-500">
      Estimated earning potential based on clicks, assumed conversion, AOV, and commission rate.
    </p>
  </div>

  <div className="grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Estimated commission by brand</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3 text-right">Est. commission</th>
          </tr>
        </thead>
        <tbody>
          {(estimatedByBrand?.rows ?? []).map((r: any) => (
            <tr key={r.brandId} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium">{r.brand?.name ?? "Unknown"}</div>
                <div className="text-xs text-neutral-500">
                  {r.clicks} clicks • {(r.commissionRate * 100).toFixed(0)}% commission
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {money(r.estimatedCommission)}
              </td>
            </tr>
          ))}

          {(estimatedByBrand?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                No brand-level estimate data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Estimated commission by shopper country</div>
        <div className="text-xs text-neutral-500">Range: {range}</div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Country</th>
            <th className="px-4 py-3 text-right">Est. commission</th>
          </tr>
        </thead>
        <tbody>
          {(estimatedByShopperCountry?.rows ?? []).map((r: any) => (
            <tr key={r.countryCode} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium">{countryLabel(r.countryCode)}</div>
                <div className="text-xs text-neutral-500">{r.clicks} clicks</div>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {money(r.estimatedCommission)}
              </td>
            </tr>
          ))}

          {(estimatedByShopperCountry?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                No shopper-country estimate data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold">Model assumptions</div>
        <div className="text-xs text-neutral-500">Current defaults</div>
      </div>

      <div className="p-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-neutral-600">Default commission</span>
          <span className="font-medium">15%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-600">Default AOV</span>
          <span className="font-medium">£75</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-600">Default conversion</span>
          <span className="font-medium">2%</span>
        </div>
        <div className="pt-2 text-xs text-neutral-500">
          Brand-specific commission rate and AOV are used when available. Otherwise defaults apply.
        </div>
      </div>
    </div>
  </div>

  <div className="rounded-2xl border bg-white overflow-hidden">
    <div className="px-4 py-3 border-b">
      <div className="font-semibold">Top products by estimated commission</div>
      <div className="text-xs text-neutral-500">Range: {range}</div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-neutral-50 text-left text-neutral-600">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Brand</th>
            <th className="px-4 py-3 text-right">Clicks</th>
            <th className="px-4 py-3 text-right">Est. commission</th>
          </tr>
        </thead>
        <tbody>
          {(estimatedByProduct?.rows ?? []).map((r: any) => (
            <tr key={`${r.brand?.id ?? "b"}:${r.productId}`} className="border-t">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg border bg-neutral-50 flex items-center justify-center shrink-0">
                    {r.product?.imageUrl ? (
                      <img
                        src={r.product.imageUrl}
                        alt={r.product?.title ?? "Product image"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">No image</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {r.product?.title ?? "Unknown product"}
                    </div>
                    {r.product?.price ? (
                      <div className="text-xs text-neutral-500">
                        {r.product.price} {r.product.currency}
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">{r.brand?.name ?? "Unknown"}</td>
              <td className="px-4 py-3 text-right">{r.clicks}</td>
              <td className="px-4 py-3 text-right font-medium">
                {money(r.estimatedCommission)}
              </td>
            </tr>
          ))}

          {(estimatedByProduct?.rows ?? []).length === 0 && (
            <tr>
              <td className="px-4 py-6 text-neutral-500" colSpan={4}>
                No product-level estimate data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
</section>

<div className="rounded-2xl border bg-white overflow-hidden md:col-span-2">
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
              {(byShopperCountry?.rows ?? []).map((r: any) => (
                <tr key={r.countryCode} className="border-t">
                  <td className="px-4 py-3 font-medium">{countryLabel(r.countryCode)}</td>
                  <td className="px-4 py-3 text-right">{r.clicks}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                      <div
                        className="h-2 bg-black/70"
                        style={{
                          width:
                            byShopperCountry?.rows?.[0]?.clicks
                              ? `${Math.max(
                                  5,
                                  Math.round((r.clicks / byShopperCountry.rows[0].clicks) * 100)
                                )}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {(byShopperCountry?.rows ?? []).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                    No shopper preference country clicks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

<div className="text-xs text-neutral-500">
  Country boundaries may include overseas territories depending on the map dataset.
</div>
      <WorldChoropleth
        title={`Shopper preference country heatmap (${range})`}
        data={numericData}
      />
    </div>
  );
}