import { prisma } from "@/lib/prisma";
import type { GridProduct } from "@/components/ProductGrid";
import {
  MerchandisingScopeType,
  MerchandisingVersion,
  type Region,
} from "@prisma/client";

import {  buildTrackedOutboundUrl,} from "@/lib/affiliate/tracking";

type CandidateProduct = {
  id: string;
  slug: string;
  title: string;
  price: unknown;
  currency: string;
  badges: string[];
  affiliateUrl: string | null;
  publishedAt: Date | null;

  brand: {
    name: string;
    slug: string;
    baseCountryCode: string | null;
  } | null;

  images: Array<{
    url: string;
  }>;
};

function mapToGridProduct(
  product: CandidateProduct,
  index: number,
  isExpandedPageOne: boolean,
  contextType: "CURATED" | "BALANCED",
  region: Region
): GridProduct {
  return {
    id: product.id,
    title: product.title,
    brandName:
      product.brand?.name ?? null,
    brandSlug:
      product.brand?.slug ?? null,
    productSlug:
      product.slug,
    imageUrl:
      product.images[0]?.url ?? null,
    price:
      product.price == null
        ? null
        : String(product.price),
    currency:
      String(product.currency),

    buyUrl:
      buildTrackedOutboundUrl(
        product.id,
        {
          sourcePage: "CONTINENT",
          sectionKey:
            `continent_${region.toLowerCase()}`,
          position:
            index + 1,
          pageNumber:
            1,
          contextType,
        }
      ),

    badges:
      (product.badges ?? []) as string[],

    analytics: {
      sourcePage: "CONTINENT",
      sectionKey:
        `continent_${region.toLowerCase()}`,
      position:
        index + 1,
      pageNumber:
        1,
      isExpandedPageOne,
      contextType,
    },
  };
}

export async function getContinentPageOneProducts(
  region: Region,
  visibleCount = 24
): Promise<GridProduct[]> {
  const targetCount = Math.max(
    1,
    Math.min(visibleCount, 48)
  );

  const isExpandedPageOne =
    targetCount > 24;

  /*
   * 1. Load all eligible products for
   *    this continent.
   */
  const products =
    await prisma.product.findMany({
      where: {
        status: "APPROVED",
        isActive: true,
        publishedAt: {
          not: null,
        },
        affiliateUrl: {
          not: null,
        },

        brand: {
          is: {
            baseRegion: region,
            accountStatus: "ACTIVE",
            affiliateStatus: "ACTIVE",
          },
        },
      },

      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],

      take: 240,

      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        currency: true,
        badges: true,
        affiliateUrl: true,
        publishedAt: true,

        brand: {
          select: {
            name: true,
            slug: true,
            baseCountryCode: true,
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

  const validProducts =
    products.filter(
      (product) =>
        product.brand?.baseCountryCode &&
        product.affiliateUrl
    ) as CandidateProduct[];

  if (validProducts.length === 0) {
    return [];
  }

  /*
   * 2. Load the LIVE visual merchandising
   *    arrangement for this continent.
   *
   * Example:
   * scopeType = CONTINENT
   * scopeKey  = ASIA
   */
  const livePlacements =
    await prisma.categoryMerchPlacement.findMany({
      where: {
        scopeType:
          MerchandisingScopeType.CONTINENT,

        scopeKey: region,

        version:
          MerchandisingVersion.LIVE,
      },

      orderBy: {
        position: "asc",
      },

      take: 48,

      select: {
        productId: true,
        position: true,
      },
    });

  const productsById = new Map(
    validProducts.map((product) => [
      product.id,
      product,
    ])
  );

  /*
   * Only keep curated products that are
   * still genuinely eligible/live.
   */
  const curatedProducts =
    livePlacements
      .map((placement) =>
        productsById.get(
          placement.productId
        )
      )
      .filter(
        (
          product
        ): product is CandidateProduct =>
          Boolean(product)
      );

  /*
   * If merchandising already fills the
   * requested page, return it immediately.
   */
  if (
    curatedProducts.length >= targetCount
  ) {
    return curatedProducts
      .slice(0, targetCount)
      .map((product, index) =>
        mapToGridProduct(
  product,
  index,
  isExpandedPageOne,
  "CURATED",
  region
)
      );
  }

  /*
   * 3. Exclude products already manually
   *    curated before doing the automatic
   *    balancing.
   */
  const curatedIds = new Set(
    curatedProducts.map(
      (product) => product.id
    )
  );

  const automaticCandidates =
    validProducts.filter(
      (product) =>
        !curatedIds.has(product.id)
    );

  /*
   * 4. Group remaining products by country.
   *
   * This preserves your original balancing
   * behaviour.
   */
  const byCountry = new Map<
    string,
    CandidateProduct[]
  >();

  for (
    const product of automaticCandidates
  ) {
    const countryCode =
      product.brand?.baseCountryCode?.toUpperCase();

    if (!countryCode) continue;

    const current =
      byCountry.get(countryCode) ?? [];

    current.push(product);

    byCountry.set(
      countryCode,
      current
    );
  }

  const countryGroups =
    Array.from(byCountry.entries())
      .map(
        ([countryCode, items]) => ({
          countryCode,
          items,
        })
      )
      .sort((a, b) =>
        a.countryCode.localeCompare(
          b.countryCode
        )
      );

  /*
   * Start page 1 with your manually
   * curated products.
   */
  const picked: CandidateProduct[] = [
    ...curatedProducts,
  ];

  const usedIds = new Set(
    picked.map((product) => product.id)
  );

  /*
   * Pass 1:
   * one product from each country.
   */
  for (const group of countryGroups) {
    const next =
      group.items.find(
        (item) =>
          !usedIds.has(item.id)
      );

    if (!next) continue;

    picked.push(next);
    usedIds.add(next.id);

    if (
      picked.length >= targetCount
    ) {
      break;
    }
  }

  /*
   * Pass 2:
   * another product from each country.
   */
  if (picked.length < targetCount) {
    for (const group of countryGroups) {
      const next =
        group.items.find(
          (item) =>
            !usedIds.has(item.id)
        );

      if (!next) continue;

      picked.push(next);
      usedIds.add(next.id);

      if (
        picked.length >= targetCount
      ) {
        break;
      }
    }
  }

  /*
   * Pass 3:
   * fill anything still remaining using
   * the existing newest-first candidate
   * ordering.
   */
  if (picked.length < targetCount) {
    const remaining =
      automaticCandidates.filter(
        (item) =>
          !usedIds.has(item.id)
      );

    for (const item of remaining) {
      picked.push(item);
      usedIds.add(item.id);

      if (
        picked.length >= targetCount
      ) {
        break;
      }
    }
  }

  /*
   * 5. Convert into storefront products.
   *
   * Products that fall inside the manual
   * arrangement are tagged CURATED.
   * Automatically filled products remain
   * BALANCED.
   */
  return picked
    .slice(0, targetCount)
    .map((product, index) =>
      mapToGridProduct(
  product,
  index,
  isExpandedPageOne,
  index < curatedProducts.length
    ? "CURATED"
    : "BALANCED",
  region
)
    );
}