import { cookies, headers } from "next/headers";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";

export const dynamic = "force-dynamic";

type Range = "today" | "7d" | "30d" | "custom";

type PerformanceRow = {
  sessions: number;
  waitlist: number;
  brandApps: number;
  waitlistConversionRate: number;
  brandAppConversionRate: number;
};

type SourceRow = PerformanceRow & {
  source: string;
};

type CampaignRow = PerformanceRow & {
  campaign: string;
};



type ContentRow = PerformanceRow & {
  content: string;
};

type JourneyRow = PerformanceRow & {
  source: string;
  campaign: string;
  content: string;
};

type AcquisitionResponse = {
  range: Range;

  period: {
    from: string;
    to: string;
  };

 overview: {
  sessions: number;

  waitlistReceived: number;
  brandAppsReceived: number;

  attributedWaitlist: number;
  attributedBrandApps: number;

  waitlistConversionRate: number;
  brandAppConversionRate: number;
};

  sources: SourceRow[];
  campaigns: CampaignRow[];
  contents: ContentRow[];
  journeys: JourneyRow[];
};

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

async function getJSON(
  path: string
): Promise<AcquisitionResponse> {
  const jar = await cookies();
  const url = await absoluteUrl(path);

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      cookie: jar.toString(),
    },
  });

  if (!res.ok) {
    const text = await res
      .text()
      .catch(() => "");

    throw new Error(
      `Acquisition API failed: ${path} (${res.status}) ${text.slice(
        0,
        500
      )}`
    );
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

function StatCard({
  eyebrow,
  title,
  value,
  description,
}: {
  eyebrow: string;
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
          {eyebrow}
        </div>

        <div className="mt-0.5 text-sm font-semibold text-black">
          {title}
        </div>

        <div className="mt-0.5 text-xs text-neutral-400">
          {description}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="text-3xl font-semibold tracking-tight text-black">
          {value}
        </div>
      </div>
    </div>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/60">
        {eyebrow}
      </div>

      <h2 className="mt-1 text-lg font-semibold tracking-tight text-black">
        {title}
      </h2>

      <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function formatLabel(value: string) {
  if (
    value === "unassigned" ||
    value === "unattributed"
  ) {
    return value
      .charAt(0)
      .toUpperCase() + value.slice(1);
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function Rate({
  value,
}: {
  value: number;
}) {
  return (
    <span className="font-medium text-neutral-900">
      {value.toFixed(1)}%
    </span>
  );
}

function EmptyRow({
  colSpan,
}: {
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-12 text-center text-sm text-neutral-400"
      >
        No acquisition data for this period.
      </td>
    </tr>
  );
}

export default async function AcquisitionPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;

  const range: Range =
    sp.range === "today" ||
    sp.range === "7d" ||
    sp.range === "30d" ||
    sp.range === "custom"
      ? sp.range
      : "30d";

  const fromDate = sp.from ?? "";
  const toDate = sp.to ?? "";

  const query = new URLSearchParams({
    range,
  });

  if (range === "custom") {
    if (fromDate) {
      query.set("from", fromDate);
    }

    if (toDate) {
      query.set("to", toDate);
    }
  }

  const data = await getJSON(
    `/api/admin/analytics/acquisition?${query.toString()}`
  );

  const overview = data.overview;

  function rangeHref(nextRange: Range) {
    if (nextRange === "30d") {
      return "/admin/analytics/acquisition";
    }

    return `/admin/analytics/acquisition?range=${nextRange}`;
  }

  const rangeLabel =
    range === "today"
      ? "Today"
      : range === "7d"
      ? "Last 7 days"
      : range === "30d"
      ? "Last 30 days"
      : fromDate && toDate
      ? `${fromDate} → ${toDate}`
      : "Custom range";

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
        <AnalyticsNav />

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin analytics · Acquisition
              </div>

              <h1 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Growth & conversion
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-white/60">
                Understand where Veilora sessions
                originate and which sources, campaigns
                and placements convert into waitlist
                signups and brand applications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RangeLink
                href={rangeHref("today")}
                label="Today"
                active={range === "today"}
              />

              <RangeLink
                href={rangeHref("7d")}
                label="Last 7 days"
                active={range === "7d"}
              />

              <RangeLink
                href={rangeHref("30d")}
                label="Last 30 days"
                active={range === "30d"}
              />

              <RangeLink
                href={rangeHref("custom")}
                label="Custom range"
                active={range === "custom"}
              />
            </div>
          </div>

          {range === "custom" && (
            <form
              method="GET"
              action="/admin/analytics/acquisition"
              className="mt-5 flex flex-wrap items-center gap-3"
            >
              <input
                type="hidden"
                name="range"
                value="custom"
              />

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
                  defaultValue={fromDate}
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
                  defaultValue={toDate}
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

          <div className="mt-5 text-xs text-white/45">
            Acquisition cohort · {rangeLabel}
          </div>
        </section>

        {/* Overview */}
        <section className="space-y-4">
          <SectionIntro
            eyebrow="Overview"
            title="Acquisition performance"
            description="Conversions are linked back to the exact originating Veilora analytics session."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              eyebrow="Traffic"
              title="Sessions"
              value={overview.sessions}
              description="Sessions acquired"
            />

            <StatCard
  eyebrow="Consumer"
  title="Waitlist signups"
  value={overview.waitlistReceived}
  description={`${overview.attributedWaitlist} attributed to sessions`}
/>

<StatCard
  eyebrow="Brands"
  title="Brand applications"
  value={overview.brandAppsReceived}
  description={`${overview.attributedBrandApps} attributed to sessions`}
/>

            <StatCard
              eyebrow="Conversion"
              title="Waitlist CVR"
              value={`${overview.waitlistConversionRate.toFixed(
                1
              )}%`}
              description={`${overview.attributedWaitlist} attributed ÷ ${overview.sessions} sessions`}
            />

            <StatCard
              eyebrow="Conversion"
              title="Brand App CVR"
              value={`${overview.brandAppConversionRate.toFixed(
                1
              )}%`}
              description={`${overview.attributedBrandApps} attributed ÷ ${overview.sessions} sessions`}
            />
          </div>
        </section>

        {/* Source performance */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
            <SectionIntro
              eyebrow="Channels"
              title="Source performance"
              description="Compare acquisition and conversion performance across Instagram, TikTok, LinkedIn, Google, direct traffic and other sources."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  <th className="px-5 py-4">
                    Source
                  </th>
                  <th className="px-5 py-4 text-right">
                    Sessions
                  </th>
                  <th className="px-5 py-4 text-right">
                    Waitlist
                  </th>
                  <th className="px-5 py-4 text-right">
                    Brand Apps
                  </th>
                  <th className="px-5 py-4 text-right">
                    Waitlist CVR
                  </th>
                  <th className="px-5 py-4 text-right">
                    Brand App CVR
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.sources.map((row) => (
                  <tr
                    key={row.source}
                    className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                  >
                    <td className="px-5 py-4 font-medium text-neutral-900">
                      {formatLabel(row.source)}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.sessions}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.waitlist}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.brandApps}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Rate
                        value={
                          row.waitlistConversionRate
                        }
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Rate
                        value={
                          row.brandAppConversionRate
                        }
                      />
                    </td>
                  </tr>
                ))}

                {data.sources.length === 0 && (
                  <EmptyRow colSpan={6} />
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Campaign performance */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
            <SectionIntro
              eyebrow="Campaigns"
              title="Campaign performance"
              description="Measure which Veilora initiatives are driving sessions and converting into consumer or brand demand."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  <th className="px-5 py-4">
                    Campaign
                  </th>
                  <th className="px-5 py-4 text-right">
                    Sessions
                  </th>
                  <th className="px-5 py-4 text-right">
                    Waitlist
                  </th>
                  <th className="px-5 py-4 text-right">
                    Brand Apps
                  </th>
                  <th className="px-5 py-4 text-right">
                    Waitlist CVR
                  </th>
                  <th className="px-5 py-4 text-right">
                    Brand App CVR
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.campaigns.map((row) => (
                  <tr
                    key={row.campaign}
                    className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                  >
                    <td className="px-5 py-4 font-medium text-neutral-900">
                      {formatLabel(row.campaign)}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.sessions}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.waitlist}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.brandApps}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Rate
                        value={
                          row.waitlistConversionRate
                        }
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Rate
                        value={
                          row.brandAppConversionRate
                        }
                      />
                    </td>
                  </tr>
                ))}

                {data.campaigns.length === 0 && (
                  <EmptyRow colSpan={6} />
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Journey performance */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
            <SectionIntro
              eyebrow="Attribution"
              title="Acquisition journeys"
              description="See the exact source → campaign → content combinations responsible for Veilora traffic and conversion."
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-sm">
              <thead>
                <tr className="border-b border-black/5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  <th className="px-5 py-4">
                    Source
                  </th>
                  <th className="px-5 py-4">
                    Campaign
                  </th>
                  <th className="px-5 py-4">
                    Content
                  </th>
                  <th className="px-5 py-4 text-right">
                    Sessions
                  </th>
                  <th className="px-5 py-4 text-right">
                    Waitlist
                  </th>
                  <th className="px-5 py-4 text-right">
                    Brand Apps
                  </th>
                  <th className="px-5 py-4 text-right">
                    Waitlist CVR
                  </th>
                  <th className="px-5 py-4 text-right">
                    Brand App CVR
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.journeys.map(
                  (row, index) => (
                    <tr
                      key={`${row.source}-${row.campaign}-${row.content}-${index}`}
                      className="border-b border-black/5 last:border-0 hover:bg-black/[0.015]"
                    >
                      <td className="px-5 py-4 font-medium text-neutral-900">
                        {formatLabel(
                          row.source
                        )}
                      </td>

                      <td className="px-5 py-4 text-neutral-700">
                        {formatLabel(
                          row.campaign
                        )}
                      </td>

                      <td className="px-5 py-4 text-neutral-700">
                        {formatLabel(
                          row.content
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-neutral-700">
                        {row.sessions}
                      </td>

                      <td className="px-5 py-4 text-right text-neutral-700">
                        {row.waitlist}
                      </td>

                      <td className="px-5 py-4 text-right text-neutral-700">
                        {row.brandApps}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Rate
                          value={
                            row.waitlistConversionRate
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Rate
                          value={
                            row.brandAppConversionRate
                          }
                        />
                      </td>
                    </tr>
                  )
                )}

                {data.journeys.length ===
                  0 && (
                  <EmptyRow colSpan={8} />
                )}
              </tbody>
            </table>
          </div>
        </section>

       
      </div>
    </div>
  );
}