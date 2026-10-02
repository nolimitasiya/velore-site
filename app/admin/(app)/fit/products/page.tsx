import Link from "next/link";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";
import {
  ProductLengthStructure,
} from "@prisma/client";

import {
  loadNormalizedRecommendationSizes,
} from "@/lib/fit/loadRecommendationInput";

import {
  assessProductLengthReadiness,
} from "@/lib/fit/admin/productLengthReadiness";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatProductType(value: string | null) {
  if (!value) return "—";
  if (value === "COATS_JACKETS") return "Coats & Jackets";
  if (value === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (value === "T_SHIRT") return "T-Shirt";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

export default async function ProductFitDirectoryPage() {
  await requireAdminSession();

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },

    orderBy: [
      {
        brand: {
          name: "asc",
        },
      },
      {
        title: "asc",
      },
    ],

    select: {
      id: true,
      title: true,
      slug: true,
      productType: true,
lengthStructure: true,
publishedAt: true,
status: true,

productTypes: {
  select: {
    productType: true,
  },
},

lengthOptions: true,

      brand: {
        select: {
          id: true,
          name: true,
        },
      },

      fitProfile: {
  select: {
    id: true,
    intendedFit: true,
    stretch: true,
    measurementBasis: true,

    measurements: {
      select: {
        type: true,
        component: true,
      },
    },
  },
},

     productSizes: {
  select: {
    sizeId: true,

    size: {
      select: {
        name: true,
      },
    },

    fitMeasurements: true,

    sizeChartMapping: {
      select: {
        entryId: true,

        chartEntry: {
          include: {
            chart: {
              select: {
                measurementBasis: true,
              },
            },

            measurements: true,
          },
        },
      },
    },
  },
},
    },
  });

  const productEvidence = products.map((product) => {
  const normalizedSizes =
    loadNormalizedRecommendationSizes({
      productTypes: product.productTypes,

      legacyProductType: product.productType,

      lengthStructure: product.lengthStructure,

      lengthOptions: product.lengthOptions,

      fitProfile: product.fitProfile
        ? {
            intendedFit:
              product.fitProfile.intendedFit,
            stretch:
              product.fitProfile.stretch,
            measurementBasis:
              product.fitProfile.measurementBasis,
          }
        : null,

      productSizes: product.productSizes.map(
        (productSize) => ({
          sizeId: productSize.sizeId,

          size: {
            name: productSize.size.name,
          },

          fitMeasurements:
            productSize.fitMeasurements,

          sizeChartMapping:
            productSize.sizeChartMapping
              ? {
                  chartEntry:
                    productSize.sizeChartMapping
                      .chartEntry,
                }
              : null,
        })
      ),
    });

  const lengthReadiness =
    assessProductLengthReadiness(
      normalizedSizes
    );

  const mappedCount =
    product.productSizes.filter(
      (productSize) =>
        productSize.sizeChartMapping !== null
    ).length;


   const canonicalProductType =
  product.productTypes.length === 1
    ? product.productTypes[0].productType
    : product.productTypes.length === 0
      ? product.productType
      : null;

const isOneSizeProduct =
  canonicalProductType === "HIJAB" ||
  canonicalProductType === "KHIMAR";

const oneSizeDimensionCount =
  isOneSizeProduct
    ? product.fitProfile?.measurements.filter(
        (measurement) => {
          if (
            canonicalProductType === "HIJAB"
          ) {
            return (
              measurement.component === "HIJAB" &&
              (measurement.type ===
                "GARMENT_LENGTH" ||
                measurement.type === "WIDTH")
            );
          }

          return (
            measurement.component === "KHIMAR" &&
            (measurement.type ===
              "GARMENT_LENGTH" ||
              measurement.type ===
                "FRONT_LENGTH" ||
              measurement.type ===
                "BACK_LENGTH" ||
              measurement.type === "WIDTH")
          );
        }
      ).length ?? 0
    : 0;

  return {
  productId: product.id,
  mappedCount,
  sizeCount: product.productSizes.length,
  lengthReadiness,
  isOneSizeProduct,
  oneSizeDimensionCount,
};
});

const productEvidenceById = new Map(
  productEvidence.map((item) => [
    item.productId,
    item,
  ])
);

  const configuredProducts = products.filter(
    (product) => product.fitProfile
  ).length;

  const productsWithSizes = products.filter(
    (product) => product.productSizes.length > 0
  ).length;

  const fullyReadyProducts =
  products.filter((product) => {
    const evidence =
      productEvidenceById.get(product.id);

    if (!evidence) {
  return false;
}

if (evidence.isOneSizeProduct) {
  return (
    product.fitProfile?.measurementBasis ===
      "GARMENT" &&
    evidence.oneSizeDimensionCount > 0
  );
}

if (evidence.sizeCount === 0) {
  return false;
}

    if (
      product.lengthStructure ===
      ProductLengthStructure.LENGTH_BASED_SIZE
    ) {
      return (
        evidence.lengthReadiness.status ===
        "READY"
      );
    }

    return (
      evidence.mappedCount ===
      evidence.sizeCount
    );
  }).length;

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
                Product Fit
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Connect product-level fit characteristics
                and existing catalogue sizes to verified
                brand size charts.
              </p>
            </div>

            <Link
              href="/admin/fit"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              ← Fit &amp; Sizing
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Active products"
              value={products.length}
            />

            <MetricCard
              label="With catalogue sizes"
              value={productsWithSizes}
            />

            <MetricCard
              label="Fit profiles"
              value={configuredProducts}
            />

            <MetricCard
  label="Evidence ready"
  value={fullyReadyProducts}
