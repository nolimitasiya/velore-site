import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

import SizeChartMeasurementEditor from "./SizeChartMeasurementEditor";
import SizeChartProvenanceEditor from "./SizeChartProvenanceEditor";

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
  if (value === "BODY") return "Body measurements";
  if (value === "GARMENT") return "Garment measurements";
  return "Unknown";
}



export default async function BrandSizeChartPage({
  params,
}: {
  params: Promise<{ chartId: string }>;
}) {
  await requireAdminSession();

  const { chartId } = await params;

  const chart = await prisma.brandSizeChart.findUnique({
    where: {
      id: chartId,
    },

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
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],

        include: {
          measurements: {
            orderBy: [
              {
                component: "asc",
              },
              {
                type: "asc",
              },
            ],
          },
        },
      },
    },
  });

  if (!chart) {
    notFound();
  }

  const measurementCount = chart.entries.reduce(
    (total, entry) => total + entry.measurements.length,
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
                Admin catalogue · Fit &amp; Sizing · {chart.brand.name}
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {chart.name}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Manage this brand&apos;s size rows, measurement ranges and
                sizing provenance.
              </p>
            </div>

            <Link
              href="/admin/fit/size-charts"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              ← Brand size charts
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Size rows" value={chart.entries.length} />

            <MetricCard
              label="Measurements"
              value={measurementCount}
            />

            <MetricCard
              label="Basis"
              value={formatBasis(chart.measurementBasis)}
            />

            <MetricCard
              label="Source unit"
              value={chart.sourceUnit}
            />
          </div>
        </section>

        {/* Chart context */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              Chart context
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
              {chart.brand.name}
            </h2>

            <div className="mt-5 space-y-5">
              <DetailRow
                label="Measurement basis"
                value={formatBasis(chart.measurementBasis)}
              />

              <DetailRow
                label="Source unit"
                value={
                  chart.sourceUnit === "CM"
                    ? "Centimetres (CM)"
                    : "Inches (IN)"
                }
              />

              <div>
                <div className="text-xs font-medium text-neutral-400">
                  Product types
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {chart.productTypes.map((item) => (
                    <span
                      key={item.productType}
                      className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600"
                    >
                      {formatProductType(item.productType)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <SizeChartProvenanceEditor
  chartId={chart.id}
  source={chart.source}
  initialSourceUrl={chart.sourceUrl ?? ""}
  initialSourceNotes={chart.sourceNotes ?? ""}
  initialLastVerifiedAt={
    chart.lastVerifiedAt
      ? chart.lastVerifiedAt.toISOString().slice(0, 10)
      : ""
  }
/>
        </section>

        {/* Size rows */}
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <SizeChartMeasurementEditor
    chartId={chart.id}
    sourceUnit={chart.sourceUnit}
    productTypes={chart.productTypes.map(
    (item) => item.productType
  )}
    initialEntries={chart.entries.map((entry) => ({
      id: entry.id,
      sizeLabel: entry.sizeLabel,

      measurements: entry.measurements.map(
        (measurement) => ({
          type: measurement.type,
          component: measurement.component,

          sourceMinValue:
            measurement.sourceMinValue.toString(),

          sourceMaxValue:
            measurement.sourceMaxValue.toString(),
        })
      ),
    }))}
  />
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
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <div className="text-xs text-white/50">{label}</div>

      <div className="mt-1 text-xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium text-neutral-700">
        {value}
      </div>
    </div>
  );
}