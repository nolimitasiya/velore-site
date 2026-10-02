import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ProductType,
} from "@prisma/client";

import {
  presentProductFit,
} from "@/lib/fit/presentation/productFitPresentation";

import type {
  ProductSizeRecommendationServiceResult,
} from "@/lib/fit/getProductSizeRecommendation";

import type {
  ProductRecommendation,
  SizeAssessment,
} from "@/lib/fit/recommendation";

function sizeAssessment(
  id: string,
  label: string
): SizeAssessment {
  return {
    productType: ProductType.DRESS,
    sizeId: id,
    sizeLabel: label,
    status: "SUITABLE",
    requiredMeasurements: [],
    optionalMeasurements: [],
  };
}

function assessed(
  recommendation: ProductRecommendation
): ProductSizeRecommendationServiceResult {
  return {
    status: "ASSESSED",

    recommendation,

 lengthAssessment: {
  structure: "SIZE_DEPENDENT",
  result: {
    status: "INSUFFICIENT_EVIDENCE",
    structure: "SIZE_DEPENDENT",
    assessments: [],
    reason: "MISSING_GARMENT_LENGTH",
  },
},

productDimensions: {
  state: "NOT_APPLICABLE",
},
    shopperDisplayUnit: "CM",
  };
}

describe("presentProductFit", () => {
  it("requires sign in when there is no authenticated shopper", () => {
    expect(
      presentProductFit({
        isAuthenticated: false,
        result: null,
      })
    ).toEqual({
      state: "SIGN_IN_REQUIRED",
    });
  });

  it("requires My Fit when the authenticated shopper has no fit profile", () => {
    expect(
      presentProductFit({
        isAuthenticated: true,
        result: {
          status: "UNAVAILABLE",
          recommendation: null,
          reason:
            "SHOPPER_FIT_PROFILE_MISSING",
        },
      })
    ).toEqual({
      state: "FIT_PROFILE_REQUIRED",
    });
  });

  it("preserves assessed insufficient evidence separately from a missing shopper fit profile", () => {
    expect(
      presentProductFit({
        isAuthenticated: true,
        result: assessed({
          productType: ProductType.DRESS,
          status:
            "INSUFFICIENT_EVIDENCE",
          recommendedSize: null,
          suitableSizes: [],
          assessments: [],
        }),
      })
    ).toEqual({
      state: "INSUFFICIENT_EVIDENCE",
    });
  });

  it("presents a unique recommended size and preserves all suitable sizes", () => {
    const medium =
      sizeAssessment("m", "M");

    const large =
      sizeAssessment("l", "L");

    expect(
      presentProductFit({
        isAuthenticated: true,
        result: assessed({
          productType: ProductType.DRESS,
          status: "RECOMMENDED",
          recommendedSize: medium,
          suitableSizes: [
            medium,
            large,
          ],
          assessments: [
            medium,
            large,
          ],
        }),
      })
    ).toEqual({
      state: "RECOMMENDED",

      recommendedSize: {
        id: "m",
        label: "M",
      },

      suitableSizes: [
        {
          id: "m",
          label: "M",
        },
        {
          id: "l",
          label: "L",
        },
      ],
    });
  });

  it("preserves every suitable size when cross-size preference cannot establish a winner", () => {
    const medium =
      sizeAssessment("m", "M");

    const large =
      sizeAssessment("l", "L");

    expect(
      presentProductFit({
        isAuthenticated: true,
        result: assessed({
          productType: ProductType.DRESS,
          status:
            "MULTIPLE_SUITABLE",
          recommendedSize: null,
          suitableSizes: [
            medium,
            large,
          ],
          assessments: [
            medium,
            large,
          ],
        }),
      })
    ).toEqual({
      state: "MULTIPLE_SUITABLE",

      suitableSizes: [
        {
          id: "m",
          label: "M",
        },
        {
          id: "l",
          label: "L",
        },
      ],
    });
  });

  it("preserves a genuine no-suitable-size result", () => {
    expect(
      presentProductFit({
        isAuthenticated: true,
        result: assessed({
          productType: ProductType.DRESS,
          status:
            "NO_SUITABLE_SIZE",
          recommendedSize: null,
          suitableSizes: [],
          assessments: [],
        }),
      })
    ).toEqual({
      state: "NO_SUITABLE_SIZE",
    });
  });

  it("maps non-conventional size recommendation products to not applicable", () => {
    expect(
      presentProductFit({
        isAuthenticated: true,
        result: assessed({
          productType:
            ProductType.HIJAB,
          status:
            "SIZE_RECOMMENDATION_NOT_APPLICABLE",
          recommendedSize: null,
          suitableSizes: [],
          assessments: [],
        }),
      })
    ).toEqual({
      state: "NOT_APPLICABLE",
    });
  });

  it("fails closed for unavailable product or shopper states", () => {
    const reasons = [
      "PRODUCT_NOT_FOUND",
      "SHOPPER_NOT_FOUND",
      "PRODUCT_NOT_LOADABLE",
    ] as const;

    for (const reason of reasons) {
      expect(
        presentProductFit({
          isAuthenticated: true,
          result: {
            status: "UNAVAILABLE",
            recommendation: null,
            reason,
          },
        })
      ).toEqual({
        state: "UNAVAILABLE",
      });
    }
  });

  it("fails closed if an authenticated shopper unexpectedly has no service result", () => {
    expect(
      presentProductFit({
        isAuthenticated: true,
        result: null,
      })
    ).toEqual({
      state: "UNAVAILABLE",
    });
  });

  it("fails closed if RECOMMENDED ever arrives without a recommended size", () => {
    expect(
      presentProductFit({
        isAuthenticated: true,
        result: assessed({
          productType: ProductType.DRESS,
          status: "RECOMMENDED",
          recommendedSize: null,
          suitableSizes: [],
          assessments: [],
        }),
      })
    ).toEqual({
      state: "UNAVAILABLE",
    });
  });
});