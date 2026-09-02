import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {  AnalyticsEventType,  Prisma,} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfUtcDay(date: Date) {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
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


function addUtcDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

const MIN_SIGNAL_SESSIONS = 5;

function qualifiesForIndex(
  row: MarketSignalRow
) {
  return (
    row.impressionSessions.size >=
    MIN_SIGNAL_SESSIONS
  );
}



function getDateRange(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const range = searchParams.get("range") ?? "30d";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = new Date();

  if (range === "today") {
    const start = startOfUtcDay(now);

    return {
      start,
      endExclusive: addUtcDays(start, 1),
    };
  }

  if (range === "7d") {
    const endExclusive = addUtcDays(
      startOfUtcDay(now),
      1
    );

    const start = addUtcDays(
      endExclusive,
      -7
    );

    return {
      start,
      endExclusive,
    };
  }

  if (range === "90d") {
  const endExclusive = addUtcDays(
    startOfUtcDay(now),
    1
  );

  const start = addUtcDays(
    endExclusive,
    -90
  );

  return {
    start,
    endExclusive,
  };
}

if (range === "1y") {
  const endExclusive = addUtcDays(
    startOfUtcDay(now),
    1
  );

  const start = addUtcDays(
    endExclusive,
    -365
  );

  return {
    start,
    endExclusive,
  };
}

  if (
    range === "custom" &&
    from &&
    to
  ) {
    const start = new Date(
      `${from}T00:00:00.000Z`
    );

    const end = new Date(
      `${to}T00:00:00.000Z`
    );

    return {
      start,
      endExclusive:
        addUtcDays(end, 1),
    };
  }

  const endExclusive = addUtcDays(
    startOfUtcDay(now),
    1
  );

  const start = addUtcDays(
    endExclusive,
    -30
  );

  return {
    start,
    endExclusive,
  };
}

function buildRankMap(
  map: Map<string, MarketSignalRow>
) {
  const rows = Array.from(map.values())
    .filter(qualifiesForIndex)
    .map((row) => ({
  key: row.key,

  score:
    marketStrengthScore(row),

  exposure:
    row.impressionSessions.size,
}))
.sort((a, b) => {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  return (
    b.exposure -
    a.exposure
  );
});

  return new Map(
    rows.map((row, index) => [
      row.key,
      index + 1,
    ])
  );
}

function buildMarketSignalRows(
  map: Map<string, MarketSignalRow>,
  previousMap?: Map<
    string,
    MarketSignalRow
  >
) {
  const currentRankMap =
  buildRankMap(map);

const previousRankMap =
  previousMap
    ? buildRankMap(previousMap)
    : new Map<string, number>(); 
  return Array.from(
    map.values()
  )
    .map((row) => {
      const exposedSessions =
        row.impressionSessions.size;

        const previous =
  previousMap?.get(row.key);

  const currentQualifies =
  qualifiesForIndex(row);

const previousQualifies =
  previous
    ? qualifiesForIndex(previous)
    : false;

  const currentRank =
  currentRankMap.get(row.key) ?? null;

const previousRank =
  previousRankMap.get(row.key) ?? null;

const currentScore =
  marketStrengthScore(row);

const previousScore =
  previous
    ? marketStrengthScore(previous)
    : 0;

    const rankChange =
  previousRank == null ||
  currentRank == null
    ? null
    : previousRank - currentRank;

let status:
  | "NEW"
  | "UP"
  | "DOWN"
  | "STABLE"
  | "LOW_SAMPLE";

if (!currentQualifies) {
  status = "LOW_SAMPLE";
} else if (!previousQualifies) {
  status = "NEW";
} else if (
  currentRank != null &&
  previousRank != null &&
  currentRank < previousRank
) {
  status = "UP";
} else if (
  currentRank != null &&
  previousRank != null &&
  currentRank > previousRank
) {
  status = "DOWN";
} else {
  status = "STABLE";
}

const brandBreakdown =
  Array.from(
    row.brandBreakdown.values()
  )
    .map((brand) => {
      const exposedSessions =
        brand.impressionSessions.size;

      const viewRate =
        safeRate(
          intersectionSize(
            brand.impressionSessions,
            brand.viewSessions
          ),
          exposedSessions
        );

      const saveRate =
        safeRate(
          intersectionSize(
            brand.impressionSessions,
            brand.wishlistSessions
          ),
          exposedSessions
        );

      const shopIntentRate =
        safeRate(
          intersectionSize(
            brand.impressionSessions,
            brand.shopSessions
          ),
          exposedSessions
        );

      const strengthScore =
        viewRate * 0.2 +
        saveRate * 0.3 +
        shopIntentRate * 0.5;

      return {
        brandId:
          brand.brandId,

        name:
          brand.name,

        slug:
          brand.slug,

        impressions:
          brand.impressions,

        views:
          brand.views,

        wishlistAdds:
          brand.wishlistAdds,

        shopClicks:
          brand.shopClicks,

        uniqueImpressionSessions:
          brand.impressionSessions.size,

        uniqueViewSessions:
          brand.viewSessions.size,

        uniqueWishlistSessions:
          brand.wishlistSessions.size,

        uniqueShopSessions:
          brand.shopSessions.size,

        viewRate,
        saveRate,
        shopIntentRate,

        strengthScore,
      };
    })
    .sort((a, b) => {
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
    });


const productBreakdown =
  Array.from(
    row.productBreakdown.values()
  )
    .map((product) => {
      const exposedSessions =
        product.impressionSessions.size;

      const viewRate =
        safeRate(
          intersectionSize(
            product.impressionSessions,
            product.viewSessions
          ),
          exposedSessions
        );

      const saveRate =
        safeRate(
          intersectionSize(
            product.impressionSessions,
            product.wishlistSessions
          ),
          exposedSessions
        );

      const shopIntentRate =
        safeRate(
          intersectionSize(
            product.impressionSessions,
            product.shopSessions
          ),
          exposedSessions
        );

      const strengthScore =
        viewRate * 0.2 +
        saveRate * 0.3 +
        shopIntentRate * 0.5;

      return {
        productId:
          product.productId,

        title:
          product.title,

        slug:
          product.slug,

        brandName:
          product.brandName,

        brandSlug:
          product.brandSlug,

        imageUrl:
          product.imageUrl,

        impressions:
          product.impressions,

        views:
          product.views,

        wishlistAdds:
          product.wishlistAdds,

        shopClicks:
          product.shopClicks,

        uniqueImpressionSessions:
          product.impressionSessions.size,

        uniqueViewSessions:
          product.viewSessions.size,

        uniqueWishlistSessions:
          product.wishlistSessions.size,

        uniqueShopSessions:
          product.shopSessions.size,

        viewRate,
        saveRate,
        shopIntentRate,

        strengthScore,
      };
    })
    .sort((a, b) => {
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
    });

      return {
        key: row.key,
        label: row.label,

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

        viewRate:
  safeRate(
    intersectionSize(
      row.impressionSessions,
      row.viewSessions
    ),
    exposedSessions
  ),

saveRate:
  safeRate(
    intersectionSize(
      row.impressionSessions,
      row.wishlistSessions
    ),
    exposedSessions
  ),

shopIntentRate:
  safeRate(
    intersectionSize(
      row.impressionSessions,
      row.shopSessions
    ),
    exposedSessions
  ),

          currentScore,
          previousScore,

momentumStatus: status,

currentRank,
previousRank,
rankChange,

brandBreakdown,
productBreakdown,

      };
    })
    .sort((a, b) => {
  /*
   * Qualifying ranked signals first,
   * in actual Veilora Index rank order.
   */
  if (
    a.currentRank != null &&
    b.currentRank != null
  ) {
    return (
      a.currentRank -
      b.currentRank
    );
  }

  /*
   * A qualifying ranked signal
   * always sits above a low-sample one.
   */
  if (a.currentRank != null) {
    return -1;
  }

  if (b.currentRank != null) {
    return 1;
  }

  /*
   * Among low-sample signals,
   * show the most exposed first.
   */
  return (
    b.uniqueImpressionSessions -
    a.uniqueImpressionSessions
  );
});
}

function safeRate(
  numerator: number,
  denominator: number
) {
  if (denominator <= 0) {
    return 0;
  }

  return numerator / denominator;
}



function marketStrengthScore(row: {
  impressionSessions: Set<string>;
  viewSessions: Set<string>;
  wishlistSessions: Set<string>;
  shopSessions: Set<string>;
}) {
  const exposedSessions =
    row.impressionSessions.size;

  if (exposedSessions <= 0) {
    return 0;
  }

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

  return (
    viewRate * 0.2 +
    saveRate * 0.3 +
    shopIntentRate * 0.5
  );
}



type SignalBrandRow = {
  brandId: string;
  name: string;
  slug: string | null;

  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;

  impressionSessions: Set<string>;
  viewSessions: Set<string>;
  wishlistSessions: Set<string>;
  shopSessions: Set<string>;
};


type MarketSignalRow = {
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

  brandBreakdown: Map<
  string,
  SignalBrandRow
>;

productBreakdown: Map<
  string,
  SignalProductRow
>;

};
type SignalProductRow = {
  productId: string;
  title: string;
  slug: string | null;

  brandName: string;
  brandSlug: string | null;

  imageUrl: string | null;

  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;

  impressionSessions: Set<string>;
  viewSessions: Set<string>;
  wishlistSessions: Set<string>;
  shopSessions: Set<string>;
};

function addMarketSignalEvent({
  map,
  key,
  label,
  eventType,
  sessionId,
  brandId,
  brandName,
  brandSlug,

  productId,
  productTitle,
  productSlug,
  productBrandName,
  productBrandSlug,
  productImageUrl,
}: {
  map: Map<string, MarketSignalRow>;
  key: string;
  label: string;
  eventType: AnalyticsEventType;
  sessionId: string;

  brandId?: string | null;
  brandName?: string | null;
  brandSlug?: string | null;

productId?: string | null;
productTitle?: string | null;
productSlug?: string | null;
productBrandName?: string | null;
productBrandSlug?: string | null;
productImageUrl?: string | null;
}) {
  const existing =
    map.get(key) ?? {
      key,
      label,

      impressions: 0,
      views: 0,
      wishlistAdds: 0,
      shopClicks: 0,

      impressionSessions: new Set<string>(),
      viewSessions: new Set<string>(),
      wishlistSessions: new Set<string>(),
      shopSessions: new Set<string>(),

      brandBreakdown:
       new Map<string, SignalBrandRow>(),

       productBreakdown:
        new Map<string, SignalProductRow>(),
    };

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_IMPRESSION
  ) {
    existing.impressions += 1;
    existing.impressionSessions.add(sessionId);
  }

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    existing.views += 1;
    existing.viewSessions.add(sessionId);
  }

  if (
    eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    existing.wishlistAdds += 1;
    existing.wishlistSessions.add(sessionId);
  }

  if (
    eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    existing.shopClicks += 1;
    existing.shopSessions.add(sessionId);
  }

  if (brandId && brandName) {
  const brand =
    existing.brandBreakdown.get(
      brandId
    ) ?? {
      brandId,
      name: brandName,
      slug: brandSlug ?? null,

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
    brand.impressions += 1;

    brand.impressionSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    brand.views += 1;

    brand.viewSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    brand.wishlistAdds += 1;

    brand.wishlistSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    brand.shopClicks += 1;

    brand.shopSessions.add(
      sessionId
    );
  }

  existing.brandBreakdown.set(
    brandId,
    brand
  );
}

