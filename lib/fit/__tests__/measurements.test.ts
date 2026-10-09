import { describe, expect, it } from "vitest";

import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementRangeType,
  FitMeasurementType,
} from "@prisma/client";

import {
  resolveSizeMeasurement,
  resolveSizeMeasurementEvidence,
  resolveSizeMeasurements,
} from "@/lib/fit/measurements";

describe("Veilora Fit measurement resolution", () => {
  it("prefers product-size evidence over mapped brand-chart evidence", () => {
    const result = resolveSizeMeasurement({
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.WHOLE_GARMENT,

      productMeasurementBasis:
        FitMeasurementBasis.GARMENT,

      productSizeMeasurements: [
        {
  type: FitMeasurementType.BUST,
  component:
    FitGarmentComponent.WHOLE_GARMENT,
  measurementBasis:
    FitMeasurementBasis.GARMENT,
  rangeType:
    FitMeasurementRangeType.RANGE,
  minValueCm: 96,
  maxValueCm: 98,
}
      ],

      mappedChart: {
        measurementBasis:
          FitMeasurementBasis.BODY,

        measurements: [
          {
            type: FitMeasurementType.BUST,
            component:
              FitGarmentComponent.WHOLE_GARMENT,
            rangeType:
              FitMeasurementRangeType.RANGE,
            minValueCm: 88,
            maxValueCm: 92,
          },
        ],
      },
    });

   expect(result).toEqual({
  status: "RESOLVED",

  measurement: {
  type: FitMeasurementType.BUST,
  component:
    FitGarmentComponent.WHOLE_GARMENT,

  range: {
    minValueCm: 96,
    maxValueCm: 98,
  },

  rangeType:
    FitMeasurementRangeType.RANGE,

  basis: FitMeasurementBasis.GARMENT,
  source: "PRODUCT_SIZE",
},
 });
  });
  it("retains BODY and GARMENT evidence as parallel semantic measurements", () => {
  const result =
    resolveSizeMeasurementEvidence({
      type: FitMeasurementType.BUST,

      productMeasurementBasis:
        FitMeasurementBasis.GARMENT,

      productSizeMeasurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,
          measurementBasis:
            FitMeasurementBasis.GARMENT,
          rangeType:
    FitMeasurementRangeType.RANGE,
          minValueCm: 108,
          maxValueCm: 108,
        },
      ],

      mappedChart: {
        measurementBasis:
          FitMeasurementBasis.BODY,

        measurements: [
          {
            type: FitMeasurementType.BUST,
            component:
              FitGarmentComponent.WHOLE_GARMENT,
              rangeType:
    FitMeasurementRangeType.RANGE,

            minValueCm: 88,
            maxValueCm: 92,
          },
        ],
      },
    });

  expect(result.type).toBe(
    FitMeasurementType.BUST
  );

  expect(result.component).toBe(
    FitGarmentComponent.WHOLE_GARMENT
  );

  expect(result.body).toEqual({
    status: "RESOLVED",

    measurement: {
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      range: {
        minValueCm: 88,
        maxValueCm: 92,
      },
      rangeType:
          FitMeasurementRangeType.RANGE,
      basis: FitMeasurementBasis.BODY,
      source: "BRAND_SIZE_CHART",
    },
  });

  expect(result.garment).toEqual({
    status: "RESOLVED",

    measurement: {
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      range: {
        minValueCm: 108,
        maxValueCm: 108,
      },
      rangeType:
    FitMeasurementRangeType.RANGE,
      basis: FitMeasurementBasis.GARMENT,
      source: "PRODUCT_SIZE",
    },
  });
});

it("preserves valid BODY evidence when parallel GARMENT evidence is invalid", () => {
  const result =
    resolveSizeMeasurementEvidence({
      type: FitMeasurementType.BUST,

      productMeasurementBasis:
        FitMeasurementBasis.GARMENT,

      productSizeMeasurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,
           measurementBasis:
             FitMeasurementBasis.GARMENT,
          rangeType:
    FitMeasurementRangeType.RANGE,

          minValueCm: 110,
          maxValueCm: 100,
        },
      ],

      mappedChart: {
        measurementBasis:
          FitMeasurementBasis.BODY,

        measurements: [
          {
            type: FitMeasurementType.BUST,
            component:
              FitGarmentComponent.WHOLE_GARMENT,
            rangeType:
    FitMeasurementRangeType.RANGE,

            minValueCm: 88,
            maxValueCm: 92,
          },
        ],
      },
    });

  expect(result.body.status).toBe(
    "RESOLVED"
  );

  expect(result.garment).toEqual({
    status: "INVALID",
    measurement: null,
    source: "PRODUCT_SIZE",
  });
});

  it("falls back to the mapped brand chart when product-size evidence is absent", () => {
    const result = resolveSizeMeasurement({
      type: FitMeasurementType.WAIST,

      productMeasurementBasis:
        FitMeasurementBasis.GARMENT,

      productSizeMeasurements: [],

      mappedChart: {
        measurementBasis:
          FitMeasurementBasis.BODY,

        measurements: [
          {
            type: FitMeasurementType.WAIST,
            component:
              FitGarmentComponent.WHOLE_GARMENT,
            rangeType:
              FitMeasurementRangeType.RANGE,
            minValueCm: 70,
            maxValueCm: 74,
          },
        ],
      },
    });

    expect(result.status).toBe("RESOLVED");

if (result.status !== "RESOLVED") {
  throw new Error(
    "Expected resolved measurement"
  );
}

expect(result.measurement.source).toBe(
  "BRAND_SIZE_CHART"
);

expect(result.measurement.basis).toBe(
  FitMeasurementBasis.BODY
);

expect(result.measurement.range).toEqual({
  minValueCm: 70,
  maxValueCm: 74,
});
  });

  it("defaults an unspecified component to WHOLE_GARMENT", () => {
    const result = resolveSizeMeasurement({
      type: FitMeasurementType.BUST,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      productSizeMeasurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,
          measurementBasis:
            FitMeasurementBasis.BODY,
          rangeType:
            FitMeasurementRangeType.RANGE,
          minValueCm: 88,
          maxValueCm: 92,
        },
      ],

      mappedChart: null,
    });

    expect(result.status).toBe("RESOLVED");

