import type {
  DesignedEaseRange,
} from "@/lib/fit/designedEase";

import type {
  ActualEaseRange,
} from "@/lib/fit/actualEase";

export type DesignedEaseComparisonStatus =
  | "WITHIN_DESIGNED_RANGE"
  | "BELOW_DESIGNED_RANGE"
  | "ABOVE_DESIGNED_RANGE";

export type DesignedEaseRangeComparisonStatus =
  | "WITHIN_DESIGNED_RANGE"
  | "OVERLAPS_BELOW_DESIGNED_RANGE"
  | "OVERLAPS_ABOVE_DESIGNED_RANGE"
  | "SPANS_DESIGNED_RANGE"
  | "BELOW_DESIGNED_RANGE"
  | "ABOVE_DESIGNED_RANGE";

export type DesignedEaseRangeComparison = {
  status: DesignedEaseRangeComparisonStatus;

  actualEase: ActualEaseRange;
  designedEase: DesignedEaseRange;
};

export type DesignedEaseComparison = {
  status: DesignedEaseComparisonStatus;

  actualEaseCm: number;
  designedEase: DesignedEaseRange;

  differenceFromRangeCm: number;
};

export function compareActualEaseToDesignedEase(
  actualEaseCm: number,
  designedEase: DesignedEaseRange
): DesignedEaseComparison {
  if (actualEaseCm < designedEase.minEaseCm) {
    return {
      status: "BELOW_DESIGNED_RANGE",
      actualEaseCm,
      designedEase,
      differenceFromRangeCm:
        actualEaseCm -
        designedEase.minEaseCm,
    };
  }

  if (actualEaseCm > designedEase.maxEaseCm) {
    return {
      status: "ABOVE_DESIGNED_RANGE",
      actualEaseCm,
      designedEase,
      differenceFromRangeCm:
        actualEaseCm -
        designedEase.maxEaseCm,
    };
  }

  return {
    status: "WITHIN_DESIGNED_RANGE",
    actualEaseCm,
    designedEase,
    differenceFromRangeCm: 0,
  };
}

export function compareActualEaseRangeToDesignedEase(
  actualEase: ActualEaseRange,
  designedEase: DesignedEaseRange
): DesignedEaseRangeComparison {
  if (
    actualEase.maxEaseCm <
    designedEase.minEaseCm
  ) {
    return {
      status: "BELOW_DESIGNED_RANGE",
      actualEase,
      designedEase,
    };
  }

    if (
    actualEase.minEaseCm >
    designedEase.maxEaseCm
  ) {
    return {
      status: "ABOVE_DESIGNED_RANGE",
      actualEase,
      designedEase,
    };
  }

  if (
    actualEase.minEaseCm <
      designedEase.minEaseCm &&
    actualEase.maxEaseCm >
      designedEase.maxEaseCm
  ) {
    return {
      status: "SPANS_DESIGNED_RANGE",
      actualEase,
      designedEase,
    };
  }

  if (
    actualEase.minEaseCm <
      designedEase.minEaseCm &&
    actualEase.maxEaseCm <=
      designedEase.maxEaseCm
  ) {
    return {
      status:
        "OVERLAPS_BELOW_DESIGNED_RANGE",
      actualEase,
      designedEase,
    };
  }

  if (
    actualEase.minEaseCm >=
      designedEase.minEaseCm &&
    actualEase.maxEaseCm >
      designedEase.maxEaseCm
  ) {
    return {
      status:
        "OVERLAPS_ABOVE_DESIGNED_RANGE",
      actualEase,
      designedEase,
    };
  }

  return {
    status: "WITHIN_DESIGNED_RANGE",
    actualEase,
    designedEase,
  };
}