if (productId && productTitle) {
  const product =
    existing.productBreakdown.get(
      productId
    ) ?? {
      productId,
      title: productTitle,
      slug: productSlug ?? null,

      brandName:
        productBrandName ??
        "Unknown",

      brandSlug:
        productBrandSlug ?? null,

      imageUrl:
        productImageUrl ?? null,

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
    product.impressions += 1;

    product.impressionSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    product.views += 1;

    product.viewSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    product.wishlistAdds += 1;

    product.wishlistSessions.add(
      sessionId
    );
  }

  if (
    eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    product.shopClicks += 1;

    product.shopSessions.add(
      sessionId
    );
  }

  existing.productBreakdown.set(
    productId,
    product
  );
}

  map.set(key, existing);
}



export async function GET(
  req: NextRequest
) {
  try {
    const {
      start,
      endExclusive,
    } = getDateRange(req);

    const { searchParams } =
  new URL(req.url);

const rawCountry =
  searchParams.get("country");

const country =
  rawCountry &&
  rawCountry.toLowerCase() !== "all"
    ? rawCountry.toUpperCase()
    : "all";

const countryFilter =
  country !== "all"
    ? {
        shopperCountryCode:
          country,
      }
    : {};

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

const rawSource =
  searchParams.get("source");

const normalizedSource =
  String(rawSource ?? "")
    .trim()
    .toUpperCase();

const source =
  normalizedSource &&
  normalizedSource !== "ALL" &&
  (
    DISCOVERY_SOURCES as readonly string[]
  ).includes(normalizedSource)
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
          equals: source,
        },
      }
    : {};

    const createdAt = {
      gte: start,
      lt: endExclusive,
    };

    const periodMs =
  endExclusive.getTime() -
  start.getTime();

