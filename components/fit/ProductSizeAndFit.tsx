"use client";

import Link from "next/link";
import { useState } from "react";

import type {
  ProductFitPresentation,
} from "@/lib/fit/presentation/productFitPresentation";

import type {
  ProductSizeChartPresentation,
} from "@/lib/fit/presentation/productSizeChartPresentation";
import type {
  ProductLengthPresentation,
} from "@/lib/fit/presentation/productLengthPresentation";

import type {
  ProductDimensionsPresentation,
} from "@/lib/fit/presentation/productDimensionsPresentation";

import {
  sortSizes,
} from "@/lib/sizing/order";
import {
  selectUniqueLengthMatch,
} from "@/lib/fit/presentation/selectUniqueLengthMatch";

type DisplayUnit = "CM" | "IN";

type Props = {
  presentation: ProductFitPresentation;
  lengthPresentation: ProductLengthPresentation | null;
  productDimensions: ProductDimensionsPresentation;
  sizeCharts: ProductSizeChartPresentation[];
  initialUnit: DisplayUnit;
  isOneSizeProduct: boolean;
};
const CM_PER_INCH = 2.54;

function formatMeasurementLabel(
  type: string,
  component: string
) {
  const labels: Record<string, string> = {
    HEIGHT: "Height",
    BUST: "Bust",
    WAIST: "Waist",
    HIP: "Hip",
    SHOULDER_WIDTH: "Shoulder",
    SLEEVE_LENGTH: "Sleeve",
    ARM_LENGTH: "Arm length",
    ARMHOLE: "Armhole",
    INSEAM: "Inseam",
    GARMENT_LENGTH: "Garment length",
    FRONT_LENGTH: "Front length",
    BACK_LENGTH: "Back length",
    TOP_LENGTH: "Top length",
    SKIRT_LENGTH: "Skirt length",
    TROUSER_LENGTH: "Trouser length",
    WIDTH: "Width",
    NECK_OPENING: "Neck opening",
  };

  const label =
    labels[type] ??
    type
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );

  if (
    type === "WAIST" &&
    component === "SKIRT"
  ) {
    return "Skirt waist";
  }

  if (
    type === "FRONT_LENGTH" &&
    component === "SKIRT"
  ) {
    return "Front skirt length";
  }

  return label;
}

