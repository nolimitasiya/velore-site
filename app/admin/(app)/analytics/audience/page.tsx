import Link from "next/link";
import { cookies } from "next/headers";

import AnalyticsNav from "@/components/analytics/AnalyticsNav";

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

  const res = await fetch(
    absoluteUrl(path),
    {
      cache: "no-store",
      headers: {
        cookie: jar.toString(),
      },
    }
  );

  if (!res.ok) {
    const text =
      await res
        .text()
        .catch(() => "");

    throw new Error(
      `Failed: ${path} (${res.status}) ${text}`
    );
  }

  return res.json();
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
        <div className="text-sm font-semibold text-black">
          {title}
        </div>

        {subtitle ? (
          <div className="mt-0.5 text-xs text-neutral-400">
            {subtitle}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

const regionNames =
  new Intl.DisplayNames(
    ["en"],
    {
      type: "region",
    }
  );

function countryLabel(
  code: string
) {
  return (
    regionNames.of(
      String(code ?? "")
        .toUpperCase()
    ) ?? code
  );
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
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function percent(
  value: number | null | undefined
) {
  if (
    value == null ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "—";
  }

  return `${(
    Number(value) * 100
  ).toFixed(1)}%`;
}

function buildAudienceUrl({
  range,
  from,
  to,
  country,
  source,
}: {
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

  if (
    country !== "all"
  ) {
    params.set(
      "country",
      country
    );
  }

  if (
    source !== "all"
  ) {
    params.set(
      "source",
      source
    );
  }

  return `/admin/analytics/audience?${params.toString()}`;
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

export default async function AudienceAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    country?: string;
    source?: string;
  }>;
}) {
  const sp =
    await searchParams;

  const range =
    sp.range === "today" ||
    sp.range === "7d" ||
    sp.range === "30d" ||
    sp.range === "90d" ||
    sp.range === "1y" ||
    sp.range === "custom"
      ? sp.range
      : "30d";

  const fromDate =
    sp.from ?? "";

  const toDate =
    sp.to ?? "";

  const rawCountry =
  sp.country?.trim();

const country =
  !rawCountry ||
  rawCountry.toLowerCase() === "all"
    ? "all"
    : rawCountry.toUpperCase();

const rawSource =
  sp.source?.trim();

const source =
  !rawSource ||
  rawSource.toLowerCase() === "all"
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
    if (fromDate) {
      apiParams.set(
        "from",
        fromDate
      );
    }

    if (toDate) {
      apiParams.set(
        "to",
        toDate
      );
    }
  }

  const data =
    await getJSON(
      `/api/admin/analytics/audience?${apiParams.toString()}`
    );

  const overview =
    data?.overview ?? {};

  const geography =
    data?.geography ?? [];

  const ageDistribution =
    data?.ageDistribution ?? [];

  const countries:
    string[] =
    data?.filters?.countries ??
    [];

  const discoverySources:
    string[] =
    data?.filters
      ?.discoverySources ??
    [];

  const drilldownParams =
    new URLSearchParams();

  drilldownParams.set(
    "range",
    range
  );

  if (
    country !== "all"
  ) {
    drilldownParams.set(
      "country",
      country
    );
  }

  if (
    source !== "all"
  ) {
    drilldownParams.set(
      "source",
      source
    );
  }

  if (
    range === "custom"
  ) {
    if (fromDate) {
      drilldownParams.set(
        "from",
        fromDate
      );
    }

    if (toDate) {
      drilldownParams.set(
        "to",
        toDate
      );
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">

        <AnalyticsNav />

        {/* HERO */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">

          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Audience analytics
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Shopper intelligence
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Understand who makes up the
            Veilora audience, where shoppers
            are coming from and which
            demographic groups are growing.
          </p>

        </section>

        {/* FILTERS */}
        {/* FILTERS */}
<section className="space-y-4">

  {/* Reporting period */}
  <div className="rounded-[28px] border border-black/10 bg-white px-4 py-4 md:px-5">

    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/60">
          Reporting period
        </div>

        <div className="mt-1 text-xs text-neutral-500">
          All Audience intelligence below uses this period.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">

        <RangeLink
          label="Today"
          active={range === "today"}
          href={buildAudienceUrl({
            range: "today",
            country,
            source,
          })}
        />

        <RangeLink
          label="7 Days"
          active={range === "7d"}
          href={buildAudienceUrl({
            range: "7d",
            country,
            source,
          })}
        />

        <RangeLink
          label="30 Days"
          active={range === "30d"}
          href={buildAudienceUrl({
            range: "30d",
            country,
            source,
          })}
        />

        <RangeLink
          label="90 Days"
          active={range === "90d"}
          href={buildAudienceUrl({
            range: "90d",
            country,
            source,
          })}
        />

        <RangeLink
          label="1 Year"
          active={range === "1y"}
          href={buildAudienceUrl({
            range: "1y",
            country,
            source,
          })}
        />

        <RangeLink
          label="Custom"
          active={range === "custom"}
          href={buildAudienceUrl({
            range: "custom",
            from: fromDate,
            to: toDate,
            country,
            source,
          })}
        />

      </div>

    </div>

    {/* Custom dates */}
    {range === "custom" ? (
      <form
        method="GET"
        action="/admin/analytics/audience"
        className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/5 pt-4"
      >
        <input
          type="hidden"
          name="range"
          value="custom"
        />

        <input
          type="hidden"
          name="country"
          value={country}
        />

        <input
          type="hidden"
          name="source"
          value={source}
        />

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-neutral-400">
            From
          </label>

          <input
            type="date"
            name="from"
            defaultValue={fromDate}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-neutral-400">
            To
          </label>

          <input
            type="date"
            name="to"
            defaultValue={toDate}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-[#7B2D3E]/40"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#6a2535]"
        >
          Apply
        </button>
      </form>
    ) : null}

  </div>

  {/* Country + Discovery Source */}
  <form
    method="GET"
    action="/admin/analytics/audience"
    className="flex flex-wrap items-center gap-2"
  >
    <input
      type="hidden"
      name="range"
      value={range}
    />

    {range === "custom" ? (
      <>
        <input
          type="hidden"
          name="from"
          value={fromDate}
        />

        <input
          type="hidden"
          name="to"
          value={toDate}
        />
      </>
    ) : null}

    <select
      name="country"
      defaultValue={country}
      className="min-w-[172px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none transition focus:border-[#7B2D3E]/40"
    >
      <option value="all">
        All countries
      </option>

      {countries.map((countryCode) => (
        <option
          key={countryCode}
          value={countryCode}
        >
          {countryLabel(countryCode)}
        </option>
      ))}
    </select>

    <select
      name="source"
      defaultValue={source}
      className="min-w-[172px] rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-neutral-700 outline-none transition focus:border-[#7B2D3E]/40"
    >
      <option value="all">
        All discovery sources
      </option>

      {discoverySources.map(
        (discoverySource) => (
          <option
            key={discoverySource}
            value={discoverySource}
          >
            {sourceLabel(
              discoverySource
            )}
          </option>
        )
      )}
    </select>

    <button
      type="submit"
      className="rounded-full bg-[#7B2D3E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#6a2535]"
    >
      Apply
    </button>

  </form>

</section>

        {/* OVERVIEW */}
        <section className="space-y-4">

          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Audience
            </div>

            <h2 className="text-sm font-medium text-black">
              Shopper overview
            </h2>
          </div>

          <div className="mx-auto grid w-full max-w-[760px] gap-4 md:grid-cols-2">

            <Card
              title="Registered shoppers"
              subtitle="Total Veilora shopper accounts"
            >
              <div className="p-5">

                <div className="text-3xl font-semibold">
                  {overview.registeredShoppers ??
                    0}
                </div>

                <div className="mt-1 text-[11px] text-neutral-400">
                  Shoppers who have created
                  an account.
                </div>

              </div>
            </Card>

            <Card
              title="Active audience"
              subtitle="Analytics sessions active in selected period"
            >
              <div className="p-5">

                <div className="text-3xl font-semibold">
                  {overview.activeAudience ??
                    0}
                </div>

                <div className="mt-1 text-[11px] text-neutral-400">
                  Includes registered and
                  anonymous shopping sessions.
                </div>

              </div>
            </Card>

          </div>
        </section>

        {/* GEOGRAPHY */}
        <section className="space-y-4">

          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Geography
            </div>

            <h2 className="text-sm font-medium text-black">
              Brand markets
            </h2>
          </div>

          <Card
            title="Brand markets"
            subtitle="Shopper exposure across brands from different global markets"
          >

            <div className="overflow-x-auto">

              <table className="w-full min-w-[640px] text-sm">

                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">

                  <tr>
                    <th className="px-5 py-3">
                      Brand market
                    </th>

                    <th className="px-5 py-3 text-right">
                      Unique exposed sessions
                    </th>

                    <th className="px-5 py-3 text-right">
                      Audience reach
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {geography.map(
                    (row: any) => (

                      <tr
                        key={
                          row.countryCode
                        }
                        className="border-t border-black/6 transition hover:bg-[#fdf7f4]/60"
                      >

                        <td className="px-5 py-3.5 font-medium">

                          <Link
                            href={
                              `/admin/analytics/audience/country/${encodeURIComponent(
                                row.countryCode
                              )}?${drilldownParams.toString()}`
                            }
                            className="underline decoration-black/15 underline-offset-4 transition hover:text-[#7B2D3E]"
                          >
                            {countryLabel(
                              row.countryCode
                            )}
                          </Link>

                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {row.uniqueSessions ??
                            0}
                        </td>

                        <td className="px-5 py-3.5 text-right font-medium">
                          {percent(
                            row.share
                          )}
                        </td>

                      </tr>
                    )
                  )}

                  {geography.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-sm text-neutral-400"
                      >
                        No brand-market exposure for this period.
                      </td>
                    </tr>
                  ) : null}

                </tbody>

              </table>

            </div>

            <div className="border-t border-black/6 px-5 py-3 text-[11px] leading-5 text-neutral-400">
  Brand markets represent the home market of brands whose
  products were shown to shoppers. Audience reach is based on
  unique exposed sessions and may overlap across markets because
  the same session can see products from more than one market.
</div>

          </Card>

        </section>

        {/* DEMOGRAPHICS */}
        <section className="space-y-4">

          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Demographics
            </div>

            <h2 className="text-sm font-medium text-black">
              Age distribution
            </h2>
          </div>

          <Card
            title="Shopper age"
            subtitle="Age distribution among registered shoppers with known age"
          >

            <div className="overflow-x-auto">

              <table className="w-full min-w-[640px] text-sm">

                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">

                  <tr>
                    <th className="px-5 py-3">
                      Age group
                    </th>

                    <th className="px-5 py-3 text-right">
                      Shoppers
                    </th>

                    <th className="px-5 py-3 text-right">
                      Known-age share
                    </th>
                  </tr>

                </thead>

                <tbody>

                  {ageDistribution.map(
                    (row: any) => (

                      <tr
                        key={
                          row.ageBand
                        }
                        className="border-t border-black/6 transition hover:bg-[#fdf7f4]/60"
                      >

                        <td className="px-5 py-3.5 font-medium">

                          <Link
                            href={
                              `/admin/analytics/audience/age/${encodeURIComponent(
                                row.ageBand
                              )}?${drilldownParams.toString()}`
                            }
                            className="underline decoration-black/15 underline-offset-4 transition hover:text-[#7B2D3E]"
                          >
                            {row.ageBand}
                          </Link>

                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {row.shoppers ??
                            0}
                        </td>

                        <td className="px-5 py-3.5 text-right font-medium">
                          {percent(
                            row.share
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            <div className="border-t border-black/6 px-5 py-4">

              <div className="flex flex-wrap items-center justify-between gap-2">

                <div className="text-xs text-neutral-400">
                  Age coverage
                </div>

                <div className="text-sm font-semibold text-[#7B2D3E]">
                  {percent(
                    overview.ageCoverage
                  )}
                </div>

              </div>

              <div className="mt-1 text-[11px] leading-5 text-neutral-400">
                Age distribution only
                represents registered
                shoppers with a known date of
                birth. It does not represent
                anonymous Veilora sessions.
              </div>

            </div>

          </Card>

        </section>

      </div>
    </div>
  );
}