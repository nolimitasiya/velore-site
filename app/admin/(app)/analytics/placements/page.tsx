import Link from "next/link";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import { loadPlacementPerformance } from "@/lib/analytics/loadPlacementReports";

export const dynamic = "force-dynamic";

type SearchParams = {
  days?: string;
  page?: string;
};

function readDays(value?: string): 7 | 30 | 90 {
  return value === "7" || value === "90"
    ? Number(value) as 7 | 90
    : 30;
}

function readPage(value?: string): number {
  const page = Number(value ?? "1");
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function percent(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

export default async function PlacementPerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const days = readDays(params.days);
  const page = readPage(params.page);
  const pageSize = 50;

  const report = await loadPlacementPerformance({
    days,
    page,
    pageSize,
  });

  const rows = report.rows;

  function reportUrl(nextPage: number, nextDays = days) {
    return `/admin/analytics/placements?days=${nextDays}&page=${nextPage}`;
  }

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
        <AnalyticsNav />

        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Product discovery analytics
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Placement Performance
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
            Understand which product placements generate visibility,
            direct Shop clicks and Shop clicks after a product detail visit.
          </p>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-black/10 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Reporting period
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Product impressions and Shop clicks
            </p>
          </div>

          <div className="flex gap-2">
            {([7, 30, 90] as const).map((period) => (
              <Link
                key={period}
                href={reportUrl(1, period)}
                className={[
                  "rounded-xl px-4 py-2 text-sm font-medium transition",
                  days === period
                    ? "bg-[#7B2D3E] text-white"
                    : "border border-black/10 bg-white text-neutral-600 hover:bg-neutral-50",
                ].join(" ")}
              >
                {period} days
              </Link>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 px-6 py-5">
            <h2 className="text-lg font-semibold text-neutral-900">
              Product placement breakdown
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Each row represents a distinct product and discovery placement.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Product</th>
                  <th className="px-5 py-4 font-semibold">Placement</th>
                  <th className="px-5 py-4 font-semibold">Position</th>
                  <th className="px-5 py-4 text-right font-semibold">Impressions</th>
                  <th className="px-5 py-4 text-right font-semibold">Direct</th>
                  <th className="px-5 py-4 text-right font-semibold">PDP Shop Clicks</th>
                  <th className="px-5 py-4 text-right font-semibold">Total Shop Clicks</th>
                  <th className="px-5 py-4 text-right font-semibold">Unique Sessions</th>
                  <th className="px-5 py-4 text-right font-semibold">Shop CTR</th>
                  <th className="px-5 py-4 text-right font-semibold">Direct CTR</th>
                  <th className="px-5 py-4 text-right font-semibold">PDP CTR</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {rows.map((row, index) => (
                  <tr
                    key={`${row.productId}-${row.discoverySource}-${row.sectionKey}-${row.position}-${row.pageNumber}-${row.contextType}-${index}`}
                    className="hover:bg-[#fdf7f4]/60"
                  >
                    <td className="px-5 py-4 font-medium text-neutral-900">
                      {report.productNames[row.productId] ?? "Unknown product"}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      <div className="font-medium">
                        {row.discoverySource ?? "Unassigned"}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {row.sectionKey ?? "No section"}
                        {row.contextType ? ` · ${row.contextType}` : ""}
                        {row.pageNumber ? ` · Page ${row.pageNumber}` : ""}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {row.position ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-right">{row.impressions.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">{row.directClicks.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">{row.pdpClicks.toLocaleString()}</td>

                    <td className="px-5 py-4 text-right font-semibold text-[#7B2D3E]">
                      {row.totalClicks.toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {row.uniqueClickingSessions.toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold">
                      {percent(row.shopCtr)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {percent(row.directCtr)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {percent(row.pdpCtr)}
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-14 text-center text-neutral-500">
                      {page > report.totalPages
                        ? "This page is outside the available placement results. Use Previous to return to an earlier page."
                         : "No placement activity found for this reporting period."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-black/10 px-6 py-4">
  <span className="text-sm text-neutral-500">
    Page {page.toLocaleString()} of {report.totalPages.toLocaleString()}
    {" · "}
    Showing {rows.length.toLocaleString()} of{" "}
    {report.totalRows.toLocaleString()} placements
  </span>

  <div className="flex gap-2">
    {page > 1 && (
      <Link
        href={reportUrl(page - 1)}
        className="rounded-xl border border-black/10 px-4 py-2 text-sm"
      >
        Previous
      </Link>
    )}

    {page < report.totalPages && (
      <Link
        href={reportUrl(page + 1)}
        className="rounded-xl bg-[#7B2D3E] px-4 py-2 text-sm text-white"
      >
        Next
      </Link>
    )}
  </div>
</div>
        </section>

        <section className="rounded-[20px] border border-black/10 bg-white p-5 text-xs leading-6 text-neutral-600">
          <strong className="text-neutral-900">How to read this report:</strong>{" "}
          An impression is recorded when at least 50% of a product card becomes visible.
          Direct clicks originate from product cards; PDP Shop clicks originate from
          product detail pages. Shop CTR is total Shop clicks divided by impressions.
          Repeat clicks are counted, so CTR can exceed 100%. Where attribution or
          impressions are missing, interpret the results cautiously.
        </section>
      </div>
    </div>
  );
}