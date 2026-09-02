import {
  AnalyticsEventType,
  Prisma,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_HEAT_SESSIONS = 5;

const DISCOVERY_SOURCES = [
  "HOME",
  "SEARCH",
  "BRAND",
  "CATEGORY",
  "PRODUCT",
  "DIARY",
  "STYLE_FEED",
  "CONTINENT",
  "EMERGING_BRANDS",
  "NEW_IN",
  "SALE",
  "OTHER",
] as const;

function startOfUtcDay(date: Date) {
  const copy = new Date(date);

  copy.setUTCHours(
    0,
    0,
    0,
    0
  );

  return copy;
}

function addUtcDays(
  date: Date,
  days: number
) {
  const copy =
    new Date(date);

  copy.setUTCDate(
    copy.getUTCDate() +
      days
  );

  return copy;
}

function getDateRange(
  req: NextRequest
) {
  const { searchParams } =
    new URL(req.url);

  const range =
    searchParams.get(
      "range"
    ) ?? "30d";

  const from =
    searchParams.get(
      "from"
    );

  const to =
    searchParams.get(
      "to"
    );

  const now =
    new Date();

  if (range === "today") {
    const start =
      startOfUtcDay(now);

    return {
      start,

      endExclusive:
        addUtcDays(
          start,
          1
        ),
    };
  }

  if (range === "7d") {
    const endExclusive =
      addUtcDays(
        startOfUtcDay(now),
        1
      );

    return {
      start:
        addUtcDays(
          endExclusive,
          -7
        ),

      endExclusive,
    };
  }

  if (range === "90d") {
    const endExclusive =
      addUtcDays(
        startOfUtcDay(now),
        1
      );

    return {
      start:
        addUtcDays(
          endExclusive,
          -90
        ),

      endExclusive,
    };
  }

  if (range === "1y") {
    const endExclusive =
      addUtcDays(
        startOfUtcDay(now),
        1
      );

    return {
      start:
        addUtcDays(
          endExclusive,
          -365
        ),

      endExclusive,
    };
  }

  if (
    range === "custom" &&
    from &&
    to
  ) {
    const start =
      new Date(
        `${from}T00:00:00.000Z`
      );

    const end =
      new Date(
        `${to}T00:00:00.000Z`
      );

    return {
      start,

      endExclusive:
        addUtcDays(
          end,
          1
        ),
    };
  }

  /*
   * Default = 30 days
   */
  const endExclusive =
    addUtcDays(
      startOfUtcDay(now),
      1
    );

  return {
    start:
      addUtcDays(
        endExclusive,
        -30
      ),

    endExclusive,
  };
}

function intersectionSize(
  a: Set<string>,
  b: Set<string>
) {
  let count = 0;

  for (const value of a) {
    if (b.has(value)) {
      count += 1;
    }
  }

  return count;
}

function safeRate(
  numerator: number,
  denominator: number
) {
  if (
    denominator <= 0
  ) {
    return 0;
  }

  return (
    numerator /
    denominator
  );
}

type BehaviourRow = {
  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;

  impressionSessions:
    Set<string>;

  viewSessions:
    Set<string>;

  wishlistSessions:
    Set<string>;

  shopSessions:
    Set<string>;
};

function createBehaviourRow():
  BehaviourRow {
  return {
    impressions: 0,
    views: 0,
    wishlistAdds: 0,
    shopClicks: 0,

    impressionSessions:
      new Set<string>(),

    viewSessions:
      new Set<string>(),

    wishlistSessions:
      new Set<string>(),

    shopSessions:
      new Set<string>(),
  };
}

function addBehaviourEvent(
  row: BehaviourRow,
  eventType:
    AnalyticsEventType,
  sessionId: string
) {
  if (
    eventType ===
    AnalyticsEventType.PRODUCT_IMPRESSION
  ) {
    row.impressions += 1;

    row.impressionSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    row.views += 1;

    row.viewSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    row.wishlistAdds += 1;

    row.wishlistSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    row.shopClicks += 1;

    row.shopSessions.add(
      sessionId
    );
  }
}

function buildBehaviourMetrics(
  row: BehaviourRow
) {
  const exposedSessions =
    row.impressionSessions.size;

  /*
   * IMPORTANT:
   *
   * These are intersections.
   *
   * A session only contributes to a rate
   * when that same session was exposed
   * to the brand/product first.
   */

  const viewedAfterExposure =
    intersectionSize(
      row.impressionSessions,
      row.viewSessions
    );

  const savedAfterExposure =
    intersectionSize(
      row.impressionSessions,
      row.wishlistSessions
    );

  const shoppedAfterExposure =
    intersectionSize(
      row.impressionSessions,
      row.shopSessions
    );

  const viewRate =
    safeRate(
      viewedAfterExposure,
      exposedSessions
    );

  const saveRate =
    safeRate(
      savedAfterExposure,
      exposedSessions
    );

  const shopIntentRate =
    safeRate(
      shoppedAfterExposure,
      exposedSessions
    );

  const strengthScore =
    viewRate * 0.2 +
    saveRate * 0.3 +
    shopIntentRate * 0.5;

  const savedAfterView =
    intersectionSize(
      row.viewSessions,
      row.wishlistSessions
    );

  const shoppedAfterView =
    intersectionSize(
      row.viewSessions,
      row.shopSessions
    );

  const shoppedAfterSave =
    intersectionSize(
      row.wishlistSessions,
      row.shopSessions
    );

  return {
    impressions:
      row.impressions,

    views:
      row.views,

    wishlistAdds:
      row.wishlistAdds,

    shopClicks:
      row.shopClicks,

    uniqueImpressionSessions:
      row.impressionSessions.size,

    uniqueViewSessions:
      row.viewSessions.size,

    uniqueWishlistSessions:
      row.wishlistSessions.size,

    uniqueShopSessions:
      row.shopSessions.size,

    viewRate,

    saveRate,

    shopIntentRate,

    strengthScore,

    impressionToShopRate:
      safeRate(
        shoppedAfterExposure,
        exposedSessions
      ),

    viewToWishlistRate:
      safeRate(
        savedAfterView,
        row.viewSessions.size
      ),

    viewToShopRate:
      safeRate(
        shoppedAfterView,
        row.viewSessions.size
      ),

    wishlistToShopRate:
      safeRate(
        shoppedAfterSave,
        row.wishlistSessions.size
      ),
  };
}

type BrandSignalRow = {
  key: string;
  label: string;

  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;

  impressionSessions: Set<string>;
  viewSessions: Set<string>;
  wishlistSessions: Set<string>;
  shopSessions: Set<string>;
};

function addBrandSignalEvent({
  map,
  key,
  label,
  eventType,
  sessionId,
}: {
  map: Map<string, BrandSignalRow>;
  key: string;
  label: string;
  eventType: AnalyticsEventType;
  sessionId: string;
}) {
  const existing =
    map.get(key) ?? {
      key,
      label,

      impressions: 0,
      views: 0,
      wishlistAdds: 0,
      shopClicks: 0,

      impressionSessions:
        new Set<string>(),

      viewSessions:
        new Set<string>(),

      wishlistSessions:
        new Set<string>(),

      shopSessions:
        new Set<string>(),
    };

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_IMPRESSION
  ) {
    existing.impressions += 1;

    existing.impressionSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    existing.views += 1;

    existing.viewSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    existing.wishlistAdds += 1;

    existing.wishlistSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    existing.shopClicks += 1;

    existing.shopSessions.add(
      sessionId
    );
  }

  map.set(
    key,
    existing
  );
}

