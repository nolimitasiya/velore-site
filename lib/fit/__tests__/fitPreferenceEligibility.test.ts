import { describe, expect, it } from "vitest";

import {
  assessFitPreferenceEligibility,
} from "@/lib/fit/fitPreferenceEligibility";

describe("Veilora Fit preference eligibility", () => {
  it("allows a known intended fit with known no-stretch evidence", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "PRESERVES_DESIGNED_FIT",
        intendedFit: "REGULAR",
        stretch: "NONE",
      });

    expect(result).toEqual({
      status: "ELIGIBLE",
      reason: "ELIGIBLE",
    });
  });

  it("allows known stretch evidence", () => {
    for (const stretch of [
      "LOW",
      "MEDIUM",
      "HIGH",
    ] as const) {
      const result =
        assessFitPreferenceEligibility({
          relationship:
            "PRESERVES_DESIGNED_FIT",
          intendedFit: "REGULAR",
          stretch,
        });

      expect(result).toEqual({
        status: "ELIGIBLE",
        reason: "ELIGIBLE",
      });
    }
  });

  it("rejects missing intended fit", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "PRESERVES_DESIGNED_FIT",
        intendedFit: null,
        stretch: "NONE",
      });

    expect(result).toEqual({
      status: "INELIGIBLE",
      reason: "MISSING_INTENDED_FIT",
    });
  });

  it("rejects unknown stretch", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "PRESERVES_DESIGNED_FIT",
        intendedFit: "REGULAR",
        stretch: "UNKNOWN",
      });

    expect(result).toEqual({
      status: "INELIGIBLE",
      reason: "UNKNOWN_STRETCH",
    });
  });

  it("rejects an ambiguous designed-fit relationship", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "AMBIGUOUS_AROUND_DESIGNED_FIT",
        intendedFit: "REGULAR",
        stretch: "NONE",
      });

    expect(result).toEqual({
      status: "INELIGIBLE",
      reason: "AMBIGUOUS_FIT_RELATIONSHIP",
    });
  });

  it("accepts every known intended-fit value", () => {
    for (const intendedFit of [
      "SLIM",
      "REGULAR",
      "RELAXED",
      "OVERSIZED",
    ] as const) {
      const result =
        assessFitPreferenceEligibility({
          relationship:
            "PRESERVES_DESIGNED_FIT",
          intendedFit,
          stretch: "NONE",
        });

      expect(result.status).toBe(
        "ELIGIBLE"
      );
    }
  });

  it("allows closer-than-designed evidence when the semantic context is known", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "CLOSER_THAN_DESIGNED",
        intendedFit: "OVERSIZED",
        stretch: "NONE",
      });

    expect(result.status).toBe(
      "ELIGIBLE"
    );
  });

  it("allows looser-than-designed evidence when the semantic context is known", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "LOOSER_THAN_DESIGNED",
        intendedFit: "SLIM",
        stretch: "LOW",
      });

    expect(result.status).toBe(
      "ELIGIBLE"
    );
  });

  it("prioritizes missing intended fit when multiple semantic inputs are unresolved", () => {
    const result =
      assessFitPreferenceEligibility({
        relationship:
          "AMBIGUOUS_AROUND_DESIGNED_FIT",
        intendedFit: null,
        stretch: "UNKNOWN",
      });

    expect(result).toEqual({
      status: "INELIGIBLE",
      reason: "MISSING_INTENDED_FIT",
    });
  });
});