/>
          </div>
        </section>

        {/* Explanation */}
        <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
            How this works
          </div>

          <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
            Catalogue sizes remain the source of truth
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-500">
            Veilora Fit does not create another set of
            product sizes. It adds fit intelligence to the
            sizes already assigned to each product and maps
            them to verified brand size-chart rows.
          </p>
        </section>

        {/* Product directory */}
        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="border-b border-black/5 px-6 py-5 md:px-8">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              Catalogue
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
              Products
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Configure fit characteristics and size-chart
              mappings product by product.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="px-6 py-16 text-center md:px-8">
              <h3 className="text-lg font-semibold text-black">
                No active products
              </h3>

              <p className="mt-2 text-sm text-neutral-500">
                Active catalogue products will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-[#fdf7f4] text-left">
                  <tr className="text-[10px] uppercase tracking-[0.16em] text-[#a89280]">
                    <th className="px-6 py-4 font-semibold">
                      Product
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Brand
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Type
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Fit profile
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Size evidence
                    </th>

                    <th className="px-6 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {products.map((product) => {
                    const evidence =
  productEvidenceById.get(product.id);

const mappedCount =
  evidence?.mappedCount ?? 0;

const sizeCount =
  evidence?.sizeCount ?? 0;

const isLengthBasedSize =
  product.lengthStructure ===
  ProductLengthStructure.LENGTH_BASED_SIZE;

const evidenceCount = isLengthBasedSize
  ? evidence?.lengthReadiness
      .evidencedSizeCount ?? 0
  : mappedCount;

const evidenceComplete = isLengthBasedSize
  ? evidence?.lengthReadiness
      .hasCompleteEvidence ?? false
  : sizeCount > 0 &&
    mappedCount === sizeCount;
const canonicalProductType =
  product.productTypes.length === 1
    ? product.productTypes[0].productType
    : product.productTypes.length === 0
      ? product.productType
      : null;

      const isOneSizeProduct =
  canonicalProductType === "HIJAB" ||
  canonicalProductType === "KHIMAR";

const oneSizeDimensionCount =
  isOneSizeProduct
    ? product.fitProfile?.measurements.filter(
        (measurement) => {
          if (
            canonicalProductType === "HIJAB"
          ) {
            return (
              measurement.component === "HIJAB" &&
              (measurement.type ===
                "GARMENT_LENGTH" ||
                measurement.type === "WIDTH")
            );
          }

          return (
            measurement.component === "KHIMAR" &&
            (measurement.type ===
              "GARMENT_LENGTH" ||
              measurement.type ===
                "FRONT_LENGTH" ||
              measurement.type ===
                "BACK_LENGTH" ||
              measurement.type === "WIDTH")
          );
        }
      ).length ?? 0
    : 0;

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-neutral-50/60"
                      >
                        <td className="px-6 py-5">
                          <div className="font-medium text-black">
                            {product.title}
                          </div>

                          <div className="mt-1 text-xs text-neutral-400">
                            {product.publishedAt
                              ? "Published"
                              : "Not published"}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-neutral-600">
                          {product.brand.name}
                        </td>

                        <td className="px-6 py-5 text-neutral-600">
                          {formatProductType(
                            canonicalProductType
                            )}
                        </td>

                        <td className="px-6 py-5">
                          {product.fitProfile ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                              Configured
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500">
                              Not configured
                            </span>
                          )}
                        </td>

                       <td className="px-6 py-5">
  {isOneSizeProduct ? (
    <div>
      <div className="text-sm font-medium text-neutral-700">
        {oneSizeDimensionCount > 0
          ? `${oneSizeDimensionCount} ${
              oneSizeDimensionCount === 1
                ? "dimension"
                : "dimensions"
            }`
          : "No dimensions"}
      </div>

      <div className="mt-1 text-xs text-neutral-400">
        One Size
      </div>
    </div>
  ) : sizeCount === 0 ? (
    <span className="text-xs text-neutral-400">
      No catalogue sizes
    </span>
  ) : (
    <div>
      <div className="text-sm font-medium text-neutral-700">
        {evidenceCount} / {sizeCount}
      </div>

      <div className="mt-1 text-xs text-neutral-400">
        {isLengthBasedSize
          ? evidenceComplete
            ? "Length evidence complete"
            : "Length evidence"
          : evidenceComplete
            ? "Fully mapped"
            : "Mapped"}
      </div>
    </div>
  )}
</td>

                        <td className="px-6 py-5 text-right">
                          <Link
                            href={`/admin/fit/products/${product.id}`}
                            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-[#7B2D3E] transition hover:bg-[#fdf7f4]"
                          >
                            Configure →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <div className="text-xs text-white/50">
        {label}
      </div>

      <div className="mt-1 text-xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}