const previousEndExclusive =
  new Date(start);

const previousStart =
  new Date(
    start.getTime() -
    periodMs
  );
 

const previousCreatedAt = {
  gte: previousStart,
  lt: previousEndExclusive,
};

const shouldIncludeSearch =
  source === "all" ||
  source === "SEARCH";

   const [
  searches,
  impressions,
  productViews,
  wishlistAdds,
  shopClicks,
  searchEvents,
  brandEvents,
  searchTrendEvents,
  behaviourTrendEvents,
  previousMarketEvents,
  availableCountries,

  
] = await Promise.all([
  // 1. Search count
shouldIncludeSearch
  ? prisma.analyticsEvent.count({
      where: {
        eventType:
          AnalyticsEventType.SEARCH,

        createdAt,

        ...countryFilter,
      },
    })
  : Promise.resolve(0),

  // 2. Product impression count
  prisma.analyticsEvent.count({
    where: {
      eventType:
        AnalyticsEventType.PRODUCT_IMPRESSION,
      createdAt,
      ...countryFilter,
      ...discoverySourceFilter,
    },
  }),

  // 3. Product view count
  prisma.analyticsEvent.count({
    where: {
      eventType:
        AnalyticsEventType.PRODUCT_VIEW,
      createdAt,
      ...countryFilter,
      ...discoverySourceFilter,
    },
  }),

  // 4. Wishlist count
  prisma.analyticsEvent.count({
    where: {
      eventType:
        AnalyticsEventType.WISHLIST_ADD,
      createdAt,
      ...countryFilter,
      ...discoverySourceFilter,
    },
  }),

  // 5. Shop click count
  prisma.analyticsEvent.count({
    where: {
      eventType:
        AnalyticsEventType.SHOP_CLICK,
      createdAt,
      ...countryFilter,
      ...discoverySourceFilter,
    },
  }),

 // 6. Search intelligence events
shouldIncludeSearch
  ? prisma.analyticsEvent.findMany({
      where: {
        eventType:
          AnalyticsEventType.SEARCH,

        createdAt,

        ...countryFilter,
      },

      select: {
        sessionId: true,
        query: true,
        normalizedQuery: true,
        resultsCount: true,
        shopperCountryCode: true,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 20_000,
    })
  : Promise.resolve([]),

  // 7. Current behaviour events
  prisma.analyticsEvent.findMany({
    where: {
      eventType: {
        in: [
          AnalyticsEventType.PRODUCT_IMPRESSION,
          AnalyticsEventType.PRODUCT_VIEW,
          AnalyticsEventType.WISHLIST_ADD,
          AnalyticsEventType.SHOP_CLICK,
        ],
      },

      createdAt,

      ...countryFilter,
      ...discoverySourceFilter,

      brandId: {
        not: null,
      },
    },

    select: {
      sessionId: true,
      eventType: true,

      productId: true,
      brandId: true,

      product: {
        select: {
          id: true,
          title: true,
          slug: true,

          productType: true,

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
      },

      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },

    take: 50_000,
  }),

  // 8. Search trend events
shouldIncludeSearch
  ? prisma.analyticsEvent.findMany({
      where: {
        eventType:
          AnalyticsEventType.SEARCH,

        createdAt,

        ...countryFilter,
      },

      select: {
        eventType: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "asc",
      },

      take: 100_000,
    })
  : Promise.resolve([]),

  // 9. Behaviour trend events
  prisma.analyticsEvent.findMany({
    where: {
      eventType: {
        in: [
          AnalyticsEventType.PRODUCT_VIEW,
          AnalyticsEventType.WISHLIST_ADD,
          AnalyticsEventType.SHOP_CLICK,
        ],
      },

      createdAt,

      ...countryFilter,
      ...discoverySourceFilter,
    },

    select: {
      eventType: true,
      createdAt: true,
    },

    orderBy: {
      createdAt: "asc",
    },

    take: 100_000,
  }),

  // 10. Previous-period market events
  prisma.analyticsEvent.findMany({
    where: {
      eventType: {
        in: [
          AnalyticsEventType.PRODUCT_IMPRESSION,
          AnalyticsEventType.PRODUCT_VIEW,
          AnalyticsEventType.WISHLIST_ADD,
          AnalyticsEventType.SHOP_CLICK,
        ],
      },

      createdAt:
        previousCreatedAt,

      ...countryFilter,
      ...discoverySourceFilter,

      brandId: {
        not: null,
      },
    },

    select: {
      sessionId: true,
      eventType: true,

      productId: true,
      brandId: true,

      product: {
        select: {
          id: true,
          title: true,
          slug: true,

          productType: true,

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
      },

      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },

    take: 50_000,
  }),

  // 11. Available countries
  prisma.analyticsEvent.findMany({
    where: {
      shopperCountryCode: {
        not: null,
      },
    },

    select: {
      shopperCountryCode: true,
    },

    distinct: [
      "shopperCountryCode",
    ],

    orderBy: {
      shopperCountryCode:
        "asc",
    },
  }),
]);


/*
 * ─────────────────────────────
 * Behaviour funnel sessions
 * ─────────────────────────────
 *
 * Rates in the Veilora Index are based on
 * unique shopper sessions, not raw event counts.
 */

const impressionSessionIds =
  new Set<string>();

const viewSessionIds =
  new Set<string>();

const wishlistSessionIds =
  new Set<string>();

const shopSessionIds =
  new Set<string>();

for (const event of brandEvents) {
  if (
    event.eventType ===
    AnalyticsEventType.PRODUCT_IMPRESSION
  ) {
    impressionSessionIds.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    viewSessionIds.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    wishlistSessionIds.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    shopSessionIds.add(
      event.sessionId
    );
  }
}

const exposedAndViewed =
  intersectionSize(
    impressionSessionIds,
    viewSessionIds
  );

const exposedAndSaved =
  intersectionSize(
    impressionSessionIds,
    wishlistSessionIds
  );

const exposedAndShopped =
  intersectionSize(
    impressionSessionIds,
    shopSessionIds
  );

const viewedAndSaved =
  intersectionSize(
    viewSessionIds,
    wishlistSessionIds
  );

const viewedAndShopped =
  intersectionSize(
    viewSessionIds,
    shopSessionIds
  );

const savedAndShopped =
  intersectionSize(
    wishlistSessionIds,
    shopSessionIds
  );



    const countries =
  availableCountries
    .map(
      (row) =>
        row.shopperCountryCode
    )
    .filter(
      (
        code
      ): code is string =>
        Boolean(code)
    );

    /*
     * ─────────────────────────────
     * Search intelligence
     * ─────────────────────────────
     */

    const searchMap = new Map<
      string,
      {
        query: string;
        searches: number;
        sessions: Set<string>;
        zeroResults: number;
        totalResults: number;
      }
    >();

    let zeroResultSearches = 0;

    const uniqueSearchSessions =
      new Set<string>();

    for (const event of searchEvents) {
      uniqueSearchSessions.add(
        event.sessionId
      );

      const normalized =
        event.normalizedQuery?.trim();

      if (!normalized) {
        continue;
      }

      const results =
        event.resultsCount ?? 0;

      if (results === 0) {
        zeroResultSearches += 1;
      }

      const existing =
        searchMap.get(normalized) ?? {
          query:
            event.query ??
            normalized,
          searches: 0,
          sessions:
            new Set<string>(),
          zeroResults: 0,
          totalResults: 0,
        };

      existing.searches += 1;

      existing.sessions.add(
        event.sessionId
      );

      existing.totalResults +=
        results;

      if (results === 0) {
        existing.zeroResults += 1;
      }

      searchMap.set(
        normalized,
        existing
      );
    }

    


    const topSearches =
  Array.from(
    searchMap.entries()
  )
    .map(
      ([normalizedQuery, value]) => ({
        normalizedQuery,
        query: value.query,
        searches: value.searches,
        uniqueSessions: value.sessions.size,
        zeroResults: value.zeroResults,
        zeroResultRate:
          safeRate(
            value.zeroResults,
            value.searches
          ),
        averageResults:
          value.searches > 0
            ? value.totalResults /
              value.searches
            : 0,
      })
    )

    // Keep failed searches only in Unmet Demand
    .filter(
      (row) =>
        row.zeroResults === 0
    )

    .sort(
      (a, b) =>
        b.searches -
        a.searches
    )
    .slice(0, 15);

    const unmetDemand =
      Array.from(
        searchMap.entries()
      )
        .map(
          ([normalizedQuery, value]) => ({
            normalizedQuery,

            query: value.query,

            searches:
              value.searches,

            uniqueSessions:
              value.sessions.size,

            zeroResults:
              value.zeroResults,

            zeroResultRate:
              safeRate(
                value.zeroResults,
                value.searches
              ),

            averageResults:
              value.searches > 0
                ? value.totalResults /
                  value.searches
                : 0,
          })
        )
        .filter(
          (row) =>
            row.zeroResults > 0
        )
        .sort((a, b) => {
          if (
            b.zeroResultRate !==
            a.zeroResultRate
          ) {
            return (
              b.zeroResultRate -
              a.zeroResultRate
            );
          }

          return (
            b.searches -
            a.searches
          );
        })
        .slice(0, 15);

    /*
     * ─────────────────────────────
     * Brand intelligence
     * ─────────────────────────────
     */

    const brandMap = new Map<
      string,
      {
        brandId: string;
        name: string;
        slug: string | null;

        impressions: number;
        views: number;
        shopClicks: number;

        impressionSessions:
          Set<string>;

        viewSessions:
          Set<string>;

        shopSessions:
          Set<string>;

        wishlistAdds: number;
        wishlistSessions: Set<string>;
      }
    >();

    for (const event of brandEvents) {
      if (
        !event.brandId ||
        !event.brand
      ) {
        continue;
      }

      const existing =
        brandMap.get(
          event.brandId
        ) ?? {
          brandId:
            event.brandId,

          name:
            event.brand.name,

          slug:
            event.brand.slug,

          impressions: 0,
          views: 0,
          shopClicks: 0,

          impressionSessions:
            new Set<string>(),

          viewSessions:
            new Set<string>(),

          shopSessions:
            new Set<string>(),

          wishlistAdds: 0,
          wishlistSessions:
            new Set<string>(),
        };

      if (
        event.eventType ===
        AnalyticsEventType.PRODUCT_IMPRESSION
      ) {
        existing.impressions += 1;

        existing.impressionSessions.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.PRODUCT_VIEW
      ) {
        existing.views += 1;

        existing.viewSessions.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.SHOP_CLICK
      ) {
        existing.shopClicks += 1;

        existing.shopSessions.add(
          event.sessionId
        );
      }

      if (
  event.eventType ===
  AnalyticsEventType.WISHLIST_ADD
) {
  existing.wishlistAdds += 1;

  existing.wishlistSessions.add(
    event.sessionId
  );
}

      brandMap.set(
        event.brandId,
        existing
      );
    

      
  }

 



   const brandRows =
  Array.from(
    brandMap.values()
  )
    .map((brand) => {
      const exposedSessions =
        brand.impressionSessions.size;

      const viewedAfterExposure =
        intersectionSize(
          brand.impressionSessions,
          brand.viewSessions
        );

      const savedAfterExposure =
        intersectionSize(
          brand.impressionSessions,
          brand.wishlistSessions
        );

      const shoppedAfterExposure =
        intersectionSize(
          brand.impressionSessions,
          brand.shopSessions
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
          brand.viewSessions,
          brand.wishlistSessions
        );

      const shoppedAfterView =
        intersectionSize(
          brand.viewSessions,
          brand.shopSessions
        );

      const shoppedAfterSave =
        intersectionSize(
          brand.wishlistSessions,
          brand.shopSessions
        );

      

      return {
        brandId:
          brand.brandId,

        name:
          brand.name,

        slug:
          brand.slug,

        impressions:
          brand.impressions,

        views:
          brand.views,

        wishlistAdds:
          brand.wishlistAdds,

        shopClicks:
          brand.shopClicks,

        uniqueImpressionSessions:
          brand.impressionSessions.size,

        uniqueViewSessions:
          brand.viewSessions.size,

        uniqueWishlistSessions:
          brand.wishlistSessions.size,

        uniqueShopSessions:
          brand.shopSessions.size,

          viewRate,
          saveRate,
          shopIntentRate,
          strengthScore,

        /*
         * Core Veilora Index rates:
         * unique responding sessions
         * ÷ unique exposed sessions
         */
       

        /*
         * Funnel diagnostics
         */
        impressionToShopRate:
          safeRate(
            shoppedAfterExposure,
            exposedSessions
          ),

        viewToWishlistRate:
          safeRate(
            savedAfterView,
            brand.viewSessions.size
          ),

        viewToShopRate:
          safeRate(
            shoppedAfterView,
            brand.viewSessions.size
          ),

        wishlistToShopRate:
          safeRate(
            shoppedAfterSave,
            brand.wishlistSessions.size
          ),
      };
    })
.sort((a, b) => {
  const aQualifies =
    a.uniqueImpressionSessions >=
    MIN_SIGNAL_SESSIONS;

  const bQualifies =
    b.uniqueImpressionSessions >=
    MIN_SIGNAL_SESSIONS;

  if (aQualifies && !bQualifies) {
    return -1;
  }

  if (!aQualifies && bQualifies) {
    return 1;
  }

  if (aQualifies && bQualifies) {
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

  return (
    b.uniqueImpressionSessions -
    a.uniqueImpressionSessions
  );
});


        /*
 * ─────────────────────────────
 * Product intelligence
 * ─────────────────────────────
 */

const productMap = new Map<
  string,
  {
    productId: string;
    title: string;
    slug: string | null;

    brandName: string;
    brandSlug: string | null;

    imageUrl: string | null;

    impressions: number;
    views: number;
    wishlistAdds: number;
    shopClicks: number;

    impressionSessions: Set<string>;
    viewSessions: Set<string>;
    wishlistSessions: Set<string>;
    shopSessions: Set<string>;
  }
>();

for (const event of brandEvents) {
  if (
    !event.productId ||
    !event.product
  ) {
    continue;
  }

  const existing =
    productMap.get(
      event.productId
    ) ?? {
      productId:
        event.productId,

      title:
        event.product.title,

      slug:
        event.product.slug,

      brandName:
        event.product.brand?.name ??
        "Unknown",

      brandSlug:
        event.product.brand?.slug ??
        null,

      imageUrl:
        event.product.images?.[0]?.url ??
        null,

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
    event.eventType ===
    AnalyticsEventType.PRODUCT_IMPRESSION
  ) {
    existing.impressions += 1;

    existing.impressionSessions.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    existing.views += 1;

    existing.viewSessions.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    existing.wishlistAdds += 1;

    existing.wishlistSessions.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    existing.shopClicks += 1;

    existing.shopSessions.add(
      event.sessionId
    );
  }

  productMap.set(
    event.productId,
    existing
  );
}




const productRows =
  Array.from(
    productMap.values()
  )
    .map((product) => {
      const exposedSessions =
        product.impressionSessions.size;

      const viewRate =
        safeRate(
          intersectionSize(
            product.impressionSessions,
            product.viewSessions
          ),
          exposedSessions
        );

      const saveRate =
        safeRate(
          intersectionSize(
            product.impressionSessions,
            product.wishlistSessions
          ),
          exposedSessions
        );

      const shopIntentRate =
        safeRate(
          intersectionSize(
            product.impressionSessions,
            product.shopSessions
          ),
          exposedSessions
        );

      const strengthScore =
        viewRate * 0.2 +
        saveRate * 0.3 +
        shopIntentRate * 0.5;

      return {
        productId:
          product.productId,

        title:
          product.title,

        slug:
          product.slug,

        brandName:
          product.brandName,

        brandSlug:
          product.brandSlug,

        imageUrl:
          product.imageUrl,

        impressions:
          product.impressions,

        views:
          product.views,

        wishlistAdds:
          product.wishlistAdds,

        shopClicks:
          product.shopClicks,

        uniqueImpressionSessions:
          product.impressionSessions.size,

        uniqueViewSessions:
          product.viewSessions.size,

        uniqueWishlistSessions:
          product.wishlistSessions.size,

        uniqueShopSessions:
          product.shopSessions.size,

        viewRate,
        saveRate,
        shopIntentRate,
        strengthScore,
      };
    })
    .sort((a, b) => {
  const aQualifies =
    a.uniqueImpressionSessions >=
    MIN_SIGNAL_SESSIONS;

  const bQualifies =
    b.uniqueImpressionSessions >=
    MIN_SIGNAL_SESSIONS;

  /*
   * Qualifying products always appear first.
   */
  if (aQualifies && !bQualifies) {
    return -1;
  }

  if (!aQualifies && bQualifies) {
    return 1;
  }

  /*
   * If both qualify:
   * hottest product first.
   */
  if (aQualifies && bQualifies) {
    if (
      b.strengthScore !==
      a.strengthScore
    ) {
      return (
        b.strengthScore -
        a.strengthScore
      );
    }

    /*
     * Tie-break:
     * more unique exposure wins.
     */
    return (
      b.uniqueImpressionSessions -
      a.uniqueImpressionSessions
    );
  }

  /*
   * Both are low sample:
   * show the one closest to qualifying first.
   */
  return (
    b.uniqueImpressionSessions -
    a.uniqueImpressionSessions
  );
});

/*
 * ─────────────────────────────
 * Market signals
 * ─────────────────────────────
 */

const productTypeSignalMap =
  new Map<string, MarketSignalRow>();

const colourSignalMap =
  new Map<string, MarketSignalRow>();

const styleSignalMap =
  new Map<string, MarketSignalRow>();

const materialSignalMap =
  new Map<string, MarketSignalRow>();

const occasionSignalMap =
  new Map<string, MarketSignalRow>();

  const previousProductTypeSignalMap =
  new Map<string, MarketSignalRow>();

const previousColourSignalMap =
  new Map<string, MarketSignalRow>();

const previousStyleSignalMap =
  new Map<string, MarketSignalRow>();

const previousMaterialSignalMap =
  new Map<string, MarketSignalRow>();

const previousOccasionSignalMap =
  new Map<string, MarketSignalRow>();

  for (const event of brandEvents) {
    
  if (!event.product) {
    continue;
  }

  const {
  product,
  eventType,
  sessionId,
  brandId,
  brand,
} = event;

  /*
   * Product types
   */
  const productTypes = new Set<string>();

  if (product.productType) {
    productTypes.add(
      product.productType
    );
  }

  for (
    const row of product.productTypes ?? []
  ) {
    if (row.productType) {
      productTypes.add(
        row.productType
      );
    }
  }

  for (const type of productTypes) {
    addMarketSignalEvent({
      map: productTypeSignalMap,
      key: type,
      label: type
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (m) =>
          m.toUpperCase()
        ),
      eventType,
      sessionId,

      brandId,
brandName:
  brand?.name ?? null,
brandSlug:
  brand?.slug ?? null,

  productId:
  product.id,

productTitle:
  product.title,

productSlug:
  product.slug,

productBrandName:
  product.brand?.name ?? null,

productBrandSlug:
  product.brand?.slug ?? null,

productImageUrl:
  product.images?.[0]?.url ?? null,

    });
  }

  /*
   * Colours
   */
  for (
    const row of
      product.productColours ?? []
  ) {
    const colour =
      row.colour;

    if (!colour) continue;

    addMarketSignalEvent({
      map: colourSignalMap,
      key: colour.slug,
      label: colour.name,
      eventType,
      sessionId,

      brandId,
brandName:
  brand?.name ?? null,
brandSlug:
  brand?.slug ?? null,

  productId:
  product.id,

productTitle:
  product.title,

productSlug:
  product.slug,

productBrandName:
  product.brand?.name ?? null,

productBrandSlug:
  product.brand?.slug ?? null,

productImageUrl:
  product.images?.[0]?.url ?? null,

    });
  }

  /*
   * Styles
   */
  for (
    const row of
      product.productStyles ?? []
  ) {
    const style =
      row.style;

    if (!style) continue;

    addMarketSignalEvent({
      map: styleSignalMap,
      key: style.slug,
      label: style.name,
      eventType,
      sessionId,
      brandId,
brandName:
  brand?.name ?? null,
brandSlug:
  brand?.slug ?? null,

  productId:
  product.id,

productTitle:
  product.title,

productSlug:
  product.slug,

productBrandName:
  product.brand?.name ?? null,

productBrandSlug:
  product.brand?.slug ?? null,

productImageUrl:
  product.images?.[0]?.url ?? null,
    });
  }

  /*
   * Materials
   */
  for (
    const row of
      product.productMaterials ?? []
  ) {
    const material =
      row.material;

    if (!material) continue;

    addMarketSignalEvent({
      map: materialSignalMap,
      key: material.slug,
      label: material.name,
      eventType,
      sessionId,
      brandId,
brandName:
  brand?.name ?? null,
brandSlug:
  brand?.slug ?? null,

  productId:
  product.id,

productTitle:
  product.title,

productSlug:
  product.slug,

productBrandName:
  product.brand?.name ?? null,

productBrandSlug:
  product.brand?.slug ?? null,

productImageUrl:
  product.images?.[0]?.url ?? null,
    });
  }

  /*
   * Occasions
   */
  for (
    const row of
      product.productOccasions ?? []
  ) {
    const occasion =
      row.occasion;

    if (!occasion) continue;

    addMarketSignalEvent({
      map: occasionSignalMap,
      key: occasion.slug,
      label: occasion.name,
      eventType,
      sessionId,

      brandId,
brandName:
  brand?.name ?? null,
brandSlug:
  brand?.slug ?? null,

  productId:
  product.id,

productTitle:
  product.title,

productSlug:
  product.slug,

productBrandName:
  product.brand?.name ?? null,

productBrandSlug:
  product.brand?.slug ?? null,

productImageUrl:
  product.images?.[0]?.url ?? null,
  
    });
  }
}


for (const event of previousMarketEvents) {
  if (!event.product) {
    continue;
  }

  const {
  product,
  eventType,
  sessionId,
  brandId,
  brand,
} = event;

  const productTypes =
    new Set<string>();

  if (product.productType) {
    productTypes.add(
      product.productType
    );
  }

  for (
    const row of product.productTypes ?? []
  ) {
    if (row.productType) {
      productTypes.add(
        row.productType
      );
    }
  }

  for (const type of productTypes) {
    addMarketSignalEvent({
      map:
        previousProductTypeSignalMap,

      key: type,

      label: type
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(
          /\b\w/g,
          (m) => m.toUpperCase()
        ),

      eventType,
      sessionId,
      brandId,
      brandName:
        brand?.name ?? null,
      brandSlug:
        brand?.slug ?? null,
    });
  }

  for (
    const row of
      product.productColours ?? []
  ) {
    const colour =
      row.colour;

    if (!colour) continue;

    addMarketSignalEvent({
      map:
        previousColourSignalMap,

      key:
        colour.slug,

      label:
        colour.name,

      eventType,
      sessionId,
      brandId,
      brandName:
        brand?.name ?? null,
      brandSlug:
        brand?.slug ?? null,
    });
  }

  for (
    const row of
      product.productStyles ?? []
  ) {
    const style =
      row.style;

    if (!style) continue;

    addMarketSignalEvent({
      map:
        previousStyleSignalMap,

      key:
        style.slug,

      label:
        style.name,

      eventType,
      sessionId,
      brandId,
brandName:
  brand?.name ?? null,
brandSlug:
  brand?.slug ?? null,
    });
  }

  for (
    const row of
      product.productMaterials ?? []
  ) {
    const material =
      row.material;

    if (!material) continue;

    addMarketSignalEvent({
      map:
        previousMaterialSignalMap,

      key:
        material.slug,

      label:
        material.name,

      eventType,
      sessionId,
      brandId,
      brandName:
        brand?.name ?? null,
      brandSlug:
        brand?.slug ?? null,
    });
  }

  for (
    const row of
      product.productOccasions ?? []
  ) {
    const occasion =
      row.occasion;

    if (!occasion) continue;

    addMarketSignalEvent({
      map:
        previousOccasionSignalMap,

      key:
        occasion.slug,

      label:
        occasion.name,

      eventType,
      sessionId,
      brandId,
      brandName:
        brand?.name ?? null,
      brandSlug:
        brand?.slug ?? null,
    });
  }
}


const productTypeSignals =
  buildMarketSignalRows(
    productTypeSignalMap,
    previousProductTypeSignalMap
  );

const colourSignals =
  buildMarketSignalRows(
    colourSignalMap,
    previousColourSignalMap
  );

const styleSignals =
  buildMarketSignalRows(
    styleSignalMap,
    previousStyleSignalMap
  );

const materialSignals =
  buildMarketSignalRows(
    materialSignalMap,
    previousMaterialSignalMap
  );

const occasionSignals =
  buildMarketSignalRows(
    occasionSignalMap,
    previousOccasionSignalMap
  );
    /*
 * ─────────────────────────────
 * Trend intelligence
 * ─────────────────────────────
 */

const trendMap = new Map<
  string,
  {
    date: string;
    searches: number;
    productViews: number;
    wishlistAdds: number;
    shopClicks: number;
  }
>();

/*
 * Create every day in the selected range first.
 * This ensures days with zero activity still
 * appear on the chart.
 */
for (
  let cursor = new Date(start);
  cursor < endExclusive;
  cursor = addUtcDays(cursor, 1)
) {
  const date =
    cursor
      .toISOString()
      .slice(0, 10);

  trendMap.set(date, {
    date,
    searches: 0,
    productViews: 0,
    wishlistAdds: 0,
    shopClicks: 0,
  });
}

const trendEvents = [
  ...searchTrendEvents,
  ...behaviourTrendEvents,
];

for (const event of trendEvents) {
  const date =
    event.createdAt
      .toISOString()
      .slice(0, 10);

  const row =
    trendMap.get(date);

  if (!row) {
    continue;
  }

  if (
    event.eventType ===
    AnalyticsEventType.SEARCH
  ) {
    row.searches += 1;
  }

  if (
    event.eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    row.productViews += 1;
  }

  if (
    event.eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    row.wishlistAdds += 1;
  }

  if (
    event.eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    row.shopClicks += 1;
  }
}

const trends =
  Array.from(
    trendMap.values()
  );

    return NextResponse.json({
      ok: true,
      filters: {
  country,
  source,
},

       countries,
       discoverySources:
       DISCOVERY_SOURCES,
       
      range: {
        start:
          start.toISOString(),

        endExclusive:
          endExclusive.toISOString(),
      },

      overview: {
        searches,

        uniqueSearchSessions:
          uniqueSearchSessions.size,

        zeroResultSearches,

        zeroResultRate:
          safeRate(
            zeroResultSearches,
            searches
          ),

        impressions,

        productViews,

        wishlistAdds,

        shopClicks,

        /*
 * Raw event volumes
 */


/*
 * Unique-session funnel sizes
 */
uniqueImpressionSessions:
  impressionSessionIds.size,

uniqueViewSessions:
  viewSessionIds.size,

uniqueWishlistSessions:
  wishlistSessionIds.size,

uniqueShopSessions:
  shopSessionIds.size,

/*
 * Veilora Index conversion rates
 */
productViewRate:
  safeRate(
    exposedAndViewed,
    impressionSessionIds.size
  ),

saveRate:
  safeRate(
    exposedAndSaved,
    impressionSessionIds.size
  ),

shopIntentRate:
  safeRate(
    exposedAndShopped,
    impressionSessionIds.size
  ),

impressionToShopRate:
  safeRate(
    exposedAndShopped,
    impressionSessionIds.size
  ),

viewToWishlistRate:
  safeRate(
    viewedAndSaved,
    viewSessionIds.size
  ),

viewToShopRate:
  safeRate(
    viewedAndShopped,
    viewSessionIds.size
  ),

wishlistToShopRate:
  safeRate(
    savedAndShopped,
    wishlistSessionIds.size
  ),
      },

      topSearches,
      unmetDemand,
      brands:
      brandRows.slice(0, 20),
      products:
      productRows.slice(0, 25),


marketSignals: {
  productTypes:
    productTypeSignals.slice(0, 20),

  colours:
    colourSignals.slice(0, 20),

  styles:
    styleSignals.slice(0, 20),

  materials:
    materialSignals.slice(0, 20),

  occasions:
    occasionSignals.slice(0, 20),
},

      

      trends,

    });
  } catch (error) {
    console.error(
      "Veilora Index overview failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to load Veilora Index intelligence",
      },
      {
        status: 500,
      }
    );
  }
}