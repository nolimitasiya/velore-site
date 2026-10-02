import { describe, expect, it } from "vitest";

import {
  assessFitPreference,
} from "@/lib/fit/fitPreferenceAssessment";

describe("Veilora Fit preference assessment", () => {
  it("ranks an eligible fit relationship", () => {
    const result = assessFitPreference({
      relationship: "PRESERVES_DESIGNED_FIT",
      intendedFit: "REGULAR",
      stretch: "NONE",
      preference: "REGULAR",
    });

    expect(result).toEqual({
      status: "RANKED",
      relationship: "PRESERVES_DESIGNED_FIT",
      intendedFit: "REGULAR",
      stretch: "NONE",
      preference: "REGULAR",
      eligibility: {
        status: "ELIGIBLE",
        reason: "ELIGIBLE",
      },
      ranking: {
        rank: 0,
        relationship: "PRESERVES_DESIGNED_FIT",
        preference: "REGULAR",
      },
    });
  });

  it("never ranks when intended fit is missing", () => {
    const result = assessFitPreference({
      relationship: "PRESERVES_DESIGNED_FIT",
      intendedFit: null,
      stretch: "NONE",
      preference: "REGULAR",
    });

    expect(result.status).toBe("NOT_RANKED");
    expect(result.ranking).toBeNull();
    expect(result.eligibility).toEqual({
      status: "INELIGIBLE",
      reason: "MISSING_INTENDED_FIT",
    });
  });

  it("never ranks when stretch is unknown", () => {
    const result = assessFitPreference({
      relationship: "PRESERVES_DESIGNED_FIT",
      intendedFit: "REGULAR",
      stretch: "UNKNOWN",
      preference: "CLOSER",
    });

    expect(result.status).toBe("NOT_RANKED");
    expect(result.ranking).toBeNull();
    expect(result.eligibility).toEqual({
      status: "INELIGIBLE",
      reason: "UNKNOWN_STRETCH",
    });
  });

  it("never ranks an ambiguous fit relationship", () => {
    const result = assessFitPreference({
      relationship:
        "AMBIGUOUS_AROUND_DESIGNED_FIT",
      intendedFit: "OVERSIZED",
      stretch: "NONE",
      preference: "CLOSER",
    });

    expect(result.status).toBe("NOT_RANKED");
    expect(result.ranking).toBeNull();
    expect(result.eligibility).toEqual({
      status: "INELIGIBLE",
      reason: "AMBIGUOUS_FIT_RELATIONSHIP",
    });
  });

  it("uses CLOSER preference only after eligibility succeeds", () => {
    const result = assessFitPreference({
      relationship:
        "PARTIALLY_CLOSER_THAN_DESIGNED",
      intendedFit: "OVERSIZED",
      stretch: "NONE",
      preference: "CLOSER",
    });

    expect(result.status).toBe("RANKED");

    if (result.status !== "RANKED") {
      throw new Error(
        "Expected eligible preference assessment"
      );
    }

    expect(result.ranking.rank).toBe(0);
    expect(result.ranking.preference).toBe(
      "CLOSER"
    );
  });

  it("uses RELAXED preference only after eligibility succeeds", () => {
    const result = assessFitPreference({
      relationship:
        "PARTIALLY_LOOSER_THAN_DESIGNED",
      intendedFit: "SLIM",
      stretch: "LOW",
      preference: "RELAXED",
    });

    expect(result.status).toBe("RANKED");

    if (result.status !== "RANKED") {
      throw new Error(
        "Expected eligible preference assessment"
      );
    }

    expect(result.ranking.rank).toBe(0);
    expect(result.ranking.preference).toBe(
      "RELAXED"
    );
  });

  it("preserves known NONE stretch as valid evidence", () => {
    const result = assessFitPreference({
      relationship: "PRESERVES_DESIGNED_FIT",
      intendedFit: "SLIM",
      stretch: "NONE",
      preference: "REGULAR",
    });

    expect(result.status).toBe("RANKED");

    if (result.status !== "RANKED") {
      throw new Error(
        "Expected eligible preference assessment"
      );
    }

    expect(result.stretch).toBe("NONE");
    expect(result.ranking).not.toBeNull();
  });

  it("preserves the intended product silhouette context without changing it", () => {
    const result = assessFitPreference({
      relationship:
        "PARTIALLY_CLOSER_THAN_DESIGNED",
      intendedFit: "OVERSIZED",
      stretch: "LOW",
      preference: "CLOSER",
    });

    expect(result.status).toBe("RANKED");

    if (result.status !== "RANKED") {
      throw new Error(
        "Expected eligible preference assessment"
      );
    }

    expect(result.intendedFit).toBe(
      "OVERSIZED"
    );

    expect(result.relationship).toBe(
      "PARTIALLY_CLOSER_THAN_DESIGNED"
    );
  });

  it("does not manufacture a rank when multiple eligibility conditions fail", () => {
    const result = assessFitPreference({
      relationship:
        "AMBIGUOUS_AROUND_DESIGNED_FIT",
      intendedFit: null,
      stretch: "UNKNOWN",
      preference: "RELAXED",
    });

    expect(result).toEqual({
      status: "NOT_RANKED",
      relationship:
        "AMBIGUOUS_AROUND_DESIGNED_FIT",
      intendedFit: null,
      stretch: "UNKNOWN",
      preference: "RELAXED",
      eligibility: {
        status: "INELIGIBLE",
        reason: "MISSING_INTENDED_FIT",
      },
      ranking: null,
    });
  });
});