import { describe, expect, it } from "vitest";

import {
  interpretDesignedFit,
} from "@/lib/fit/designedFitInterpretation";

describe("Veilora Fit designed fit interpretation", () => {
  it("interprets below designed range as closer than designed", () => {
    const result = interpretDesignedFit({
      status: "BELOW_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 11,
        maxEaseCm: 13,
      },
      designedEase: {
        minEaseCm: 16,
        maxEaseCm: 20,
      },
    });

    expect(result).toEqual({
      relationship: "CLOSER_THAN_DESIGNED",
      comparisonStatus: "BELOW_DESIGNED_RANGE",
    });
  });

  it("interprets lower overlap as partially closer than designed", () => {
    const result = interpretDesignedFit({
      status: "OVERLAPS_BELOW_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 14,
        maxEaseCm: 18,
      },
      designedEase: {
        minEaseCm: 16,
        maxEaseCm: 20,
      },
    });

    expect(result).toEqual({
      relationship:
        "PARTIALLY_CLOSER_THAN_DESIGNED",
      comparisonStatus:
        "OVERLAPS_BELOW_DESIGNED_RANGE",
    });
  });

  it("interprets containment as preserving the designed fit", () => {
    const result = interpretDesignedFit({
      status: "WITHIN_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 17,
        maxEaseCm: 19,
      },
      designedEase: {
        minEaseCm: 16,
        maxEaseCm: 20,
      },
    });

    expect(result).toEqual({
      relationship: "PRESERVES_DESIGNED_FIT",
      comparisonStatus: "WITHIN_DESIGNED_RANGE",
    });
  });

  it("interprets upper overlap as partially looser than designed", () => {
    const result = interpretDesignedFit({
      status: "OVERLAPS_ABOVE_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 18,
        maxEaseCm: 22,
      },
      designedEase: {
        minEaseCm: 16,
        maxEaseCm: 20,
      },
    });

    expect(result).toEqual({
      relationship:
        "PARTIALLY_LOOSER_THAN_DESIGNED",
      comparisonStatus:
        "OVERLAPS_ABOVE_DESIGNED_RANGE",
    });
  });

  it("interprets above designed range as looser than designed", () => {
    const result = interpretDesignedFit({
      status: "ABOVE_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 22,
        maxEaseCm: 24,
      },
      designedEase: {
        minEaseCm: 16,
        maxEaseCm: 20,
      },
    });

    expect(result).toEqual({
      relationship: "LOOSER_THAN_DESIGNED",
      comparisonStatus: "ABOVE_DESIGNED_RANGE",
    });
  });

  it("interprets a range spanning the designed range as ambiguous", () => {
    const result = interpretDesignedFit({
      status: "SPANS_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 14,
        maxEaseCm: 22,
      },
      designedEase: {
        minEaseCm: 16,
        maxEaseCm: 20,
      },
    });

    expect(result).toEqual({
      relationship:
        "AMBIGUOUS_AROUND_DESIGNED_FIT",
      comparisonStatus: "SPANS_DESIGNED_RANGE",
    });
  });
});