"use client";

import {
  FabricStretch,
  FitDataSource,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementRangeType,
  FitMeasurementType,
  ProductIntendedFit,
  ProductLengthStructure,
  ProductType,
} from "@prisma/client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getProductMeasurementRules } from "@/lib/fit/measurementRules";
import {
  assessProductSizingEvidenceWarnings,
} from "@/lib/fit/admin/productSizingEvidenceWarnings";

type SizeMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  measurementBasis: FitMeasurementBasis | null;
  rangeType: FitMeasurementRangeType;
  minValueCm: number | null;
  maxValueCm: number | null;
};

type ChartMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  rangeType: FitMeasurementRangeType;
  minValueCm: number | null;
  maxValueCm: number | null;
};

type ProductSize = {
  sizeId: string;
  sizeName: string;
  mappedEntryId: string | null;
  fitMeasurements: SizeMeasurement[];
};

type ChartEntry = {
  id: string;
  sizeLabel: string;
  measurements: ChartMeasurement[];
};

type CompatibleChart = {
  id: string;
  name: string;
  measurementBasis: FitMeasurementBasis;
  entries: ChartEntry[];
};

type SizingRequirement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
};

type Props = {
  productId: string;
  lengthStructure: ProductLengthStructure | null;
  productTypes: ProductType[];
  initialComponents: FitGarmentComponent[];
  initialSizingRequirements: SizingRequirement[];
  initialProfile: {
    intendedFit: ProductIntendedFit | null;
    stretch: FabricStretch;
    measurementBasis: FitMeasurementBasis;
    source: FitDataSource | null;
    sourceUrl: string;
    fitNotes: string;
    lastVerifiedAt: string;
  } | null;
  productSizes: ProductSize[];
  compatibleCharts: CompatibleChart[];
};

