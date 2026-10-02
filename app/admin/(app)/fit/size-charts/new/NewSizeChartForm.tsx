"use client";

import {
  FitDataSource,
  FitMeasurementBasis,
  FitUnit,
} from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PRODUCT_TYPES } from "@/lib/taxonomy/productTypes";

type BrandOption = {
  id: string;
  name: string;
};

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

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
      {children}

      {required ? (
        <span className="ml-1 text-[#7B2D3E]">*</span>
      ) : null}
    </label>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-xs transition",
        active
          ? "border-[#7B2D3E] bg-[#7B2D3E] text-white shadow-sm"
          : "border-black/10 bg-white text-neutral-700 hover:bg-[#fdf7f4]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function NewSizeChartForm({
  brands,
}: {
  brands: BrandOption[];
}) {
  const router = useRouter();

  const [brandId, setBrandId] = useState("");
  const [name, setName] = useState("");

  const [measurementBasis, setMeasurementBasis] =
    useState<FitMeasurementBasis>(
      FitMeasurementBasis.UNKNOWN
    );

  const [sourceUnit, setSourceUnit] =
    useState<FitUnit>(FitUnit.CM);

  const [source, setSource] =
    useState<FitDataSource>(
      FitDataSource.BRAND_WEBSITE
    );

  const [sourceUrl, setSourceUrl] = useState("");

  const [lastVerifiedAt, setLastVerifiedAt] =
    useState("");

  const [selectedProductTypes, setSelectedProductTypes] =
    useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] =
    useState<string | null>(null);

  function toggleProductType(productType: string) {
    setSelectedProductTypes((current) =>
      current.includes(productType)
        ? current.filter((item) => item !== productType)
        : [...current, productType]
    );
  }

  async function createChart() {
    if (saving) return;

    setSaveError(null);

    if (!brandId) {
      setSaveError("Select a brand.");
      return;
    }

    if (!name.trim()) {
      setSaveError("Enter a chart name.");
      return;
    }

    if (selectedProductTypes.length === 0) {
      setSaveError("Select at least one product type.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/fit/size-charts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            brandId,
            name: name.trim(),
            measurementBasis,
            sourceUnit,
            source,
            sourceUrl: sourceUrl.trim(),
            lastVerifiedAt,
            productTypes: selectedProductTypes,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ??
            `Failed to create size chart (${response.status})`
        );
      }

      router.push(
        `/admin/fit/size-charts/${data.chartId}`
      );

      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to create size chart."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Chart details
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Identify the brand chart and preserve the
              context supplied by its original source.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <FieldLabel required>Brand</FieldLabel>

              <select
                value={brandId}
                onChange={(event) =>
                  setBrandId(event.target.value)
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
              >
                <option value="">Select a brand</option>

                {brands.map((brand) => (
                  <option
                    key={brand.id}
                    value={brand.id}
                  >
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel required>
                Chart name
              </FieldLabel>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="e.g. Women's General"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
              />

              <div className="mt-2 text-xs leading-5 text-neutral-400">
                Use a descriptive internal name such as
                Women&apos;s General, Abayas or Bottoms.
              </div>
            </div>

            <div>
              <FieldLabel required>
                Applies to
              </FieldLabel>

              <div className="flex flex-wrap gap-2">
                {PRODUCT_TYPES.map((productType) => (
                  <Chip
                    key={productType}
                    active={selectedProductTypes.includes(
                      productType
                    )}
                    onClick={() =>
                      toggleProductType(productType)
                    }
                  >
                    {formatProductType(productType)}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Measurement context
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Record what the chart measurements represent
              and how the brand originally presents them.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel required>
                Measurement basis
              </FieldLabel>

              <select
                value={measurementBasis}
                onChange={(event) =>
                  setMeasurementBasis(
                    event.target
                      .value as FitMeasurementBasis
                  )
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
              >
                <option value={FitMeasurementBasis.BODY}>
                  Body measurements
                </option>

                <option
                  value={FitMeasurementBasis.GARMENT}
                >
                  Garment measurements
                </option>

                <option
                  value={FitMeasurementBasis.UNKNOWN}
                >
                  Unknown
                </option>
              </select>

              <div className="mt-2 text-xs leading-5 text-neutral-400">
                Choose Unknown rather than assuming when the
                source does not make this clear.
              </div>
            </div>

            <div>
              <FieldLabel required>
                Source unit
              </FieldLabel>

              <select
                value={sourceUnit}
                onChange={(event) =>
                  setSourceUnit(
                    event.target.value as FitUnit
                  )
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
              >
                <option value={FitUnit.CM}>
                  Centimetres (CM)
                </option>

                <option value={FitUnit.IN}>
                  Inches (IN)
                </option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Source &amp; verification
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Keep provenance so Veilora can identify stale
              or changed sizing information later.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <FieldLabel required>
                Data source
              </FieldLabel>

              <select
                value={source}
                onChange={(event) =>
                  setSource(
                    event.target.value as FitDataSource
                  )
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
              >
                <option
                  value={FitDataSource.BRAND_WEBSITE}
                >
                  Brand website
                </option>

                <option
                  value={FitDataSource.BRAND_PORTAL}
                >
                  Brand portal
                </option>

                <option value={FitDataSource.ADMIN}>
                  Admin
                </option>
              </select>
            </div>

            <div>
              <FieldLabel>Source URL</FieldLabel>

              <input
                type="url"
                value={sourceUrl}
                onChange={(event) =>
                  setSourceUrl(event.target.value)
                }
                placeholder="https://brand.com/pages/size-guide"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20 focus:ring-4 focus:ring-black/5"
              />
            </div>

            <div>
              <FieldLabel>
                Last verified
              </FieldLabel>

              <input
                type="date"
                value={lastVerifiedAt}
                onChange={(event) =>
                  setLastVerifiedAt(event.target.value)
                }
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/5"
              />

              <div className="mt-2 text-xs leading-5 text-neutral-400">
                Date Veilora last confirmed that this chart
                matched the brand&apos;s current sizing
                information.
              </div>
            </div>
          </div>
        </section>
      </div>

      <div>
        <section className="sticky top-24 rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
            New size chart
          </div>

          <h2 className="mt-2 text-lg font-semibold text-black">
            Create chart
          </h2>

          <p className="mt-2 text-sm leading-6 text-neutral-500">
            After creating the chart, you&apos;ll add its
            size rows and measurements.
          </p>

          {saveError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {saveError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={createChart}
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#7B2D3E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#6a2435] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Creating..."
              : "Create size chart"}
          </button>
        </section>
      </div>
    </div>
  );
}