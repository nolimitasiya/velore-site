
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";

import Link from "next/link";


export const dynamic = "force-dynamic";



async function absoluteUrl(path: string) {
  const headerStore = await headers();

  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host");

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");

  if (!host) {
    throw new Error(`Unable to determine request host for ${path}`);
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

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    throw new Error(
      `Analytics API failed: ${path} (${res.status}) ${text.slice(0, 500)}`
    );
  }

  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");

    throw new Error(
      `Analytics API returned non-JSON: ${path} (${res.status}) ` +
        `content-type=${contentType} body=${text.slice(0, 500)}`
    );
  }

  return res.json();
}

function RangeLink({ href, label, active }: { href: string; label: string; active: boolean }) {
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

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-0.5">
      {eyebrow ? (
        <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-sm font-medium tracking-tight text-black">{title}</h2>
      {description ? <p className="max-w-3xl text-xs text-neutral-500">{description}</p> : null}
    </div>
  );
}



function AnalyticsAreaCard({
  eyebrow,
  title,
  description,
  href,
  stats,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  stats: Array<{
    label: string;
    value: string | number;
  }>;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[28px] border border-black/10 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/60">
          {eyebrow}
        </div>

        <div className="mt-1 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-black">
            {title}
          </h2>

          <span className="text-sm text-[#7B2D3E] transition group-hover:translate-x-1">
            Explore →
          </span>
        </div>

        <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-black/5 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white px-5 py-4"
          >
            <div className="text-xs text-neutral-400">
              {stat.label}
            </div>

            <div className="mt-1 text-xl font-semibold text-black">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const range = sp.range === "today" || sp.range === "7d" || sp.range === "30d" || sp.range === "custom"
  ? sp.range : "30d";
const fromDate = sp.from ?? "";
const toDate = sp.to ?? "";

  const [
  summary,
  indexOverview,
  audienceData,
] = await Promise.all([
  getJSON(
    `/api/admin/analytics/summary?range=${range}&from=${fromDate}&to=${toDate}`
  ),

  getJSON(
    `/api/admin/analytics/index-overview?range=${range}&from=${fromDate}&to=${toDate}`
  ),

  getJSON(
    `/api/admin/analytics/audience?range=${range}&from=${fromDate}&to=${toDate}&country=all&source=all`
  ),
]);

const totalWishlistSaves =
  await prisma.wishlistItem.count();

const qs = (r: string) => (r === "30d" ? "" : `?range=${r}`);
const index = indexOverview?.overview ?? {};

const audience =
  audienceData?.overview ?? {};

const audienceGeography =
  audienceData?.geography ?? [];

const activeMarkets =
  audienceGeography.length;

const ageCoverage =
  audience.ageCoverage != null
    ? `${(
        Number(
          audience.ageCoverage
        ) * 100
      ).toFixed(0)}%`
    : "—";



  return (
  <div className="min-h-screen bg-neutral-50/70">
    <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8" suppressHydrationWarning>
       
        {/* ── Hero ── */}

        <AnalyticsNav />
<section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
        Admin analytics
      </div>
      <h1 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
        Revenue & performance intelligence
      </h1>
      <p className="max-w-2xl text-sm leading-6 text-white/60">
        A clean overview of platform traffic, shopper demand, product interest, and
        estimated commercial value across Veilora.
      </p>
    </div>

    {/* Range controls */}
    <div className="flex flex-wrap items-center gap-2">
      <RangeLink href={`/admin/analytics${qs("today")}`}   label="Today"        active={range === "today"} />
      <RangeLink href={`/admin/analytics${qs("7d")}`}      label="Last 7 days"  active={range === "7d"} />
      <RangeLink href={`/admin/analytics${qs("30d")}`}     label="Last 30 days" active={range === "30d"} />
      <RangeLink href={`/admin/analytics${qs("custom")}`}  label="Custom range" active={range === "custom"} />
    </div>
  </div>

  {/* Custom date picker — shown only when custom is active */}
  {range === "custom" && (
  <form method="GET" action="/admin/analytics" className="mt-5 flex flex-wrap items-center gap-3">
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

  {/* Download buttons */}
  <div className="mt-5 flex flex-wrap items-center gap-3">
    <a
      href={`/api/admin/analytics/export/clicks-by-brand?range=${range}&take=1000`}
      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/15"
    >
      Download brands report
    </a>
    <a
      href={`/api/admin/analytics/export/clicks-by-product?range=${range}&take=1000`}
      className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/15"
    >
      Download products report
    </a>
    <a
      href={`/api/admin/analytics/export/raw-clicks?range=${range}&take=20000`}
      className="inline-flex items-center rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-[#7B2D3E] transition hover:bg-white/90"
    >
      Download raw clicks report
    </a>
  </div>
</section>

{/* ── Stat cards — update progress bar + table head colours ── */}


    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
  {/* Product views */}
  <div className="overflow-hidden rounded-[28px] border border-black/10 border-l-[3px] border-l-[#7B2D3E] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Discovery</div>
      <div className="mt-0.5 text-sm font-semibold text-black">Product views</div>
      <div className="mt-0.5 text-xs text-neutral-400">Product detail pages opened</div>
    </div>
    <div className="px-5 py-5">
      <div className="text-3xl font-semibold tracking-tight text-black">
        {range === "today"
          ? summary?.views?.today ?? 0
          : range === "7d"
          ? summary?.views?.last7 ?? 0
          : range === "custom"
          ? summary?.views?.custom ?? 0
          : summary?.views?.last30 ?? 0}
      </div>
      <div className="mt-1 text-xs text-neutral-400">
        {range === "today" ? "Today" : range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : `${fromDate} → ${toDate}`}
      </div>
    </div>
  </div>

  {/* Shop at clicks */}
<div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Intent</div>
      <div className="mt-0.5 text-sm font-semibold text-black">Shop clicks</div>
      <div className="mt-0.5 text-xs text-neutral-400">Outbound clicks to brand websites</div>
    </div>
    <div className="px-5 py-5">
      <div className="text-3xl font-semibold tracking-tight text-black">
        {range === "today"
          ? summary?.clicks?.today ?? 0
          : range === "7d"
          ? summary?.clicks?.last7 ?? 0
          : range === "custom"
          ? summary?.clicks?.custom ?? 0
          : summary?.clicks?.last30 ?? 0}
      </div>
      <div className="mt-1 text-xs text-neutral-400">
        {range === "today" ? "Today" : range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : `${fromDate} → ${toDate}`}
      </div>
    </div>
  </div>

  {/* Total brands */}
  <div className="overflow-hidden rounded-[28px] border border-black/10 border-l-[3px] border-l-[#7B2D3E] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">

    <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Platform</div>
      <div className="mt-0.5 text-sm font-semibold text-black">Total brands</div>
      <div className="mt-0.5 text-xs text-neutral-400">Active on platform</div>
    </div>
    <div className="px-5 py-5">
      <div className="text-3xl font-semibold tracking-tight text-black">
        {summary?.brandCount ?? "—"}
      </div>
      <div className="mt-1 text-xs text-neutral-400">
        {summary?.brandCountAtRangeStart != null && summary?.brandCount != null
          ? `${summary.brandCount - summary.brandCountAtRangeStart >= 0 ? "+" : ""}${summary.brandCount - summary.brandCountAtRangeStart} this period`
          : "Active brands"}
      </div>
    </div>
  </div>

  {/* Total products */}
  <div className="overflow-hidden rounded-[28px] border border-black/10 border-l-[3px] border-l-[#7B2D3E] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">

    <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Platform</div>
      <div className="mt-0.5 text-sm font-semibold text-black">Total products</div>
      <div className="mt-0.5 text-xs text-neutral-400">Listed across all brands</div>
    </div>
    <div className="px-5 py-5">
      <div className="text-3xl font-semibold tracking-tight text-black">
        {summary?.productCount ?? "—"}
      </div>
      <div className="mt-1 text-xs text-neutral-400">
        {summary?.productCountAtRangeStart != null && summary?.productCount != null
          ? `${summary.productCount - summary.productCountAtRangeStart >= 0 ? "+" : ""}${summary.productCount - summary.productCountAtRangeStart} this period`
          : "Active products"}
      </div>
    </div>
  </div>
</section>

<section className="space-y-4">
  <SectionIntro
    eyebrow="Analytics areas"
    title="Explore Veilora performance"
    description="Move from the high-level overview into dedicated intelligence for demand, shoppers, platform behaviour, and commerce."
  />

  <div className="grid gap-5 xl:grid-cols-2">
    <AnalyticsAreaCard
      eyebrow="Veilora Index"
      title="Fashion intelligence"
      description="Understand what shoppers are searching for, viewing, saving, and intending to buy."
      href="/admin/analytics/veilora-index"
      stats={[
        {
          label: "Searches",
          value: index.searches ?? 0,
        },
        {
          label: "Product views",
          value: index.productViews ?? 0,
        },
        {
          label: "Wishlist adds",
          value: index.wishlistAdds ?? 0,
        },
        {
          label: "Shop clicks",
          value: index.shopClicks ?? 0,
        },
      ]}
    />

    <AnalyticsAreaCard
  eyebrow="Audience"
  title="Shopper intelligence"
  description="Understand who is using Veilora, where they are based, and how shopper groups behave."
  href="/admin/analytics/audience"
  stats={[
    {
      label:
        "Registered shoppers",
      value:
        audience.registeredShoppers ??
        0,
    },

    {
      label:
        "Active audience",
      value:
        audience.activeAudience ??
        0,
    },

    {
      label:
        "Active markets",
      value:
        activeMarkets,
    },

    {
      label:
        "Age coverage",
      value:
        ageCoverage,
    },
  ]}
/>

    <AnalyticsAreaCard
  eyebrow="Insights"
  title="Cross intelligence"
  description="Connect audience demographics, brand markets and discovery behaviour with the fashion signals shoppers respond to most strongly."
  href="/admin/analytics/insights"
  stats={[
    {
      label: "Impressions",
      value: index.impressions ?? 0,
    },
    {
      label: "Product views",
      value: index.productViews ?? 0,
    },
    {
      label: "Wishlist saves",
      value: totalWishlistSaves,
    },
    {
      label: "Shop clicks",
      value: index.shopClicks ?? 0,
    },
  ]}
/>

    <AnalyticsAreaCard
      eyebrow="Commerce"
      title="Commercial performance"
      description="Track outbound intent, future purchases, GMV, commissions, and brand revenue contribution."
      href="/admin/analytics/commerce"
      stats={[
        {
          label: "Shop clicks",
          value: index.shopClicks ?? 0,
        },
        {
          label: "Purchases",
          value: "—",
        },
        {
          label: "GMV",
          value: "—",
        },
        {
          label: "Commission",
          value: "—",
        },
      ]}
    />
  </div>
</section>

        
      </div>
    </div>
  );
}