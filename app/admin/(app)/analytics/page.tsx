import WorldChoropleth from "@/components/analytics/WorldChoropleth";
import { iso2ToIsoNumeric } from "@/lib/geo/iso";
import { cookies } from "next/headers";
import DiaryInsightsClient from "./DiaryInsightsClient";
import { prisma } from "@/lib/prisma";


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

function Card({
  title,
  subtitle,
  children,
  className = "",
  contentClassName = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className,
      ].join(" ")}
    >
      {title || subtitle ? (
        <div className="border-b border-black/8 px-5 py-4">
          {title ? <div className="text-sm font-medium text-black">{title}</div> : null}
      {subtitle ? <div className="mt-0.5 text-xs text-neutral-400">{subtitle}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}



function ProgressBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? `${Math.max(5, Math.round((value / max) * 100))}%` : "0%";

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full rounded-full bg-[#7B2D3E]/70" style={{ width }} />
    </div>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td className="px-4 py-8 text-sm text-neutral-500" colSpan={colSpan}>
        {message}
      </td>
    </tr>
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

function sourcePageLabel(sourcePage: string) {
  if (sourcePage === "HOME") return "Homepage";
  if (sourcePage === "SEARCH") return "Search";
  if (sourcePage === "BRAND") return "Brand page";
  return sourcePage;
}

function contextTypeLabel(value: string | null) {
  if (!value) return "Unknown";
  if (value === "MERCH") return "Merchandising";
  if (value === "BALANCED") return "Balanced continent feed";
  if (value === "GRID") return "Standard grid";
  if (value === "GRID_AFTER_MERCH") return "Grid after merch page one";
  if (value === "GRID_AFTER_BALANCED") return "Grid after balanced page one";
  return value.replaceAll("_", " ");
}

function pageStateLabel(row: { pageNumber: number | null; isExpandedPageOne: boolean | null; label?: string }) {
  if (row.label) return row.label;
  if (row.pageNumber === 1 && row.isExpandedPageOne === true) return "Page 1 (expanded 48)";
  if (row.pageNumber === 1) return "Page 1 (default 24)";
  if (row.pageNumber) return `Page ${row.pageNumber}`;
  return "Unknown";
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

  const summary = await getJSON(`/api/admin/analytics/summary?range=${range}&from=${fromDate}&to=${toDate}`);
  const topBrands = await getJSON(`/api/admin/analytics/clicks-by-brand?range=${range}&from=${fromDate}&to=${toDate}&take=5`);
  const topProducts = await getJSON(`/api/admin/analytics/clicks-by-product?range=${range}&from=${fromDate}&to=${toDate}&take=5`);
const byShopperCountry = await getJSON(`/api/admin/analytics/clicks-by-shopper-country?range=${range}&from=${fromDate}&to=${toDate}&take=20`);
const bySourcePage = await getJSON(`/api/admin/analytics/clicks-by-source-page?range=${range}&from=${fromDate}&to=${toDate}`);
const bySection = await getJSON(`/api/admin/analytics/clicks-by-section?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const byProductType = await getJSON(`/api/admin/analytics/clicks-by-product-type?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const byStyle = await getJSON(`/api/admin/analytics/clicks-by-style?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const byColour = await getJSON(`/api/admin/analytics/clicks-by-colour?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const estimatedByBrand = await getJSON(`/api/admin/analytics/estimated-by-brand?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const estimatedByProduct = await getJSON(`/api/admin/analytics/estimated-by-product?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const estimatedByShopperCountry = await getJSON(`/api/admin/analytics/estimated-by-shopper-country?range=${range}&from=${fromDate}&to=${toDate}&take=10`);
const byContextType = await getJSON(`/api/admin/analytics/clicks-by-context-type?range=${range}&from=${fromDate}&to=${toDate}`);
const byPageNumber = await getJSON(`/api/admin/analytics/clicks-by-page-number?range=${range}&from=${fromDate}&to=${toDate}`);
const byExpandedState = await getJSON(`/api/admin/analytics/clicks-by-expanded-state?range=${range}&from=${fromDate}&to=${toDate}`);
const byPosition = await getJSON(`/api/admin/analytics/clicks-by-position?range=${range}&from=${fromDate}&to=${toDate}&take=24`);

const [totalWishlistSaves, wishlistByShopperRaw, wishlistByProductRaw] = await Promise.all([
  prisma.wishlistItem.count(),
  prisma.wishlistItem.groupBy({
    by: ["shopperId"],
  }),
  prisma.wishlistItem.groupBy({
    by: ["productId"],
    _count: { _all: true },
    orderBy: { _count: { productId: "desc" } },
    take: 5,
  }),
]);

const uniqueWishlistShoppers = wishlistByShopperRaw.length;
const wishlistProductIds = wishlistByProductRaw.map((r) => r.productId);

const wishlistProducts = await prisma.product.findMany({
  where: { id: { in: wishlistProductIds } },
  select: {
    id: true,
    title: true,
    price: true,
    currency: true,
    brand: { select: { name: true } },
    images: {
      orderBy: { sortOrder: "asc" },
      take: 1,
      select: { url: true },
    },
  },
});

const wMap = new Map(wishlistProducts.map((p) => [p.id, p]));

const topWishlistRows = wishlistByProductRaw.map((r) => {
  const p = wMap.get(r.productId) ?? null;
  return {
    productId: r.productId,
    title: p?.title ?? "Unknown product",
    brandName: p?.brand?.name ?? "—",
    imageUrl: p?.images?.[0]?.url ?? null,
    price: p?.price ? String(p.price) : null,
    currency: p?.currency ?? "",
    saves: Number(r._count._all),
  };
});

const numericData: Record<string, number> = {};

  for (const r of byShopperCountry?.rows ?? []) {
    const id = iso2ToIsoNumeric(r.countryCode);
    if (!id) continue;
    numericData[id] = (numericData[id] ?? 0) + Number(r.clicks ?? 0);
  }

  const qs = (r: string) => (r === "30d" ? "" : `?range=${r}`);

  const maxSourceClicks = Math.max(
    0,
    ...((bySourcePage?.rows ?? []).map((r: any) => Number(r.clicks ?? 0)))
  );

  const maxCountryClicks = Math.max(
    0,
    ...((byShopperCountry?.rows ?? []).map((r: any) => Number(r.clicks ?? 0)))
  );

  return (
  <div className="min-h-screen bg-neutral-50/70">
    <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8" suppressHydrationWarning>
        {/* ── Hero ── */}
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
      <div className="mt-0.5 text-xs text-neutral-400">Shoppers who clicked a product card</div>
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
  {/* Shop at clicks */}
<div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Intent</div>
      <div className="mt-0.5 text-sm font-semibold text-black">Shop at clicks</div>
      <div className="mt-0.5 text-xs text-neutral-400">Shoppers who clicked throughto purchase</div>
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
            eyebrow="Traffic"
            title="Traffic intelligence"
            description="Where product discovery is happening across the platform."
          />

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card title="Clicks by source page" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Intensity</th>
                  </tr>
                </thead>
                <tbody>
                  {(bySourcePage?.rows ?? []).map((r: any) => (
                    <tr key={r.sourcePage} className="border-t border-black/6 align-middle">
                      <td className="px-4 py-3.5 font-medium text-black">
                        {sourcePageLabel(r.sourcePage)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                      <td className="px-4 py-3.5">
                        <ProgressBar value={Number(r.clicks ?? 0)} max={maxSourceClicks} />
                      </td>
                    </tr>
                  ))}

                  {(bySourcePage?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={3} message="No source-page click data yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>

            <Card title="Top brands" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {(topBrands?.rows ?? []).map((r: any) => (
                    <tr key={r.brandId} className="border-t border-black/6">
                      <td className="px-4 py-3.5 font-medium text-black">
                        {r.brand?.name ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                    </tr>
                  ))}

                  {(topBrands?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={2} message="No clicks yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <SectionIntro
            eyebrow="Merchandising"
            title="Storefront performance"
            description="Which homepage sections are driving outbound product interest."
          />

          <Card title="Top storefront sections" subtitle={`Range: ${range}`}>
            <table className="w-full text-sm">
              <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Target country</th>
                  <th className="px-4 py-3 text-right font-medium">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {(bySection?.rows ?? []).map((r: any) => (
                  <tr
                    key={`${r.sectionId ?? "none"}:${r.sectionKey ?? "key"}`}
                    className="border-t border-black/6 align-top"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-black">{r.sectionTitle ?? "Unknown section"}</div>
                      {r.sectionKey ? (
                        <div className="mt-1 text-xs text-neutral-500">{r.sectionKey}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-700">{r.sectionType ?? "—"}</td>
                    <td className="px-4 py-3.5 text-neutral-700">{r.targetCountryCode ?? "All / n.a."}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                  </tr>
                ))}

                {(bySection?.rows ?? []).length === 0 ? (
                  <EmptyRow colSpan={4} message="No storefront-section click data yet." />
                ) : null}
              </tbody>
            </table>
          </Card>
        </section>

        <section className="space-y-4">
  <SectionIntro
    eyebrow="Behaviour"
    title="Browsing behaviour"
    description="How shoppers are interacting with merchandising, balanced discovery, pagination, and expanded first-page browsing."
  />

  <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
    <Card title="Clicks by context type" subtitle={`Range: ${range}`}>
      <table className="w-full text-sm">
        <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
          <tr>
            <th className="px-4 py-3 font-medium">Context</th>
            <th className="px-4 py-3 text-right font-medium">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(byContextType?.rows ?? []).map((r: any) => (
            <tr key={r.contextType ?? "unknown"} className="border-t border-black/6">
              <td className="px-4 py-3.5 font-medium text-black">
                {contextTypeLabel(r.contextType)}
              </td>
              <td className="px-4 py-3.5 text-right font-medium text-black">
                {r.clicks}
              </td>
            </tr>
          ))}

          {(byContextType?.rows ?? []).length === 0 ? (
            <EmptyRow colSpan={2} message="No context-type click data yet." />
          ) : null}
        </tbody>
      </table>
    </Card>

    <Card title="Clicks by page number" subtitle={`Range: ${range}`}>
      <table className="w-full text-sm">
        <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
          <tr>
            <th className="px-4 py-3 font-medium">Page</th>
            <th className="px-4 py-3 text-right font-medium">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(byPageNumber?.rows ?? []).map((r: any) => (
            <tr key={String(r.pageNumber)} className="border-t border-black/6">
              <td className="px-4 py-3.5 font-medium text-black">
                {r.pageNumber ? `Page ${r.pageNumber}` : "Unknown"}
              </td>
              <td className="px-4 py-3.5 text-right font-medium text-black">
                {r.clicks}
              </td>
            </tr>
          ))}

          {(byPageNumber?.rows ?? []).length === 0 ? (
            <EmptyRow colSpan={2} message="No page-number click data yet." />
          ) : null}
        </tbody>
      </table>
    </Card>

    <Card title="Expanded first-page behaviour" subtitle={`Range: ${range}`}>
      <table className="w-full text-sm">
        <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
          <tr>
            <th className="px-4 py-3 font-medium">State</th>
            <th className="px-4 py-3 text-right font-medium">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {(byExpandedState?.rows ?? []).map((r: any, idx: number) => (
            <tr key={`${r.pageNumber ?? "x"}-${String(r.isExpandedPageOne)}-${idx}`} className="border-t border-black/6">
              <td className="px-4 py-3.5 font-medium text-black">
                {pageStateLabel(r)}
              </td>
              <td className="px-4 py-3.5 text-right font-medium text-black">
                {r.clicks}
              </td>
            </tr>
          ))}

          {(byExpandedState?.rows ?? []).length === 0 ? (
            <EmptyRow colSpan={2} message="No expanded-state click data yet." />
          ) : null}
        </tbody>
      </table>
    </Card>

    <Card title="Clicks by position" subtitle={`Range: ${range}`}>
  <table className="w-full text-sm">
    <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
      <tr>
        <th className="px-4 py-3 font-medium">Position</th>
        <th className="px-4 py-3 text-right font-medium">Clicks</th>
      </tr>
    </thead>
    <tbody>
      {(byPosition?.rows ?? []).map((r: any) => (
        <tr key={String(r.position)} className="border-t border-black/6">
          <td className="px-4 py-3.5 font-medium text-black">
            {r.position ? `Slot ${r.position}` : "Unknown"}
          </td>
          <td className="px-4 py-3.5 text-right font-medium text-black">
            {r.clicks}
          </td>
        </tr>
      ))}

      {(byPosition?.rows ?? []).length === 0 ? (
        <EmptyRow colSpan={2} message="No position click data yet." />
      ) : null}
    </tbody>
  </table>
</Card>

  </div>
</section>

        <section className="space-y-4">
          <SectionIntro
            eyebrow="Demand"
            title="Product intelligence"
            description="What kinds of products, styles, and colours are attracting the most shopper interest."
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Top product types" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {(byProductType?.rows ?? []).map((r: any) => (
                    <tr key={r.productType ?? "unknown"} className="border-t border-black/6">
                      <td className="px-4 py-3.5 font-medium text-black">
                        {productTypeLabel(r.productType)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                    </tr>
                  ))}

                  {(byProductType?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={2} message="No product-type click data yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>

            <Card title="Top styles" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Style</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {(byStyle?.rows ?? []).map((r: any) => (
                    <tr key={r.styleId} className="border-t border-black/6">
                      <td className="px-4 py-3.5 font-medium text-black">{r.styleName}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                    </tr>
                  ))}

                  {(byStyle?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={2} message="No style click data yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>

            <Card title="Top colours" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Colour</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {(byColour?.rows ?? []).map((r: any) => (
                    <tr key={r.colourId} className="border-t border-black/6">
                      <td className="px-4 py-3.5 font-medium text-black">{r.colourName}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                    </tr>
                  ))}

                  {(byColour?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={2} message="No colour click data yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>
          </div>

          <Card title="Top products" subtitle={`Range: ${range}`}>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Colour</th>
                    <th className="px-4 py-3 font-medium">Style</th>
                    <th className="px-4 py-3 font-medium">Price band</th>
                    <th className="px-4 py-3 font-medium">Badges</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {(topProducts?.rows ?? []).map((r: any) => (
                    <tr
                      key={`${r.brand?.id ?? "b"}:${r.productId}`}
                      className="border-t border-black/6 align-top"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
                            {r.product?.imageUrl ? (
                              <img
                                src={r.product.imageUrl}
                                alt={r.product?.title ?? "Product image"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[11px] text-neutral-400">No image</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-medium text-black">
                              {r.product?.title ?? "Unknown product"}
                            </div>
                            {r.product?.price ? (
                              <div className="mt-1 text-xs text-neutral-500">
                                {r.product.price} {r.product.currency}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-neutral-700">{r.brand?.name ?? "Unknown"}</td>
                      <td className="px-4 py-3.5 text-neutral-700">
                        {productTypeLabel(r.product?.productType ?? null)}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700">
                        {r.product?.primaryColour ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700">
                        {r.product?.primaryStyle ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-neutral-700">{r.product?.priceBand ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        {r.product?.badges?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {r.product.badges.map((badge: string) => (
                              <span
                                key={badge}
                                className="rounded-full border border-black/10 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-700"
                              >
                                {badge.replaceAll("_", " ")}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                    </tr>
                  ))}

                  {(topProducts?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={8} message="No product-level clicks yet." />
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

<section className="space-y-4">
  <SectionIntro
    eyebrow="Wishlist"
    title="Shopper wishlist intelligence"
    description="Products shoppers are saving — a real-time signal of intent and demand across the platform."
  />

  <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
        Wishlist
      </div>
      <h2 className="mt-0.5 text-base font-semibold text-black">Saved products — platform snapshot</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Current totals across all brands. Independent of date range.
      </p>
    </div>

    {/* Two mini stats */}
    <div className="grid grid-cols-2 divide-x divide-[#e8ddd4] border-b border-[#e8ddd4]">
      <div className="px-6 py-5">
        <div className="text-xs text-neutral-400">Total saves</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight text-black">
          {totalWishlistSaves}
        </div>
        <div className="mt-1 text-xs text-neutral-400">Across all brands</div>
      </div>
      <div className="px-6 py-5">
        <div className="text-xs text-neutral-400">Unique shoppers</div>
        <div className="mt-1 text-3xl font-semibold tracking-tight text-black">
          {uniqueWishlistShoppers}
        </div>
        <div className="mt-1 text-xs text-neutral-400">With at least one saved product</div>
      </div>
    </div>

    {/* Top wishlisted products */}
    {topWishlistRows.length > 0 ? (
      <table className="w-full text-sm">
        <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
          <tr>
            <th className="px-5 py-3 font-medium">Product</th>
            <th className="px-5 py-3 font-medium">Brand</th>
            <th className="px-5 py-3 font-medium">Price</th>
            <th className="px-5 py-3 text-right font-medium">Saves</th>
          </tr>
        </thead>
        <tbody>
          {topWishlistRows.map((r) => (
            <tr key={r.productId} className="border-t border-black/6">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-[#faf8f4]">
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={r.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </div>
                  <div className="truncate font-medium text-black">{r.title}</div>
                </div>
              </td>
              <td className="px-5 py-4 text-neutral-700">{r.brandName}</td>
              <td className="px-5 py-4 text-neutral-700">
                {r.price ? `${r.currency} ${r.price}` : <span className="text-neutral-400">—</span>}
              </td>
              <td className="px-5 py-4 text-right font-semibold text-[#7B2D3E]">{r.saves}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="px-6 py-8 text-sm text-neutral-400">
        No products wishlisted yet.
      </div>
    )}
  </div>
</section>


        <section className="space-y-4">
          <SectionIntro
            eyebrow="Geography"
            title="Shopper preference geography"
            description="Where shopper-selected country demand is concentrated across the platform."
          />

          <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
            <Card
              title="Shopper preference country"
              subtitle={`Range: ${range}`}
              className="h-fit"
            >
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Intensity</th>
                  </tr>
                </thead>
                <tbody>
                  {(byShopperCountry?.rows ?? []).map((r: any) => (
                    <tr key={r.countryCode} className="border-t border-black/6 align-middle">
                      <td className="px-4 py-3.5 font-medium text-black">
                        {countryLabel(r.countryCode)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                      <td className="px-4 py-3.5">
                        <ProgressBar value={Number(r.clicks ?? 0)} max={maxCountryClicks} />
                      </td>
                    </tr>
                  ))}

                  {(byShopperCountry?.rows ?? []).length === 0 ? (
                    <EmptyRow
                      colSpan={3}
                      message="No shopper preference country clicks yet."
                    />
                  ) : null}
                </tbody>
              </table>
            </Card>

            <div className="space-y-3">
              <div className="text-xs text-neutral-500">
                Country boundaries may include overseas territories depending on the map dataset.
              </div>
              <WorldChoropleth
                title={`Shopper preference country heatmap (${range})`}
                data={numericData}
              />
            </div>
            
          </div>

          
        </section>

        <DiaryInsightsClient />

        <section className="space-y-4">
          <SectionIntro
            eyebrow="Commercial"
            title="Commercial intelligence"
            description="Estimated earning potential based on clicks, assumed conversion, AOV, and commission rate."
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <Card title="Estimated commission by brand" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 text-right font-medium">Est. commission</th>
                  </tr>
                </thead>
                <tbody>
                  {(estimatedByBrand?.rows ?? []).map((r: any) => (
                    <tr key={r.brandId} className="border-t border-black/6 align-top">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-black">{r.brand?.name ?? "Unknown"}</div>
                        <div className="mt-1 text-xs text-neutral-500">
                          {r.clicks} clicks • {(r.commissionRate * 100).toFixed(0)}% commission
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">
                        {money(r.estimatedCommission)}
                      </td>
                    </tr>
                  ))}

                  {(estimatedByBrand?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={2} message="No brand-level estimate data yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>

            <Card title="Estimated commission by shopper country" subtitle={`Range: ${range}`}>
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Country</th>
                    <th className="px-4 py-3 text-right font-medium">Est. commission</th>
                  </tr>
                </thead>
                <tbody>
                  {(estimatedByShopperCountry?.rows ?? []).map((r: any) => (
                    <tr key={r.countryCode} className="border-t border-black/6 align-top">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-black">{countryLabel(r.countryCode)}</div>
                        <div className="mt-1 text-xs text-neutral-500">{r.clicks} clicks</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">
                        {money(r.estimatedCommission)}
                      </td>
                    </tr>
                  ))}

                  {(estimatedByShopperCountry?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={2} message="No shopper-country estimate data yet." />
                  ) : null}
                </tbody>
              </table>
            </Card>

            <Card title="Model assumptions" subtitle="Current defaults" contentClassName="p-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className="text-neutral-600">Default commission</span>
                  <span className="font-semibold text-black">15%</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className="text-neutral-600">Default AOV</span>
                  <span className="font-semibold text-black">£75</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className="text-neutral-600">Default conversion</span>
                  <span className="font-semibold text-black">2%</span>
                </div>
                <div className="pt-1 text-xs leading-5 text-neutral-500">
                  Brand-specific commission rate and AOV are used when available. Otherwise defaults apply.
                </div>
              </div>
            </Card>
          </div>

          <Card title="Top products by estimated commission" subtitle={`Range: ${range}`}>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Brand</th>
                    <th className="px-4 py-3 text-right font-medium">Clicks</th>
                    <th className="px-4 py-3 text-right font-medium">Est. commission</th>
                  </tr>
                </thead>
                <tbody>
                  {(estimatedByProduct?.rows ?? []).map((r: any) => (
                    <tr
                      key={`${r.brand?.id ?? "b"}:${r.productId}`}
                      className="border-t border-black/6"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
                            {r.product?.imageUrl ? (
                              <img
                                src={r.product.imageUrl}
                                alt={r.product?.title ?? "Product image"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[11px] text-neutral-400">No image</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-medium text-black">
                              {r.product?.title ?? "Unknown product"}
                            </div>
                            {r.product?.price ? (
                              <div className="mt-1 text-xs text-neutral-500">
                                {r.product.price} {r.product.currency}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-neutral-700">{r.brand?.name ?? "Unknown"}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">{r.clicks}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-black">
                        {money(r.estimatedCommission)}
                      </td>
                    </tr>
                  ))}

                  {(estimatedByProduct?.rows ?? []).length === 0 ? (
                    <EmptyRow colSpan={4} message="No product-level estimate data yet." />
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        
        
      </div>
    </div>
  );
}