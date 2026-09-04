import Link from "next/link";
import { cookies, headers } from "next/headers";

import AnalyticsNav from "@/components/analytics/AnalyticsNav";

type BehaviourRow = {
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

type AgeAudienceResponse = {
  ok: boolean;
  
  filters: {
  country: string;
  source: string;
  countries: string[];
  discoverySources: string[];
};

  segment: {
    type: "AGE";
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
    productTypes: BehaviourRow[];
    colours: BehaviourRow[];
    styles: BehaviourRow[];
    materials: BehaviourRow[];
    occasions: BehaviourRow[];
  };

  brands: BehaviourRow[];
  products: BehaviourRow[];
};

const regionNames =
  new Intl.DisplayNames(
    ["en"],
    { type: "region" }
  );

function countryLabel(
  code: string
) {
  return (
    regionNames.of(
      code.toUpperCase()
    ) ?? code
  );
}

function formatPercent(
  value: number
) {
  return `${(
    value * 100
  ).toFixed(1)}%`;
}

function formatAgeBand(
  value: string
) {
  return value.replace(
    "-",
    "–"
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

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
        {title}
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
        {value}
      </div>

      {subtitle ? (
        <div className="mt-2 text-sm text-neutral-500">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b56c7d]">
          {eyebrow}
        </div>
      ) : null}

      <h2 className="mt-1 text-lg font-medium text-neutral-950">
        {title}
      </h2>

      {description ? (
        <p className="mt-2 text-sm text-neutral-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function MetricCard({
  eyebrow,
  title,
  value,
  subtitle,
  accent = false,
}: {
  eyebrow: string;
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
      <div className="border-b border-[#eadbd6] bg-[#fdf7f4] px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b56c7d]">
          {eyebrow}
        </div>

        <div className="mt-1 text-lg font-semibold text-neutral-950">
          {title}
        </div>
      </div>

      <div className="px-6 py-7">
        <div
          className={[
            "text-4xl font-semibold tracking-tight",
            accent
              ? "text-[#873047]"
              : "text-neutral-950",
          ].join(" ")}
        >
          {value}
        </div>

        {subtitle ? (
          <div className="mt-2 text-sm text-neutral-400">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}



function SignalTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: BehaviourRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
      <div className="border-b border-[#eadbd6] bg-[#fdf7f4] px-6 py-5">
        <h3 className="text-base font-semibold text-neutral-950">
          {title}
        </h3>

        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-8 text-sm text-neutral-400">
          No data yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left font-semibold text-[#a88972]">
                <th className="px-5 py-4">
                  SIGNAL
                </th>

                <th className="px-5 py-4 text-right">
                  Exposure
                </th>

                <th className="px-5 py-4 text-right">
                  Views
                </th>

                <th className="px-5 py-4 text-right">
                  Saves
                </th>

                <th className="px-5 py-4 text-right">
                  Shop
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200">
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="transition hover:bg-[#fdfaf8]"
                >
                  <td className="px-5 py-5">
                    <div className="text-base font-medium text-neutral-950">
                      {row.label}
                    </div>

                    {!row.qualifies ? (
                      <div className="mt-1 text-xs text-amber-700">
                        Low sample
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-5 text-right text-base text-neutral-950">
                    {row.uniqueImpressionSessions}
                  </td>

                  <td className="px-5 py-5 text-right text-base text-neutral-950">
  {row.views}
</td>

<td className="px-5 py-5 text-right text-base text-neutral-950">
  {row.wishlistAdds}
</td>

<td className="px-5 py-5 text-right text-base text-neutral-950">
  {row.shopClicks}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function ActivityTable({
  rows,
  type,
}: {
  rows: BehaviourRow[];
  type: "brand" | "product";
}) {
  const isBrand = type === "brand";

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
      <div className="border-b border-[#eadbd6] bg-[#fdf7f4] px-6 py-5">
        <h3 className="text-base font-semibold text-neutral-950">
          {isBrand
            ? "Brands"
            : "Products"}
        </h3>

        <p className="mt-1 text-sm text-neutral-400">
          {isBrand
            ? "Which brands are attracting shoppers in this audience"
            : "Which products are attracting shoppers in this audience"}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-8 text-sm text-neutral-400">
          No data yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left font-semibold text-[#a88972]">
                <th className="px-5 py-4">
                  {isBrand
                    ? "BRAND"
                    : "PRODUCT"}
                </th>

                <th className="px-5 py-4 text-right">
                  Exposure
                </th>

                <th className="px-5 py-4 text-right">
                  Views
                </th>

                <th className="px-5 py-4 text-right">
                  Saves
                </th>

                <th className="px-5 py-4 text-right">
                  Shop
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-200">
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="transition hover:bg-[#fdfaf8]"
                >
                  <td className="px-5 py-5">
                    <div className="text-base font-medium text-neutral-950">
                      {row.label}
                    </div>

                    {!row.qualifies ? (
                      <div className="mt-1 text-xs text-amber-700">
                        Low sample
                      </div>
                    ) : null}
                  </td>

                  <td className="px-5 py-5 text-right text-base text-neutral-950">
                    {row.uniqueImpressionSessions}
                  </td>

                  <td className="px-5 py-5 text-right text-base text-neutral-950">
                    {row.views}
                  </td>

                  <td className="px-5 py-5 text-right text-base text-neutral-950">
                    {row.wishlistAdds}
                  </td>

                  <td className="px-5 py-5 text-right text-base text-neutral-950">
                    {row.shopClicks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function AgeAudiencePage({
  params,
  searchParams,
}: {
  params: Promise<{
    ageBand: string;
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
    ageBand,
  } = await params;

  const query =
    await searchParams;

  const range =
  query.range === "today" ||
  query.range === "7d" ||
  query.range === "30d" ||
  query.range === "90d" ||
  query.range === "1y" ||
  query.range === "custom"
    ? query.range
    : "30d";

const from =
  query.from ?? "";

const to =
  query.to ?? "";

const country =
  query.country &&
  query.country.toLowerCase() !== "all"
    ? query.country.toUpperCase()
    : "all";

const source =
  query.source &&
  query.source.toLowerCase() !== "all"
    ? query.source.toUpperCase()
    : "all";

  const cookieStore =
    await cookies();

  const cookieHeader =
    cookieStore.toString();

  const qs =
    new URLSearchParams({
      range,
      country,
      source,
    });

  if (from) {
    qs.set(
      "from",
      from
    );
  }

  if (to) {
    qs.set(
      "to",
      to
    );
  }

 const url = await absoluteUrl(
  `/api/admin/analytics/audience/age/${encodeURIComponent(
    ageBand
  )}?${qs.toString()}`
);

  const response = await fetch(
  url,
  {
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  }
);

 const contentType =
  response.headers.get("content-type") ?? "";

if (!response.ok) {
  const text =
    await response.text().catch(() => "");

  throw new Error(
    `Age audience API failed (${response.status}): ${text.slice(0, 500)}`
  );
}

if (!contentType.includes("application/json")) {
  const text =
    await response.text().catch(() => "");

  throw new Error(
    `Age audience API returned non-JSON (${response.status}): ${text.slice(0, 500)}`
  );
}

const data =
  (await response.json()) as AgeAudienceResponse;

  if (
    !response.ok ||
    !data.ok
  ) {
    return (
      <div className="space-y-6 p-6">
        <AnalyticsNav />

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Unable to load age audience intelligence.
        </div>
      </div>
    );
  }

  const {
    segment,
    behaviour,
  } = data;

  const countries =
  data.filters?.countries ?? [];

const discoverySources =
  data.filters?.discoverySources ?? [];

  const headlineQualifies =
    behaviour.uniqueExposedSessions >=
    5;

  const ageLabel =
    formatAgeBand(
      segment.label
    );

  return (
    <div className="space-y-10 p-6">
      <AnalyticsNav />

      <div>
  <Link
    href={
  `/admin/analytics/audience?range=${range}` +
  `&from=${encodeURIComponent(from)}` +
  `&to=${encodeURIComponent(to)}` +
  `&country=${encodeURIComponent(country)}` +
  `&source=${encodeURIComponent(source)}`
}
    className="text-sm font-medium text-[#7B2D3E] transition hover:opacity-70"
  >
    ← Back to Audience
  </Link>

  <div className="mt-8 rounded-[34px] bg-[#873047] px-10 py-9 text-white">
    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
      Age group
    </div>

    <h1 className="mt-3 text-4xl font-semibold tracking-tight">
      {ageLabel}
    </h1>

    <p className="mt-4 text-sm text-white/75">
      Shopper intelligence · Behaviour and product preferences
    </p>
  </div>
</div>

     <section className="space-y-4">

        <section className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
      Reporting period
    </div>

    <div className="mt-1 text-xs text-neutral-500">
      All audience intelligence below uses this period.
    </div>
  </div>

  <div className="flex flex-wrap items-center gap-2">
    {[
      ["today", "Today"],
      ["7d", "7 Days"],
      ["30d", "30 Days"],
      ["90d", "90 Days"],
      ["1y", "1 Year"],
    ].map(([value, label]) => {
      const active =
        range === value;

      return (
        <Link
          key={value}
          href={
            `/admin/analytics/audience/age/${encodeURIComponent(ageBand)}` +
            `?range=${value}` +
            `&country=${encodeURIComponent(country)}` +
            `&source=${encodeURIComponent(source)}`
          }
          className={
            active
              ? "rounded-full bg-[#7B2D3E] px-3.5 py-2 text-xs font-semibold text-white"
              : "rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 transition hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E]"
          }
        >
          {label}
        </Link>
      );
    })}

    <Link
      href={
        `/admin/analytics/audience/age/${encodeURIComponent(ageBand)}` +
        `?range=custom` +
        `&country=${encodeURIComponent(country)}` +
        `&source=${encodeURIComponent(source)}`
      }
      className={
        range === "custom"
          ? "rounded-full bg-[#7B2D3E] px-3.5 py-2 text-xs font-semibold text-white"
          : "rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 transition hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E]"
      }
    >
      Custom
    </Link>
  </div>
</section>

<form
  method="GET"
  className="flex flex-wrap items-center gap-2"
>
  <input
    type="hidden"
    name="range"
    value={range}
  />

  {from ? (
    <input
      type="hidden"
      name="from"
      value={from}
    />
  ) : null}

  {to ? (
    <input
      type="hidden"
      name="to"
      value={to}
    />
  ) : null}

  <select
    name="country"
    defaultValue={country}
    className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 outline-none focus:border-[#7B2D3E]/30"
  >
    <option value="all">
      All registered countries
    </option>

    {countries.map(
      (code) => (
        <option
          key={code}
          value={code}
        >
          {countryLabel(code)}
        </option>
      )
    )}
  </select>

  <select
    name="source"
    defaultValue={source}
    className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 outline-none focus:border-[#7B2D3E]/30"
  >
    <option value="all">
      All discovery sources
    </option>

    {discoverySources.map(
      (value) => (
        <option
          key={value}
          value={value}
        >
          {value === "STYLE_FEED"
            ? "Style Feed"
            : value === "CONTINENT"
              ? "Discover the World"
              : value === "EMERGING_BRANDS"
                ? "Emerging Brands"
                : value
                    .toLowerCase()
                    .replaceAll(
                      "_",
                      " "
                    )
                    .replace(
                      /\b\w/g,
                      (m) =>
                        m.toUpperCase()
                    )}
        </option>
      )
    )}
  </select>

  <button
    type="submit"
    className="rounded-full bg-[#7B2D3E] px-3.5 py-2 text-xs font-semibold text-white"
  >
    Apply
  </button>

  
  
</form>

{range === "custom" ? (
  <section className="rounded-[24px] border border-black/10 bg-white p-4">
    <form
      method="GET"
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
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

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          From
        </span>

        <input
          type="date"
          name="from"
          defaultValue={from}
          required
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#7B2D3E]/40"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          To
        </span>

        <input
          type="date"
          name="to"
          defaultValue={to}
          required
          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#7B2D3E]/40"
        />
      </label>

      <button
        type="submit"
        className="rounded-xl bg-[#7B2D3E] px-4 py-2 text-sm font-semibold text-white"
      >
        Apply dates
      </button>
    </form>
  </section>
) : null}

  <SectionHeading
    eyebrow="Audience"
    title={`${ageLabel} shoppers`}
    description="The size of this registered audience segment and its activity during the selected period."
  />

  <div className="grid gap-5 md:grid-cols-3">
    <MetricCard
      eyebrow="Audience"
      title="Registered shoppers"
      value={segment.audienceSize}
    />

    <MetricCard
      eyebrow="Share"
      title="Audience share"
      value={formatPercent(segment.audienceShare)}
    />

    <MetricCard
      eyebrow="Activity"
      title="Active sessions"
      value={segment.activeSessions}
      subtitle="Sessions linked to shoppers in this age group."
    />
  </div>
</section>

    <section className="space-y-4">
  <SectionHeading
    eyebrow="Shopper response"
    title="How this audience responds"
    description={`How shoppers aged ${ageLabel} responded after exposure.`}
  />

  <div className="grid gap-5 md:grid-cols-4">
    <MetricCard
      eyebrow="Exposure"
      title="Exposed sessions"
      value={behaviour.uniqueExposedSessions}
    />

    <MetricCard
      eyebrow="Interest"
      title="View rate"
      value={
        headlineQualifies
          ? formatPercent(behaviour.viewRate)
          : "—"
      }
    />

    <MetricCard
      eyebrow="Consideration"
      title="Save rate"
      value={
        headlineQualifies
          ? formatPercent(behaviour.saveRate)
          : "—"
      }
    />

    <MetricCard
      eyebrow="Intent"
      title="Shop intent"
      value={
        headlineQualifies
          ? formatPercent(behaviour.shopIntentRate)
          : "—"
      }
      accent
    />
  </div>

  {!headlineQualifies ? (
    <div className="text-sm text-amber-700">
      Low sample · {behaviour.uniqueExposedSessions} of 5 minimum exposed sessions
    </div>
  ) : null}
</section>

      <section className="space-y-4">
  <SectionHeading
    eyebrow="Activity volume"
    title="What happened"
    description="Raw event volume from shoppers in this age segment."
  />

  <div className="grid gap-5 md:grid-cols-4">
    <MetricCard
      eyebrow="Exposure"
      title="Product impressions"
      value={behaviour.impressions}
    />

    <MetricCard
      eyebrow="Interest"
      title="PDP views"
      value={behaviour.views}
    />

    <MetricCard
      eyebrow="Consideration"
      title="Saves"
      value={behaviour.wishlistAdds}
    />

    <MetricCard
      eyebrow="Intent"
      title="Shop clicks"
      value={behaviour.shopClicks}
      accent
    />
  </div>
</section>

     <section className="space-y-5">
  <SectionHeading
    eyebrow="Audience signals"
    title={`What ${ageLabel} shoppers respond to`}
    description="Product types, colours, styles, materials and occasions attracting this audience."
  />

  <div className="grid gap-5 xl:grid-cols-2">
    <SignalTable
      title="Product types"
      subtitle="Performance by clothing category"
      rows={data.signals.productTypes}
    />

    <SignalTable
      title="Colours"
      subtitle="Which colours are attracting shoppers"
      rows={data.signals.colours}
    />

    <SignalTable
      title="Styles"
      subtitle="Which styles are attracting shoppers"
      rows={data.signals.styles}
    />

    <SignalTable
      title="Materials"
      subtitle="Which materials are attracting shoppers"
      rows={data.signals.materials}
    />
  </div>

  <SignalTable
    title="Occasions"
    subtitle="Which occasions are attracting shoppers"
    rows={data.signals.occasions}
  />
</section>

      <section className="space-y-5">
  <SectionHeading
    eyebrow="Brand intelligence"
    title="Brands this audience responds to"
    description={`Which brands are generating exposure, interest, consideration and shop intent among ${ageLabel} shoppers.`}
  />

  <ActivityTable
    type="brand"
    rows={data.brands}
  />
</section>

     <section className="space-y-5">
  <SectionHeading
    eyebrow="Product intelligence"
    title="Products this audience responds to"
    description={`Which products are generating exposure, interest, consideration and shop intent among ${ageLabel} shoppers.`}
  />

  <ActivityTable
    type="product"
    rows={data.products}
  />
</section>
    </div>
  );
}