import { describe, expect, it } from "vitest";
import {
  FitGarmentComponent,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

import { getProductMeasurementRules } from "../measurementRules";

describe("getProductMeasurementRules", () => {
  it("preserves ordinary product rules without fit components", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.PANTS
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toEqual([
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);
  });
  it("resolves standalone top measurements to the TOP component", () => {
    const rules =
    getProductMeasurementRules(
      ProductType.TOP
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.TOP,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.WAIST,
      component: FitGarmentComponent.TOP,
    },
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.TOP,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.TOP_LENGTH,
      component: FitGarmentComponent.TOP,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.TOP,
    },
  ]);
});
it("resolves hoodie and sweatshirt measurements to the TOP component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.HOODIE_SWEATSHIRT
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.TOP,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.TOP,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.TOP_LENGTH,
      component: FitGarmentComponent.TOP,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.TOP,
    },
  ]);
});

it("resolves t-shirt measurements to the TOP component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.T_SHIRT
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.TOP,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.TOP,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.TOP_LENGTH,
      component: FitGarmentComponent.TOP,
    },
  ]);
});

it("resolves blazer measurements to the JACKET component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.BLAZER
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.JACKET,
    },
  ]);

  expect(rules.optionalBodyFit).toEqual([
  {
    type: FitMeasurementType.WAIST,
    component: FitGarmentComponent.JACKET,
  },
  {
    type: FitMeasurementType.HIP,
    component: FitGarmentComponent.JACKET,
  },
  {
    type: FitMeasurementType.SHOULDER_WIDTH,
    component: FitGarmentComponent.JACKET,
  },
]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.GARMENT_LENGTH,
      component: FitGarmentComponent.JACKET,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.JACKET,
    },
  ]);
});

it("resolves coat and jacket measurements to the JACKET component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.COATS_JACKETS
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.JACKET,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.WAIST,
      component: FitGarmentComponent.JACKET,
    },
    {
      type: FitMeasurementType.HIP,
      component: FitGarmentComponent.JACKET,
    },
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.JACKET,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.GARMENT_LENGTH,
      component: FitGarmentComponent.JACKET,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.JACKET,
    },
  ]);
});

it("resolves dress measurements to the DRESS component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.DRESS
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.DRESS,
    },
    {
      type: FitMeasurementType.WAIST,
      component: FitGarmentComponent.DRESS,
    },
    {
      type: FitMeasurementType.HIP,
      component: FitGarmentComponent.DRESS,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.DRESS,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.GARMENT_LENGTH,
      component: FitGarmentComponent.DRESS,
    },
    {
      type: FitMeasurementType.FRONT_LENGTH,
      component: FitGarmentComponent.DRESS,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.DRESS,
    },
  ]);
});

it("resolves abaya measurements to the ABAYA component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.ABAYA
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.ABAYA,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.WAIST,
      component: FitGarmentComponent.ABAYA,
    },
    {
      type: FitMeasurementType.HIP,
      component: FitGarmentComponent.ABAYA,
    },
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.ABAYA,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.GARMENT_LENGTH,
      component: FitGarmentComponent.ABAYA,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.ABAYA,
    },
  ]);
});