if (result.status !== "RESOLVED") {
  throw new Error(
    "Expected resolved measurement"
  );
}

expect(result.measurement.component).toBe(
  FitGarmentComponent.WHOLE_GARMENT
);
  });

  it("does not substitute evidence from a different garment component", () => {
    const result = resolveSizeMeasurement({
      type: FitMeasurementType.WAIST,
      component:
        FitGarmentComponent.BOTTOM,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      productSizeMeasurements: [
        {
          type: FitMeasurementType.WAIST,
          component:
            FitGarmentComponent.TOP,
          measurementBasis:
            FitMeasurementBasis.BODY,
          rangeType:
            FitMeasurementRangeType.RANGE,
          minValueCm: 70,
          maxValueCm: 74,
        },
      ],

      mappedChart: null,
    });

    expect(result).toEqual({
      status: "MISSING",
      measurement: null,
    });
  });

  it("rejects invalid ranges", () => {
    const result = resolveSizeMeasurement({
      type: FitMeasurementType.BUST,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      productSizeMeasurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,
          measurementBasis:
            FitMeasurementBasis.BODY,
          rangeType:
            FitMeasurementRangeType.RANGE,
          minValueCm: 100,
          maxValueCm: 90,
        },
      ],

      mappedChart: null,
    });

    expect(result).toEqual({
      status: "INVALID",
      measurement: null,
  source: "PRODUCT_SIZE",
});
  });

  it("resolves multiple requested measurements independently", () => {
    const result = resolveSizeMeasurements(
      {
        productMeasurementBasis:
          FitMeasurementBasis.BODY,

        productSizeMeasurements: [
          {
            type: FitMeasurementType.BUST,
            component:
              FitGarmentComponent.WHOLE_GARMENT,
            measurementBasis:
             FitMeasurementBasis.BODY,
            rangeType:
              FitMeasurementRangeType.RANGE,
            minValueCm: 88,
            maxValueCm: 92,
          },
          {
            type: FitMeasurementType.WAIST,
            component:
              FitGarmentComponent.WHOLE_GARMENT,
            measurementBasis:
            FitMeasurementBasis.BODY,
            rangeType:
              FitMeasurementRangeType.RANGE,
            minValueCm: 70,
            maxValueCm: 74,
          },
        ],

        mappedChart: null,
      },

      [
        {
          type: FitMeasurementType.BUST,
        },
        {
          type: FitMeasurementType.WAIST,
        },
        {
          type: FitMeasurementType.HIP,
        },
      ]
    );

    expect(result).toHaveLength(2);

    expect(
      result.map((measurement) => measurement.type)
    ).toEqual([
      FitMeasurementType.BUST,
      FitMeasurementType.WAIST,
    ]);
  });

  it("does not fall back to the brand chart when matching product-size evidence exists but is invalid", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    productSizeMeasurements: [
      {
        type: FitMeasurementType.BUST,
        component:
          FitGarmentComponent.WHOLE_GARMENT,
        measurementBasis:
          FitMeasurementBasis.GARMENT,

        rangeType:
          FitMeasurementRangeType.RANGE,
        minValueCm: 100,
        maxValueCm: 90,
      },
    ],

    mappedChart: {
      measurementBasis:
        FitMeasurementBasis.GARMENT,

      measurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,

          rangeType:
            FitMeasurementRangeType.RANGE,
          minValueCm: 106,
          maxValueCm: 108,
        },
      ],
    },
  });

  expect(result).toEqual({
    status: "INVALID",
    measurement: null,
    source: "PRODUCT_SIZE",
  });
});

