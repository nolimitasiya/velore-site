import Link from "next/link";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";
import { loadDiscoveryJourneys } from "@/lib/analytics/loadPlacementReports";

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

function originLabel(origin: string): string {
  if (origin === "PRODUCT_CARD") return "Card";
  if (origin === "PRODUCT_DETAIL") return "PDP";
  return "Unknown";
}

export default async function DiscoveryJourneysPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const days = readDays(params.days);
  const page = readPage(params.page);
  const pageSize = 50;

  const report = await loadDiscoveryJourneys({
    days,
    page,
    pageSize,
  });

  const rows = report.rows;

  function reportUrl(nextPage: number, nextDays = days) {
    return `/admin/analytics/journeys?days=${nextDays}&page=${nextPage}`;
  }

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 p-6 md:p-8">
        <AnalyticsNav />

        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Shopper discovery analytics
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Discovery Journeys
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
            Explore how reported journey entry points connect to product
            placements and eventual Shop clicks.
          </p>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-black/10 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Reporting period
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Shop click journeys
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
              Entry → Placement → Shop origin
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Grouped Shop clicks, with journey attribution evidence displayed separately.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Journey Entry</th>
                  <th className="px-5 py-4 font-semibold">Product Placement</th>
                  <th className="px-5 py-4 font-semibold">Position</th>
                  <th className="px-5 py-4 font-semibold">Shop Origin</th>
                  <th className="px-5 py-4 text-right font-semibold">Shop Clicks</th>
                  <th className="px-5 py-4 text-right font-semibold">Unique Sessions</th>
                  <th className="px-5 py-4 font-semibold">Evidence</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {rows.map((row, index) => (
                  <tr
                    key={`${row.entrySource}-${row.discoverySource}-${row.sectionKey}-${row.position}-${row.clickOrigin}-${index}`}
                    className="hover:bg-[#fdf7f4]/60"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-neutral-900">
                        {row.entrySource ?? "Unknown"}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {row.entrySectionKey ?? "No entry section"}
                        {row.entryPosition ? ` · Position ${row.entryPosition}` : ""}
                        {row.entryPageNumber ? ` · Page ${row.entryPageNumber}` : ""}
                        {row.entryContextType ? ` · ${row.entryContextType}` : ""}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-neutral-900">
                        {row.discoverySource ?? "Unassigned"}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {row.sectionKey ?? "No section"}
                        {row.pageNumber ? ` · Page ${row.pageNumber}` : ""}
                        {row.contextType ? ` · ${row.contextType}` : ""}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {row.position ?? "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#fdf0f2] px-3 py-1 text-xs font-semibold text-[#7B2D3E]">
                        {originLabel(row.clickOrigin)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-[#7B2D3E]">
                      {row.shopClicks.toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {row.uniqueClickingSessions.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                          row.attributionEvidence === "URL_REPORTED"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-neutral-100 text-neutral-600",
                        ].join(" ")}
                      >
                        {row.attributionEvidence === "URL_REPORTED"
                          ? "URL reported"
                          : "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-neutral-500">
                     {page > report.totalPages
                       ? "This page is outside the available journey results. Use Previous to return to an earlier page."
                       : "No Shop click journeys found for this reporting period."}
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
    {report.totalRows.toLocaleString()} journeys
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
          <strong className="text-neutral-900">Attribution note:</strong>{" "}
          Journey entries are based on tracking parameters supplied to Veilora Club.
          A URL-reported entry does not independently prove that every preceding
          page was visited. Missing information is displayed as Unknown rather
          than reconstructing an unsupported journey.
        </section>
      </div>
    </div>
  );
}