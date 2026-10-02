import { describe, expect, it } from "vitest";

import {
  compareActualEaseRangeToDesignedEase,
  compareActualEaseToDesignedEase,
} from "@/lib/fit/designedEaseComparison";

describe(
  "Veilora Fit designed ease comparison",
  () => {
    it("identifies actual ease within the designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          18,
          {
            minEaseCm: 16,
            maxEaseCm: 20,
          }
        );

      expect(result).toEqual({
        status: "WITHIN_DESIGNED_RANGE",
        actualEaseCm: 18,
        designedEase: {
          minEaseCm: 16,
          maxEaseCm: 20,
        },
        differenceFromRangeCm: 0,
      });
    });

    it("identifies actual ease below the designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          13,
          {
            minEaseCm: 16,
            maxEaseCm: 20,
          }
        );

      expect(result).toEqual({
        status: "BELOW_DESIGNED_RANGE",
        actualEaseCm: 13,
        designedEase: {
          minEaseCm: 16,
          maxEaseCm: 20,
        },
        differenceFromRangeCm: -3,
      });
    });

    it("identifies actual ease above the designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          24,
          {
            minEaseCm: 16,
            maxEaseCm: 20,
          }
        );

      expect(result).toEqual({
        status: "ABOVE_DESIGNED_RANGE",
        actualEaseCm: 24,
        designedEase: {
          minEaseCm: 16,
          maxEaseCm: 20,
        },
        differenceFromRangeCm: 4,
      });
    });

    it("treats the minimum boundary as within the designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          16,
          {
            minEaseCm: 16,
            maxEaseCm: 20,
          }
        );

      expect(result.status).toBe(
        "WITHIN_DESIGNED_RANGE"
      );

      expect(
        result.differenceFromRangeCm
      ).toBe(0);
    });

    it("treats the maximum boundary as within the designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          20,
          {
            minEaseCm: 16,
            maxEaseCm: 20,
          }
        );

      expect(result.status).toBe(
        "WITHIN_DESIGNED_RANGE"
      );

      expect(
        result.differenceFromRangeCm
      ).toBe(0);
    });

    it("supports negative designed ease", () => {
      const result =
        compareActualEaseToDesignedEase(
          -5,
          {
            minEaseCm: -8,
            maxEaseCm: -2,
          }
        );

      expect(result).toEqual({
        status: "WITHIN_DESIGNED_RANGE",
        actualEaseCm: -5,
        designedEase: {
          minEaseCm: -8,
          maxEaseCm: -2,
        },
        differenceFromRangeCm: 0,
      });
    });

    it("correctly identifies actual ease below a negative designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          -10,
          {
            minEaseCm: -8,
            maxEaseCm: -2,
          }
        );

      expect(result.status).toBe(
        "BELOW_DESIGNED_RANGE"
      );

      expect(
        result.differenceFromRangeCm
      ).toBe(-2);
    });

    it("correctly identifies actual ease above a negative designed range", () => {
      const result =
        compareActualEaseToDesignedEase(
          1,
          {
            minEaseCm: -8,
            maxEaseCm: -2,
          }
        );

      expect(result.status).toBe(
        "ABOVE_DESIGNED_RANGE"
      );

      expect(
        result.differenceFromRangeCm
      ).toBe(3);
    });
    it("identifies an actual ease range entirely below the designed range", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 11,
        maxEaseCm: 13,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "BELOW_DESIGNED_RANGE"
  );
});

it("identifies an actual ease range overlapping the lower boundary", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 14,
        maxEaseCm: 18,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "OVERLAPS_BELOW_DESIGNED_RANGE"
  );
});

it("identifies an actual ease range fully within the designed range", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 17,
        maxEaseCm: 19,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "WITHIN_DESIGNED_RANGE"
  );
});

it("identifies an actual ease range overlapping the upper boundary", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 18,
        maxEaseCm: 22,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "OVERLAPS_ABOVE_DESIGNED_RANGE"
  );
});

it("identifies an actual ease range entirely above the designed range", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 22,
        maxEaseCm: 24,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "ABOVE_DESIGNED_RANGE"
  );
});

it("identifies an actual ease range spanning both sides of the designed range", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 14,
        maxEaseCm: 22,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "SPANS_DESIGNED_RANGE"
  );
});

it("treats touching the lower designed boundary as overlap", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 14,
        maxEaseCm: 16,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "OVERLAPS_BELOW_DESIGNED_RANGE"
  );
});

it("treats touching the upper designed boundary as overlap", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: 20,
        maxEaseCm: 22,
      },
      {
        minEaseCm: 16,
        maxEaseCm: 20,
      }
    );

  expect(result.status).toBe(
    "OVERLAPS_ABOVE_DESIGNED_RANGE"
  );
});

it("supports negative actual and designed ease ranges", () => {
  const result =
    compareActualEaseRangeToDesignedEase(
      {
        minEaseCm: -7,
        maxEaseCm: -4,
      },
      {
        minEaseCm: -8,
        maxEaseCm: -2,
      }
    );

  expect(result.status).toBe(
    "WITHIN_DESIGNED_RANGE"
  );
});
  }
);