function formatEnum(value: string) {
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

export default function ProductFitEditor({
  productId,
  lengthStructure,
  productTypes,
  initialComponents,
  initialSizingRequirements,
  initialProfile,
  productSizes,
  compatibleCharts,
}: Props) {
const router = useRouter();
const isSetsProduct =
  productTypes.length === 1 &&
  productTypes[0] === ProductType.SETS;
const isActivewearProduct =
  productTypes.length === 1 &&
  productTypes[0] === ProductType.ACTIVEWEAR;
const isLengthBasedSize =
  lengthStructure ===
  ProductLengthStructure.LENGTH_BASED_SIZE;
const initialChartId = useMemo(() => {
const mappedEntryIds = new Set(
      productSizes
        .map((size) => size.mappedEntryId)
        .filter(Boolean)
    );

    if (mappedEntryIds.size === 0) {
  if (isLengthBasedSize) {
    return "";
  }

  return compatibleCharts.length === 1
    ? compatibleCharts[0].id
    : "";
}

    const chart = compatibleCharts.find((candidate) =>
      candidate.entries.some((entry) =>
        mappedEntryIds.has(entry.id)
      )
    );

    return chart?.id ?? "";
 }, [
  compatibleCharts,
  productSizes,
  isLengthBasedSize,
]);

  const [intendedFit, setIntendedFit] = useState(
    initialProfile?.intendedFit ?? ""
  );

  const [stretch, setStretch] = useState<FabricStretch>(
    initialProfile?.stretch ?? FabricStretch.UNKNOWN
  );

  const [measurementBasis, setMeasurementBasis] =
    useState<FitMeasurementBasis>(
      initialProfile?.measurementBasis ??
        FitMeasurementBasis.UNKNOWN
    );

  const [source, setSource] = useState(
    initialProfile?.source ?? ""
  );

  const [sourceUrl, setSourceUrl] = useState(
    initialProfile?.sourceUrl ?? ""
  );

  const [fitNotes, setFitNotes] = useState(
    initialProfile?.fitNotes ?? ""
  );

  const [lastVerifiedAt, setLastVerifiedAt] = useState(
    initialProfile?.lastVerifiedAt ?? ""
  );

  type FitComposition =
  | "TOP"
  | "TROUSER"
  | "TOP_SKIRT"
  | "TOP_TROUSER"
  | "";

const [fitComposition, setFitComposition] =
  useState<FitComposition>(() => {
    const components = new Set(initialComponents);

    if (
      isActivewearProduct &&
      components.size === 1 &&
      components.has(FitGarmentComponent.TOP)
    ) {
      return "TOP";
    }

    if (
      isActivewearProduct &&
      components.size === 1 &&
      components.has(FitGarmentComponent.TROUSER)
    ) {
      return "TROUSER";
    }

    if (
      components.size === 2 &&
      components.has(FitGarmentComponent.TOP) &&
      components.has(FitGarmentComponent.SKIRT)
    ) {
      return "TOP_SKIRT";
    }

    if (
      components.size === 2 &&
      components.has(FitGarmentComponent.TOP) &&
      components.has(FitGarmentComponent.TROUSER)
    ) {
      return "TOP_TROUSER";
    }

    return "";
  });

  const [chartId, setChartId] =
    useState(initialChartId);

  const [sizingRequirements, setSizingRequirements] =
   useState<SizingRequirement[]>(
    initialSizingRequirements
  );

  const [mappings, setMappings] = useState<
  Record<string, string>
>(() => {
  const initialChart = compatibleCharts.find(
    (chart) => chart.id === initialChartId
  );

  return Object.fromEntries(
    productSizes.map((size) => {
      /*
       * Preserve an existing saved mapping first.
       */
      if (size.mappedEntryId) {
        return [size.sizeId, size.mappedEntryId];
      }

      /*
       * For an unmapped product, automatically match
       * catalogue labels against the selected brand chart.
       *
       * Example:
       * S → S
       * M → M
       * L → L
       */
      const exactMatch = initialChart?.entries.find(
        (entry) =>
          entry.sizeLabel.trim().toLowerCase() ===
          size.sizeName.trim().toLowerCase()
      );

      return [
        size.sizeId,
        exactMatch?.id ?? "",
      ];
    })
  );
});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedChart = compatibleCharts.find(
    (chart) => chart.id === chartId
  );

  function selectChart(nextChartId: string) {
    setChartId(nextChartId);

    const nextChart = compatibleCharts.find(
      (chart) => chart.id === nextChartId
    );

    /*
     * Auto-match labels when possible:
     * S → S, M → M, etc.
     *
     * Admin can still override every row manually.
     */
    const nextMappings = Object.fromEntries(
      productSizes.map((size) => {
        if (!nextChart) {
          return [size.sizeId, ""];
        }

        const exactMatch = nextChart.entries.find(
          (entry) =>
            entry.sizeLabel.trim().toLowerCase() ===
            size.sizeName.trim().toLowerCase()
        );

        return [
          size.sizeId,
          exactMatch?.id ?? "",
        ];
      })
    );

    setMappings(nextMappings);
  }

const fitComponents: FitGarmentComponent[] =
  fitComposition === "TOP"
    ? [FitGarmentComponent.TOP]
    : fitComposition === "TROUSER"
      ? [FitGarmentComponent.TROUSER]
      : fitComposition === "TOP_SKIRT"
        ? [
            FitGarmentComponent.TOP,
            FitGarmentComponent.SKIRT,
          ]
        : fitComposition === "TOP_TROUSER"
          ? [
              FitGarmentComponent.TOP,
              FitGarmentComponent.TROUSER,
            ]
          : [];

   const sizingRule =
  productTypes.length === 1
    ? getProductMeasurementRules(
        productTypes[0],
        fitComponents
      )
    : null;

const allowedSizingRequirements =
  sizingRule?.supportsSizeRecommendation
    ? [
        ...sizingRule.requiredBodyFit,
        ...sizingRule.optionalBodyFit,
      ].flatMap((requirement) =>
        requirement.component
          ? [
              {
                type: requirement.type,
                component: requirement.component,
              },
            ]
          : []
      )
    : [];

  const sizingEvidenceWarnings =
   assessProductSizingEvidenceWarnings({
    productTypes,
    fitComponents,
    explicitRequiredBodyFit: sizingRequirements,
    productMeasurementBasis: measurementBasis,

    sizes: productSizes.map((size) => {
      const mappedEntryId = mappings[size.sizeId];

      const mappedEntry = selectedChart?.entries.find(
        (entry) => entry.id === mappedEntryId
      );

      return {
        sizeId: size.sizeId,
        sizeName: size.sizeName,
        productSizeMeasurements: size.fitMeasurements.map(
  (measurement) => ({
    ...measurement,
    measurementBasis:
      measurement.measurementBasis ?? measurementBasis,
    minValueCm: measurement.minValueCm ?? NaN,
    maxValueCm: measurement.maxValueCm ?? NaN,
  })
),

        mappedChart: mappedEntry && selectedChart
  ? {
      measurementBasis: selectedChart.measurementBasis,
      measurements: mappedEntry.measurements.map(
        (measurement) => ({
          ...measurement,
          minValueCm: measurement.minValueCm ?? NaN,
          maxValueCm: measurement.maxValueCm ?? NaN,
        })
      ),
    }
  : null,
      };
    }),
  });

function isSizingRequirementSelected(
  requirement: SizingRequirement
) {
  return sizingRequirements.some(
    (selected) =>
      selected.type === requirement.type &&
      selected.component === requirement.component
  );
}

function toggleSizingRequirement(
  requirement: SizingRequirement
) {
  setSizingRequirements((current) => {
    const exists = current.some(
      (selected) =>
        selected.type === requirement.type &&
        selected.component === requirement.component
    );

    if (exists) {
      return current.filter(
        (selected) =>
          !(
            selected.type === requirement.type &&
            selected.component === requirement.component
          )
      );
    }

    return [...current, requirement];
  });
}

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/fit/products/${productId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            intendedFit: intendedFit || null,
            stretch,
            measurementBasis,
            source: source || null,
            sourceUrl,
            fitNotes,
            lastVerifiedAt:
              lastVerifiedAt || null,
            fitComponents:
  isSetsProduct || isActivewearProduct
    ? fitComponents
    : [],

sizingRequirements: sizingRequirements.map(
  (requirement) => ({
    type: requirement.type,
    component: requirement.component,
  })
),

chartId: chartId || null,

            mappings: productSizes.map((size) => ({
              sizeId: size.sizeId,
              entryId:
                mappings[size.sizeId] || null,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to save Product Fit."
        );
      }

      setSuccess("Product Fit saved.");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save Product Fit."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-black/5 px-6 py-5 md:px-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
          Configure
        </div>

        <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
          Product Fit
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">
  {isLengthBasedSize
    ? "Store product-level fit characteristics and, when useful, connect catalogue sizes to a compatible brand chart as supporting evidence."
    : "Store product-level fit characteristics and map the product's existing catalogue sizes to a verified brand chart."}
</p>
      </div>

      <div className="space-y-8 p-6 md:p-8">
        {/* Fit characteristics */}
        <div>
          <h3 className="text-base font-semibold text-black">
            Fit characteristics
          </h3>

          {isLengthBasedSize ? (
  <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
    Explicit garment-length measurements can support
    length recommendation without a chart mapping.
    Select a compatible garment chart only when it
    provides useful supporting evidence.
  </p>
) : null}

          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <Field label="Intended fit">
              <select
                value={intendedFit}
                onChange={(event) =>
                  setIntendedFit(event.target.value)
                }
                className={inputClass}
              >
                <option value="">Not set</option>

                {Object.values(ProductIntendedFit).map(
                  (value) => (
                    <option key={value} value={value}>
                      {formatEnum(value)}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Fabric stretch">
              <select
                value={stretch}
                onChange={(event) =>
                  setStretch(
                    event.target.value as FabricStretch
                  )
                }
                className={inputClass}
              >
                {Object.values(FabricStretch).map(
                  (value) => (
                    <option key={value} value={value}>
                      {formatEnum(value)}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Measurement basis">
              <select
                value={measurementBasis}
                onChange={(event) =>
                  setMeasurementBasis(
                    event.target
                      .value as FitMeasurementBasis
                  )
                }
                className={inputClass}
              >
                {Object.values(
                  FitMeasurementBasis
                ).map((value) => (
                  <option key={value} value={value}>
                    {formatEnum(value)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        {isSetsProduct || isActivewearProduct ? (
  <div className="border-t border-black/5 pt-8">
    <h3 className="text-base font-semibold text-black">
      {isSetsProduct
        ? "Set composition"
        : "Activewear composition"}
    </h3>

    <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
      {isSetsProduct
        ? "Define the garment components sold together in this set. Veilora Fit uses this to apply the correct component-specific sizing rules."
        : "Define the garment structure of this activewear product. Veilora Fit uses this to apply the correct component-specific sizing and length rules."}
    </p>

    <div className="mt-4 max-w-xl">
      <Field label="Components">
        <select
          value={fitComposition}
          onChange={(event) =>
            setFitComposition(
              event.target.value as FitComposition
            )
          }
          className={inputClass}
        >
          <option value="">
            Not configured
          </option>

          {isSetsProduct ? (
            <>
              <option value="TOP_SKIRT">
                Top + Skirt
              </option>

              <option value="TOP_TROUSER">
                Top + Trouser
              </option>
            </>
          ) : (
            <>
              <option value="TOP">
                Top
              </option>

              <option value="TROUSER">
                Trouser
              </option>

              <option value="TOP_TROUSER">
                Top + Trouser
              </option>
            </>
          )}
        </select>
      </Field>
    </div>
  </div>
) : null}

{/* Sizing requirements */}
{allowedSizingRequirements.length > 0 ? (
  <div className="border-t border-black/5 pt-8">
    <h3 className="text-base font-semibold text-black">
      Sizing requirements
    </h3>

    <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
      Select the body measurements this brand uses to
      determine the size of this product. Veilora will
      require these measurements before recommending a size.
    </p>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {allowedSizingRequirements.map((requirement) => {
        const checked =
          isSizingRequirementSelected(requirement);

        return (
          <label
            key={`${requirement.component}:${requirement.type}`}
            className={[
              "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
              checked
                ? "border-[#7B2D3E]/30 bg-[#fdf7f4]"
                : "border-black/10 bg-white hover:bg-neutral-50",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                toggleSizingRequirement(requirement)
              }
              className="h-4 w-4 accent-[#7B2D3E]"
            />

            <div>
              <div className="text-sm font-medium text-neutral-800">
                {formatEnum(requirement.type)}
              </div>

              <div className="mt-0.5 text-xs text-neutral-400">
                {formatEnum(requirement.component)}
              </div>
            </div>
          </label>
        );
      })}
    </div>

    {sizingRequirements.length === 0 ? (
      <p className="mt-3 text-xs leading-5 text-neutral-400">
        No product-specific requirements are configured.
        Veilora will use the default sizing requirements for
        this product type.
      </p>
    ) : (
      <p className="mt-3 text-xs leading-5 text-neutral-400">
        Product-specific requirements are configured and will
        override the default sizing requirements for this
        product.
      </p>
    )}
    {sizingEvidenceWarnings.length > 0 ? (
  <div
    role="status"
    className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"
  >
    <h4 className="text-sm font-semibold text-amber-900">
      Incomplete sizing data
    </h4>

    <p className="mt-2 text-sm leading-6 text-amber-800">
      Some catalogue sizes are missing required BODY
      measurement evidence or contain invalid values.
      Review the measurements or update the sizing
      requirements.
    </p>

    <ul className="mt-3 space-y-2">
      {sizingEvidenceWarnings.map((warning) => (
        <li
          key={`${warning.sizeId}:${warning.component}:${warning.type}`}
          className="text-sm text-amber-900"
        >
          <span className="font-semibold">
            Size {warning.sizeName}:
          </span>{" "}
          {warning.reason === "INVALID"
            ? "Invalid"
            : "Missing"}{" "}
          required {formatEnum(warning.type).toLowerCase()}
          {" "}measurement
          {warning.component !== FitGarmentComponent.WHOLE_GARMENT
            ? ` (${formatEnum(warning.component)})`
            : ""}
          .
        </li>
      ))}
    </ul>

    <p className="mt-3 text-xs leading-5 text-amber-700">
      This is an advisory warning. You can still save
      Product Fit, but Veilora may not have sufficient
      evidence to assess the affected sizes reliably.
    </p>
  </div>
) : null}
  </div>
) : null}

        {/* Provenance */}
        <div className="border-t border-black/5 pt-8">
          <h3 className="text-base font-semibold text-black">
            Product Fit provenance
          </h3>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <Field label="Data source">
              <select
                value={source}
                onChange={(event) =>
                  setSource(event.target.value)
                }
                className={inputClass}
              >
                <option value="">Not set</option>

                {Object.values(FitDataSource).map(
                  (value) => (
                    <option key={value} value={value}>
                      {formatEnum(value)}
                    </option>
                  )
                )}
              </select>
            </Field>

            <Field label="Last verified">
              <input
                type="date"
                value={lastVerifiedAt}
                onChange={(event) =>
                  setLastVerifiedAt(
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Source URL">
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(event) =>
                    setSourceUrl(event.target.value)
                  }
                  placeholder="https://..."
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Fit notes">
                <textarea
                  value={fitNotes}
                  onChange={(event) =>
                    setFitNotes(event.target.value)
                  }
                  rows={4}
                  placeholder="Optional product-specific fit notes..."
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="border-t border-black/5 pt-8">
          <h3 className="text-base font-semibold text-black">
            Size chart mapping
          </h3>

          <div className="mt-4 max-w-xl">
            <Field label="Brand size chart">
              <select
                value={chartId}
                onChange={(event) =>
                  selectChart(event.target.value)
                }
                className={inputClass}
              >
                <option value="">
  {isLengthBasedSize
    ? "No size chart — use explicit length evidence"
    : "No size chart"}
</option>

                {compatibleCharts.map((chart) => (
                  <option
                    key={chart.id}
                    value={chart.id}
                  >
                    {chart.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedChart &&
          productSizes.length > 0 ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4]">
                  <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-[#a89280]">
                    <th className="px-5 py-4 font-semibold">
                      Product size
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Brand chart row
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {productSizes.map((size) => (
                    <tr key={size.sizeId}>
                      <td className="px-5 py-4 font-medium text-black">
                        {size.sizeName}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={
                            mappings[size.sizeId] ?? ""
                          }
                          onChange={(event) =>
                            setMappings((current) => ({
                              ...current,
                              [size.sizeId]:
                                event.target.value,
                            }))
                          }
                          className={inputClass}
                        >
                          <option value="">
  {isLengthBasedSize
    ? "No mapping"
    : "Not mapped"}
</option>

                          {selectedChart.entries.map(
                            (entry) => (
                              <option
                                key={entry.id}
                                value={entry.id}
                              >
                                {entry.sizeLabel}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        {/* Save */}
        <div className="flex flex-col gap-4 border-t border-black/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {error ? (
              <p className="text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="text-sm font-medium text-emerald-700">
                {success}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-2xl bg-[#7B2D3E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#692536] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Product Fit"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-medium text-neutral-500">
        {label}
      </div>

      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-[#7B2D3E]/40 focus:ring-2 focus:ring-[#7B2D3E]/10";