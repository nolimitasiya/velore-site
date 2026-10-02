import { prisma } from "@/lib/prisma";

export const recommendationProductInclude = {
  productTypes: {
    select: {
      productType: true,
    },
  },

  lengthStructure: true,

 lengthOptions: {
  select: {
    id: true,
    label: true,
    valueCm: true,
    sourceValue: true,
    sourceUnit: true,
    sortOrder: true,
    source: true,
    sourceUrl: true,
    sourceNotes: true,
    lastVerifiedAt: true,
  },
},

  fitProfile: {
  select: {
    intendedFit: true,
    stretch: true,
    measurementBasis: true,
    source: true,

    measurements: {
      select: {
        type: true,
        component: true,
        minValueCm: true,
        maxValueCm: true,
        sourceMinValue: true,
        sourceMaxValue: true,
        sourceUnit: true,
      },
    },
  },
},

  productSizes: {
    select: {
      sizeId: true,

      size: {
        select: {
          name: true,
        },
      },

      fitMeasurements: {
        select: {
          type: true,
          component: true,
          measurementBasis: true,
          minValueCm: true,
          maxValueCm: true,
        },
      },

      sizeChartMapping: {
        select: {
          chartEntry: {
            select: {
              chart: {
                select: {
                  measurementBasis: true,
                },
              },

              measurements: {
                select: {
                  type: true,
                  component: true,
                  minValueCm: true,
                  maxValueCm: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const recommendationShopperInclude = {
  fitProfile: {
    select: {
      fitPreference: true,
      preferredUnit: true,

      measurements: {
        select: {
          type: true,
          valueCm: true,
        },
      },
    },
  },
} as const;

export async function loadProductRecommendationData(
  productId: string
) {
  return prisma.product.findUnique({
    where: {
      id: productId,
    },

    select: {
      productType: true,

      ...recommendationProductInclude,
    },
  });
}

export async function loadShopperRecommendationData(
  shopperId: string
) {
  return prisma.shopper.findUnique({
    where: {
      id: shopperId,
    },

    select: recommendationShopperInclude,
  });
}