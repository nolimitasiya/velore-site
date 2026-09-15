import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import MetricTrendChart from "@/components/analytics/MetricTrendChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function londonDayStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", timeZoneName: "shortOffset", hour: "2-digit",
  }).formatToParts(utcGuess).find((p) => p.type === "timeZoneName")?.value;
  const match = tzName?.match(/GMT([+-]\d{1,2})?/);
  const hoursOffset = match?.[1] ? Number(match[1]) : 0;
  return new Date(Date.UTC(y, m - 1, d, 0 - hoursOffset, 0, 0));
}

function londonMonthStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const firstDay = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const tzName = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", timeZoneName: "shortOffset", hour: "2-digit",
  }).formatToParts(firstDay).find((p) => p.type === "timeZoneName")?.value;
  const match = tzName?.match(/GMT([+-]\d{1,2})?/);
  const hoursOffset = match?.[1] ? Number(match[1]) : 0;
  return new Date(Date.UTC(y, m - 1, 1, 0 - hoursOffset, 0, 0));
}

function formatSource(
  source: string | null
) {
  if (!source) {
    return "Unknown";
  }

  return source
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
  }>;
}) {
  const params =
    await searchParams;

  const range =
    params.range ?? "30d";

  const { admin } = await requireAdminSession();
  const now = new Date();
  const startToday = londonDayStart(now);
  const startMonth = londonMonthStart(now);
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const start30d = new Date(
  now.getTime() -
    30 * 24 * 60 * 60 * 1000
);

let acquisitionStart:
  Date | null = start30d;

switch (range) {
  case "today":
    acquisitionStart =
      startToday;
    break;

  case "7d":
    acquisitionStart =
      start7d;
    break;

  case "month":
    acquisitionStart =
      startMonth;
    break;

  case "all":
    acquisitionStart =
      null;
    break;

  case "30d":
  default:
    acquisitionStart =
      start30d;
    break;
}

const periodWhere =
  acquisitionStart
    ? {
        createdAt: {
          gte:
            acquisitionStart,
        },
      }
    : {};

  const [
  totalCount,
  todayCount,
  last7dCount,
  monthCount,
  rows,
  sourceGroups,
] = await Promise.all([
  prisma.waitlistSubscriber.count(),

  prisma.waitlistSubscriber.count({
    where: {
      createdAt: {
        gte: startToday,
      },
    },
  }),

  prisma.waitlistSubscriber.count({
    where: {
      createdAt: {
        gte: start7d,
      },
    },
  }),

  prisma.waitlistSubscriber.count({
    where: {
      createdAt: {
        gte: startMonth,
      },
    },
  }),

  prisma.waitlistSubscriber.findMany({
  where:
    periodWhere,

  orderBy: {
    createdAt: "desc",
  },

  take: 1000,
}),

  prisma.waitlistSubscriber.groupBy({
  by: [
    "acquisitionSource",
  ],

  where:
    periodWhere,

  _count: {
    _all: true,
  },
}),
]);

const acquisitionBreakdown =
  sourceGroups
    .filter(
      (group) =>
        group.acquisitionSource
    )
    .map((group) => ({
      source:
        group.acquisitionSource!,
      count:
        group._count._all,
    }))
    .sort(
      (a, b) =>
        b.count - a.count
    );

const unattributedCount =
  sourceGroups.find(
    (group) =>
      !group.acquisitionSource
  )?._count._all ?? 0;

const attributedCount =
  acquisitionBreakdown.reduce(
    (total, item) =>
      total + item.count,
    0
  );

const periodSignupCount =
  attributedCount +
  unattributedCount;

  const signupTrendMap =
  new Map<string, number>();

for (const row of rows) {
  const dateKey =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/London",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date(
        row.createdAt
      )
    );

  signupTrendMap.set(
    dateKey,
    (signupTrendMap.get(
      dateKey
    ) ?? 0) + 1
  );
}

const trendStart =
  acquisitionStart ??
  (
    rows.length
      ? new Date(
          rows[
            rows.length - 1
          ].createdAt
        )
      : startToday
  );

const trendDays: {
  date: string;
  value: number;
}[] = [];

const cursor =
  londonDayStart(
    trendStart
  );

const end =
  londonDayStart(
    now
  );

