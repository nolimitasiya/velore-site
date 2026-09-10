import { prisma } from "@/lib/prisma";
import type { GridProduct } from "@/components/ProductGrid";
import {
  MerchandisingScopeType,
  MerchandisingVersion,
  ProductType,
  Prisma,
} from "@prisma/client";

import {
  buildTrackedOutboundUrl,
} from "@/lib/affiliate/tracking";
import { unstable_cache } from "next/cache";

const MANUAL_LIMIT = 48;

type ScopeType = "PRODUCT_TYPE" | "OCCASION";

type ProductRecord = {
  id: string;
  slug: string;
  title: string;
  price: unknown;
  currency: string;
  badges: string[];
  brand: {
    name: string;
    slug: string;
  };
  images: Array<{ url: string }>;
};

function mapProduct(
  product: ProductRecord,
  index: number,
  sectionKey: string,
  isExpandedPageOne: boolean,
  contextType: "PRODUCT_TYPE" | "OCCASION_TYPE"
): GridProduct {
  return {
    id: product.id,
    title: product.title,
    brandName: product.brand.name,
    brandSlug: product.brand.slug,
    productSlug: product.slug,
    imageUrl: product.images[0]?.url ?? null,
    price: product.price == null ? null : String(product.price),
    currency: String(product.currency),
    buyUrl:
  buildTrackedOutboundUrl(
    product.id,
    {
      sourcePage: "CATEGORY",
      sectionKey,
      position: index + 1,
      pageNumber: 1,
      contextType,
    }
  ),
    badges: product.badges ?? [],
    analytics: {
  sourcePage:
    "CATEGORY",

  sectionKey,

  position:
    index + 1,

  pageNumber:
    1,

  isExpandedPageOne,

  contextType,
},
  };
}

function buildScopeWhere(
  scopeType: ScopeType,
  scopeKey: string
): Prisma.ProductWhereInput {
  if (scopeType === "PRODUCT_TYPE") {
    return {
      OR: [
        {
          productType: scopeKey as ProductType,
        },
        {
          productTypes: {
            some: {
              productType: scopeKey as ProductType,
            },
          },
        },
      ],
    };
  }

  return {
    productOccasions: {
      some: {
        occasion: {
          slug: scopeKey.toLowerCase(),
        },
      },
    },
  };
}

// Fetching up to 300 fully-joined products (brand + image) on every request
// for the default, unfiltered landing view of every clothing/occasion type
// page is the single most expensive query on those routes. It doesn't need
// to be live: curated merchandising positions and the eligible-product pool
// don't change second-to-second, so a short time-based cache turns most
// requests into a cache hit while keeping admin changes visible within a
// minute. If instant admin reflection is needed later, add a
// revalidateTag("category-merch") call to the merchandising save route and
// switch this to tag-based invalidation instead.
const getCachedEligibleProducts = unstable_cache(
  async (scopeType: ScopeType, scopeKey: string) => {
    const scopeWhere = buildScopeWhere(scopeType, scopeKey);

    return prisma.product.findMany({
      where: {
        status: "APPROVED",
        isActive: true,
        publishedAt: {
          not: null,
        },

        brand: {
          is: {
            accountStatus: "ACTIVE",
            affiliateStatus: "ACTIVE",
          },
        },

        ...scopeWhere,
      },

      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],

      take: 300,

      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        currency: true,
        badges: true,

        brand: {
          select: {
            name: true,
            slug: true,
          },
        },

        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
          select: {
            url: true,
          },
        },
      },
    });
  },
  ["category-merch-eligible-products"],
  { tags: ["storefront-products", "category-merch"], revalidate: 60 }
);

export async function getCategoryMerchProducts({
  scopeType,
  scopeKey,
  visibleCount = 24,
}: {
  scopeType: ScopeType;
  scopeKey: string;
  visibleCount?: number;
}): Promise<GridProduct[]> {
  const targetCount = Math.max(
    1,
    Math.min(visibleCount, MANUAL_LIMIT)
  );

  const isExpandedPageOne = targetCount > 24;

  const placements =
    await prisma.categoryMerchPlacement.findMany({
      where: {
        scopeType:
          scopeType === "PRODUCT_TYPE"
            ? MerchandisingScopeType.PRODUCT_TYPE
            : MerchandisingScopeType.OCCASION,
        scopeKey,
        version: MerchandisingVersion.LIVE,
        position: {
          lte: MANUAL_LIMIT,
        },
      },
      orderBy: {
        position: "asc",
      },
      select: {
        productId: true,
        position: true,
      },
    });

  /*
   * Fetch all products currently eligible for this storefront scope.
   * Cached for 60s — see getCachedEligibleProducts above.
   */
  const eligibleProducts = await getCachedEligibleProducts(scopeType, scopeKey);

  const productMap = new Map(
    eligibleProducts.map((product) => [
      product.id,
      product,
    ])
  );

  /*
   * Respect LIVE positions.
   *
   * If a product has since become inactive/unapproved,
   * it simply drops out rather than breaking the page.
   */
  const curatedProducts = placements
    .map((placement) =>
      productMap.get(placement.productId)
    )
    .filter(
      (
        product
      ): product is (typeof eligibleProducts)[number] =>
        Boolean(product)
    );

  const curatedIds = new Set(
    curatedProducts.map((product) => product.id)
  );

  /*
   * Automatic products fill any empty positions.
   */
  const automaticProducts =
    eligibleProducts.filter(
      (product) =>
        !curatedIds.has(product.id)
    );

  const finalProducts = [
    ...curatedProducts,
    ...automaticProducts,
  ].slice(0, targetCount);

  return finalProducts.map(
    (product, index) =>
      mapProduct(
  product,
  index,

  scopeType === "PRODUCT_TYPE"
    ? `product_type_${scopeKey.toLowerCase()}`
    : `occasion_${scopeKey.toLowerCase()}`,

  isExpandedPageOne,

  scopeType === "PRODUCT_TYPE"
    ? "PRODUCT_TYPE"
    : "OCCASION_TYPE"
)
  );
}

/*
 * Used by page 2+ so the manually curated first 48
 * never repeat later.
 */
export async function getCategoryMerchLiveIds({
  scopeType,
  scopeKey,
}: {
  scopeType: ScopeType;
  scopeKey: string;
}) {
  const placements =
    await prisma.categoryMerchPlacement.findMany({
      where: {
        scopeType:
          scopeType === "PRODUCT_TYPE"
            ? MerchandisingScopeType.PRODUCT_TYPE
            : MerchandisingScopeType.OCCASION,
        scopeKey,
        version: MerchandisingVersion.LIVE,
        position: {
          lte: MANUAL_LIMIT,
        },
      },
      orderBy: {
        position: "asc",
      },
      select: {
        productId: true,
      },
    });

  return placements.map(
    (placement) => placement.productId
  );
}