function formatNumber(value: number) {
  const rounded =
    Math.round(value * 10) / 10;

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

function formatMeasurementValue(
  minValueCm: number | null,
  maxValueCm: number | null,
  unit: DisplayUnit
) {
  if (
    minValueCm === null &&
    maxValueCm === null
  ) {
    return "—";
  }

  const convert = (value: number) =>
    unit === "CM"
      ? value
      : value / CM_PER_INCH;

  const minValue =
    minValueCm === null
      ? null
      : convert(minValueCm);

  const maxValue =
    maxValueCm === null
      ? null
      : convert(maxValueCm);

  if (
    minValue !== null &&
    maxValue !== null
  ) {
    if (
      Math.abs(minValue - maxValue) <
      0.0001
    ) {
      return formatNumber(minValue);
    }

    return `${formatNumber(
      minValue
    )}–${formatNumber(maxValue)}`;
  }

  return formatNumber(
    minValue ?? maxValue!
  );
}

function formatLengthRange(
  range: {
    min: number;
    max: number;
  },
  unit: DisplayUnit
) {
  if (unit === "IN") {
    const minInches = Math.round(
      range.min / CM_PER_INCH
    );

    const maxInches = Math.round(
      range.max / CM_PER_INCH
    );

    const value =
      minInches === maxInches
        ? String(minInches)
        : `${minInches}–${maxInches}`;

    return `${value} IN`;
  }

  const value = formatMeasurementValue(
    range.min,
    range.max,
    unit
  );

  return `${value} cm`;
}

function formatLengthDifference(
  differenceCm: number,
  unit: DisplayUnit
) {
  const value =
    unit === "CM"
      ? differenceCm
      : differenceCm / CM_PER_INCH;

  const formattedValue =
  unit === "IN"
    ? String(Math.round(Math.abs(value)))
    : formatNumber(Math.abs(value));

return `${formattedValue} ${
  unit === "CM" ? "cm" : "IN"
}`;
}

export default function ProductSizeAndFit({
  presentation,
  lengthPresentation,
  productDimensions,
  sizeCharts,
  initialUnit,
  isOneSizeProduct,
}: Props) {

  const [displayUnit, setDisplayUnit] =
  useState<DisplayUnit>(initialUnit);
  const hasProductDimensions =
  productDimensions.state === "AVAILABLE";

  const sizeAttachedLengthPresentation =
  lengthPresentation?.state === "ASSESSED" &&
  lengthPresentation.structure === "SIZE_ATTACHED"
    ? lengthPresentation
    : null;
    const lengthBasedSizePresentation =
  lengthPresentation?.state === "ASSESSED" &&
  lengthPresentation.structure ===
    "LENGTH_BASED_SIZE"
    ? lengthPresentation
    : null;

/*
 * For LENGTH_BASED_SIZE products the ProductSize itself
 * represents the purchasable length-based choice.
 *
 * A unique MATCH can therefore be surfaced as the
 * shopper's recommended length-based size.
 *
 * Do not choose the "closest" option when there is no
 * exact match, and do not choose arbitrarily when more
 * than one option matches.
 */
const recommendedLengthBasedSize =
  lengthBasedSizePresentation
    ? selectUniqueLengthMatch(
        lengthBasedSizePresentation.sizes
      )
    : null;

const lengthBasedShopperReference =
  lengthBasedSizePresentation?.sizes[0]
    ?.shopperReferenceCm ?? null;

const sortedLengthBasedSizes =
  lengthBasedSizePresentation
    ? [...lengthBasedSizePresentation.sizes].sort(
        (a, b) =>
          sortSizes(
            { slug: a.label },
            { slug: b.label }
          )
      )
    : [];

const recommendedSizeLength =
  presentation.state === "RECOMMENDED" &&
  sizeAttachedLengthPresentation
    ? sizeAttachedLengthPresentation.sizes.find(
        (size) =>
          size.id === presentation.recommendedSize.id
      ) ?? null
    : null;

  const recommendedSizeLengthDifferenceCm =
    recommendedSizeLength
    ? (() => {
  const garmentLength =
          recommendedSizeLength.garmentRangeCm.min;

  const preferredLength =
          recommendedSizeLength.shopperReferenceCm.min;

        return garmentLength - preferredLength;
      })()
    : null;
const shopperLengthReference =
  sizeAttachedLengthPresentation?.sizes[0]
    ?.shopperReferenceCm ?? null;

  const sortedSizeAttachedLengths =
    sizeAttachedLengthPresentation
    ? [
        ...sizeAttachedLengthPresentation.sizes,
      ].sort((a, b) =>
        sortSizes(
          { slug: a.label },
          { slug: b.label }
        )
      )
    : [];
  /*
   * UNAVAILABLE represents an internal/service-side state.
   * Don't expose that as shopper-facing Fit guidance.
   */
 if (
  !isOneSizeProduct &&
  presentation.state === "UNAVAILABLE" &&
  sizeCharts.length === 0
) {
  return null;
}

  return (
    <details
      id="size-and-fit"
      className="group border-t border-black/10"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-sm font-medium text-black [&::-webkit-details-marker]:hidden">
        <span>Size &amp; Fit</span>

        <span
  aria-hidden="true"
  className="text-lg leading-none text-black/40 transition-transform duration-200 group-open:rotate-90"
>
  ›
</span>
      </summary>

      {!lengthBasedSizePresentation &&
  !hasProductDimensions && (
  <div className="px-4 pb-5">
        {presentation.state === "SIGN_IN_REQUIRED" && (
          <div>
            <p className="text-sm font-medium text-black/85">
              Find your fit
            </p>

            <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
              Sign in to get personalised size guidance.
            </p>

            <Link
              href="/account/login?next=%2Faccount%2Ffit"
              className="mt-3 inline-block text-xs font-medium text-black underline underline-offset-4 transition hover:text-black/60"
            >
              Sign in →
            </Link>
          </div>
        )}

        {presentation.state === "FIT_PROFILE_REQUIRED" && (
          <div>
            <p className="text-sm font-medium text-black/85">
              Find your fit
            </p>

            <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
              Add your measurements to get personalised size guidance.
            </p>

            <Link
              href="/account/fit"
              className="mt-3 inline-block text-xs font-medium text-black underline underline-offset-4 transition hover:text-black/60"
            >
              Set up My Fit →
            </Link>
          </div>
        )}

        {presentation.state === "INSUFFICIENT_EVIDENCE" &&
        !lengthBasedSizePresentation && (
        <div>
            <p className="text-sm font-medium text-black/85">
              Size recommendation unavailable
            </p>

            <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
              {sizeCharts.length > 0
              ? "We can show the brand's measurements, but don't yet have enough information to recommend a size confidently."
              : "We don't have enough fit information for this product yet."}
            </p>
          </div>
        )}

        {presentation.state === "NO_SUITABLE_SIZE" && (
          <div>
            <p className="text-sm font-medium text-black/85">
              No suitable size found
            </p>

            <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
              Based on the fit information available, we couldn&apos;t identify a suitable available size.
            </p>
          </div>
        )}

        {presentation.state === "RECOMMENDED" && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">
              Recommended for you
            </p>

            <p className="mt-1 text-2xl font-medium text-black">
              {presentation.recommendedSize.label}
            </p>

            <p className="mt-2 max-w-md text-xs leading-relaxed text-black/50">
              Based on your measurements and fit preference.
            </p>
          </div>
        )}

        {presentation.state === "MULTIPLE_SUITABLE" && (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">
      Your fit
    </p>

    <p className="mt-1 text-sm font-medium text-black/85">
      {presentation.suitableSizes
        .map((size) => size.label)
        .join(" and ")}{" "}
      may both work for you
    </p>

    <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
      We don&apos;t have enough comparable fit information to confidently recommend one over the other.
    </p>

    {!isOneSizeProduct && (
      <Link
        href="/account/fit"
        className="mt-3 inline-block text-xs font-medium text-black underline underline-offset-4 transition hover:text-black/60"
      >
        View My Fit →
      </Link>
    )}
  </div>
)}

        {presentation.state === "NOT_APPLICABLE" && (
  isOneSizeProduct ? (
    <div>
      <p className="text-sm font-medium text-black/85">
        One Size
      </p>

      <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
        Brand dimensions are not available for this product.
      </p>
    </div>
  ) : (
    <p className="max-w-md text-xs leading-relaxed text-black/50">
      Detailed size and fit information for this product will appear here when available.
    </p>
  )
)}
  </div>
)}

{productDimensions.state === "AVAILABLE" && (
  <div className="px-4 pb-5">
    <p className="text-sm font-medium text-black/85">
      One Size
    </p>

    <div className="mt-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/80">
          Dimensions
        </p>

        <div
          className="flex items-center gap-1 text-[11px]"
          aria-label="Measurement unit"
        >
          <button
            type="button"
            onClick={() => setDisplayUnit("CM")}
            aria-pressed={displayUnit === "CM"}
            className={[
              "rounded-full px-2 py-1 transition",
              displayUnit === "CM"
                ? "bg-black text-white"
                : "text-black/45 hover:text-black/70",
            ].join(" ")}
          >
            CM
          </button>

          <button
            type="button"
            onClick={() => setDisplayUnit("IN")}
            aria-pressed={displayUnit === "IN"}
            className={[
              "rounded-full px-2 py-1 transition",
              displayUnit === "IN"
                ? "bg-black text-white"
                : "text-black/45 hover:text-black/70",
            ].join(" ")}
          >
            IN
          </button>
        </div>
      </div>

      <div className="mt-3 divide-y divide-black/5">
        {productDimensions.dimensions.map(
          (dimension) => (
            <div
              key={dimension.type}
              className="flex items-center justify-between gap-6 py-3"
            >
              <span className="text-xs text-black/50">
                {formatMeasurementLabel(
                  dimension.type,
                  productDimensions.productType
                )}
              </span>

              <span className="text-sm font-medium text-black/80">
                {formatMeasurementValue(
                  dimension.minValueCm,
                  dimension.maxValueCm,
                  displayUnit
                )}{" "}
                {displayUnit === "CM"
                  ? "cm"
                  : "in"}
              </span>
            </div>
          )
        )}
      </div>
      {(productDimensions.source === "BRAND_WEBSITE" ||
  productDimensions.source === "BRAND_PORTAL") && (
  <p className="mt-3 text-[10px] leading-relaxed text-black/40">
    Measurements provided by the brand.
  </p>
)}
    </div>
  </div>
)}

{lengthPresentation &&
  lengthPresentation.state !==
    "NOT_APPLICABLE" &&
  lengthPresentation.state !==
    "UNAVAILABLE" && (
    <div
  className={[
    "border-t border-black/10 px-4 pt-5",
    lengthBasedSizePresentation ? "" : "mt-6",
  ].join(" ")}
>
     <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/80">
  Length
</p>

      {lengthPresentation.state ===
        "PREFERENCE_REQUIRED" && (
        <div className="mt-3">
          <p className="text-sm font-medium text-black/85">
            Add your preferred length
          </p>

          <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
            Add your preferred length to My Fit
            to get personalised length guidance
            for dresses, abayas and jilbabs.
          </p>

          <Link
            href="/account/fit"
            className="mt-3 inline-block text-xs font-medium text-black underline underline-offset-4 transition hover:text-black/60"
          >
            Edit My Fit →
          </Link>
        </div>
      )}

      {lengthPresentation.state ===
        "PRODUCT_EVIDENCE_UNAVAILABLE" && (
        <p className="mt-3 max-w-md text-xs leading-relaxed text-black/50">
          Personalised length guidance isn&apos;t
          available for this product yet.
        </p>
      )}

     {sizeAttachedLengthPresentation && (
  <div className="mt-4">
    {shopperLengthReference && (
      <div>
        <p className="text-[11px] text-black/45">
          Your preferred length
        </p>

        <p className="mt-1 text-sm font-medium text-black/80">
          {formatLengthRange(
            shopperLengthReference,
            displayUnit
          )}
        </p>
      </div>
    )}

    <div className="mt-5">
      <div className="grid grid-cols-[1fr_auto] border-b border-black/10 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/40">
          Size
        </p>

        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/40">
          Garment length
        </p>
      </div>

      <div>
        {sortedSizeAttachedLengths.map(
            (size) => {
            const isRecommendedSize =
              presentation.state === "RECOMMENDED" &&
              size.id ===
                presentation.recommendedSize.id;

            return (
              <div
  key={size.id}
  className={[
    "grid grid-cols-[1fr_auto] items-center border-b px-2 py-3 transition-colors last:border-0",

    isRecommendedSize && size.status === "MATCH"
      ? "border-emerald-700/10 bg-emerald-50/60"
      : isRecommendedSize &&
          (size.status === "SHORTER" ||
            size.status === "LONGER")
        ? "border-amber-700/10 bg-amber-50/60"
        : "border-black/5",
  ].join(" ")}
>
               <span
  className={[
    "text-sm",
    isRecommendedSize
      ? "font-medium text-black"
      : "text-black/65",
  ].join(" ")}
>
  {size.label}
</span>

                <span
                  className={[
                    "text-sm",
                    isRecommendedSize
                      ? "font-medium text-black"
                      : "text-black/65",
                  ].join(" ")}
                >
                  {formatLengthRange(
                    size.garmentRangeCm,
                    displayUnit
                  )}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>

    {recommendedSizeLength &&
      recommendedSizeLength.status !== "MATCH" && (
        <div className="mt-4 border-l-2 border-amber-500/40 pl-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800">
  Length note
</p>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-black/55">
            Your recommended size{" "}
            {presentation.state === "RECOMMENDED"
              ? presentation.recommendedSize.label
              : recommendedSizeLength.label}{" "}
            has a garment length of{" "}
            {formatLengthRange(
              recommendedSizeLength.garmentRangeCm,
              displayUnit
            )}
            , which is{" "}
{recommendedSizeLengthDifferenceCm !== null && (
  <span className="font-semibold text-black/75">
    {formatLengthDifference(
      recommendedSizeLengthDifferenceCm,
      displayUnit
    )}{" "}
    {recommendedSizeLength.status === "SHORTER"
      ? "shorter"
      : "longer"}
  </span>
)}{" "}
than your preferred length.
          </p>
        </div>
      )}

    {recommendedSizeLength?.status === "MATCH" && (
      <p className="mt-4 text-xs leading-relaxed text-black/50">
        The garment length of your recommended size
        matches your preferred maxi length.
      </p>
    )}
  </div>
)}

{lengthBasedSizePresentation && (
  <div className="mt-4">
    {lengthBasedShopperReference && (
      <div>
        <p className="text-[11px] text-black/45">
          Your preferred length
        </p>

        <p className="mt-1 text-sm font-medium text-black/80">
          {formatLengthRange(
            lengthBasedShopperReference,
            displayUnit
          )}
        </p>
      </div>
    )}

    {recommendedLengthBasedSize && (
      <div className="mt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/40">
          Recommended for your preferred length
        </p>

        <p className="mt-1 text-2xl font-medium text-black">
          {recommendedLengthBasedSize.label}
        </p>

        <p className="mt-1 max-w-md text-xs leading-relaxed text-black/50">
          This available size matches your preferred
          maxi length.
        </p>
      </div>
    )}

    <div className="mt-5">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-black/10 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/40">
          Size
        </p>

        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-black/40">
          Garment length
        </p>

        <span className="sr-only">
          Length match
        </span>
      </div>

      <div>
        {sortedLengthBasedSizes.map((size) => {
          const isRecommended =
            recommendedLengthBasedSize?.id ===
            size.id;

          return (
            <div
              key={size.id}
              className={[
                "grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-2 py-3 last:border-0",
                isRecommended
                  ? "border-emerald-700/10 bg-emerald-50/60"
                  : "border-black/5",
              ].join(" ")}
            >
              <span
                className={[
                  "text-sm",
                  isRecommended
                    ? "font-medium text-black"
                    : "text-black/65",
                ].join(" ")}
              >
                {size.label}
              </span>

              <span
                className={[
                  "text-sm",
                  isRecommended
                    ? "font-medium text-black"
                    : "text-black/65",
                ].join(" ")}
              >
                {formatLengthRange(
                  size.garmentRangeCm,
                  displayUnit
                )}
              </span>

              <span className="min-w-[48px] text-right text-[11px] font-medium">
                {size.status === "MATCH" ? (
                  <span className="text-emerald-800">
                    Match
                  </span>
                ) : size.status === "SHORTER" ? (
                  <span className="text-black/40">
                    Shorter
                  </span>
                ) : (
                  <span className="text-black/40">
                    Longer
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>

    {!recommendedLengthBasedSize && (
      <p className="mt-4 max-w-md text-xs leading-relaxed text-black/50">
        None of the available lengths exactly match your
        preferred maxi length.
      </p>
    )}
  </div>
)}
      {lengthPresentation.state === "ASSESSED" &&
  lengthPresentation.structure ===
    "INDEPENDENT" && (
    <div className="mt-3">
      {/*
       * Independent length options are separate from
       * conventional sizes. They must never be presented
       * as size-attached measurements.
       */}
      <div className="mb-4">
        <p className="text-[11px] text-black/45">
          Your preferred length
        </p>

        <p className="mt-1 text-sm font-medium text-black/80">
          {formatLengthRange(
            lengthPresentation.options[0]
              .shopperReferenceCm,
            displayUnit
          )}
        </p>
      </div>

      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-black/40">
        Available lengths
      </p>

      <div className="mt-3 space-y-3">
        {lengthPresentation.options.map(
          (option) => (
            <div
  key={option.id}
  className={[
    "rounded-xl border px-3 py-3 transition-colors",
    option.status === "MATCH"
      ? "border-emerald-700/10 bg-emerald-50/60"
      : option.status === "SHORTER" ||
          option.status === "LONGER"
        ? "border-amber-700/10 bg-amber-50/60"
        : "border-black/8",
  ].join(" ")}
>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-black/80">
                    {option.label}
                  </p>

                  <p className="mt-1 text-xs text-black/45">
                    {formatLengthRange(
                      option.garmentRangeCm,
                      displayUnit
                    )}
                  </p>
                </div>

                <p className="text-right text-xs font-medium text-black/70">
                  {option.status === "MATCH"
                    ? "Matches your preferred length ✓"
                    : option.status ===
                        "SHORTER"
                      ? "Shorter than your preferred length"
                      : "Longer than your preferred length"}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )}
    </div>
  )}

      {sizeCharts.length > 0 && (
  <div className="mt-6 border-t border-black/10 px-4 pt-5 pb-1">
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/80">
  Brand Size Chart
</p>

    <div className="mt-1 flex items-center justify-between gap-4">
      <p className="text-[11px] text-black/45">
        {sizeCharts[0].chart.measurementBasis ===
        "GARMENT"
          ? "Garment measurements"
          : sizeCharts[0].chart
                .measurementBasis === "BODY"
            ? "Body measurements"
            : "Measurements"}
      </p>

      <div
  className="flex items-center gap-1 text-[11px]"
  aria-label="Measurement unit"
>
  <button
    type="button"
    onClick={() => setDisplayUnit("CM")}
    aria-pressed={displayUnit === "CM"}
    className={[
      "rounded-full px-2 py-1 transition",
      displayUnit === "CM"
        ? "bg-black text-white"
        : "text-black/45 hover:text-black/70",
    ].join(" ")}
  >
    CM
  </button>

  <button
    type="button"
    onClick={() => setDisplayUnit("IN")}
    aria-pressed={displayUnit === "IN"}
    className={[
      "rounded-full px-2 py-1 transition",
      displayUnit === "IN"
        ? "bg-black text-white"
        : "text-black/45 hover:text-black/70",
    ].join(" ")}
  >
    IN
  </button>
</div>
    </div>

    {sizeCharts.map((sizeChart) => {
      const measurementKeys =
        Array.from(
          new Map(
            sizeChart.entries.flatMap(
              (entry) =>
                entry.measurements.map(
                  (measurement) => [
                    `${measurement.component}:${measurement.type}`,
                    {
                      type: measurement.type,
                      component:
                        measurement.component,
                    },
                  ]
                )
            )
          ).values()
        );

      return (
        <div
          key={sizeChart.chart.id}
          className="mt-4 overflow-x-auto"
        >
          <table className="w-full min-w-[460px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-black/10">
                <th className="whitespace-nowrap py-3 pr-8 text-left font-medium text-black/50">
                  Measurement
                </th>

                {sizeChart.entries.map(
                  (entry) => (
                    <th
                      key={entry.id}
                      className="whitespace-nowrap px-5 py-3 text-center font-medium text-black/80"
                    >
                      {
                        entry.productSize
                          .label
                      }
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {measurementKeys.map(
                ({
                  type,
                  component,
                }) => (
                  <tr
                    key={`${component}:${type}`}
                    className="border-b border-black/5 last:border-0"
                  >
                    <td className="whitespace-nowrap py-3 pr-8 text-black/55">
                      {formatMeasurementLabel(
                        type,
                        component
                      )}
                    </td>

                    {sizeChart.entries.map(
                      (entry) => {
                        const measurement =
                          entry.measurements.find(
                            (candidate) =>
                              candidate.type ===
                                type &&
                              candidate.component ===
                                component
                          );

                        return (
                          <td
                            key={entry.id}
                            className="whitespace-nowrap px-5 py-3 text-center text-black/70"
                          >
                            {measurement
                              ? formatMeasurementValue(
                                  measurement.minValueCm,
                                  measurement.maxValueCm,
                                  displayUnit

                                )
                              : "—"}
                          </td>
                        );
                      }
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      );
    })}

    <p className="mt-3 text-[10px] leading-relaxed text-black/40">
      {displayUnit === "CM"
        ? "Measurements shown in centimetres."
        : "Measurements shown in inches."}
    </p>
  </div>
)}

   {!isOneSizeProduct && (
  <div className="border-t border-black/10 px-4 py-5">
    <Link
      href="/account/fit"
      className="inline-block text-xs font-medium text-black underline underline-offset-4 transition hover:text-black/60"
    >
      View My Fit →
    </Link>
  </div>
)}
    </details>
  );
}
