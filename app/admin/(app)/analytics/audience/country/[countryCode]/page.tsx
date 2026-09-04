import Link from "next/link";
import { cookies, headers } from "next/headers";

import AnalyticsNav from "@/components/analytics/AnalyticsNav";

type SignalRow = {
  key: string;
  label: string;

  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;

  uniqueImpressionSessions: number;
  uniqueViewSessions: number;
  uniqueWishlistSessions: number;
  uniqueShopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strengthScore: number;
  qualifies: boolean;
};

type MarketAudienceResponse = {
  ok: boolean;

  filters: {
    country: string;
    source: string;

    countries: string[];
    discoverySources: string[];
  };

  segment: {
    type: "MARKET";

    key: string;
    label: string;

    audienceSize: number;
    audienceShare: number;
    activeSessions: number;
  };

  range: {
    start: string;
    endExclusive: string;
  };

  behaviour: {
    impressions: number;
    views: number;
    wishlistAdds: number;
    shopClicks: number;

    uniqueExposedSessions: number;
    uniqueViewSessions: number;
    uniqueWishlistSessions: number;
    uniqueShopSessions: number;

    viewRate: number;
    saveRate: number;
    shopIntentRate: number;
  };

  signals: {
    productTypes: SignalRow[];
    colours: SignalRow[];
    styles: SignalRow[];
    materials: SignalRow[];
    occasions: SignalRow[];
  };

  brands: SignalRow[];
  products: SignalRow[];
};

type SearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
  country?: string;
  source?: string;
}>;

type PageParams = Promise<{
  countryCode: string;
}>;

const VALID_RANGES = [
  "today",
  "7d",
  "30d",
  "90d",
  "1y",
  "custom",
] as const;

function percent(
  value:
    | number
    | null
    | undefined
) {
  if (
    value == null ||
    Number.isNaN(value)
  ) {
    return "—";
  }

  return `${(
    value * 100
  ).toFixed(1)}%`;
}

function formatNumber(
  value:
    | number
    | null
    | undefined
) {
  return Number(
    value ?? 0
  ).toLocaleString();
}

function countryLabel(
  code: string
) {
  try {
    const displayNames =
      new Intl.DisplayNames(
        ["en"],
        {
          type: "region",
        }
      );

    return (
      displayNames.of(code) ??
      code
    );
  } catch {
    return code;
  }
}

