import { cookies, headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return `${base}${path}`;
}

async function getJSON(path: string) {
  const jar = await cookies();
  const url = await absoluteUrl(path);

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      cookie: jar.toString(),
    },
  });

  const contentType =
    res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const text =
      await res.text().catch(() => "");

    throw new Error(
      `Analytics API failed: ${path} (${res.status}) ${text.slice(0, 500)}`
    );
  }

  if (!contentType.includes("application/json")) {
    const text =
      await res.text().catch(() => "");

    throw new Error(
      `Analytics API returned non-JSON: ${path} (${res.status}) ` +
        `content-type=${contentType} body=${text.slice(0, 500)}`
    );
  }

  return res.json();
}

function strongestSignal(
  rows: any[]
) {
  return (
    rows.find(
      (row) =>
        row.qualifies
    ) ?? null
  );
}

function percent(
  value: number | null | undefined
) {
  return `${(
    Number(value ?? 0) * 100
  ).toFixed(1)}%`;
}

const MIN_HEAT_SESSIONS = 5;

export default async function BrandIntelligencePage({
  params,
  searchParams,
}: {
  params: Promise<{
    brandSlug: string;
  }>;

  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    country?: string;
    source?: string;
  }>;
}) {
  const {
    brandSlug,
  } = await params;

  const sp =
    await searchParams;

  const range =
    sp.range ?? "30d";

  const from =
    sp.from ?? "";

  const to =
    sp.to ?? "";

  const country =
    sp.country &&
    sp.country.toLowerCase() !== "all"
      ? sp.country.toUpperCase()
      : "all";

  const source =
    sp.source &&
    sp.source.toLowerCase() !== "all"
      ? sp.source.toUpperCase()
      : "all";

  const data =
  await getJSON(
    `/api/admin/analytics/brand/${encodeURIComponent(
      brandSlug
    )}?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`
  );

  const brand =
  data?.brand ?? null;

const products =
  data?.products ?? [];

const profileIntelligence =
  data?.profileIntelligence ?? {
    profileViews: 0,
    uniqueProfileViewers: 0,
    profileProductImpressions: 0,
    exposedProfileViewers: 0,
    profileExplorationRate: 0,

    profileProductExposureSessions: 0,
    profileProductViewSessions: 0,
    profileWishlistSessions: 0,
    profileShopSessions: 0,

    profileToExposureRate: 0,
    profileToProductViewRate: 0,
    profileToWishlistRate: 0,
    profileToShopRate: 0,
  };

const marketSignals =
  data?.marketSignals ?? {
    productTypes: [],
    colours: [],
    styles: [],
    materials: [],
    occasions: [],
  };

  if (!brand) {
    return (
      <div className="min-h-screen bg-neutral-50/70 p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/admin/analytics/veilora-index?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
            className="text-sm font-medium text-[#7B2D3E]"
          >
            ← Back to Veilora Index
          </Link>

          <div className="mt-8 rounded-[28px] border border-black/10 bg-white p-8">
            <h1 className="text-xl font-semibold">
              Brand intelligence not found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const lowSample =
    Number(
      brand.uniqueImpressionSessions ?? 0
    ) < MIN_HEAT_SESSIONS;

  const profileLowSample =
    Number(
    profileIntelligence.uniqueProfileViewers ?? 0
  ) < MIN_HEAT_SESSIONS;

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">

        <Link
          href={`/admin/analytics/veilora-index?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
          className="inline-flex text-sm font-medium text-[#7B2D3E]"
        >
          ← Back to Veilora Index
        </Link>

        {/* HERO */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Brand intelligence
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {brand.name}
            </h1>

            {lowSample ? (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/80">
                Low sample
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-white/60">
            How shoppers are responding to {brand.name} across Veilora.
          </p>
        </section>

        {/* MAIN KPI CARDS */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Impressions
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {brand.impressions ?? 0}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Exposed shoppers
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {brand.uniqueImpressionSessions ?? 0}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Views
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {brand.views ?? 0}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Saves
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {brand.wishlistAdds ?? 0}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Shop
            </div>

            <div className="mt-2 text-3xl font-semibold text-[#7B2D3E]">
              {brand.shopClicks ?? 0}
            </div>
          </div>

        </section>

        {/* BEHAVIOURAL STRENGTH */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">

          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Shopper response
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              How efficiently {brand.name} converts exposure into interest, saves and outbound intent.
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-4">

            <div>
              <div className="text-xs text-neutral-400">
                View rate
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {percent(
                  brand.viewRate
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Save rate
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {percent(
                  brand.saveRate
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Shop intent rate
              </div>

              <div className="mt-1 text-2xl font-semibold text-[#7B2D3E]">
                {percent(
                  brand.shopIntentRate
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Heat score
              </div>

              <div className="mt-1 text-2xl font-semibold text-[#7B2D3E]">
                {lowSample
                  ? "—"
                  : percent(
                      brand.strengthScore
                    )}
              </div>
            </div>

          </div>
        </section>

        {/* STRONGEST MARKET SIGNALS */}
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">

  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">

    <div className="text-sm font-semibold">
      Strongest market signals
    </div>

    <div className="mt-0.5 text-xs text-neutral-400">
      The product attributes generating the strongest shopper response for {brand.name}.
    </div>

  </div>

  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">

    {[
      {
        label:
          "Product type",

        group:
          "productTypes",

        row:
          strongestSignal(
            marketSignals.productTypes
          ),
      },

      {
        label:
          "Colour",

        group:
          "colours",

        row:
          strongestSignal(
            marketSignals.colours
          ),
      },

      {
        label:
          "Style",

        group:
          "styles",

        row:
          strongestSignal(
            marketSignals.styles
          ),
      },

      {
        label:
          "Material",

        group:
          "materials",

        row:
          strongestSignal(
            marketSignals.materials
          ),
      },

      {
        label:
          "Occasion",

        group:
          "occasions",

        row:
          strongestSignal(
            marketSignals.occasions
          ),
      },
    ].map(
      ({
        label,
        group,
        row,
      }) => (
        <div
          key={group}
          className="rounded-[22px] border border-black/10 bg-white p-4"
        >

          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {label}
          </div>

          {row ? (
            <>
              <Link
                href={
                  `/admin/analytics/veilora-index/signal/${group}/${encodeURIComponent(
                    row.key
                  )}/brand/${encodeURIComponent(
                    brand.slug
                  )}` +
                  `?range=${range}` +
                  `&from=${encodeURIComponent(
                    from
                  )}` +
                  `&to=${encodeURIComponent(
                    to
                  )}` +
                  `&country=${encodeURIComponent(
                    country
                  )}` +
                  `&source=${encodeURIComponent(
                    source
                  )}`
                }
                className="mt-2 block text-lg font-semibold text-black transition hover:text-[#7B2D3E] hover:underline"
              >
                {row.label}
              </Link>

              <div className="mt-4 space-y-1.5">

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    Heat
                  </span>

                  <span className="font-semibold text-[#7B2D3E]">
                    {percent(
                      row.strengthScore
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    Exposed
                  </span>

                  <span className="font-medium text-black">
                    {
                      row.uniqueImpressionSessions
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    Shop intent
                  </span>

                  <span className="font-medium text-black">
                    {percent(
                      row.shopIntentRate
                    )}
                  </span>
                </div>

              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-neutral-400">
              Not enough data yet
            </div>
          )}

        </div>
      )
    )}

  </div>

</section>

{/* BRAND PROFILE INTELLIGENCE */}
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">

  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
    <div className="flex flex-wrap items-center gap-2">

      <div className="text-sm font-semibold">
        Brand profile intelligence
      </div>

      {profileLowSample &&
      Number(
        profileIntelligence.uniqueProfileViewers ?? 0
      ) > 0 ? (
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Low sample
        </span>
      ) : null}

    </div>

    <div className="mt-0.5 text-xs text-neutral-400">
      How shoppers explore {brand.name}&apos;s brand profile and continue into product discovery and shopping intent.
    </div>
  </div>

  {/* PROFILE KPIs */}
  <div className="grid gap-4 border-b border-black/6 p-5 md:grid-cols-2 xl:grid-cols-4">

    <div className="rounded-[22px] border border-black/10 bg-neutral-50/60 p-4">
      <div className="text-xs text-neutral-400">
        Profile visits
      </div>

      <div className="mt-2 text-3xl font-semibold">
        {
          profileIntelligence.profileViews ??
          0
        }
      </div>

      <div className="mt-1 text-[11px] text-neutral-400">
        Total visits to the brand profile, including repeat visits.
      </div>
    </div>

    <div className="rounded-[22px] border border-black/10 bg-neutral-50/60 p-4">
      <div className="text-xs text-neutral-400">
        Unique visitors
      </div>

      <div className="mt-2 text-3xl font-semibold">
        {
          profileIntelligence.uniqueProfileViewers ??
          0
        }
      </div>

      <div className="mt-1 text-[11px] text-neutral-400">
        Unique shoppers who visited the profile.
      </div>
    </div>

    <div className="rounded-[22px] border border-black/10 bg-neutral-50/60 p-4">
  <div className="text-xs text-neutral-400">
    Product impressions
  </div>

  <div className="mt-2 text-3xl font-semibold">
    {
      profileIntelligence.profileProductImpressions ??
      0
    }
  </div>

  <div className="mt-1 text-[11px] text-neutral-400">
    Product impressions generated within the brand profile.
  </div>
</div>

    <div className="rounded-[22px] border border-black/10 bg-neutral-50/60 p-4">
      <div className="text-xs text-neutral-400">
        Profile exploration rate
      </div>

      <div className="mt-2 text-3xl font-semibold text-[#7B2D3E]">
        {profileLowSample
          ? "—"
          : percent(
              profileIntelligence.profileExplorationRate
            )}
      </div>

      <div className="mt-1 text-[11px] text-neutral-400">
        Exposed shoppers who also visited the brand profile.
      </div>
    </div>

  </div>

  {/* PROFILE SHOPPING JOURNEY */}
  <div className="p-5">

    <div>
      <div className="text-sm font-semibold">
        Shopping journey from profile
      </div>

      <div className="mt-0.5 text-xs text-neutral-400">
        What unique profile visitors went on to do within {brand.name}&apos;s shopping journey.
      </div>
    </div>

    <div className="mt-5 overflow-x-auto">

      <table className="w-full min-w-[760px] text-sm">

        <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
          <tr>
            <th className="px-4 py-3">
              Journey stage
            </th>

            <th className="px-4 py-3 text-right">
              Unique shoppers
            </th>

            <th className="px-4 py-3 text-right">
              From profile
            </th>
          </tr>
        </thead>

        <tbody>

          <tr className="border-t border-black/6">
            <td className="px-4 py-3.5 font-medium">
              Profile visitors
            </td>

            <td className="px-4 py-3.5 text-right font-semibold">
              {
                profileIntelligence.uniqueProfileViewers ??
                0
              }
            </td>

            <td className="px-4 py-3.5 text-right text-neutral-400">
              Starting point
            </td>
          </tr>

          <tr className="border-t border-black/6">
            <td className="px-4 py-3.5">
              Product PDP viewers
            </td>

            <td className="px-4 py-3.5 text-right">
              {
                profileIntelligence.profileProductViewSessions ??
                0
              }
            </td>

            <td className="px-4 py-3.5 text-right font-medium">
              {profileLowSample
                ? "—"
                : percent(
                    profileIntelligence.profileToProductViewRate
                  )}
            </td>
          </tr>

          <tr className="border-t border-black/6">
            <td className="px-4 py-3.5">
              Savers
            </td>

            <td className="px-4 py-3.5 text-right">
              {
                profileIntelligence.profileWishlistSessions ??
                0
              }
            </td>

            <td className="px-4 py-3.5 text-right font-medium">
              {profileLowSample
                ? "—"
                : percent(
                    profileIntelligence.profileToWishlistRate
                  )}
            </td>
          </tr>

          <tr className="border-t border-black/6">
            <td className="px-4 py-3.5">
              Shop intent shoppers
            </td>

            <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
              {
                profileIntelligence.profileShopSessions ??
                0
              }
            </td>

            <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
              {profileLowSample
                ? "—"
                : percent(
                    profileIntelligence.profileToShopRate
                  )}
            </td>
          </tr>

        </tbody>

      </table>

    </div>

    {Number(
      profileIntelligence.uniqueProfileViewers ?? 0
    ) === 0 ? (
      <div className="mt-4 rounded-[18px] border border-dashed border-black/10 bg-neutral-50 px-4 py-4 text-sm text-neutral-400">
        No brand profile visits recorded for this period and filter selection.
      </div>
    ) : null}

  </div>

</section>


        {/* PRODUCT DRIVERS */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">

          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Products driving {brand.name}
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              Individual products generating exposure and shopper response.
            </div>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1250px] text-sm">

              <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="px-4 py-3 text-right">
                    Impressions
                  </th>

                  <th className="px-4 py-3 text-right">
                    Exposed shoppers
                  </th>

                  <th className="px-4 py-3 text-right">
                    Views
                  </th>

                  <th className="px-4 py-3 text-right">
                    Saves
                  </th>

                  <th className="px-4 py-3 text-right">
                    Shop
                  </th>

                  <th className="px-4 py-3 text-right">
                    View rate
                  </th>

                  <th className="px-4 py-3 text-right">
                    Save rate
                  </th>

                  <th className="px-4 py-3 text-right">
                    Shop intent
                  </th>

                  <th className="px-4 py-3 text-right">
                    Heat
                  </th>

                </tr>
              </thead>

              <tbody>

                {products.map(
                  (product: any) => {
                    const productLowSample =
                      Number(
                        product.uniqueImpressionSessions ??
                          0
                      ) <
                      MIN_HEAT_SESSIONS;

                    return (
                      <tr
                        key={
                          product.productId
                        }
                        className="border-t border-black/6"
                      >

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">

                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-50">

                              {product.imageUrl ? (
                                <img
                                  src={
                                    product.imageUrl
                                  }
                                  alt={
                                    product.title
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : null}

                            </div>

                            <div>
                              <div className="font-medium text-black">
                                {
                                  product.title
                                }
                              </div>

                              {productLowSample ? (
                                <span className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  Low sample
                                </span>
                              ) : null}
                            </div>

                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {
                            product.impressions
                          }
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {
                            product.uniqueImpressionSessions
                          }
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {
                            product.views
                          }
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {
                            product.wishlistAdds
                          }
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {
                            product.shopClicks
                          }
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {percent(
                            product.viewRate
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {percent(
                            product.saveRate
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                          {percent(
                            product.shopIntentRate
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                          {productLowSample
                            ? "—"
                            : percent(
                                product.strengthScore
                              )}
                        </td>

                      </tr>
                    );
                  }
                )}

                {!products.length ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-sm text-neutral-400"
                    >
                      No product performance data yet.
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