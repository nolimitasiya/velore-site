export type DisplayUnit = "CM" | "IN";

export type MeasurementRangeType =
  | "RANGE"
  | "UPPER_BOUND";

const CM_PER_INCH = 2.54;

function formatNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;

  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

export function formatMeasurementValue(
  minValueCm: number | null,
  maxValueCm: number | null,
  unit: DisplayUnit,
  rangeType: MeasurementRangeType = "RANGE"
): string {
  const validMin =
    minValueCm !== null &&
    Number.isFinite(minValueCm) &&
    minValueCm >= 0;

  const validMax =
    maxValueCm !== null &&
    Number.isFinite(maxValueCm) &&
    maxValueCm >= 0;

  const convert = (value: number) =>
    unit === "CM"
      ? value
      : value / CM_PER_INCH;

  if (rangeType === "UPPER_BOUND") {
    if (!validMax) {
      return "—";
    }

    return `Up to ${formatNumber(
      convert(maxValueCm!)
    )}`;
  }

  if (
    !validMin ||
    !validMax ||
    minValueCm! > maxValueCm!
  ) {
    return "—";
  }

  const minValue = convert(minValueCm!);
  const maxValue = convert(maxValueCm!);

  if (Math.abs(minValue - maxValue) < 0.0001) {
    return formatNumber(minValue);
  }

  return `${formatNumber(minValue)}–${formatNumber(maxValue)}`;
}