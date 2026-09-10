import { cookies, headers } from "next/headers";
import Link from "next/link";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";

export const dynamic = "force-dynamic";

async function absoluteUrl(
  path: string
) {
  const headerStore =
    await headers();

  const host =
    headerStore.get(
      "x-forwarded-host"
    ) ??
    headerStore.get("host");

  const protocol =
    headerStore.get(
      "x-forwarded-proto"
    ) ??
    (process.env.NODE_ENV ===
    "production"
      ? "https"
      : "http");

  if (!host) {
    throw new Error(
      `Unable to determine request host for ${path}`
    );
  }

  return `${protocol}://${host}${path}`;
}

async function getJSON(
  path: string
) {
  const jar = await cookies();

  const res = await fetch(
    await absoluteUrl(path),
    {
      cache: "no-store",
      headers: {
        cookie: jar.toString(),
      },
    }
  );

  const contentType =
    res.headers.get(
      "content-type"
    ) ?? "";

  if (!res.ok) {
    const text =
      await res
        .text()
        .catch(() => "");

    throw new Error(
      `Analytics API failed: ${path} (${res.status}) ${text.slice(
        0,
        500
      )}`
    );
  }

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    throw new Error(
      `Analytics API returned non-JSON: ${path}`
    );
  }

  return res.json();
}

function HealthPill({
  liveProducts,
}: {
  liveProducts: number;
}) {
  if (liveProducts >= 6) {
    return (
      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800">
        Healthy
      </span>
    );
  }

  if (liveProducts >= 3) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800">
        Thin
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-700">
      Needs attention
    </span>
  );
}

export default async function BrandsAnalyticsPage() {
  const data =
    await getJSON(
      "/api/admin/analytics/brands"
    );

  const brands =
    data?.brands ?? [];

 const summary =
  data?.summary ?? {
    brands: 0,
    liveProducts: 0,
    notLiveProducts: 0,
    affiliateReadyProducts: 0,
    missingAffiliateProducts: 0,
    healthyBrands: 0,
    thinBrands: 0,
    attentionBrands: 0,
  };

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">

        <AnalyticsNav />

        {/* HERO */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Brand portfolio
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Brand catalogue health
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Review catalogue depth,
            live product coverage and
            affiliate readiness across
            every Veilora brand.
          </p>
        </section>

        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Brands with products
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {summary.brands}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Live products
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {
                summary.liveProducts
              }
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Healthy brands
            </div>

            <div className="mt-2 text-3xl font-semibold text-emerald-700">
              {
                summary.healthyBrands
              }
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Need attention
            </div>

            <div className="mt-2 text-3xl font-semibold text-[#7B2D3E]">
              {
                summary.attentionBrands
              }
            </div>
          </div>

        </section>

        {/* HEALTH BREAKDOWN */}
        <section className="grid gap-4 md:grid-cols-3">

          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-xs font-medium text-emerald-700">
              Healthy
            </div>

            <div className="mt-1 text-2xl font-semibold text-emerald-900">
              {summary.healthyBrands}
            </div>

            <div className="mt-1 text-xs text-emerald-700/70">
              6+ live products
            </div>
          </div>

          <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-5">
            <div className="text-xs font-medium text-amber-700">
              Thin
            </div>

            <div className="mt-1 text-2xl font-semibold text-amber-900">
              {summary.thinBrands}
            </div>

            <div className="mt-1 text-xs text-amber-700/70">
              3–5 live products
            </div>
          </div>

          <div className="rounded-[22px] border border-red-200 bg-red-50 p-5">
            <div className="text-xs font-medium text-red-700">
              Needs attention
            </div>

            <div className="mt-1 text-2xl font-semibold text-red-900">
              {
                summary.attentionBrands
              }
            </div>

            <div className="mt-1 text-xs text-red-700/70">
              0–2 live products
            </div>
          </div>

        </section>

        {/* BRAND TABLE */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">

          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Brand portfolio
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              Ranked by the number of
              products currently live
              for shoppers.
            </div>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-sm">

              <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-5 py-3">
                    Brand
                  </th>

                  <th className="px-4 py-3">
                    Market
                  </th>

                  <th className="px-4 py-3 text-right">
                    Live
                  </th>

                  <th className="px-4 py-3 text-right">
                      Not live
                      </th>

                  <th className="px-4 py-3 text-right">
                    Active
                  </th>

                  <th className="px-4 py-3 text-right">
                    Published
                  </th>

                  <th className="px-4 py-3 text-right">
                    Affiliate ready
                  </th>

                  <th className="px-4 py-3 text-right">
                    Missing affiliate
                  </th>

                  <th className="px-4 py-3">
                    Catalogue health
                  </th>

                  <th className="px-5 py-3 text-right">
                    Intelligence
                  </th>
                </tr>
              </thead>

              <tbody>
                {brands.map(
                  (brand: any) => (
                    <tr
                      key={brand.id}
                      className="border-t border-black/6"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-black">
                          {
                            brand.name
                          }
                        </div>

                        <div className="mt-0.5 text-xs text-neutral-400">
                          {
                            brand.slug
                          }
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-black">
                          {
                            brand.countryCode ??
                            "—"
                          }
                        </div>

                        <div className="mt-0.5 text-xs text-neutral-400">
                          {brand.region
                            ? brand.region.replaceAll(
                                "_",
                                " "
                              )
                            : "Region not set"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right text-lg font-semibold">
                        {
                          brand.liveProducts
                        }
                      </td>
                      <td className="px-4 py-4 text-right">
  <span
    className={
      brand.notLiveProducts > 0
        ? "font-semibold text-amber-700"
        : "text-neutral-400"
    }
  >
    {brand.notLiveProducts}
  </span>
</td>

                      <td className="px-4 py-4 text-right">
                        {
                          brand.activeProducts
                        }
                      </td>

                      <td className="px-4 py-4 text-right">
                        {
                          brand.publishedProducts
                        }
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className="font-medium text-emerald-700">
                          {
                            brand.affiliateReadyProducts
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span
                          className={
                            brand.missingAffiliateProducts >
                            0
                              ? "font-semibold text-red-600"
                              : "text-neutral-400"
                          }
                        >
                          {
                            brand.missingAffiliateProducts
                          }
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <HealthPill
                          liveProducts={
                            brand.liveProducts
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/analytics/veilora-index/brand/${encodeURIComponent(
                            brand.slug
                          )}`}
                          className="font-medium text-[#7B2D3E] transition hover:underline"
                        >
                          View performance →
                        </Link>
                      </td>
                    </tr>
                  )
                )}

                {!brands.length ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-sm text-neutral-400"
                    >
                      No brands with products found.
                    </td>
                  </tr>
                ) : null}
              </tbody>

            </table>

          </div>
        </section>

      </div>
    </div>
  );
}