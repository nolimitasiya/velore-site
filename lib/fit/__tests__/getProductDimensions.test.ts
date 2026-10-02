import { describe, expect, it } from "vitest";

import {
  FabricStretch,
  FitDataSource,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
  ProductType,
} from "@prisma/client";

import {
  getProductDimensions,
} from "@/lib/fit/getProductDimensions";

function decimal(value: number) {
  return {
    toString: () => String(value),
  };
}

describe("getProductDimensions", () => {
  it("returns factual Hijab dimensions without shopper data", () => {
    const result = getProductDimensions({
      productTypes: [
        {
          productType: ProductType.HIJAB,
        },
      ],

      legacyProductType: ProductType.HIJAB,

      fitProfile: {
        intendedFit: null,
        stretch: FabricStretch.UNKNOWN,
        measurementBasis:
          FitMeasurementBasis.GARMENT,

        source:
        FitDataSource.BRAND_WEBSITE,

        measurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.HIJAB,

            minValueCm: decimal(180),
            maxValueCm: decimal(180),

            sourceMinValue: decimal(180),
            sourceMaxValue: decimal(180),

            sourceUnit: FitUnit.CM,
          },
          {
            type:
              FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.HIJAB,

            minValueCm: decimal(70),
            maxValueCm: decimal(70),

            sourceMinValue: decimal(70),
            sourceMaxValue: decimal(70),

            sourceUnit: FitUnit.CM,
          },
        ],
      },
    });

    expect(result).toEqual({
  state: "AVAILABLE",
  productType: ProductType.HIJAB,
  source: FitDataSource.BRAND_WEBSITE,

  dimensions: [
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          minValueCm: 180,
          maxValueCm: 180,
        },
        {
          type:
            FitMeasurementType.WIDTH,
          minValueCm: 70,
          maxValueCm: 70,
        },
      ],
    });
  });

  it("supports directional Khimar dimensions", () => {
    const result = getProductDimensions({
      productTypes: [
        {
          productType: ProductType.KHIMAR,
        },
      ],

      legacyProductType: null,

      fitProfile: {
        intendedFit: null,
        stretch: FabricStretch.UNKNOWN,
        measurementBasis:
  FitMeasurementBasis.GARMENT,
source:
  FitDataSource.BRAND_PORTAL,

measurements: [
          {
            type:
              FitMeasurementType.FRONT_LENGTH,
            component:
              FitGarmentComponent.KHIMAR,
            minValueCm: decimal(95),
            maxValueCm: decimal(95),
            sourceMinValue: decimal(95),
            sourceMaxValue: decimal(95),
            sourceUnit: FitUnit.CM,
          },
          {
            type:
              FitMeasurementType.BACK_LENGTH,
            component:
              FitGarmentComponent.KHIMAR,
            minValueCm: decimal(120),
            maxValueCm: decimal(120),
            sourceMinValue: decimal(120),
            sourceMaxValue: decimal(120),
            sourceUnit: FitUnit.CM,
          },
          {
            type:
              FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.KHIMAR,
            minValueCm: decimal(90),
            maxValueCm: decimal(90),
            sourceMinValue: decimal(90),
            sourceMaxValue: decimal(90),
            sourceUnit: FitUnit.CM,
          },
        ],
      },
    });

    expect(result).toEqual({
  state: "AVAILABLE",
  productType: ProductType.KHIMAR,
  source: FitDataSource.BRAND_PORTAL,

  dimensions: [
        {
          type:
            FitMeasurementType.FRONT_LENGTH,
          minValueCm: 95,
          maxValueCm: 95,
        },
        {
          type:
            FitMeasurementType.BACK_LENGTH,
          minValueCm: 120,
          maxValueCm: 120,
        },
        {
          type:
            FitMeasurementType.WIDTH,
          minValueCm: 90,
          maxValueCm: 90,
        },
      ],
    });
  });

  it("fails closed when product-level measurements are not GARMENT evidence", () => {
    const result = getProductDimensions({
      productTypes: [
        {
          productType: ProductType.HIJAB,
        },
      ],

      legacyProductType: ProductType.HIJAB,

      fitProfile: {
        intendedFit: null,
        stretch: FabricStretch.UNKNOWN,
        measurementBasis:
          FitMeasurementBasis.BODY,
          source:
           FitDataSource.BRAND_WEBSITE,


        measurements: [
          {
            type:
              FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.HIJAB,
            minValueCm: decimal(70),
            maxValueCm: decimal(70),
            sourceMinValue: decimal(70),
            sourceMaxValue: decimal(70),
            sourceUnit: FitUnit.CM,
          },
        ],
      },
    });

    expect(result).toEqual({
      state: "PRODUCT_EVIDENCE_UNAVAILABLE",
    });
  });

  it("uses the legacy product type only when no canonical type exists", () => {
    const result = getProductDimensions({
      productTypes: [],

      legacyProductType: ProductType.HIJAB,

      fitProfile: {
        intendedFit: null,
        stretch: FabricStretch.UNKNOWN,
        measurementBasis:
          FitMeasurementBasis.GARMENT,
         source:
           FitDataSource.ADMIN,

        measurements: [
          {
            type:
              FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.HIJAB,
            minValueCm: decimal(70),
            maxValueCm: decimal(70),
            sourceMinValue: decimal(70),
            sourceMaxValue: decimal(70),
            sourceUnit: FitUnit.CM,
          },
        ],
      },
    });

    expect(result.state).toBe("AVAILABLE");

  });

  it("does not use the legacy type to resolve ambiguous canonical product types", () => {
    const result = getProductDimensions({
      productTypes: [
        {
          productType: ProductType.HIJAB,
        },
        {
          productType:
            ProductType.ACCESSORIES,
        },
      ],

      legacyProductType: ProductType.HIJAB,

      fitProfile: {
        intendedFit: null,
        stretch: FabricStretch.UNKNOWN,
        measurementBasis:
          FitMeasurementBasis.GARMENT,
          source:
           FitDataSource.ADMIN,

        measurements: [
          {
            type:
              FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.HIJAB,
            minValueCm: decimal(70),
            maxValueCm: decimal(70),
            sourceMinValue: decimal(70),
            sourceMaxValue: decimal(70),
            sourceUnit: FitUnit.CM,
          },
        ],
      },
    });

    expect(result).toEqual({
      state: "NOT_APPLICABLE",
    });
  });

  it("returns NOT_APPLICABLE for conventional clothing", () => {
    const result = getProductDimensions({
      productTypes: [
        {
          productType: ProductType.DRESS,
        },
      ],

      legacyProductType: ProductType.DRESS,

      fitProfile: null,
    });

    expect(result).toEqual({
      state: "NOT_APPLICABLE",
    });
  });
});
