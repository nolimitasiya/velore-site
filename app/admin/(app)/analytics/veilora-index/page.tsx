import { cookies, headers } from "next/headers";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import MetricTrendChart from "@/components/analytics/MetricTrendChart";
import MarketSignalTable from "@/components/analytics/MarketSignalTable";
import Link from "next/link";

export const dynamic = "force-dynamic";



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

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    const text =
      await res.text().catch(() => "");

    throw new Error(
      `Analytics API returned non-JSON: ${path} (${res.status}) ` +
        `content-type=${contentType} body=${text.slice(0, 500)}`
    );
  }

  return res.json();
}

function RankBadge({
  rank,
  previousRank,
  rankChange,
}: {
  rank: number | null;
  previousRank: number | null;
  rankChange: number | null;
}) {
  if (rank == null) {
    return (
      <span className="text-xs text-neutral-400">
        —
      </span>
    );
  }

  if (previousRank == null) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold text-black">
          #{rank}
        </span>

        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
          NEW
        </span>
      </div>
    );
  }

  if ((rankChange ?? 0) > 0) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold text-black">
          #{rank}
        </span>

        <span className="text-xs font-semibold text-emerald-600">
          ↑{rankChange}
        </span>
      </div>
    );
  }

  if ((rankChange ?? 0) < 0) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="font-semibold text-black">
          #{rank}
        </span>

        <span className="text-xs font-semibold text-red-600">
          ↓{Math.abs(rankChange ?? 0)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <span className="font-semibold text-black">
        #{rank}
      </span>

      <span className="text-xs font-semibold text-blue-600">
        →
      </span>
    </div>
  );
}


function percent(value: number | null | undefined) {
  return `${(
    Number(value ?? 0) * 100
  ).toFixed(1)}%`;
}

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

function MomentumBadge({
  status,
}: {
  status:
    | "NEW"
    | "UP"
    | "DOWN"
    | "STABLE"
    | "LOW_SAMPLE";
}) {
  if (status === "LOW_SAMPLE") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
        Low sample
      </span>
    );
  }

  if (status === "NEW") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
        🟣 ✦ New
      </span>
    );
  }

  if (status === "UP") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        🟢 ↑ Up
      </span>
    );
  }

  if (status === "DOWN") {
    return (
      <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
        🔴 ↓ Down
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
      🔵 → Stable
    </span>
  );
}


