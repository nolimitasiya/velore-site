import { prisma } from "@/lib/prisma";
import type { GridProduct } from "@/components/ProductGrid";
import type { Prisma } from "@prisma/client";

export type MerchPageKey = "CLOTHING" | "SALE" | "OCCASION";
type MerchBucket = "TOP_PICKS" | "DISCOVER_MORE" | "EXPLORE_NEW";

type MerchProductRecord = {
  id: string;
  bucket: MerchBucket;
  position: number;
  product: {
    id: string;
    title: string;
    affiliateUrl: string | null;
    price: unknown;
    currency: string;
    badges: string[];
    productType: string | null;
    isActive: boolean;
    status: string;
    publishedAt: Date | null;
    brand: {
      name: string;
    };
    images: Array<{
      url: string;
    }>;
    productOccasions: Array<{
      occasionId: string;
    }>;
  };
};

type FallbackProductRecord = {
  id: string;
  title: string;
  affiliateUrl: string | null;
  price: unknown;
  currency: string;
  badges: string[];
  productType: string | null;
  isActive: boolean;
  status: string;
  publishedAt: Date | null;
  brand: {
    name: string;
  };
  images: Array<{
    url: string;
  }>;
  productOccasions: Array<{
    occasionId: string;
  }>;
};

const BLEND_ORDER: MerchBucket[] = [
  "TOP_PICKS",
  "TOP_PICKS",
  "DISCOVER_MORE",
  "TOP_PICKS",
  "DISCOVER_MORE",
  "TOP_PICKS",
  "EXPLORE_NEW",
  "DISCOVER_MORE",

  "TOP_PICKS",
  "DISCOVER_MORE",
  "TOP_PICKS",
  "EXPLORE_NEW",
  "DISCOVER_MORE",
  "TOP_PICKS",
  "DISCOVER_MORE",
  "TOP_PICKS",

  "DISCOVER_MORE",
  "EXPLORE_NEW",
  "TOP_PICKS",
  "DISCOVER_MORE",
  "TOP_PICKS",
  "DISCOVER_MORE",
  "EXPLORE_NEW",
  "DISCOVER_MORE",
];

function isMerchProductEligibleForPage(
  item: MerchProductRecord,
  pageKey: MerchPageKey
) {
  const product = item.product;

  if (!product.isActive) return false;
  if (product.status !== "APPROVED") return false;
  if (!product.publishedAt) return false;
  if (!product.affiliateUrl) return false;

  if (pageKey === "CLOTHING") {
  if (!product.productType) return false;
  if (product.productType === "ACCESSORIES") return false;
}

  if (pageKey === "SALE" && !product.badges.includes("sale")) {
    return false;
  }

  if (pageKey === "OCCASION") {
  if (product.productOccasions.length === 0) return false;
  if (!product.productType) return false;
  if (product.productType === "ACCESSORIES") return false;
}

  return true;
}

function mapMerchToGridProduct(
  item: MerchProductRecord,
  index: number,
  isExpandedPageOne: boolean
): GridProduct {
  return {
    id: item.product.id,
    title: item.product.title,
    imageUrl: item.product.images[0]?.url ?? null,
    brandName: item.product.brand.name,
    price: item.product.price == null ? null : String(item.product.price),
    currency: item.product.currency,
    buyUrl: `/out/${item.product.id}`,
    badges: item.product.badges,
    analytics: {
      sourcePage: "SEARCH",
      sectionKey: item.bucket.toLowerCase(),
      position: index + 1,
      pageNumber: 1,
      isExpandedPageOne,
      contextType: "MERCH",
    },
  };
}

function mapFallbackToGridProduct(
  product: FallbackProductRecord,
  index: number,
  pageKey: MerchPageKey,
  isExpandedPageOne: boolean
): GridProduct {
  return {
    id: product.id,
    title: product.title,
    imageUrl: product.images[0]?.url ?? null,
    brandName: product.brand.name,
    price: product.price == null ? null : String(product.price),
    currency: product.currency,
    buyUrl: `/out/${product.id}`,
    badges: product.badges,
    analytics: {
      sourcePage: "SEARCH",
      sectionKey: `${pageKey.toLowerCase()}_grid`,
      position: index + 1,
      pageNumber: 1,
      isExpandedPageOne,
      contextType: "GRID",
    },
  };
}

function shiftNextAvailable(
  bucketMap: Record<MerchBucket, MerchProductRecord[]>,
  usedProductIds: Set<string>,
  bucket: MerchBucket
): MerchProductRecord | null {
  const pool = bucketMap[bucket];

  while (pool.length > 0) {
    const next = pool.shift()!;
    if (!usedProductIds.has(next.product.id)) {
      return next;
    }
  }

  return null;
}

