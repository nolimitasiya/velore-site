"use client";

import {
  FabricStretch,
  FitDataSource,
  FitMeasurementBasis,
  ProductIntendedFit,
  ProductLengthStructure,
} from "@prisma/client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ProductSize = {
  sizeId: string;
  sizeName: string;
  mappedEntryId: string | null;
};

type ChartEntry = {
  id: string;
  sizeLabel: string;
};

type CompatibleChart = {
  id: string;
  name: string;
  entries: ChartEntry[];
};

type Props = {
  productId: string;
  lengthStructure: ProductLengthStructure | null;
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
  initialProfile,
  productSizes,
  compatibleCharts,
}: Props) {
  const router = useRouter();
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

  const [chartId, setChartId] =
    useState(initialChartId);

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