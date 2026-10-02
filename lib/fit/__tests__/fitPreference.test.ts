import { describe, expect, it } from "vitest";

import {
  rankDesignedFitForPreference,
} from "@/lib/fit/fitPreference";

describe("Veilora Fit shopper fit preference ranking", () => {
  it("REGULAR prefers preserving the designed fit", () => {
    const preserved =
      rankDesignedFitForPreference(
        "PRESERVES_DESIGNED_FIT",
        "REGULAR"
      );

    const closer =
      rankDesignedFitForPreference(
        "PARTIALLY_CLOSER_THAN_DESIGNED",
        "REGULAR"
      );

    const looser =
      rankDesignedFitForPreference(
        "PARTIALLY_LOOSER_THAN_DESIGNED",
        "REGULAR"
      );

    expect(preserved.rank).toBeLessThan(
      closer.rank
    );

    expect(preserved.rank).toBeLessThan(
      looser.rank
    );
  });

  it("CLOSER prefers a partial closer shift over preserving the designed fit", () => {
    const partial =
      rankDesignedFitForPreference(
        "PARTIALLY_CLOSER_THAN_DESIGNED",
        "CLOSER"
      );

    const preserved =
      rankDesignedFitForPreference(
        "PRESERVES_DESIGNED_FIT",
        "CLOSER"
      );

    expect(partial.rank).toBeLessThan(
      preserved.rank
    );
  });

  it("CLOSER does not prefer the most extreme closer relationship", () => {
    const partial =
      rankDesignedFitForPreference(
        "PARTIALLY_CLOSER_THAN_DESIGNED",
        "CLOSER"
      );

    const extreme =
      rankDesignedFitForPreference(
        "CLOSER_THAN_DESIGNED",
        "CLOSER"
      );

    expect(partial.rank).toBeLessThan(
      extreme.rank
    );
  });

  it("RELAXED prefers a partial looser shift over preserving the designed fit", () => {
    const partial =
      rankDesignedFitForPreference(
        "PARTIALLY_LOOSER_THAN_DESIGNED",
        "RELAXED"
      );

    const preserved =
      rankDesignedFitForPreference(
        "PRESERVES_DESIGNED_FIT",
        "RELAXED"
      );

    expect(partial.rank).toBeLessThan(
      preserved.rank
    );
  });

  it("RELAXED does not prefer the most extreme looser relationship", () => {
    const partial =
      rankDesignedFitForPreference(
        "PARTIALLY_LOOSER_THAN_DESIGNED",
        "RELAXED"
      );

    const extreme =
      rankDesignedFitForPreference(
        "LOOSER_THAN_DESIGNED",
        "RELAXED"
      );

    expect(partial.rank).toBeLessThan(
      extreme.rank
    );
  });

  it("CLOSER prefers preserving the designed fit over moving looser", () => {
    const preserved =
      rankDesignedFitForPreference(
        "PRESERVES_DESIGNED_FIT",
        "CLOSER"
      );

    const looser =
      rankDesignedFitForPreference(
        "PARTIALLY_LOOSER_THAN_DESIGNED",
        "CLOSER"
      );

    expect(preserved.rank).toBeLessThan(
      looser.rank
    );
  });

  it("RELAXED prefers preserving the designed fit over moving closer", () => {
    const preserved =
      rankDesignedFitForPreference(
        "PRESERVES_DESIGNED_FIT",
        "RELAXED"
      );

    const closer =
      rankDesignedFitForPreference(
        "PARTIALLY_CLOSER_THAN_DESIGNED",
        "RELAXED"
      );

    expect(preserved.rank).toBeLessThan(
      closer.rank
    );
  });

  it("places ambiguous evidence last for every shopper preference", () => {
    for (const preference of [
      "CLOSER",
      "REGULAR",
      "RELAXED",
    ] as const) {
      const ambiguous =
        rankDesignedFitForPreference(
          "AMBIGUOUS_AROUND_DESIGNED_FIT",
          preference
        );

      const relationships = [
        "CLOSER_THAN_DESIGNED",
        "PARTIALLY_CLOSER_THAN_DESIGNED",
        "PRESERVES_DESIGNED_FIT",
        "PARTIALLY_LOOSER_THAN_DESIGNED",
        "LOOSER_THAN_DESIGNED",
      ] as const;

      for (const relationship of relationships) {
        const other =
          rankDesignedFitForPreference(
            relationship,
            preference
          );

        expect(ambiguous.rank).toBeGreaterThan(
          other.rank
        );
      }
    }
  });

  it("returns the relationship and preference with the rank", () => {
    expect(
      rankDesignedFitForPreference(
        "PRESERVES_DESIGNED_FIT",
        "REGULAR"
      )
    ).toEqual({
      rank: 0,
      relationship: "PRESERVES_DESIGNED_FIT",
      preference: "REGULAR",
    });
  });
});