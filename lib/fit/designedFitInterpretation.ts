import type {
  DesignedEaseRangeComparison,
  DesignedEaseRangeComparisonStatus,
} from "@/lib/fit/designedEaseComparison";

export type DesignedFitRelationship =
  | "CLOSER_THAN_DESIGNED"
  | "PRESERVES_DESIGNED_FIT"
  | "LOOSER_THAN_DESIGNED"
  | "PARTIALLY_CLOSER_THAN_DESIGNED"
  | "PARTIALLY_LOOSER_THAN_DESIGNED"
  | "AMBIGUOUS_AROUND_DESIGNED_FIT";

export type DesignedFitInterpretation = {
  relationship: DesignedFitRelationship;

  comparisonStatus:
    DesignedEaseRangeComparisonStatus;
};

export function interpretDesignedFit(
  comparison: DesignedEaseRangeComparison
): DesignedFitInterpretation {
  switch (comparison.status) {
    case "BELOW_DESIGNED_RANGE":
      return {
        relationship: "CLOSER_THAN_DESIGNED",
        comparisonStatus: comparison.status,
      };

    case "OVERLAPS_BELOW_DESIGNED_RANGE":
      return {
        relationship:
          "PARTIALLY_CLOSER_THAN_DESIGNED",
        comparisonStatus: comparison.status,
      };

    case "WITHIN_DESIGNED_RANGE":
      return {
        relationship: "PRESERVES_DESIGNED_FIT",
        comparisonStatus: comparison.status,
      };

    case "OVERLAPS_ABOVE_DESIGNED_RANGE":
      return {
        relationship:
          "PARTIALLY_LOOSER_THAN_DESIGNED",
        comparisonStatus: comparison.status,
      };

    case "ABOVE_DESIGNED_RANGE":
      return {
        relationship: "LOOSER_THAN_DESIGNED",
        comparisonStatus: comparison.status,
      };

    case "SPANS_DESIGNED_RANGE":
      return {
        relationship:
          "AMBIGUOUS_AROUND_DESIGNED_FIT",
        comparisonStatus: comparison.status,
      };
  }
}