import { Badge, Prisma, Region } from "@prisma/client";
import type { StorefrontFilters } from "@/lib/storefront/parseFilters";

type BuildStorefrontWhereArgs = {
  filters: StorefrontFilters;
  categoryIds?: string[];
  region?: Region;
  occasionSlug?: string;
};

export function buildStorefrontWhere({
  filters,
  categoryIds = [],
  region,
  occasionSlug,
}: BuildStorefrontWhereArgs): Prisma.ProductWhereInput {
  const {
    brands,
    countries,
    types,
    styles,
    colors,
    sizes,
    min,
    max,
    saleOn,
    nextDayOn,
  } = filters;

  const brandWhere =
    region || brands.length || countries.length
      ? {
          brand: {
            is: {
              ...(region ? { baseRegion: region } : {}),
              ...(brands.length ? { slug: { in: brands } } : {}),
              ...(countries.length ? { baseCountryCode: { in: countries } } : {}),
            },
          },
        }
      : {};

  const categoryWhere = categoryIds.length
    ? {
        OR: [
          { categoryId: { in: categoryIds } },
          { categoryId: null, productType: { not: null } },
        ],
      }
    : {};

  const occasionWhere = occasionSlug
    ? {
        productOccasions: {
          some: {
            occasion: {
              slug: occasionSlug,
            },
          },
        },
      }
    : {};

  const typeWhere = types.length
    ? {
        productType: { in: types },
      }
    : {};

  const styleWhere = styles.length
    ? {
        productStyles: {
          some: {
            style: {
              slug: { in: styles },
            },
          },
        },
      }
    : {};

  const colorWhere = colors.length
    ? {
        productColours: {
          some: {
            colour: {
              slug: { in: colors },
            },
          },
        },
      }
    : {};

  const sizeWhere = sizes.length
    ? {
        productSizes: {
          some: {
            size: {
              slug: { in: sizes },
            },
          },
        },
      }
    : {};

  const priceWhere =
    min != null || max != null
      ? {
          price: {
            ...(min != null ? { gte: min } : {}),
            ...(max != null ? { lte: max } : {}),
          },
        }
      : {};

  const badgeWhere = {
    ...(saleOn ? { badges: { has: Badge.sale } } : {}),
    ...(nextDayOn ? { badges: { has: Badge.next_day } } : {}),
  };

  return {
    status: "APPROVED",
    isActive: true,
    publishedAt: { not: null },

    ...brandWhere,
    ...categoryWhere,
    ...occasionWhere,
    ...typeWhere,
    ...styleWhere,
    ...colorWhere,
    ...sizeWhere,
    ...priceWhere,
    ...badgeWhere,
  };
}