import type {
  FitMeasurementRange,
} from "@/lib/fit/measurements";

export type ActualEaseRange = {
  minEaseCm: number;
  maxEaseCm: number;
};

export type ActualEaseResolution =
  | {
      status: "CALCULATED";
      range: ActualEaseRange;
      shopperValueCm: number;
      garmentRange: FitMeasurementRange;
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      range: null;
    };

export function calculateActualEase(
  shopperValueCm: number,
  garmentRange: FitMeasurementRange
): ActualEaseResolution {
  if (
    !Number.isFinite(shopperValueCm) ||
    shopperValueCm <= 0 ||
    !Number.isFinite(
      garmentRange.minValueCm
    ) ||
    !Number.isFinite(
      garmentRange.maxValueCm
    ) ||
    garmentRange.minValueCm < 0 ||
    garmentRange.maxValueCm <
      garmentRange.minValueCm
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    };
  }

  return {
    status: "CALCULATED",

    range: {
      minEaseCm:
        garmentRange.minValueCm -
        shopperValueCm,

      maxEaseCm:
        garmentRange.maxValueCm -
        shopperValueCm,
    },

    shopperValueCm,
    garmentRange,
  };
}