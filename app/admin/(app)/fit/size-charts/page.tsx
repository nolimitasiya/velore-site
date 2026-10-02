import Link from "next/link";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatProductType(value: string) {
  if (value === "COATS_JACKETS") return "Coats & Jackets";
  if (value === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (value === "T_SHIRT") return "T-Shirt";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatBasis(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default async function AdminFitSizeChartsPage() {
  await requireAdminSession();

  const charts = await prisma.brandSizeChart.findMany({
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      productTypes: {
        orderBy: {
          productType: "asc",
        },
      },

      entries: {
        select: {
          id: true,
        },
      },
    },
  });

  const brandsWithCharts = new Set(
    charts.map((chart) => chart.brandId)
  ).size;

  const totalEntries = charts.reduce(
    (total, chart) => total + chart.entries.length,
    0
  );

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        {/* Header */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue · Fit &amp; Sizing
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Brand Size Charts
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Manage sizing information supplied by Veilora brand partners
                and preserve the original measurement context used by each
                chart.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/fit"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-medium text-white/80 transition hover:bg-white/15"
              >
                ← Fit &amp; Sizing
              </Link>

              <Link
                href="/admin/fit/size-charts/new"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-medium text-[#7B2D3E] transition hover:bg-white/90"
              >
                + New size chart
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Size charts" value={charts.length} />
            <MetricCard label="Brands covered" value={brandsWithCharts} />
            <MetricCard label="Size entries" value={totalEntries} />
          </div>
        </section>

        {/* Directory */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-black/5 px-6 py-5 md:px-8">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              Brand sizing
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
              Size chart directory
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
              Each chart can support one or more product types and contain its
              own size labels and measurement ranges.
            </p>
          </div>

          {charts.length === 0 ? (
            <div className="px-6 py-16 text-center md:px-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf7f4] text-[#7B2D3E]">
                <i
                  className="ti ti-ruler-measure text-xl"
                  aria-hidden="true"
                />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-black">
                No brand size charts yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Create the first chart using sizing information supplied by a
                brand.
              </p>

              <Link
                href="/admin/fit/size-charts/new"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#7B2D3E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a2435]"
              >
                Create size chart
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[#fdf7f4] text-left">
                  <tr className="text-xs uppercase tracking-[0.16em] text-[#a89280]">
                    <th className="px-6 py-4 font-semibold">Chart</th>
                    <th className="px-6 py-4 font-semibold">
                      Product types
                    </th>
                    <th className="px-6 py-4 font-semibold">Basis</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Sizes
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Verified
                    </th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {charts.map((chart) => (
                    <tr key={chart.id} className="hover:bg-neutral-50/70">
                      <td className="px-6 py-5">
                        <div className="font-medium text-black">
                          {chart.name}
                        </div>

                        <div className="mt-1 text-xs text-neutral-500">
                          {chart.brand.name}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        {chart.productTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {chart.productTypes.map((item) => (
                              <span
                                key={item.productType}
                                className="rounded-full border border-black/10 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600"
                              >
                                {formatProductType(item.productType)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>

                      <td className="px-6 py-5 text-neutral-600">
                        {formatBasis(chart.measurementBasis)}
                      </td>

                      <td className="px-6 py-5 text-right font-medium text-black">
                        {chart.entries.length}
                      </td>

                      <td className="px-6 py-5 text-right text-neutral-500">
                        {chart.lastVerifiedAt
                          ? chart.lastVerifiedAt.toLocaleDateString("en-GB")
                          : "Not verified"}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/admin/fit/size-charts/${chart.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 transition hover:border-[#7B2D3E]/30 hover:text-[#7B2D3E]"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}