it("resolves GARMENT evidence independently when BODY evidence also exists", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,
    basis: FitMeasurementBasis.GARMENT,

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    productSizeMeasurements: [
      {
        type: FitMeasurementType.BUST,
        component:
          FitGarmentComponent.WHOLE_GARMENT,
        measurementBasis:
          FitMeasurementBasis.GARMENT,
        rangeType:
          FitMeasurementRangeType.RANGE,
        minValueCm: 108,
        maxValueCm: 108,
      },
    ],

    mappedChart: {
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,

          rangeType:
            FitMeasurementRangeType.RANGE,
          minValueCm: 88,
          maxValueCm: 92,
        },
      ],
    },
  });

  expect(result).toEqual({
    status: "RESOLVED",

    measurement: {
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      range: {
        minValueCm: 108,
        maxValueCm: 108,
      },

      rangeType:
        FitMeasurementRangeType.RANGE,

      basis: FitMeasurementBasis.GARMENT,
      source: "PRODUCT_SIZE",
    },
  });
});

it("resolves BODY evidence independently when GARMENT evidence also exists", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,
    basis: FitMeasurementBasis.BODY,

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    productSizeMeasurements: [
      {
        type: FitMeasurementType.BUST,
        component:
          FitGarmentComponent.WHOLE_GARMENT,
        measurementBasis:
          FitMeasurementBasis.GARMENT,
        rangeType:
          FitMeasurementRangeType.RANGE,
        minValueCm: 108,
        maxValueCm: 108,
      },
    ],

    mappedChart: {
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.WHOLE_GARMENT,

          rangeType:
            FitMeasurementRangeType.RANGE,
          minValueCm: 88,
          maxValueCm: 92,
        },
      ],
    },
  });

  expect(result).toEqual({
    status: "RESOLVED",

    measurement: {
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.WHOLE_GARMENT,

      range: {
        minValueCm: 88,
        maxValueCm: 92,
      },

      rangeType:
        FitMeasurementRangeType.RANGE,

      basis: FitMeasurementBasis.BODY,
      source: "BRAND_SIZE_CHART",
    },
  });
});

it("resolves BODY UPPER_BOUND evidence without a minimum", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,
    basis: FitMeasurementBasis.BODY,
    productMeasurementBasis: FitMeasurementBasis.BODY,
    productSizeMeasurements: [
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.WHOLE_GARMENT,
        measurementBasis: FitMeasurementBasis.BODY,
        rangeType: FitMeasurementRangeType.UPPER_BOUND,
        minValueCm: NaN,
        maxValueCm: 96,
      },
    ],
    mappedChart: null,
  });

  expect(result.status).toBe("RESOLVED");

  if (result.status !== "RESOLVED") {
    throw new Error("Expected resolved UPPER_BOUND measurement");
  }

  expect(result.measurement.rangeType).toBe(
    FitMeasurementRangeType.UPPER_BOUND
  );
  expect(result.measurement.range.maxValueCm).toBe(96);
});

it("rejects UPPER_BOUND evidence without a valid maximum", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,
    basis: FitMeasurementBasis.BODY,
    productMeasurementBasis: FitMeasurementBasis.BODY,
    productSizeMeasurements: [
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.WHOLE_GARMENT,
        measurementBasis: FitMeasurementBasis.BODY,
        rangeType: FitMeasurementRangeType.UPPER_BOUND,
        minValueCm: NaN,
        maxValueCm: NaN,
      },
    ],
    mappedChart: null,
  });

  expect(result).toEqual({
    status: "INVALID",
    measurement: null,
    source: "PRODUCT_SIZE",
  });
});

it("rejects RANGE evidence without a minimum", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,
    basis: FitMeasurementBasis.BODY,
    productMeasurementBasis: FitMeasurementBasis.BODY,
    productSizeMeasurements: [
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.WHOLE_GARMENT,
        measurementBasis: FitMeasurementBasis.BODY,
        rangeType: FitMeasurementRangeType.RANGE,
        minValueCm: NaN,
        maxValueCm: 96,
      },
    ],
    mappedChart: null,
  });

  expect(result).toEqual({
    status: "INVALID",
    measurement: null,
    source: "PRODUCT_SIZE",
  });
});

it("resolves mapped BODY chart UPPER_BOUND evidence", () => {
  const result = resolveSizeMeasurement({
    type: FitMeasurementType.BUST,
    basis: FitMeasurementBasis.BODY,
    productMeasurementBasis: FitMeasurementBasis.GARMENT,
    productSizeMeasurements: [],
    mappedChart: {
      measurementBasis: FitMeasurementBasis.BODY,
      measurements: [
        {
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.WHOLE_GARMENT,
          rangeType: FitMeasurementRangeType.UPPER_BOUND,
          minValueCm: NaN,
          maxValueCm: 96,
        },
      ],
    },
  });

  expect(result.status).toBe("RESOLVED");

  if (result.status !== "RESOLVED") {
    throw new Error("Expected resolved chart UPPER_BOUND measurement");
  }

  expect(result.measurement.source).toBe("BRAND_SIZE_CHART");
  expect(result.measurement.rangeType).toBe(
    FitMeasurementRangeType.UPPER_BOUND
  );
  expect(result.measurement.range.maxValueCm).toBe(96);
});

});
