import Link from "next/link";
import { notFound } from "next/navigation";
import ProductFitEditor from "./ProductFitEditor";
import ProductFitMeasurementEditor from "./ProductFitMeasurementEditor";
import ProductLengthEditor from "./ProductLengthEditor";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";
import { assessProductFitReadiness } from "@/lib/fit/admin/productFitReadiness";
import { loadNormalizedRecommendationSizes } from "@/lib/fit/loadRecommendationInput";
import { assessProductLengthReadiness } from "@/lib/fit/admin/productLengthReadiness";

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
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatEnum(value: string | null) {
  if (!value) return "Not set";

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

const SIZE_ORDER = [
  "XXXS",
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "XXXL",
  "3XL",
  "4XL",
  "5XL",
];

function sizeRank(name: string) {
  const normalized = name.trim().toUpperCase();

  const index = SIZE_ORDER.indexOf(normalized);

  return index === -1
    ? Number.MAX_SAFE_INTEGER
    : index;
}

export default async function ProductFitPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdminSession();

  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },

    include: {
       lengthOptions: {
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        label: "asc",
      },
    ],
  },
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

      productSizes: {
        include: {
          size: true,
          fitMeasurements: true,

          sizeChartMapping: {
            include: {
              chartEntry: {
  include: {
    chart: {
      select: {
        id: true,
        name: true,
        measurementBasis: true,
      },
    },

    measurements: {
      select: {
        type: true,
        component: true,
        minValueCm: true,
        maxValueCm: true,
      },
    },
  },
},
            },
          },
        },
      },

      fitProfile: {
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

    sizeMeasurements: {
      orderBy: [
        {
          sizeId: "asc",
        },
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

  if (!product) {
    notFound();
  }
const sortedProductSizes = [...product.productSizes].sort(
  (a, b) => {
    const rankDifference =
      sizeRank(a.size.name) - sizeRank(b.size.name);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return a.size.name.localeCompare(
      b.size.name,
      undefined,
      {
        numeric: true,
        sensitivity: "base",
      }
    );
  }
);

  /*
   * ProductProductType is the canonical Fit taxonomy.
   *
   * product.productType is retained as a fallback for older
   * catalogue records that have not yet been migrated to the
   * multi-type relationship.
   */
  const canonicalProductTypes = [
    ...new Set([
      ...product.productTypes.map(
        (item) => item.productType
      ),

      ...(product.productTypes.length === 0 &&
      product.productType
        ? [product.productType]
        : []),
    ]),
  ];

  const isOneSizeProduct =
  canonicalProductTypes.length === 1 &&
  (canonicalProductTypes[0] === "HIJAB" ||
    canonicalProductTypes[0] === "KHIMAR");

const oneSizeDimensionCount =
  isOneSizeProduct
    ? product.fitProfile?.measurements.filter(
        (measurement) => {
          if (
            canonicalProductTypes[0] === "HIJAB"
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

  /*
   * Only charts:
   * 1. belonging to this product's brand
   * 2. currently active
   * 3. applying to at least one of this product's types
   */
  const compatibleCharts =
    canonicalProductTypes.length > 0
      ? await prisma.brandSizeChart.findMany({
          where: {
            brandId: product.brandId,
            isActive: true,

            productTypes: {
              some: {
                productType: {
                  in: canonicalProductTypes,
                },
              },
            },
          },

          orderBy: {
            name: "asc",
          },

          include: {
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
            },
          },
        })
      : [];

  const mappedSizeCount =
    product.productSizes.filter(
      (productSize) =>
        productSize.sizeChartMapping !== null
    ).length;

  const fullyMapped =
    product.productSizes.length > 0 &&
    mappedSizeCount === product.productSizes.length;
  const isLengthBasedSize =
    product.lengthStructure === "LENGTH_BASED_SIZE";

const normalizedRecommendationSizes =
  loadNormalizedRecommendationSizes({
    productTypes: product.productTypes.map(
      (item) => ({
        productType: item.productType,
      })
    ),

    legacyProductType: product.productType,
    lengthStructure: product.lengthStructure,

    lengthOptions: product.lengthOptions,

    fitProfile: product.fitProfile
      ? {
          intendedFit:
            product.fitProfile.intendedFit,
          stretch: product.fitProfile.stretch,
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
    normalizedRecommendationSizes
  );

const lengthEvidenceSizeCount =
  lengthReadiness.evidencedSizeCount;

const hasCompleteLengthEvidence =
  lengthReadiness.hasCompleteEvidence;

  const catalogueEvidenceLabel = isLengthBasedSize
  ? "Length evidence"
  : "Mapped sizes";

const catalogueEvidenceValue = isLengthBasedSize
  ? `${lengthEvidenceSizeCount} / ${product.productSizes.length}`
  : `${mappedSizeCount} / ${product.productSizes.length}`;

const catalogueEvidenceStatus = isLengthBasedSize
  ? hasCompleteLengthEvidence
    ? "Complete"
    : product.productSizes.length === 0
      ? "No sizes"
      : "Incomplete"
  : fullyMapped
    ? "Complete"
    : product.productSizes.length === 0
      ? "No sizes"
      : "Incomplete";

  const fitReadinessMeasurements =
   product.productSizes.flatMap((productSize) => {
    const mapping = productSize.sizeChartMapping;

    if (!mapping) {
      return [];
    }

    const chartBasis =
      mapping.chartEntry.chart.measurementBasis;

    return mapping.chartEntry.measurements.map(
      (measurement) => ({
        type: measurement.type,
        component: measurement.component,
        basis: chartBasis,
        minValueCm:
          measurement.minValueCm === null
            ? null
            : Number(
                measurement.minValueCm.toString()
              ),
        maxValueCm:
          measurement.maxValueCm === null
            ? null
            : Number(
                measurement.maxValueCm.toString()
              ),
      })
    );
  });

const fitReadiness = assessProductFitReadiness({
  productTypes: canonicalProductTypes,
  catalogueSizeCount: product.productSizes.length,
  mappedSizeCount,
  measurements: fitReadinessMeasurements,

  /*
   * Production currently has no catalogue-backed proof that
   * this product has sufficient designed-ease evidence.
   *
   * Do not infer ease from garment measurements alone.
   */
  hasSufficientDesignedEaseEvidence: false,
});

const displayedReadiness = isLengthBasedSize
  ? {
      label: "Length recommendation readiness",
      status: hasCompleteLengthEvidence
        ? "READY"
        : "NOT_READY",
      message: hasCompleteLengthEvidence
        ? "Every catalogue size has usable garment-length evidence."
        : "Add usable garment-length evidence for every catalogue size before length recommendation is ready.",
    }
  : {
      label: "Recommendation readiness",
      status: fitReadiness.status,
      message:
        fitReadiness.reason === "BODY_AND_GARMENT_EVIDENCE_COMPLETE"
          ? "Required body measurements and additional garment measurements are available."
          : fitReadiness.reason === "BODY_EVIDENCE_COMPLETE"
            ? "Required body measurement evidence is available for size recommendation."
            : fitReadiness.reason === "GARMENT_EVIDENCE_REQUIRES_EASE"
              ? "Garment measurements are available, but body measurements or sufficient designed-ease evidence are still needed."
              : fitReadiness.reason === "DESIGNED_EASE_EVIDENCE_COMPLETE"
                ? "Garment measurements are supported by sufficient designed-ease evidence."
                : fitReadiness.reason === "INCOMPLETE_SIZE_MAPPING"
                  ? "Map every catalogue size before this product is recommendation-ready."
                  : fitReadiness.reason === "NO_CATALOGUE_SIZES"
                    ? "Add catalogue sizes before configuring size recommendation."
                    : fitReadiness.reason === "MISSING_REQUIRED_BODY_EVIDENCE"
                      ? "Required body measurement evidence is missing."
                      : fitReadiness.reason === "MULTIPLE_PRODUCT_TYPES"
                        ? "This product has multiple canonical product types and cannot currently be loaded by the recommendation engine."
                        : fitReadiness.reason === "MISSING_PRODUCT_TYPE"
                          ? "A canonical product type is required before Fit can assess recommendation readiness."
                          : "Conventional size recommendation does not apply to this product type.",
    };

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        {/* Header */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue · Fit &amp; Sizing ·{" "}
                {product.brand.name}
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {product.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
  {isOneSizeProduct
    ? "Configure One Size dimensions and verified product measurement provenance."
    : "Configure product-level fit characteristics and connect existing catalogue sizes to a verified brand size chart."}
</p>
            </div>

            <Link
              href="/admin/fit/products"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              ← Product Fit
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  {isOneSizeProduct ? (
    <>
      <MetricCard
        label="Sizing"
        value="One Size"
      />

      <MetricCard
        label="Dimensions"
        value={
          oneSizeDimensionCount > 0
            ? `${oneSizeDimensionCount} configured`
            : "Not configured"
        }
      />

      <MetricCard
        label="Fit profile"
        value={
          product.fitProfile
            ? "Configured"
            : "Not configured"
        }
      />

      <MetricCard
        label="Measurement basis"
        value={
          product.fitProfile
            ? formatEnum(
                product.fitProfile
                  .measurementBasis
              )
            : "Not configured"
        }
      />
    </>
  ) : (
    <>
      <MetricCard
        label="Catalogue sizes"
        value={product.productSizes.length}
      />

      <MetricCard
        label={catalogueEvidenceLabel}
        value={catalogueEvidenceValue}
      />

      <MetricCard
        label="Fit profile"
        value={
          product.fitProfile
            ? "Configured"
            : "Not configured"
        }
      />

      <MetricCard
        label={
          isLengthBasedSize
            ? "Length readiness"
            : "Mapping"
        }
        value={catalogueEvidenceStatus}
      />
    </>
  )}
</div>
        </section>

        {/* Product context */}
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              Product context
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
              Catalogue information
            </h2>

            <div className="mt-5 space-y-5">
              <DetailRow
                label="Brand"
                value={product.brand.name}
              />

              <div>
                <div className="text-xs font-medium text-neutral-400">
                  Product types
                </div>

                {canonicalProductTypes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canonicalProductTypes.map(
                      (productType) => (
                        <span
                          key={productType}
                          className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600"
                        >
                          {formatProductType(productType)}
                        </span>
                      )
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-sm font-medium text-neutral-700">
                    No product type
                  </div>
                )}
              </div>

              <DetailRow
                label="Publication"
                value={
                  product.publishedAt
                    ? "Published"
                    : "Not published"
                }
              />
            </div>
          </div>

          {/* Current Fit status */}
          <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              Current Fit status
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
              Product intelligence
            </h2>

            {product.fitProfile ? (
              <div className="mt-5 space-y-5">

                <div className="border-t border-black/5 pt-5">
  <div className="text-xs font-medium text-neutral-400">
    {displayedReadiness.label}
  </div>

  <div className="mt-2 flex items-center gap-2">
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        displayedReadiness.status === "ENHANCED" ||
        displayedReadiness.status === "READY"
          ? "bg-emerald-50 text-emerald-800"
          : displayedReadiness.status === "CONDITIONAL"
            ? "bg-amber-50 text-amber-800"
            : displayedReadiness.status === "NOT_APPLICABLE"
              ? "bg-neutral-100 text-neutral-500"
              : "bg-rose-50 text-rose-800",
      ].join(" ")}
    >
      {displayedReadiness.status === "ENHANCED"
        ? "Enhanced"
        : displayedReadiness.status === "READY"
          ? "Ready"
          : displayedReadiness.status === "CONDITIONAL"
            ? "Needs evidence"
            : displayedReadiness.status === "NOT_APPLICABLE"
              ? "Not applicable"
              : "Not ready"}
    </span>
  </div>

  <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
    {displayedReadiness.message}
  </p>
</div>
                {isOneSizeProduct ? (
  <>
    <DetailRow
      label="Sizing"
      value="One Size"
    />

    <DetailRow
      label="Dimensions"
      value={
        oneSizeDimensionCount > 0
          ? `${oneSizeDimensionCount} configured`
          : "Not configured"
      }
    />

    <DetailRow
      label="Measurement basis"
      value={formatEnum(
        product.fitProfile.measurementBasis
      )}
    />
  </>
) : (
  <>
    <DetailRow
      label="Intended fit"
      value={formatEnum(
        product.fitProfile.intendedFit
      )}
    />

    <DetailRow
      label="Stretch"
      value={formatEnum(
        product.fitProfile.stretch
      )}
    />

    <DetailRow
      label="Measurement basis"
      value={formatEnum(
        product.fitProfile.measurementBasis
      )}
    />
  </>
)}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-neutral-50 px-5 py-5">
                <div className="text-sm font-medium text-neutral-700">
                  No Product Fit profile yet
                </div>

                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  Intended fit, stretch and product-specific
                  Fit provenance have not been configured.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Size evidence and mapping preview */}
        {!isOneSizeProduct ? (
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="border-b border-black/5 px-6 py-5 md:px-8">
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
      {isLengthBasedSize
        ? "Size evidence"
        : "Size chart mapping"}
    </div>

    <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
      Existing catalogue sizes
    </h2>

    <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
      {isLengthBasedSize
        ? "Each catalogue size is a purchasable length choice. Explicit garment-length evidence can support recommendation directly; a compatible garment size chart may also provide supporting evidence when available."
        : "These sizes already belong to this product. Veilora Fit will map each one to a row in a compatible brand size chart."}
    </p>
  </div>

          <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[1fr_320px]">
            <div>
              {product.productSizes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-neutral-50 p-6">
                  <div className="text-sm font-medium text-neutral-700">
                    No catalogue sizes
                  </div>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Add sizes through the existing product
                    catalogue editor before configuring Fit.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-black/10">
                  <table className="w-full text-sm">
                    <thead className="bg-[#fdf7f4]">
                      <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-[#a89280]">
                        <th className="px-5 py-4 font-semibold">
                          Product size
                        </th>

                        <th className="px-5 py-4 font-semibold">
  {isLengthBasedSize
    ? "Optional chart mapping"
    : "Current mapping"}
</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black/5">
                      {sortedProductSizes.map(
                        (productSize) => (
                          <tr
                            key={productSize.sizeId}
                          >
                            <td className="px-5 py-4 font-medium text-black">
                              {productSize.size.name}
                            </td>

                            <td className="px-5 py-4 text-neutral-600">
                              {productSize.sizeChartMapping
  ? `${productSize.sizeChartMapping.chartEntry.chart.name} → ${productSize.sizeChartMapping.chartEntry.sizeLabel}`
  : isLengthBasedSize
    ? "No chart mapping"
    : "Not mapped"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Compatible charts */}
            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a89280]">
                Compatible charts
              </div>

              <div className="mt-3 text-2xl font-semibold text-black">
                {compatibleCharts.length}
              </div>

              {compatibleCharts.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {compatibleCharts.map((chart) => (
                    <div
                      key={chart.id}
                      className="rounded-xl border border-black/10 bg-white px-4 py-3"
                    >
                      <div className="text-sm font-medium text-black">
                        {chart.name}
                      </div>

                      <div className="mt-1 text-xs text-neutral-400">
                        {chart.entries.length} size{" "}
                        {chart.entries.length === 1
                          ? "row"
                          : "rows"}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chart.productTypes.map(
                          (item) => (
                            <span
                              key={item.productType}
                              className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] text-neutral-500"
                            >
                              {formatProductType(
                                item.productType
                              )}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-neutral-500">
                  No active size chart currently matches this
                  product&apos;s brand and product type.
                </p>
              )}
            </div>
          </div>
        </section>
        ) : null}

        <ProductFitEditor
  productId={product.id}
  lengthStructure={product.lengthStructure}
  initialProfile={
    product.fitProfile
      ? {
          intendedFit: product.fitProfile.intendedFit,
          stretch: product.fitProfile.stretch,
          measurementBasis:
            product.fitProfile.measurementBasis,
          source: product.fitProfile.source,
          sourceUrl:
            product.fitProfile.sourceUrl ?? "",
          fitNotes:
            product.fitProfile.fitNotes ?? "",
          lastVerifiedAt:
            product.fitProfile.lastVerifiedAt
              ? product.fitProfile.lastVerifiedAt
                  .toISOString()
                  .slice(0, 10)
              : "",
        }
      : null
  }
  productSizes={sortedProductSizes.map(
    (productSize) => ({
      sizeId: productSize.sizeId,
      sizeName: productSize.size.name,
      mappedEntryId:
        productSize.sizeChartMapping?.entryId ??
        null,
    })
  )}
  compatibleCharts={compatibleCharts.map(
    (chart) => ({
      id: chart.id,
      name: chart.name,
      entries: chart.entries.map((entry) => ({
        id: entry.id,
        sizeLabel: entry.sizeLabel,
      })),
    })
  )}
/>

<ProductFitMeasurementEditor
  productId={product.id}
  productTypes={canonicalProductTypes}
  productSizes={sortedProductSizes.map(
    (productSize) => ({
      sizeId: productSize.sizeId,
      sizeName: productSize.size.name,
    })
  )}
  initialMeasurements={
    product.fitProfile?.measurements.map(
      (measurement) => ({
        type: measurement.type,
        component: measurement.component,
        sourceMinValue:
          measurement.sourceMinValue.toString(),
        sourceMaxValue:
          measurement.sourceMaxValue.toString(),
        sourceUnit: measurement.sourceUnit,
      })
    ) ?? []
  }
  initialSizeMeasurements={
    product.fitProfile?.sizeMeasurements.map(
      (measurement) => ({
        sizeId: measurement.sizeId,
        type: measurement.type,
        component: measurement.component,
        measurementBasis: measurement.measurementBasis,
        sourceMinValue:
          measurement.sourceMinValue.toString(),
        sourceMaxValue:
          measurement.sourceMaxValue.toString(),
        sourceUnit: measurement.sourceUnit,
      })
    ) ?? []
  }
/>
<ProductLengthEditor
  productId={product.id}
  initialStructure={product.lengthStructure}
  initialOptions={product.lengthOptions.map(
    (option) => ({
      id: option.id,
      label: option.label,
      sourceValue:
        option.sourceValue?.toString() ?? "",
      sourceUnit: option.sourceUnit,
      source: option.source,
      sourceUrl: option.sourceUrl ?? "",
      sourceNotes: option.sourceNotes ?? "",
      lastVerifiedAt: option.lastVerifiedAt
        ? option.lastVerifiedAt
            .toISOString()
            .slice(0, 10)
        : "",
    })
  )}
/>

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
