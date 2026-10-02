import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  deriveDesignedEase,
  deriveDesignedEaseFromResolution,
} from "@/lib/fit/designedEase";
import type {
  ResolvedSizeMeasurement,
} from "@/lib/fit/measurements";

function measurement(
  overrides: Partial<ResolvedSizeMeasurement> = {}
): ResolvedSizeMeasurement {
  return {
    type: FitMeasurementType.BUST,
    component:
      FitGarmentComponent.WHOLE_GARMENT,

    range: {
      minValueCm: 88,
      maxValueCm: 92,
    },

    basis: FitMeasurementBasis.BODY,
    source: "BRAND_SIZE_CHART",

    ...overrides,
  };
}

describe("Veilora Fit designed ease", () => {
  it("derives designed ease from matching BODY and GARMENT evidence", () => {
    const body = measurement();

    const garment = measurement({
      range: {
        minValueCm: 108,
        maxValueCm: 108,
      },
      basis: FitMeasurementBasis.GARMENT,
      source: "PRODUCT_SIZE",
    });

    const result =
      deriveDesignedEase(body, garment);

    expect(result.status).toBe("DERIVED");

    if (result.status !== "DERIVED") {
      throw new Error(
        "Expected designed ease to be derived"
      );
    }

    expect(result.evidence.range).toEqual({
      minEaseCm: 16,
      maxEaseCm: 20,
    });

    expect(result.evidence.bodyEvidence)
      .toBe(body);

    expect(result.evidence.garmentEvidence)
      .toBe(garment);
  });

  it("derives designed ease directly from resolved parallel evidence", () => {
  const body = measurement();

  const garment = measurement({
    range: {
      minValueCm: 108,
      maxValueCm: 108,
    },
    basis: FitMeasurementBasis.GARMENT,
    source: "PRODUCT_SIZE",
  });

  const result =
    deriveDesignedEaseFromResolution({
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      body: {
        status: "RESOLVED",
        measurement: body,
      },

      garment: {
        status: "RESOLVED",
        measurement: garment,
      },
    });

  expect(result.status).toBe("DERIVED");

  if (result.status !== "DERIVED") {
    throw new Error(
      "Expected designed ease to be derived"
    );
  }

  expect(result.evidence.range).toEqual({
    minEaseCm: 16,
    maxEaseCm: 20,
  });
});

it("does not derive designed ease when BODY evidence is missing", () => {
  const garment = measurement({
    range: {
      minValueCm: 108,
      maxValueCm: 108,
    },
    basis: FitMeasurementBasis.GARMENT,
  });

  expect(
    deriveDesignedEaseFromResolution({
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      body: {
        status: "MISSING",
        measurement: null,
      },

      garment: {
        status: "RESOLVED",
        measurement: garment,
      },
    })
  ).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    evidence: null,
  });
});

it("does not derive designed ease when GARMENT evidence is invalid", () => {
  const body = measurement();

  expect(
    deriveDesignedEaseFromResolution({
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      body: {
        status: "RESOLVED",
        measurement: body,
      },

      garment: {
        status: "INVALID",
        measurement: null,
        source: "PRODUCT_SIZE",
      },
    })
  ).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    evidence: null,
  });
});

  it("derives the full range when both BODY and GARMENT are ranges", () => {
    const body = measurement({
      range: {
        minValueCm: 88,
        maxValueCm: 92,
      },
    });

    const garment = measurement({
      range: {
        minValueCm: 106,
        maxValueCm: 110,
      },
      basis: FitMeasurementBasis.GARMENT,
    });

    const result =
      deriveDesignedEase(body, garment);

    expect(result.status).toBe("DERIVED");

    if (result.status !== "DERIVED") {
      throw new Error(
        "Expected designed ease to be derived"
      );
    }

    expect(result.evidence.range).toEqual({
      minEaseCm: 14,
      maxEaseCm: 22,
    });
  });

  it("preserves negative designed ease", () => {
    const body = measurement({
      range: {
        minValueCm: 90,
        maxValueCm: 94,
      },
    });

    const garment = measurement({
      range: {
        minValueCm: 86,
        maxValueCm: 88,
      },
      basis: FitMeasurementBasis.GARMENT,
    });

    const result =
      deriveDesignedEase(body, garment);

    expect(result.status).toBe("DERIVED");

    if (result.status !== "DERIVED") {
      throw new Error(
        "Expected designed ease to be derived"
      );
    }

    expect(result.evidence.range).toEqual({
      minEaseCm: -8,
      maxEaseCm: -2,
    });
  });

  it("refuses to derive ease when BODY and GARMENT roles are reversed", () => {
    const body = measurement({
      basis: FitMeasurementBasis.GARMENT,
    });

    const garment = measurement({
      basis: FitMeasurementBasis.BODY,
    });

    expect(
      deriveDesignedEase(body, garment)
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      evidence: null,
    });
  });

  it("refuses to pair different measurement types", () => {
    const body = measurement();

    const garment = measurement({
      type: FitMeasurementType.WAIST,
      range: {
        minValueCm: 108,
        maxValueCm: 108,
      },
      basis: FitMeasurementBasis.GARMENT,
    });

    expect(
      deriveDesignedEase(body, garment)
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      evidence: null,
    });
  });

  it("refuses to pair different garment components", () => {
    const body = measurement({
      component: FitGarmentComponent.TOP,
    });

    const garment = measurement({
      component: FitGarmentComponent.BOTTOM,
      range: {
        minValueCm: 108,
        maxValueCm: 108,
      },
      basis: FitMeasurementBasis.GARMENT,
    });

    expect(
      deriveDesignedEase(body, garment)
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      evidence: null,
    });
  });
});