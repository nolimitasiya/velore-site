import { describe, expect, it } from "vitest";

import {
  FitGarmentComponent,
  FitMeasurementType,
  FitUnit,
  ProductType,
  FitDataSource,
} from "@prisma/client";

import {
  presentProductDimensions,
} from "@/lib/fit/presentation/productDimensionsPresentation";

describe("presentProductDimensions", () => {
  it("presents factual Hijab garment dimensions", () => {
    const result = presentProductDimensions({
      productType: ProductType.HIJAB,
      source: FitDataSource.BRAND_WEBSITE,

      measurements: [
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: 180,
          maxValueCm: 180,

          sourceMinValue: 180,
          sourceMaxValue: 180,
          sourceUnit: FitUnit.CM,
        },
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: 70,
          maxValueCm: 70,

          sourceMinValue: 70,
          sourceMaxValue: 70,
          sourceUnit: FitUnit.CM,
        },
      ],
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
          type: FitMeasurementType.WIDTH,
          minValueCm: 70,
          maxValueCm: 70,
        },
      ],
    });
  });

  it("presents directional Khimar dimensions", () => {
    const result = presentProductDimensions({
      productType: ProductType.KHIMAR,
      source: FitDataSource.BRAND_PORTAL,
      measurements: [
        {
          type:
            FitMeasurementType.FRONT_LENGTH,
          component:
            FitGarmentComponent.KHIMAR,

          minValueCm: 95,
          maxValueCm: 95,

          sourceMinValue: 95,
          sourceMaxValue: 95,
          sourceUnit: FitUnit.CM,
        },
        {
          type:
            FitMeasurementType.BACK_LENGTH,
          component:
            FitGarmentComponent.KHIMAR,

          minValueCm: 120,
          maxValueCm: 120,

          sourceMinValue: 120,
          sourceMaxValue: 120,
          sourceUnit: FitUnit.CM,
        },
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.KHIMAR,

          minValueCm: 90,
          maxValueCm: 90,

          sourceMinValue: 90,
          sourceMaxValue: 90,
          sourceUnit: FitUnit.CM,
        },
      ],
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
          type: FitMeasurementType.WIDTH,
          minValueCm: 90,
          maxValueCm: 90,
        },
      ],
    });
  });

  it("does not expose measurements belonging to the wrong garment component", () => {
    const result = presentProductDimensions({
      productType: ProductType.HIJAB,
      source: FitDataSource.BRAND_WEBSITE,

      measurements: [
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.KHIMAR,

          minValueCm: 70,
          maxValueCm: 70,

          sourceMinValue: 70,
          sourceMaxValue: 70,
          sourceUnit: FitUnit.CM,
        },
      ],
    });

    expect(result).toEqual({
      state:
        "PRODUCT_EVIDENCE_UNAVAILABLE",
    });
  });

  it("ignores unsupported measurement types", () => {
    const result = presentProductDimensions({
      productType: ProductType.HIJAB,
      source: FitDataSource.ADMIN,

      measurements: [
        {
          type: FitMeasurementType.BUST,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: 90,
          maxValueCm: 90,

          sourceMinValue: 90,
          sourceMaxValue: 90,
          sourceUnit: FitUnit.CM,
        },
      ],
    });

    expect(result).toEqual({
      state:
        "PRODUCT_EVIDENCE_UNAVAILABLE",
    });
  });

  it("returns PRODUCT_EVIDENCE_UNAVAILABLE when no factual dimensions exist", () => {
    expect(
      presentProductDimensions({
        productType: ProductType.HIJAB,
        source: null,
        measurements: [],
      })
    ).toEqual({
      state:
        "PRODUCT_EVIDENCE_UNAVAILABLE",
    });
  });

  it("returns NOT_APPLICABLE for conventional clothing products", () => {
    expect(
      presentProductDimensions({
        productType: ProductType.DRESS,
        source: null,
        measurements: [],
      })
    ).toEqual({
      state: "NOT_APPLICABLE",
    });
  });
});