function MoverCard({
  eyebrow,
  row,
  kind,
}: {
  eyebrow: string;
  row: any | null;
  kind:
    | "UP"
    | "DOWN"
    | "INTENT"
    | "NEW";
}) {
  if (!row) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-4 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
            {eyebrow}
          </div>
        </div>

        <div className="p-5 text-sm text-neutral-400">
          Not enough comparison data yet.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-black/10 bg-white">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-4 py-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
          {eyebrow}
        </div>
      </div>

      <div className="p-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          {row.signalGroup}
        </div>

        <div className="mt-1 text-xl font-semibold tracking-tight text-black">
          {row.label}
        </div>

        <div className="mt-3">
          {kind === "UP" ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              🟢 ↑ {row.rankChange} places
            </span>
          ) : null}

          {kind === "DOWN" ? (
            <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
              🔴 ↓{" "}
              {Math.abs(
                Number(
                  row.rankChange ?? 0
                )
              )}{" "}
              places
            </span>
          ) : null}

          {kind === "INTENT" ? (
            <span className="inline-flex rounded-full border border-[#7B2D3E]/15 bg-[#fdf7f4] px-2.5 py-1 text-[11px] font-semibold text-[#7B2D3E]">
              Shop intent{" "}
              {percent(
                row.shopIntentRate
              )}
            </span>
          ) : null}

          {kind === "NEW" ? (
            <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
              🟣 ✦ New entrant
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-4 text-xs">
          <div>
            <div className="text-neutral-400">
              Current rank
            </div>

            <div className="mt-1 font-semibold text-black">
              #{row.currentRank}
            </div>
          </div>

          <div>
            <div className="text-neutral-400">
              Exposure
            </div>

            <div className="mt-1 font-semibold text-black">
              {row.impressions}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function StatCard({
  eyebrow,
  title,
  value,
  footer,
}: {
  eyebrow: string;
  title: string;
  value: string | number;
  footer?: string;
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
      </div>

      <div className="px-5 py-5">
        <div className="text-3xl font-semibold tracking-tight text-black">
          {value}
        </div>

        {footer ? (
          <div className="mt-1 text-xs text-neutral-400">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default async function VeiloraIndexPage({
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
  const sp = await searchParams;

  const range =
  sp.range === "today" ||
  sp.range === "7d" ||
  sp.range === "30d" ||
  sp.range === "90d" ||
  sp.range === "1y" ||
  sp.range === "custom"
    ? sp.range
    : "30d";

  const fromDate = sp.from ?? "";
  const toDate = sp.to ?? "";

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

  const data = await getJSON(
  `/api/admin/analytics/index-overview?range=${range}&from=${fromDate}&to=${toDate}&country=${country}&source=${source}`
);

const discoverySources =
  data?.discoverySources ?? [];

  const overview =
    data?.overview ?? {};

  const topSearches =
    data?.topSearches ?? [];

  const unmetDemand =
    data?.unmetDemand ?? [];

  const brands =
    data?.brands ?? [];

  const products =
     data?.products ?? [];

  const countries =
  data?.countries ?? [];

  const marketSignals =
     data?.marketSignals ?? {
    productTypes: [],
    colours: [],
    styles: [],
    materials: [],
    occasions: [],
  };

  const trends =
    data?.trends ?? [];

  function lowSample(row: any) {
  return (
    Number(row.impressions ?? 0) < 20 ||
    Number(row.uniqueImpressionSessions ?? 0) < 5
  );
}

const MIN_HEAT_SESSIONS = 5;

function lowHeatSample(row: any) {
  return (
    Number(
      row.uniqueImpressionSessions ?? 0
    ) < MIN_HEAT_SESSIONS
  );
}

const MIN_SIGNAL_SESSIONS = 5;

function hasSignalSample(row: any) {
  return (
    Number(
      row.uniqueImpressionSessions ?? 0
    ) >= MIN_SIGNAL_SESSIONS
  );
}

const allMarketSignals = [
  ...marketSignals.productTypes.map(
    (row: any) => ({
      ...row,
      signalGroup: "Product type",
    })
  ),

  ...marketSignals.colours.map(
    (row: any) => ({
      ...row,
      signalGroup: "Colour",
    })
  ),

  ...marketSignals.styles.map(
    (row: any) => ({
      ...row,
      signalGroup: "Style",
    })
  ),

  ...marketSignals.materials.map(
    (row: any) => ({
      ...row,
      signalGroup: "Material",
    })
  ),

  ...marketSignals.occasions.map(
    (row: any) => ({
      ...row,
      signalGroup: "Occasion",
    })
  ),
];

const biggestClimber =
  allMarketSignals
    .filter(
      (row: any) =>
        hasSignalSample(row) &&
        row.previousRank != null &&
        Number(row.rankChange ?? 0) > 0
    )
    .sort(
      (a: any, b: any) =>
        Number(b.rankChange ?? 0) -
        Number(a.rankChange ?? 0)
    )[0] ?? null;

const biggestFaller =
  allMarketSignals
    .filter(
      (row: any) =>
        hasSignalSample(row) &&
        row.previousRank != null &&
        Number(row.rankChange ?? 0) < 0
    )
    .sort(
      (a: any, b: any) =>
        Number(a.rankChange ?? 0) -
        Number(b.rankChange ?? 0)
    )[0] ?? null;

const strongestIntent =
  allMarketSignals
    .filter(
      (row: any) =>
        hasSignalSample(row)
    )
    .sort(
      (a: any, b: any) =>
        Number(
          b.shopIntentRate ?? 0
        ) -
        Number(
          a.shopIntentRate ?? 0
        )
    )[0] ?? null;

const newestEntrant =
  allMarketSignals
    .filter(
      (row: any) =>
        hasSignalSample(row) &&
        row.momentumStatus === "NEW" &&
        row.currentRank != null
    )
    .sort(
      (a: any, b: any) =>
        Number(a.currentRank) -
        Number(b.currentRank)
    )[0] ?? null;

const signalLeaders = [
  {
    category: "Product type",
    row: getSignalLeader(
      marketSignals.productTypes
    ),
  },
  {
    category: "Colour",
    row: getSignalLeader(
      marketSignals.colours
    ),
  },
  {
    category: "Style",
    row: getSignalLeader(
      marketSignals.styles
    ),
  },
  {
    category: "Material",
    row: getSignalLeader(
      marketSignals.materials
    ),
  },
  {
    category: "Occasion",
    row: getSignalLeader(
      marketSignals.occasions
    ),
  },
];

function getSignalLeader(rows: any[]) {
  return (
    rows
      .filter(
        (row) =>
          hasSignalSample(row) &&
          row.currentRank != null
      )
      .sort(
        (a, b) =>
          Number(a.currentRank) -
          Number(b.currentRank)
      )[0] ?? null
  );
}

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">
        <AnalyticsNav />

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
              Veilora Index
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Modest fashion intelligence
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Live signals of shopper demand,
              product exposure, interest,
              consideration and purchase intent
              across Veilora.
            </p>
          </div>
        </section>
        {/* Global period filter */}
<section className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
      Reporting period
    </div>

    <div className="mt-1 text-xs text-neutral-500">
      All Veilora Index intelligence below uses this period.
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
      const active = range === value;

      return (
        <Link
          key={value}
          href={`/admin/analytics/veilora-index?range=${value}&country=${country}&source=${source}`}
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
      href={`/admin/analytics/veilora-index?range=custom&country=${country}&source=${source}`}
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
  className="flex items-center gap-2"
>
  <input
    type="hidden"
    name="range"
    value={range}
  />  

  {fromDate ? (
    <input
      type="hidden"
      name="from"
      value={fromDate}
    />
  ) : null}

  {toDate ? (
    <input
      type="hidden"
      name="to"
      value={toDate}
    />
  ) : null}

  <select
    name="country"
    defaultValue={country}
    className="rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-600 outline-none focus:border-[#7B2D3E]/30"
  >
    <option value="all">
      All countries
    </option>

    {countries.map(
      (code: string) => (
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
    (value: string) => (
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
              .replaceAll("_", " ")
              .replace(/\b\w/g, (m) =>
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
          defaultValue={fromDate}
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
          defaultValue={toDate}
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

        {/* Funnel */}
        <section className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Shopper funnel
            </div>

            <h2 className="text-sm font-medium text-black">
              Demand → Exposure → Interest → Consideration → Intent
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              eyebrow="Demand"
              title="Searches"
              value={overview.searches ?? 0}
              footer={`${overview.uniqueSearchSessions ?? 0} unique search sessions`}
            />

            <StatCard
              eyebrow="Exposure"
              title="Product impressions"
              value={overview.impressions ?? 0}
            />

            <StatCard
              eyebrow="Interest"
              title="Product views"
              value={overview.productViews ?? 0}
              footer={`View rate ${percent(
                overview.productViewRate
              )}`}
            />

            <StatCard
              eyebrow="Consideration"
              title="Wishlist adds"
              value={overview.wishlistAdds ?? 0}
              footer={`Save Rate ${percent(
                overview.saveRate
              )}`}
            />

            <StatCard
              eyebrow="Intent"
              title="Shop clicks"
              value={overview.shopClicks ?? 0}
              footer={`Shop Intent Rate ${percent(
                overview.shopIntentRate
              )}`}
            />
          </div>
        </section>



        

        


        

        {/* Trend intelligence */}
<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Momentum
    </div>

    <h2 className="text-sm font-medium text-black">
      Behaviour over time
    </h2>

    <p className="mt-1 text-xs text-neutral-500">
      How shopper demand, interest,
      consideration and intent are changing.
    </p>
  </div>

  <div className="grid gap-4 xl:grid-cols-2">
    <MetricTrendChart
      title="Search demand"
      subtitle="Shopper searches over time"
      data={trends.map(
        (row: any) => ({
          date: row.date,
          value: row.searches,
        })
      )}
    />

    <MetricTrendChart
      title="Product interest"
      subtitle="Product detail views over time"
      data={trends.map(
        (row: any) => ({
          date: row.date,
          value: row.productViews,
        })
      )}
    />

    <MetricTrendChart
      title="Consideration"
      subtitle="Wishlist adds over time"
      data={trends.map(
        (row: any) => ({
          date: row.date,
          value: row.wishlistAdds,
        })
      )}
    />

    <MetricTrendChart
      title="Shopping intent"
      subtitle="Outbound shop clicks over time"
      data={trends.map(
        (row: any) => ({
          date: row.date,
          value: row.shopClicks,
        })
      )}
    />
  </div>
</section>
{/* Signal Leaders */}
<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
  Signal Leaders
</div>

<h2 className="text-sm font-medium text-black">
  Highest Ranked Market Signals
</h2>

<p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
   The strongest qualifying signals across product type, colour, style, material and occasion.
</p>
  </div>

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    {signalLeaders.map(
      ({ category, row }) => (
        <div
          key={category}
          className="overflow-hidden rounded-[24px] border border-black/10 bg-white"
        >
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
              {category}
            </div>
          </div>

          <div className="p-4">
            {row ? (
              <>
                <div className="flex items-start justify-between gap-3">
  <div className="text-lg font-semibold tracking-tight text-black">
    {row.label}
  </div>

  <RankBadge
    rank={row.currentRank}
    previousRank={row.previousRank}
    rankChange={row.rankChange}
  />
</div>

                <div className="mt-3">
                  <MomentumBadge
                    status={row.momentumStatus}
                    />
                </div>

                <div className="mt-4 border-t border-black/5 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">
                      Exposure
                    </span>

                    <span className="font-medium text-black">
                      {row.impressions}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">
                      Shop intent
                    </span>

                    <span className="font-medium text-[#7B2D3E]">
                      {percent(
                        row.shopIntentRate
                      )}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-4 text-xs text-neutral-400">
                Not enough data yet
              </div>
            )}
          </div>
        </div>
      )
    )}
  </div>
</section>


{/* Top Movers */}
<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Market movers
    </div>

    <h2 className="text-sm font-medium text-black">
      Biggest movements this period
    </h2>

    <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
      Signals making the strongest moves
      compared with the previous equivalent period.
    </p>
  </div>

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <MoverCard
      eyebrow="Biggest climber"
      row={biggestClimber}
      kind="UP"
    />

    <MoverCard
      eyebrow="Biggest faller"
      row={biggestFaller}
      kind="DOWN"
    />

    <MoverCard
      eyebrow="Strongest intent"
      row={strongestIntent}
      kind="INTENT"
    />

    <MoverCard
      eyebrow="New entrant"
      row={newestEntrant}
      kind="NEW"
    />
  </div>
</section>

{/* Market Signals */}
<section className="space-y-4">
  <div>
    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
      Market signals
    </div>

    <h2 className="text-sm font-medium text-black">
      What is attracting shopper interest
    </h2>

    <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-500">
      Product types, colours, styles, materials and occasions
      generating exposure, interest, consideration and shop intent.
    </p>
  </div>

  <div className="grid gap-4 xl:grid-cols-2">
    <MarketSignalTable
  title="Product types"
  subtitle="Performance by clothing category"
  rows={marketSignals.productTypes}
  signalGroup="productTypes"
  range={range}
  from={fromDate}
  to={toDate}
  country={country}
  source={source}

/>

<MarketSignalTable
  title="Colours"
  subtitle="Which colours are attracting shoppers"
  rows={marketSignals.colours}
  signalGroup="colours"
  range={range}
  from={fromDate}
  to={toDate}
  country={country}
  source={source}

/>

<MarketSignalTable
  title="Styles"
  subtitle="Style preferences emerging across Veilora"
  rows={marketSignals.styles}
  signalGroup="styles"
  range={range}
  from={fromDate}
  to={toDate}
  country={country}
  source={source}
/>

<MarketSignalTable
  title="Materials"
  subtitle="Material preferences and purchase intent"
  rows={marketSignals.materials}
  signalGroup="materials"
  range={range}
  from={fromDate}
  to={toDate}
  country={country}
  source={source}

/>

<MarketSignalTable
  title="Occasions"
  subtitle="How shoppers engage with products by occasion"
  rows={marketSignals.occasions}
  signalGroup="occasions"
  range={range}
  from={fromDate}
  to={toDate}
  country={country}
  source={source}
/>
</div>
</section>

        {/* Search intelligence */}
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
            <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
              <div className="text-sm font-semibold">
                Trending searches
              </div>

              <div className="mt-0.5 text-xs text-neutral-400">
                What shoppers are actively asking for
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-4 py-3">
                    Search
                  </th>
                  <th className="px-4 py-3 text-right">
                    Searches
                  </th>
                  <th className="px-4 py-3 text-right">
                    Sessions
                  </th>
                </tr>
              </thead>

              <tbody>
                {topSearches.map(
                  (row: any) => (
                    <tr
                      key={
                        row.normalizedQuery
                      }
                      className="border-t border-black/6"
                    >
                      <td className="px-4 py-3.5 font-medium">
                        {row.query}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {row.searches}
                      </td>

                      <td className="px-4 py-3.5 text-right text-neutral-600">
                        {
                          row.uniqueSessions
                        }
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
            <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
              <div className="text-sm font-semibold">
                Unmet demand
              </div>

              <div className="mt-0.5 text-xs text-neutral-400">
                Searches where Veilora has
                limited or no supply
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-4 py-3">
                    Search
                  </th>
                  <th className="px-4 py-3 text-right">
                    Searches
                  </th>
                  <th className="px-4 py-3 text-right">
                    Zero rate
                  </th>
                </tr>
              </thead>

              <tbody>
                {unmetDemand.map(
                  (row: any) => (
                    <tr
                      key={
                        row.normalizedQuery
                      }
                      className="border-t border-black/6"
                    >
                      <td className="px-4 py-3.5 font-medium">
                        {row.query}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {row.searches}
                      </td>

                      <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                        {percent(
                          row.zeroResultRate
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Brand Heat */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Brand heat
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              How efficiently brands turn exposure
              into interest, saves and outbound intent
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-4 py-3">
                    Brand
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
                    Wishlist
                  </th>
                  <th className="px-4 py-3 text-right">
                    Shop
                  </th>
                  <th className="px-4 py-3 text-right">
                    View rate
                  </th>
                  <th className="px-4 py-3 text-right">
                    Save Rate
                  </th>
                  <th className="px-4 py-3 text-right">
                    Shop Intent Rate
                  </th>
                  <th className="px-4 py-3 text-right">
                      Heat score
                      </th>
                </tr>
              </thead>

              <tbody>
                {brands.map((row: any) => (
                  <tr
                    key={row.brandId}
                    className="border-t border-black/6"
                  >
                    <td className="px-4 py-3.5">
  <div className="flex items-center gap-2">
    <Link
  href={
    `/admin/analytics/veilora-index/brand/${encodeURIComponent(
      row.slug
    )}` +
    `?range=${range}` +
    `&from=${encodeURIComponent(fromDate)}` +
    `&to=${encodeURIComponent(toDate)}` +
    `&country=${encodeURIComponent(country)}` +
    `&source=${encodeURIComponent(source)}`
  }
  className="font-medium text-black transition hover:text-[#7B2D3E] hover:underline"
>
  {row.name}
</Link>

    {lowHeatSample(row) ? (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
        Low sample
      </span>
    ) : null}
  </div>
</td>

                    <td className="px-4 py-3.5 text-right">
                      {row.impressions}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                        {row.uniqueImpressionSessions}
                        </td>

                    <td className="px-4 py-3.5 text-right">
                      {row.views}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {row.wishlistAdds}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {row.shopClicks}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {percent(row.viewRate)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {percent(
                        row.saveRate
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                      {percent(
                        row.shopIntentRate
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
  {lowHeatSample(row) ? (
    <span className="text-neutral-400">
      —
    </span>
  ) : (
    <span className="font-semibold text-[#7B2D3E]">
      {percent(row.strengthScore)}
    </span>
  )}
</td>

                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Product Heat */}
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
    <div className="text-sm font-semibold">
      Product heat
    </div>

    <div className="mt-0.5 text-xs text-neutral-400">
      Which individual products are turning exposure
      into interest, saves and outbound intent
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="min-w-[1200px] w-full text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
        <tr>
          <th className="px-4 py-3">
            Product
          </th>

          <th className="px-4 py-3">
            Brand
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
            Wishlist
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
            Shop intent rate
          </th>

          <th className="px-4 py-3 text-right">
  Heat score
</th>
        </tr>
      </thead>

      <tbody>
        {products.map((row: any) => (
          <tr
            key={row.productId}
            className="border-t border-black/6"
          >
            <td className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-50">
                  {row.imageUrl ? (
                    <img
                      src={row.imageUrl}
                      alt={row.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium text-black">
                    {row.title}
                  </span>

                  {lowHeatSample(row) ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Low sample
                    </span>
                  ) : null}
                </div>
              </div>
            </td>

            <td className="px-4 py-3.5 text-neutral-600">
              {row.brandName}
            </td>

            <td className="px-4 py-3.5 text-right">
              {row.impressions}
            </td>

            <td className="px-4 py-3.5 text-right">
  {row.uniqueImpressionSessions}
</td>

            <td className="px-4 py-3.5 text-right">
              {row.views}
            </td>

            <td className="px-4 py-3.5 text-right">
              {row.wishlistAdds}
            </td>

            <td className="px-4 py-3.5 text-right">
              {row.shopClicks}
            </td>

            <td className="px-4 py-3.5 text-right">
              {percent(row.viewRate)}
            </td>

            <td className="px-4 py-3.5 text-right">
              {percent(row.saveRate)}
            </td>

            <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
              {percent(row.shopIntentRate)}
            </td>
            <td className="px-4 py-3.5 text-right">
  {lowHeatSample(row) ? (
    <span className="text-neutral-400">
      —
    </span>
  ) : (
    <span className="font-semibold text-[#7B2D3E]">
      {percent(row.strengthScore)}
    </span>
  )}
</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>

      </div>
    </div>
  );
}