function buildBrandSignalRows(
  map: Map<
    string,
    BrandSignalRow
  >
) {
  return Array.from(
    map.values()
  )
    .map((row) => {
      const exposedSessions =
        row.impressionSessions.size;

      const viewRate =
        safeRate(
          intersectionSize(
            row.impressionSessions,
            row.viewSessions
          ),
          exposedSessions
        );

      const saveRate =
        safeRate(
          intersectionSize(
            row.impressionSessions,
            row.wishlistSessions
          ),
          exposedSessions
        );

      const shopIntentRate =
        safeRate(
          intersectionSize(
            row.impressionSessions,
            row.shopSessions
          ),
          exposedSessions
        );

      const strengthScore =
        viewRate * 0.2 +
        saveRate * 0.3 +
        shopIntentRate * 0.5;

      const qualifies =
        exposedSessions >=
        MIN_HEAT_SESSIONS;

      return {
        key:
          row.key,

        label:
          row.label,

        impressions:
          row.impressions,

        views:
          row.views,

        wishlistAdds:
          row.wishlistAdds,

        shopClicks:
          row.shopClicks,

        uniqueImpressionSessions:
          row.impressionSessions.size,

        uniqueViewSessions:
          row.viewSessions.size,

        uniqueWishlistSessions:
          row.wishlistSessions.size,

        uniqueShopSessions:
          row.shopSessions.size,

        viewRate,
        saveRate,
        shopIntentRate,
        strengthScore,

        qualifies,
      };
    })
    .sort((a, b) => {
      /*
       * Qualified signals first.
       */
      if (
        a.qualifies &&
        !b.qualifies
      ) {
        return -1;
      }

      if (
        !a.qualifies &&
        b.qualifies
      ) {
        return 1;
      }

      /*
       * Among qualified:
       * strongest shopper response first.
       */
      if (
        a.qualifies &&
        b.qualifies
      ) {
        if (
          b.strengthScore !==
          a.strengthScore
        ) {
          return (
            b.strengthScore -
            a.strengthScore
          );
        }

        return (
          b.uniqueImpressionSessions -
          a.uniqueImpressionSessions
        );
      }

      /*
       * Both low sample:
       * closest to threshold first.
       */
      return (
        b.uniqueImpressionSessions -
        a.uniqueImpressionSessions
      );
    });
}
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      brandSlug: string;
    }>;
  }
) {
  try {
    const {
      brandSlug,
    } = await params;

    const decodedBrandSlug =
      decodeURIComponent(
        brandSlug
      );

    const {
      start,
      endExclusive,
    } =
      getDateRange(req);

    const {
      searchParams,
    } =
      new URL(req.url);

    /*
     * ─────────────────────────────
     * Country filter
     * ─────────────────────────────
     */

    const rawCountry =
      searchParams.get(
        "country"
      );

    const country =
      rawCountry &&
      rawCountry.toLowerCase() !==
        "all"
        ? rawCountry.toUpperCase()
        : "all";

    const countryFilter:
      Prisma.AnalyticsEventWhereInput =
      country !== "all"
        ? {
            shopperCountryCode:
              country,
          }
        : {};

    /*
     * ─────────────────────────────
     * Discovery source filter
     * ─────────────────────────────
     */

    const rawSource =
      searchParams.get(
        "source"
      );

    const normalizedSource =
      String(
        rawSource ?? ""
      )
        .trim()
        .toUpperCase();

    const source =
      normalizedSource &&
      normalizedSource !==
        "ALL" &&
      (
        DISCOVERY_SOURCES as readonly string[]
      ).includes(
        normalizedSource
      )
        ? normalizedSource
        : "all";

    const discoverySourceFilter:
      Prisma.AnalyticsEventWhereInput =
      source !== "all"
        ? {
            metadata: {
              path: [
                "discoverySource",
              ],

              equals:
                source,
            },
          }
        : {};

    /*
     * ─────────────────────────────
     * Find actual brand
     * ─────────────────────────────
     *
     * Important distinction:
     *
     * Brand exists + no analytics
     * is NOT the same as
     * brand not existing.
     */

    const brand =
      await prisma.brand.findUnique({
        where: {
          slug:
            decodedBrandSlug,
        },

        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

    if (!brand) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Brand not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ─────────────────────────────
     * Fetch ALL relevant events
     * for this brand
     * ─────────────────────────────
     */

    const events =
      await prisma.analyticsEvent.findMany({
        where: {
          brandId:
            brand.id,

          eventType: {
            in: [

              AnalyticsEventType.BRAND_VIEW,

              AnalyticsEventType.PRODUCT_IMPRESSION,

              AnalyticsEventType.PRODUCT_VIEW,

              AnalyticsEventType.WISHLIST_ADD,

              AnalyticsEventType.SHOP_CLICK,
            ],
          },

          createdAt: {
            gte:
              start,

            lt:
              endExclusive,
          },

          ...countryFilter,

          ...discoverySourceFilter,
        },

        select: {
  sessionId: true,

  eventType: true,

  productId: true,

  sectionKey: true,

  contextType: true,

  product: {
  select: {
    id: true,
    title: true,
    slug: true,

    /*
     * Legacy single product type.
     */
    productType: true,

    /*
     * Current multi-product-type relation.
     */
    productTypes: {
      select: {
        productType: true,
      },
    },

    productColours: {
      select: {
        colour: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    },

    productStyles: {
      select: {
        style: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    },

    productMaterials: {
      select: {
        material: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    },

    productOccasions: {
      select: {
        occasion: {
          select: {
            name: true,
            slug: true,
          },
        },
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
},
        },

        /*
         * Generous safety limit.
         * This is brand-scoped rather than
         * global Index traffic.
         */
        take: 100_000,
      });

    /*
     * ─────────────────────────────
     * Overall brand behaviour
     * ─────────────────────────────
     */

    const brandBehaviour =
      createBehaviourRow();

      /*
 * ─────────────────────────────
 * Brand profile intelligence
 * ─────────────────────────────
 *
 * This is deliberately separate
 * from Brand Heat.
 */

let profileViews = 0;
let profileProductImpressions = 0;

const profileViewSessions =
  new Set<string>();

const profileProductExposureSessions =
  new Set<string>();

const profileProductViewSessions =
  new Set<string>();

const profileWishlistSessions =
  new Set<string>();

const profileShopSessions =
  new Set<string>();

    /*
     * ─────────────────────────────
     * Individual product behaviour
     * ─────────────────────────────
     */

    const productMap =
      new Map<
        string,
        {
          productId: string;
          title: string;
          slug: string | null;
          imageUrl: string | null;
          behaviour: BehaviourRow;
        }
      >();

const productTypeSignalMap =
  new Map<
    string,
    BrandSignalRow
  >();

const colourSignalMap =
  new Map<
    string,
    BrandSignalRow
  >();

const styleSignalMap =
  new Map<
    string,
    BrandSignalRow
  >();

const materialSignalMap =
  new Map<
    string,
    BrandSignalRow
  >();

const occasionSignalMap =
  new Map<
    string,
    BrandSignalRow
  >();

    for (
  const event of events
) {
  /*
   * ─────────────────────────────
   * Brand profile views
   * ─────────────────────────────
   */

  if (
    event.eventType ===
    AnalyticsEventType.BRAND_VIEW
  ) {
    profileViews += 1;

    profileViewSessions.add(
      event.sessionId
    );
  }

  /*
   * Overall Brand Heat behaviour.
   *
   * BRAND_VIEW is safely ignored
   * by addBehaviourEvent().
   */
  addBehaviourEvent(
    brandBehaviour,
    event.eventType,
    event.sessionId
  );

  /*
   * ─────────────────────────────
   * Behaviour from brand profile
   * ─────────────────────────────
   *
   * We use the explicit brand
   * product-grid context rather
   * than relying on request timing.
   */

  const fromBrandProfile =
    event.sectionKey ===
      "brand_product_grid" ||
    event.contextType ===
      "BRAND_PRODUCT_GRID";

  if (fromBrandProfile) {
  if (
    event.eventType ===
    AnalyticsEventType.PRODUCT_IMPRESSION
  ) {
    profileProductImpressions += 1;

    profileProductExposureSessions.add(
      event.sessionId
    );
  }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      profileProductViewSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      profileWishlistSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      profileShopSessions.add(
        event.sessionId
      );
    }
  }

  if (
    !event.productId ||
    !event.product
  ) {
    continue;
  }

      const {
  product,
  eventType,
  sessionId,
} = event;

/*
 * ─────────────────────────────
 * Product types
 * ─────────────────────────────
 *
 * Keep legacy productType and
 * newer multi-type relation.
 *
 * Set prevents duplicates.
 */

const productTypes =
  new Set<string>();

if (product.productType) {
  productTypes.add(
    product.productType
  );
}

for (
  const row of
    product.productTypes ?? []
) {
  if (row.productType) {
    productTypes.add(
      row.productType
    );
  }
}

for (
  const productType of
    productTypes
) {
  addBrandSignalEvent({
    map:
      productTypeSignalMap,

    key:
      productType,

    label:
      productType
        .toLowerCase()
        .replaceAll(
          "_",
          " "
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        ),

    eventType,
    sessionId,
  });
}

/*
 * ─────────────────────────────
 * Colours
 * ─────────────────────────────
 */

for (
  const row of
    product.productColours ?? []
) {
  const colour =
    row.colour;

  if (!colour) {
    continue;
  }

  addBrandSignalEvent({
    map:
      colourSignalMap,

    key:
      colour.slug,

    label:
      colour.name,

    eventType,
    sessionId,
  });
}

/*
 * ─────────────────────────────
 * Styles
 * ─────────────────────────────
 */

for (
  const row of
    product.productStyles ?? []
) {
  const style =
    row.style;

  if (!style) {
    continue;
  }

  addBrandSignalEvent({
    map:
      styleSignalMap,

    key:
      style.slug,

    label:
      style.name,

    eventType,
    sessionId,
  });
}

/*
 * ─────────────────────────────
 * Materials
 * ─────────────────────────────
 */

for (
  const row of
    product.productMaterials ?? []
) {
  const material =
    row.material;

  if (!material) {
    continue;
  }

  addBrandSignalEvent({
    map:
      materialSignalMap,

    key:
      material.slug,

    label:
      material.name,

    eventType,
    sessionId,
  });
}

/*
 * ─────────────────────────────
 * Occasions
 * ─────────────────────────────
 */

for (
  const row of
    product.productOccasions ?? []
) {
  const occasion =
    row.occasion;

  if (!occasion) {
    continue;
  }

  addBrandSignalEvent({
    map:
      occasionSignalMap,

    key:
      occasion.slug,

    label:
      occasion.name,

    eventType,
    sessionId,
  });
}

      const existing =
        productMap.get(
          event.productId
        ) ?? {
          productId:
            event.product.id,

          title:
            event.product.title,

          slug:
            event.product.slug,

          imageUrl:
            event.product
              .images[0]
              ?.url ??
            null,

          behaviour:
            createBehaviourRow(),
        };

      addBehaviourEvent(
        existing.behaviour,
        event.eventType,
        event.sessionId
      );

      productMap.set(
        event.productId,
        existing
      );
    }

    const brandMetrics =
      buildBehaviourMetrics(
        brandBehaviour
      );

      /*
 * ─────────────────────────────
 * Brand profile metrics
 * ─────────────────────────────
 */

const uniqueProfileViewers =
  profileViewSessions.size;

/*
 * Of shoppers exposed to this
 * brand somewhere on Veilora,
 * how many also explored the
 * brand profile?
 *
 * We call this exploration rate
 * rather than claiming strict
 * chronological causation.
 */

const exposedProfileViewers =
  intersectionSize(
    brandBehaviour.impressionSessions,
    profileViewSessions
  );

const profileExplorationRate =
  safeRate(
    exposedProfileViewers,
    brandBehaviour.impressionSessions.size
  );

/*
 * Profile shopping journey.
 *
 * Numerators must also belong
 * to a session that viewed the
 * brand profile.
 */

const profileToExposureSessions =
  intersectionSize(
    profileViewSessions,
    profileProductExposureSessions
  );

const profileToProductViewSessions =
  intersectionSize(
    profileViewSessions,
    profileProductViewSessions
  );

const profileToWishlistSessions =
  intersectionSize(
    profileViewSessions,
    profileWishlistSessions
  );

const profileToShopSessions =
  intersectionSize(
    profileViewSessions,
    profileShopSessions
  );

const profileIntelligence = {
  profileViews,

  uniqueProfileViewers,

  profileProductImpressions,

  exposedProfileViewers,

  profileExplorationRate,

  /*
   * Unique shoppers reaching
   * each stage from the brand
   * profile journey.
   */

  profileProductExposureSessions:
    profileToExposureSessions,

  profileProductViewSessions:
    profileToProductViewSessions,

  profileWishlistSessions:
    profileToWishlistSessions,

  profileShopSessions:
    profileToShopSessions,

  /*
   * Rates use unique profile
   * viewers as denominator.
   */

  profileToExposureRate:
    safeRate(
      profileToExposureSessions,
      uniqueProfileViewers
    ),

  profileToProductViewRate:
    safeRate(
      profileToProductViewSessions,
      uniqueProfileViewers
    ),

  profileToWishlistRate:
    safeRate(
      profileToWishlistSessions,
      uniqueProfileViewers
    ),

  profileToShopRate:
    safeRate(
      profileToShopSessions,
      uniqueProfileViewers
    ),
};     

    const products =
      Array.from(
        productMap.values()
      )
        .map(
          (product) => ({
            productId:
              product.productId,

            title:
              product.title,

            slug:
              product.slug,

            brandName:
              brand.name,

            brandSlug:
              brand.slug,

            imageUrl:
              product.imageUrl,

            ...buildBehaviourMetrics(
              product.behaviour
            ),
          })
        )

        
        .sort(
          (a, b) => {
            const aQualifies =
              a.uniqueImpressionSessions >=
              MIN_HEAT_SESSIONS;

            const bQualifies =
              b.uniqueImpressionSessions >=
              MIN_HEAT_SESSIONS;

            /*
             * Qualifying products first.
             */
            if (
              aQualifies &&
              !bQualifies
            ) {
              return -1;
            }

            if (
              !aQualifies &&
              bQualifies
            ) {
              return 1;
            }

            /*
             * Among qualifying products:
             * strongest Heat first.
             */
            if (
              aQualifies &&
              bQualifies
            ) {
              if (
                b.strengthScore !==
                a.strengthScore
              ) {
                return (
                  b.strengthScore -
                  a.strengthScore
                );
              }

              return (
                b.uniqueImpressionSessions -
                a.uniqueImpressionSessions
              );
            }

            /*
             * Low sample:
             * closest to qualifying first.
             */
            return (
              b.uniqueImpressionSessions -
              a.uniqueImpressionSessions
            );
          }
                );

/*
 * ─────────────────────────────
 * Brand market signals
 * ─────────────────────────────
 */

const marketSignals = {
  productTypes:
    buildBrandSignalRows(
      productTypeSignalMap
    ),

  colours:
    buildBrandSignalRows(
      colourSignalMap
    ),

  styles:
    buildBrandSignalRows(
      styleSignalMap
    ),

  materials:
    buildBrandSignalRows(
      materialSignalMap
    ),

  occasions:
    buildBrandSignalRows(
      occasionSignalMap
    ),
};

    return NextResponse.json({
      ok: true,

      filters: {
        country,
        source,
      },

      range: {
        start:
          start.toISOString(),

        endExclusive:
          endExclusive.toISOString(),
      },

      minimumHeatSessions:
        MIN_HEAT_SESSIONS,

      brand: {
        brandId:
          brand.id,

        name:
          brand.name,

        slug:
          brand.slug,

        ...brandMetrics,
      },

      products,
      profileIntelligence,
      marketSignals,
    });
  } catch (error) {
    console.error(
      "Brand intelligence failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "Unable to load brand intelligence",
      },
      {
        status: 500,
      }
    );
  }
}