import { describe, expect, it } from "vitest";

import {
  calculateGarmentEase,
  assessGarmentEase,
} from "@/lib/fit/garmentEase";

import type {
  EasePolicy,
} from "@/lib/fit/easePolicy";

import {
  FabricStretch,
  FitMeasurementType,
  ProductIntendedFit,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

const policy: EasePolicy = {
  productType: ProductType.DRESS,
  measurementType:
    FitMeasurementType.BUST,
  intendedFit:
    ProductIntendedFit.REGULAR,
  stretch: FabricStretch.NONE,
  shopperFitPreference:
    ShopperFitPreference.REGULAR,
    provenance: {
  source: "VEILORA_CALIBRATION",
  rationale:
    "Test-only policy used to verify garment-ease mathematics.",
  version: 1,
  reviewedAt: "2026-09-25",
},

  acceptableEase: {
    minEaseCm: 4,
    maxEaseCm: 8,
  },
};

describe("Veilora Fit garment ease", () => {
  it("calculates garment ease as garment measurement minus body measurement", () => {
    const result = calculateGarmentEase(
      90,
      {
        minValueCm: 96,
        maxValueCm: 98,
      }
    );

    expect(result).toEqual({
      minEaseCm: 6,
      maxEaseCm: 8,
    });
  });

  it("matches when actual ease intersects the acceptable policy range", () => {
    const result = assessGarmentEase(
      90,
      {
        minValueCm: 96,
        maxValueCm: 98,
      },
      policy
    );

    expect(result.status).toBe("MATCH");

    expect(result.actualEaseCm).toEqual({
        minEaseCm: 6,
        maxEaseCm: 8,
    });
  });

  it("detects too little ease", () => {
    const result = assessGarmentEase(
      90,
      {
        minValueCm: 91,
        maxValueCm: 93,
      },
      policy
    );

    expect(result.status).toBe(
      "TOO_LITTLE_EASE"
    );
  });

  it("detects too much ease", () => {
    const result = assessGarmentEase(
      90,
      {
        minValueCm: 100,
        maxValueCm: 102,
      },
      policy
    );

    expect(result.status).toBe(
      "TOO_MUCH_EASE"
    );
  });

  it("accepts an actual ease range that only partially overlaps the policy range", () => {
    const result = assessGarmentEase(
      90,
      {
        minValueCm: 92,
        maxValueCm: 96,
      },
      policy
    );

    // Actual ease = 2–6 cm.
    // Policy = 4–8 cm.
    // They overlap from 4–6 cm.
    expect(result.status).toBe("MATCH");
  });

  it("treats exact policy boundaries as acceptable", () => {
    const result = assessGarmentEase(
      90,
      {
        minValueCm: 94,
        maxValueCm: 98,
      },
      policy
    );

    expect(result.status).toBe("MATCH");
  });

    it("calculates negative ease when the garment is smaller than the shopper body measurement", () => {
    const result = calculateGarmentEase(
      100,
      {
        minValueCm: 94,
        maxValueCm: 98,
      }
    );

    expect(result).toEqual({
      minEaseCm: -6,
      maxEaseCm: -2,
    });
  });

  it("accepts negative ease when the applicable policy explicitly allows it", () => {
    const negativeEasePolicy: EasePolicy = {
      ...policy,

      stretch: FabricStretch.HIGH,

      acceptableEase: {
        minEaseCm: -6,
        maxEaseCm: -2,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only policy proving that negative ease can be valid for an applicable stretch construction.",
        version: 1,
        reviewedAt: "2026-09-26",
      },
    };

    const result = assessGarmentEase(
      100,
      {
        minValueCm: 94,
        maxValueCm: 98,
      },
      negativeEasePolicy
    );

    expect(result.status).toBe("MATCH");

    expect(result.actualEaseCm).toEqual({
      minEaseCm: -6,
      maxEaseCm: -2,
    });

    expect(result.acceptableEase).toEqual({
      minEaseCm: -6,
      maxEaseCm: -2,
    });
  });

});