it("resolves jilbab measurements to the JILBAB component", () => {
  const rules =
    getProductMeasurementRules(
      ProductType.JILBAB
    );

  expect(
    rules.supportsSizeRecommendation
  ).toBe(true);

  expect(
    rules.requiredBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.JILBAB,
    },
  ]);

  expect(
    rules.optionalBodyFit
  ).toEqual([
    {
      type: FitMeasurementType.HIP,
      component: FitGarmentComponent.JILBAB,
    },
    {
      type: FitMeasurementType.SHOULDER_WIDTH,
      component: FitGarmentComponent.JILBAB,
    },
  ]);

  expect(
    rules.length
  ).toEqual([
    {
      type: FitMeasurementType.GARMENT_LENGTH,
      component: FitGarmentComponent.JILBAB,
    },
    {
      type: FitMeasurementType.SLEEVE_LENGTH,
      component: FitGarmentComponent.JILBAB,
    },
  ]);
});

  it("resolves standalone skirt measurements to the SKIRT component", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SKIRT
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(
      rules.requiredBodyFit
    ).toEqual([
      {
        type: FitMeasurementType.WAIST,
        component: FitGarmentComponent.SKIRT,
      },
      {
        type: FitMeasurementType.HIP,
        component: FitGarmentComponent.SKIRT,
      },
    ]);

    expect(
      rules.length
    ).toEqual([
      {
        type: FitMeasurementType.SKIRT_LENGTH,
        component: FitGarmentComponent.SKIRT,
      },
    ]);
  });



  it("resolves a top and skirt set", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SETS,
        [
          FitGarmentComponent.TOP,
          FitGarmentComponent.SKIRT,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.SKIRT,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.SKIRT,
      },
    ]);

    expect(rules.length).toEqual([
      {
        type: FitMeasurementType.TOP_LENGTH,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.SKIRT_LENGTH,
        component:
          FitGarmentComponent.SKIRT,
      },
    ]);
  });

  it("resolves a top and trouser set", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SETS,
        [
          FitGarmentComponent.TOP,
          FitGarmentComponent.TROUSER,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);

    expect(rules.length).toEqual([
      {
        type: FitMeasurementType.TOP_LENGTH,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.INSEAM,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type:
          FitMeasurementType.TROUSER_LENGTH,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);
  });

  it("does not depend on component order", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SETS,
        [
          FitGarmentComponent.SKIRT,
          FitGarmentComponent.TOP,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toContainEqual({
      type: FitMeasurementType.WAIST,
      component: FitGarmentComponent.SKIRT,
    });
  });

  it("fails closed when set composition is missing", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SETS
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(false);

    expect(rules.requiredBodyFit).toEqual([]);
    expect(rules.optionalBodyFit).toEqual([]);
    expect(rules.length).toEqual([]);
  });

  it("fails closed for an unsupported set composition", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SETS,
        [
          FitGarmentComponent.TOP,
          FitGarmentComponent.BOTTOM,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(false);
  });

  it("fails closed rather than guessing a three-piece set", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.SETS,
        [
          FitGarmentComponent.TOP,
          FitGarmentComponent.SKIRT,
          FitGarmentComponent.JACKET,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(false);
  });

    it("resolves an activewear top", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.ACTIVEWEAR,
        [FitGarmentComponent.TOP]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
    ]);

    expect(rules.optionalBodyFit).toEqual([]);
    expect(rules.length).toEqual([]);
  });

  it("resolves activewear trousers", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.ACTIVEWEAR,
        [FitGarmentComponent.TROUSER]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toEqual([
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);

    expect(rules.optionalBodyFit).toEqual([]);

    expect(rules.length).toEqual([
      {
        type: FitMeasurementType.INSEAM,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type:
          FitMeasurementType.TROUSER_LENGTH,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);
  });

  it("resolves an activewear top and trouser set", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.ACTIVEWEAR,
        [
          FitGarmentComponent.TOP,
          FitGarmentComponent.TROUSER,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(true);

    expect(rules.requiredBodyFit).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);

    expect(rules.optionalBodyFit).toEqual([]);

    expect(rules.length).toEqual([
      {
        type: FitMeasurementType.INSEAM,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type:
          FitMeasurementType.TROUSER_LENGTH,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);
  });

  it("fails closed when activewear composition is missing", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.ACTIVEWEAR
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(false);

    expect(rules.requiredBodyFit).toEqual([]);
    expect(rules.optionalBodyFit).toEqual([]);
    expect(rules.length).toEqual([]);
    expect(rules.coverage).toEqual([]);
  });

  it("fails closed for an unsupported activewear composition", () => {
    const rules =
      getProductMeasurementRules(
        ProductType.ACTIVEWEAR,
        [
          FitGarmentComponent.TOP,
          FitGarmentComponent.SKIRT,
        ]
      );

    expect(
      rules.supportsSizeRecommendation
    ).toBe(false);

    expect(rules.requiredBodyFit).toEqual([]);
    expect(rules.optionalBodyFit).toEqual([]);
    expect(rules.length).toEqual([]);
    expect(rules.coverage).toEqual([]);
  });
});
