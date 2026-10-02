import type {
  EasePolicy,
  EaseRange,
} from "@/lib/fit/easePolicy";

export type GarmentEaseAssessmentStatus =
  | "MATCH"
  | "TOO_LITTLE_EASE"
  | "TOO_MUCH_EASE";

export type GarmentEaseAssessment = {
  status: GarmentEaseAssessmentStatus;

  actualEaseCm: EaseRange;
  acceptableEase: EaseRange;
};

type GarmentRange = {
  minValueCm: number;
  maxValueCm: number;
};

export function calculateGarmentEase(
  shopperBodyValueCm: number,
  garmentRange: GarmentRange
): EaseRange {
  /*
   * If the garment itself is expressed as a range,
   * preserve that uncertainty rather than collapsing
   * it into an arbitrary midpoint.
   */
  return {
    minEaseCm:
      garmentRange.minValueCm -
      shopperBodyValueCm,

    maxEaseCm:
      garmentRange.maxValueCm -
      shopperBodyValueCm,
  };
}

export function assessGarmentEase(
  shopperBodyValueCm: number,
  garmentRange: GarmentRange,
  policy: EasePolicy
): GarmentEaseAssessment {
  const actualEase =
    calculateGarmentEase(
      shopperBodyValueCm,
      garmentRange
    );

  /*
   * Entire observed ease range sits below the
   * minimum acceptable policy range.
   */
  if (
    actualEase.maxEaseCm <
    policy.acceptableEase.minEaseCm
  ) {
    return {
      status: "TOO_LITTLE_EASE",
      actualEaseCm: actualEase,
      acceptableEase:
        policy.acceptableEase,
    };
  }

  /*
   * Entire observed ease range sits above the
   * maximum acceptable policy range.
   */
  if (
    actualEase.minEaseCm >
    policy.acceptableEase.maxEaseCm
  ) {
    return {
      status: "TOO_MUCH_EASE",
      actualEaseCm: actualEase,
      acceptableEase:
        policy.acceptableEase,
    };
  }

  /*
   * The observed garment-ease range intersects
   * the acceptable policy range.
   */
  return {
    status: "MATCH",
    actualEaseCm: actualEase,
    acceptableEase:
      policy.acceptableEase,
  };
}