import {
  FitGarmentComponent,
  ProductType,
} from "@prisma/client";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getDefaultGarmentComponent,
} from "@/lib/fit/defaultGarmentComponent";

describe("getDefaultGarmentComponent", () => {
  it.each([
    [
      ProductType.DRESS,
      FitGarmentComponent.DRESS,
    ],
    [
      ProductType.ABAYA,
      FitGarmentComponent.ABAYA,
    ],
    [
      ProductType.JILBAB,
      FitGarmentComponent.JILBAB,
    ],
    [
      ProductType.HIJAB,
      FitGarmentComponent.HIJAB,
    ],
    [
      ProductType.KHIMAR,
      FitGarmentComponent.KHIMAR,
    ],
    [
      ProductType.SKIRT,
      FitGarmentComponent.SKIRT,
    ],
    [
      ProductType.TOP,
      FitGarmentComponent.TOP,
    ],
    [
      ProductType.T_SHIRT,
      FitGarmentComponent.TOP,
    ],
    [
      ProductType.PANTS,
      FitGarmentComponent.TROUSER,
    ],
    [
      ProductType.BLAZER,
      FitGarmentComponent.JACKET,
    ],
    [
      ProductType.COATS_JACKETS,
      FitGarmentComponent.JACKET,
    ],
  ])(
    "maps %s to %s for a single-product-type chart",
    (productType, expectedComponent) => {
      expect(
        getDefaultGarmentComponent([
          productType,
        ])
      ).toBe(expectedComponent);
    }
  );

  it("fails closed when the chart has no product type", () => {
    expect(
      getDefaultGarmentComponent([])
    ).toBe(
      FitGarmentComponent.WHOLE_GARMENT
    );
  });

  it("fails closed for a multi-product-type chart", () => {
    expect(
      getDefaultGarmentComponent([
        ProductType.DRESS,
        ProductType.ABAYA,
      ])
    ).toBe(
      FitGarmentComponent.WHOLE_GARMENT
    );
  });

  it("fails closed even when multiple product types currently map to the same component", () => {
    expect(
      getDefaultGarmentComponent([
        ProductType.BLAZER,
        ProductType.COATS_JACKETS,
      ])
    ).toBe(
      FitGarmentComponent.WHOLE_GARMENT
    );
  });

  it("falls back to whole garment for a single product type without a specific component mapping", () => {
    expect(
      getDefaultGarmentComponent([
        ProductType.ACCESSORIES,
      ])
    ).toBe(
      FitGarmentComponent.WHOLE_GARMENT
    );
  });
});