export async function getMerchPageOneProducts(
  pageKey: MerchPageKey,
  visibleCount = 24
): Promise<GridProduct[]> {
  const targetCount = Math.max(1, Math.min(visibleCount, 48));
  const now = new Date();

  const isExpandedPageOne = targetCount > 24;

  const merchItems = await prisma.collectionMerchItem.findMany({
    where: {
      pageKey,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          affiliateUrl: true,
          price: true,
          currency: true,
          badges: true,
          productType: true,
          isActive: true,
          status: true,
          publishedAt: true,
          brand: {
            select: {
              name: true,
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
          productOccasions: {
            select: {
              occasionId: true,
            },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ bucket: "asc" }, { position: "asc" }],
  });

  const validItems = merchItems.filter((item) =>
    isMerchProductEligibleForPage(item as MerchProductRecord, pageKey)
  ) as MerchProductRecord[];

  const bucketMap: Record<MerchBucket, MerchProductRecord[]> = {
    TOP_PICKS: validItems
      .filter((item) => item.bucket === "TOP_PICKS")
      .sort((a, b) => a.position - b.position),
    DISCOVER_MORE: validItems
      .filter((item) => item.bucket === "DISCOVER_MORE")
      .sort((a, b) => a.position - b.position),
    EXPLORE_NEW: validItems
      .filter((item) => item.bucket === "EXPLORE_NEW")
      .sort((a, b) => a.position - b.position),
  };

  const chosen: MerchProductRecord[] = [];
  const usedProductIds = new Set<string>();

  while (chosen.length < targetCount) {
    let foundInBlendPass = false;

    for (const bucket of BLEND_ORDER) {
      const next = shiftNextAvailable(bucketMap, usedProductIds, bucket);
      if (!next) continue;

      chosen.push(next);
      usedProductIds.add(next.product.id);
      foundInBlendPass = true;

      if (chosen.length >= targetCount) break;
    }

    if (!foundInBlendPass) break;
  }

  const fallbackBucketOrder: MerchBucket[] = [
    "TOP_PICKS",
    "DISCOVER_MORE",
    "EXPLORE_NEW",
  ];

  while (chosen.length < targetCount) {
    let foundAny = false;

    for (const bucket of fallbackBucketOrder) {
      const next = shiftNextAvailable(bucketMap, usedProductIds, bucket);
      if (!next) continue;

      chosen.push(next);
      usedProductIds.add(next.product.id);
      foundAny = true;

      if (chosen.length >= targetCount) break;
    }

    if (!foundAny) break;
  }

  const merchGridProducts = chosen.map((item, index) =>
  mapMerchToGridProduct(item, index, isExpandedPageOne)
);

  if (merchGridProducts.length >= targetCount) {
    return merchGridProducts;
  }

  const fallbackWhere: Prisma.ProductWhereInput = {
    status: "APPROVED",
    isActive: true,
    publishedAt: { not: null },
    affiliateUrl: { not: null },
    ...(pageKey === "CLOTHING"
  ? {
      productType: {
        in: [
          "ABAYA",
          "DRESS",
          "SKIRT",
          "TOP",
          "HIJAB",
          "ACTIVEWEAR",
          "SETS",
          "MATERNITY",
          "KHIMAR",
          "JILBAB",
          "COATS_JACKETS",
          "HOODIE_SWEATSHIRT",
          "PANTS",
          "BLAZER",
          "T_SHIRT",
        ],
      },
    }
  : {}),
    ...(pageKey === "SALE" ? { badges: { has: "sale" } } : {}),
    ...(pageKey === "OCCASION"
  ? {
      productOccasions: {
        some: {},
      },
      productType: {
        in: [
          "ABAYA",
          "DRESS",
          "SKIRT",
          "TOP",
          "HIJAB",
          "ACTIVEWEAR",
          "SETS",
          "MATERNITY",
          "KHIMAR",
          "JILBAB",
          "COATS_JACKETS",
          "HOODIE_SWEATSHIRT",
          "PANTS",
          "BLAZER",
          "T_SHIRT",
        ],
      },
    }
  : {}),
  };

  const fallbackProducts = await prisma.product.findMany({
    where: fallbackWhere,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 240,
    select: {
      id: true,
      title: true,
      affiliateUrl: true,
      price: true,
      currency: true,
      badges: true,
      productType: true,
      isActive: true,
      status: true,
      publishedAt: true,
      brand: {
        select: {
          name: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: {
          url: true,
        },
      },
      productOccasions: {
        select: {
          occasionId: true,
        },
        take: 1,
      },
    },
  });

  const filler = (fallbackProducts as FallbackProductRecord[])
  .filter((product) => !usedProductIds.has(product.id))
  .slice(0, targetCount - merchGridProducts.length)
  .map((product, index) =>
    mapFallbackToGridProduct(
      product,
      merchGridProducts.length + index,
      pageKey,
      isExpandedPageOne
    )
  );

  return [...merchGridProducts, ...filler];
}