while (
  cursor.getTime() <=
  end.getTime()
) {
  const dateKey =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/London",

        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      cursor
    );

  const label =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/London",

        day: "numeric",
        month: "short",
      }
    ).format(
      cursor
    );

  trendDays.push({
    date:
      label,

    value:
      signupTrendMap.get(
        dateKey
      ) ?? 0,
  });

  cursor.setUTCDate(
    cursor.getUTCDate() +
      1
  );
}
    
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastSeenWaitlistAt: now },
  });

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin · Community
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Waitlist
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/60">
                Shoppers who have signed up to be notified when Veilora Club launches.
                Today and this month use Europe/London boundaries.
              </p>
            </div>

            {/* Stat pills inside hero */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Total</div>
                <div className="mt-1 text-2xl font-semibold text-white">{totalCount}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Today</div>
                <div className="mt-1 text-2xl font-semibold text-white">{todayCount}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">Last 7 days</div>
                <div className="mt-1 text-2xl font-semibold text-white">{last7dCount}</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                <div className="text-xs text-white/50">This month</div>
                <div className="mt-1 text-2xl font-semibold text-white">{monthCount}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-2">
  {[
    {
      label: "Today",
      value: "today",
    },
    {
      label: "7 days",
      value: "7d",
    },
    {
      label: "30 days",
      value: "30d",
    },
    {
      label: "This month",
      value: "month",
    },
    {
      label: "All time",
      value: "all",
    },
  ].map((option) => {
    const active =
      range === option.value;

    return (
      <a
        key={option.value}
        href={`/admin/waitlist?range=${option.value}`}
        className={[
          "rounded-full px-3.5 py-2 text-xs font-medium transition",
          active
            ? "bg-[#7B2D3E] text-white"
            : "border border-black/10 bg-white text-neutral-500 hover:bg-[#fdf7f4] hover:text-[#7B2D3E]",
        ].join(" ")}
      >
        {option.label}
      </a>
    );
  })}
</div>

{/* Signup activity */}
<MetricTrendChart
  title="Signup activity"
  subtitle={`${periodSignupCount} waitlist signup${
    periodSignupCount === 1
      ? ""
      : "s"
  } in the selected period`}
  data={trendDays}
  range={range}
/>


        {/* Acquisition */}
<section className="rounded-[28px] border border-black/10 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <div className="font-semibold text-black">
        Waitlist acquisition
      </div>

      <div className="mt-1 text-xs text-neutral-500">
        Where attributed waitlist signups came from.
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      {acquisitionBreakdown.map(
        (item) => (
          <div
            key={item.source}
            className="flex items-center gap-2 rounded-full border border-[#e8ddd4] bg-[#fdf7f4] px-3.5 py-2"
          >
            <span className="text-xs font-medium text-[#7B2D3E]">
              {formatSource(
                item.source
              )}
            </span>

            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">
              {item.count}
            </span>
          </div>
        )
      )}

      {unattributedCount > 0 && (
        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-neutral-50 px-3.5 py-2">
          <span className="text-xs font-medium text-neutral-500">
            Unattributed
          </span>

          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-black">
            {unattributedCount}
          </span>
        </div>
      )}
    </div>
  </div>
</section>

        {/* Table */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-[#e8ddd4] px-6 py-4">
            <div className="font-semibold text-black">All signups</div>
            <div className="mt-1 text-xs text-neutral-500">
  Showing {rows.length} signup
  {rows.length === 1
    ? ""
    : "s"}{" "}
  in the selected period
</div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
              <tr>
  <th className="px-6 py-3 font-medium">
    Name
  </th>

  <th className="px-6 py-3 font-medium">
    Email
  </th>

  <th className="px-6 py-3 font-medium">
    Source
  </th>

  <th className="px-6 py-3 font-medium">
    Campaign
  </th>

  <th className="px-6 py-3 font-medium">
    Content
  </th>

  <th className="px-6 py-3 font-medium">
    Signed up
  </th>
</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-black/6 hover:bg-[#fdf7f4] transition-colors">
                  <td className="px-6 py-3.5 font-medium text-black">
                    {r.name ?? "—"}
                  </td>
                  <td className="px-6 py-3.5 text-neutral-700">
                    <a
                      href={`mailto:${r.email}`}
                      className="underline decoration-black/20 underline-offset-4 hover:text-black"
                    >
                      {r.email ?? "—"}
                    </a>
                  </td>
                  <td className="px-6 py-3.5">
  {r.acquisitionSource ? (
    <span className="inline-flex rounded-full bg-[#fdf7f4] px-2.5 py-1 text-xs font-medium text-[#7B2D3E]">
      {formatSource(
        r.acquisitionSource
      )}
    </span>
  ) : (
    <span className="text-neutral-400">
      —
    </span>
  )}
</td>

<td className="px-6 py-3.5 text-neutral-600">
  {r.acquisitionCampaign ??
    "—"}
</td>

<td className="px-6 py-3.5 text-neutral-500">
  {r.acquisitionContent ??
    "—"}
</td>
                  <td className="px-6 py-3.5 text-neutral-500">
                    {new Date(r.createdAt).toLocaleString("en-GB")}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-neutral-400" colSpan={6}>
                    No waitlist signups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </section>

      </div>
    </main>
  );
}