function sourceLabel(
  source: string
) {
  if (
    source ===
    "STYLE_FEED"
  ) {
    return "Style Feed";
  }

  if (
    source ===
    "CONTINENT"
  ) {
    return "Discover the World";
  }

  if (
    source ===
    "EMERGING_BRANDS"
  ) {
    return "Emerging Brands";
  }

  return source
    .toLowerCase()
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function buildMarketUrl({
  countryCode,
  range,
  from,
  to,
  country,
  source,
}: {
  countryCode: string;
  range: string;
  from?: string;
  to?: string;
  country: string;
  source: string;
}) {
  const params =
    new URLSearchParams();

  params.set(
    "range",
    range
  );

  if (
    range === "custom"
  ) {
    if (from) {
      params.set(
        "from",
        from
      );
    }

    if (to) {
      params.set(
        "to",
        to
      );
    }
  }

  params.set(
    "country",
    country
  );

  params.set(
    "source",
    source
  );

  return `/admin/analytics/audience/country/${countryCode}?${params.toString()}`;
}

function RangeLink({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-xs font-medium transition",
        active
          ? "border-[#7B2D3E] bg-[#7B2D3E] text-white"
          : "border-black/10 bg-white text-neutral-700 hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B87583]">
        {eyebrow}
      </p>

      <h2 className="text-lg font-medium text-neutral-950">
        {title}
      </h2>

      {description ? (
        <p className="max-w-3xl text-sm leading-6 text-neutral-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
      <div className="bg-[#F6E8EC] px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B4354]">
          {label}
        </p>
      </div>

      <div className="px-5 py-5">
        <p className="text-2xl font-medium tracking-tight text-neutral-950">
          {value}
        </p>

        {description ? (
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

async function absoluteUrl(path: string) {
  const headerStore = await headers();

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host");

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production"
      ? "https"
      : "http");

  if (!host) {
    throw new Error(
      `Unable to determine request host for ${path}`
    );
  }

  return `${protocol}://${host}${path}`;
}

function BehaviourRateCard({
  label,
  rate,
  exposed,
}: {
  label: string;
  rate: number;
  exposed: number;
}) {
  const qualifies =
    exposed >= 5;

  return (
    <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-sm">
      <div className="bg-[#F6E8EC] px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8B4354]">
          {label}
        </p>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xl font-medium tracking-tight text-neutral-950">
            {qualifies
              ? percent(rate)
              : "—"}
          </p>

          {!qualifies ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Low sample
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-xs leading-5 text-neutral-500">
          Based on unique exposed sessions.
        </p>
      </div>
    </div>
  );
}

function SignalTable({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: SignalRow[];
}) {
  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Market intelligence"
        title={title}
        description={description}
      />

      <div className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-black/5 bg-[#FCF8F9]">
              <tr className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                <th className="px-5 py-4 font-medium">
                  Signal
                </th>

                <th className="px-5 py-4 font-medium">
                  Exposed
                </th>

                <th className="px-5 py-4 font-medium">
                  View rate
                </th>

                <th className="px-5 py-4 font-medium">
                  Save rate
                </th>

                <th className="px-5 py-4 font-medium">
                  Shop intent
                </th>

                <th className="px-5 py-4 font-medium">
                  Strength
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map(
                  (row) => (
                    <tr
                      key={
                        row.key
                      }
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-900">
                            {
                              row.label
                            }
                          </span>

                          {!row.qualifies ? (
                            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
                              Low sample
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-neutral-600">
                        {
                          row.uniqueImpressionSessions
                        }
                      </td>

                      <td className="px-5 py-4 text-neutral-600">
                        {row.qualifies
                          ? percent(
                              row.viewRate
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-neutral-600">
                        {row.qualifies
                          ? percent(
                              row.saveRate
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-neutral-600">
                        {row.qualifies
                          ? percent(
                              row.shopIntentRate
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4 font-medium text-neutral-900">
                        {row.qualifies
                          ? (
                              row.strengthScore *
                              100
                            ).toFixed(
                              1
                            )
                          : "—"}
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-sm text-neutral-400"
                  >
                    No data for this market and filter combination yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default async function MarketAudiencePage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const {
    countryCode:
      rawCountryCode,
  } = await params;

  const marketCountryCode =
    decodeURIComponent(
      rawCountryCode
    )
      .trim()
      .toUpperCase();

  const sp =
    await searchParams;

  const rawRange =
    sp.range ??
    "30d";

  const range =
    VALID_RANGES.includes(
      rawRange as
        (typeof VALID_RANGES)[number]
    )
      ? rawRange
      : "30d";

  const from =
    sp.from ??
    "";

  const to =
    sp.to ??
    "";

  const rawCountry =
    sp.country?.trim();

  const country =
    !rawCountry ||
    rawCountry.toLowerCase() ===
      "all"
      ? "all"
      : rawCountry.toUpperCase();

  const rawSource =
    sp.source?.trim();

  const source =
    !rawSource ||
    rawSource.toLowerCase() ===
      "all"
      ? "all"
      : rawSource.toUpperCase();

  const apiParams =
    new URLSearchParams();

  apiParams.set(
    "range",
    range
  );

  apiParams.set(
    "country",
    country
  );

  apiParams.set(
    "source",
    source
  );

  if (
    range === "custom"
  ) {
    if (from) {
      apiParams.set(
        "from",
        from
      );
    }

    if (to) {
      apiParams.set(
        "to",
        to
      );
    }
  }

const cookieStore =
  await cookies();

const cookieHeader =
  cookieStore.toString();

const url = await absoluteUrl(
  `/api/admin/analytics/audience/country/${encodeURIComponent(
    marketCountryCode
  )}?${apiParams.toString()}`
);

 const response =
  await fetch(
    url,
    {
      headers: {
        cookie:
          cookieHeader,
      },
      cache:
        "no-store",
    }
  );

 if (!response.ok) {
  const errorText =
    await response.text();

  throw new Error(
    `Unable to load market audience intelligence: ${errorText}`
  );
}

  const data =
    (await response.json()) as MarketAudienceResponse;

  const marketName =
    countryLabel(
      marketCountryCode
    );

  const backParams =
    new URLSearchParams();

  backParams.set(
    "range",
    range
  );

  backParams.set(
    "country",
    country
  );

  backParams.set(
    "source",
    source
  );

  if (
    range === "custom"
  ) {
    if (from) {
      backParams.set(
        "from",
        from
      );
    }

    if (to) {
      backParams.set(
        "to",
        to
      );
    }
  }

  const backHref =
    `/admin/analytics/audience?${backParams.toString()}`;

  const rangeHref = (
    nextRange: string
  ) =>
    buildMarketUrl({
      countryCode:
        marketCountryCode,

      range:
        nextRange,

      from:
        nextRange ===
        "custom"
          ? from
          : undefined,

      to:
        nextRange ===
        "custom"
          ? to
          : undefined,

      country,
      source,
    });

  return (
    <div className="min-h-screen bg-[#F8F5F3]">
      <AnalyticsNav />

      <main className="mx-auto w-full max-w-[1500px] px-6 py-8 lg:px-10 lg:py-10">
        <Link
          href={backHref}
          className="inline-flex items-center text-sm text-neutral-500 transition hover:text-[#7B2D3E]"
        >
          ← Back to Audience
        </Link>

        <section className="mt-6 rounded-[32px] bg-[#7B2D3E] px-7 py-8 text-white md:px-10 md:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">
            Audience market
          </p>

          <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
            {marketName}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
            Understand how shoppers respond to brands and products from {marketName}.
            Registered country shows where the shopper is based; this market represents
            the home country of the brands and products they interact with.
          </p>
        </section>

        <section className="mt-6">
          <div className="rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B87583]">
                  Reporting period
                </p>

                <p className="mt-1 text-sm text-neutral-500">
                  All Audience market intelligence below uses this period.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <RangeLink
                  label="Today"
                  active={
                    range ===
                    "today"
                  }
                  href={rangeHref(
                    "today"
                  )}
                />

                <RangeLink
                  label="7 Days"
                  active={
                    range ===
                    "7d"
                  }
                  href={rangeHref(
                    "7d"
                  )}
                />

                <RangeLink
                  label="30 Days"
                  active={
                    range ===
                    "30d"
                  }
                  href={rangeHref(
                    "30d"
                  )}
                />

                <RangeLink
                  label="90 Days"
                  active={
                    range ===
                    "90d"
                  }
                  href={rangeHref(
                    "90d"
                  )}
                />

                <RangeLink
                  label="1 Year"
                  active={
                    range ===
                    "1y"
                  }
                  href={rangeHref(
                    "1y"
                  )}
                />

                <RangeLink
                  label="Custom"
                  active={
                    range ===
                    "custom"
                  }
                  href={rangeHref(
                    "custom"
                  )}
                />
              </div>
            </div>

            {range ===
            "custom" ? (
              <form
                method="GET"
                className="mt-5 flex flex-wrap items-end gap-3 border-t border-black/5 pt-5"
              >
                <input
                  type="hidden"
                  name="range"
                  value="custom"
                />

                <input
                  type="hidden"
                  name="country"
                  value={
                    country
                  }
                />

                <input
                  type="hidden"
                  name="source"
                  value={
                    source
                  }
                />

                <label className="space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    From
                  </span>

                  <input
                    type="date"
                    name="from"
                    defaultValue={
                      from
                    }
                    className="block rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[#7B2D3E]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    To
                  </span>

                  <input
                    type="date"
                    name="to"
                    defaultValue={
                      to
                    }
                    className="block rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[#7B2D3E]"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-medium text-white"
                >
                  Apply dates
                </button>
              </form>
            ) : null}
          </div>

          <form
            method="GET"
            className="mt-4 flex flex-wrap items-center gap-3"
          >
            <input
              type="hidden"
              name="range"
              value={
                range
              }
            />

            {range ===
            "custom" ? (
              <>
                <input
                  type="hidden"
                  name="from"
                  value={
                    from
                  }
                />

                <input
                  type="hidden"
                  name="to"
                  value={
                    to
                  }
                />
              </>
            ) : null}

            <select
              name="country"
              defaultValue={
                country
              }
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-[#7B2D3E]"
            >
              <option value="all">
                All registered countries
              </option>

              {data.filters.countries.map(
                (code) => (
                  <option
                    key={
                      code
                    }
                    value={
                      code
                    }
                  >
                    {countryLabel(
                      code
                    )}
                  </option>
                )
              )}
            </select>

            <select
              name="source"
              defaultValue={
                source
              }
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none focus:border-[#7B2D3E]"
            >
              <option value="all">
                All discovery sources
              </option>

              {data.filters.discoverySources.map(
                (
                  item
                ) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {sourceLabel(
                      item
                    )}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#682535]"
            >
              Apply
            </button>
          </form>
        </section>

        <section className="mt-10 space-y-5">
          <SectionHeading
            eyebrow="Market audience"
            title={`${marketName} audience`}
            description={`Unique sessions exposed to products from ${marketName}-based brands during the selected period.`}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Market audience"
              value={formatNumber(
                data.segment.audienceSize
              )}
              description="Unique sessions exposed to at least one product from a brand based in this market."
            />

            <MetricCard
              label="Audience reach"
              value={percent(
                data.segment.audienceShare
              )}
              description="Share of known brand-market sessions that interacted with this market."
            />

            <MetricCard
              label="Active sessions"
              value={formatNumber(
                data.segment.activeSessions
              )}
              description="Unique sessions contributing tracked behaviour to this market."
            />
          </div>
        </section>

        <section className="mt-10 space-y-5">
          <SectionHeading
            eyebrow="Shopper response"
            title="How shoppers respond"
            description={`Response to products from ${marketName}-based brands. Rates use unique exposed sessions as the denominator.`}
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            

            <BehaviourRateCard
              label="View rate"
              rate={
                data.behaviour.viewRate
              }
              exposed={
                data.behaviour.uniqueExposedSessions
              }
            />

            <BehaviourRateCard
              label="Save rate"
              rate={
                data.behaviour.saveRate
              }
              exposed={
                data.behaviour.uniqueExposedSessions
              }
            />

            <BehaviourRateCard
              label="Shop-intent rate"
              rate={
                data.behaviour.shopIntentRate
              }
              exposed={
                data.behaviour.uniqueExposedSessions
              }
            />
          </div>
        </section>

        <section className="mt-10 space-y-5">
          <SectionHeading
            eyebrow="Activity volume"
            title="Tracked activity"
            description="Raw event volume within this market cohort."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Product impressions"
              value={formatNumber(
                data.behaviour.impressions
              )}
            />

            <MetricCard
              label="Product views"
              value={formatNumber(
                data.behaviour.views
              )}
            />

            <MetricCard
              label="Wishlist adds"
              value={formatNumber(
                data.behaviour.wishlistAdds
              )}
            />

            <MetricCard
              label="Shop clicks"
              value={formatNumber(
                data.behaviour.shopClicks
              )}
            />
          </div>
        </section>

        <div className="mt-12 space-y-12">
          <SignalTable
            title="Strongest product types"
            description={`Which product categories shoppers respond to most strongly within the ${marketName} market.`}
            rows={
              data.signals.productTypes
            }
          />

          <SignalTable
            title="Strongest brands"
            description={`Brands from ${marketName} generating the strongest shopper response.`}
            rows={
              data.brands
            }
          />

          <SignalTable
            title="Strongest products"
            description={`Individual products from ${marketName}-based brands generating the strongest response.`}
            rows={
              data.products
            }
          />

          <SignalTable
            title="Strongest colours"
            description={`Colours shoppers respond to most strongly within products from ${marketName}.`}
            rows={
              data.signals.colours
            }
          />

          <SignalTable
            title="Strongest styles"
            description={`Style signals showing the strongest response within the ${marketName} market.`}
            rows={
              data.signals.styles
            }
          />

          <SignalTable
            title="Strongest materials"
            description={`Materials generating the strongest shopper response within products from ${marketName}.`}
            rows={
              data.signals.materials
            }
          />

          <SignalTable
            title="Strongest occasions"
            description={`Occasion signals generating the strongest response within the ${marketName} market.`}
            rows={
              data.signals.occasions
            }
          />
        </div>
      </main>
    </div>
  );
}