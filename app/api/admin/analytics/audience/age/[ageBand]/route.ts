import {
  AnalyticsEventType,
  Prisma,
} from "@prisma/client";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

import {
  calculateAge,
} from "@/lib/analytics/ageBands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SIGNAL_SESSIONS = 5;
const DISCOVERY_SOURCES = [
  "HOME",
  "SEARCH",
  "BRAND",
  "CATEGORY",
  "DIARY",
  "STYLE_FEED",
  "CONTINENT",
  "EMERGING_BRANDS",
  "NEW_IN",
  "SALE",
  "OTHER",
] as const;

function startOfUtcDay(
  date: Date
) {
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
  const copy = new Date(date);

  copy.setUTCDate(
    copy.getUTCDate() + days
  );

  return copy;
}

function getDateRange(
  req: NextRequest
) {
  const {
    searchParams,
  } = new URL(req.url);

  const range =
    searchParams.get("range") ??
    "30d";

  const from =
    searchParams.get("from");

  const to =
    searchParams.get("to");

  const now = new Date();

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

  if (
    range === "7d" ||
    range === "30d" ||
    range === "90d"
  ) {
    const days =
      range === "7d"
        ? 7
        : range === "90d"
          ? 90
          : 30;

    const endExclusive =
      addUtcDays(
        startOfUtcDay(now),
        1
      );

    return {
      start:
        addUtcDays(
          endExclusive,
          -days
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
  if (denominator <= 0) {
    return 0;
  }

  return (
    numerator /
    denominator
  );
}

function strengthScore({
  impressionSessions,
  viewSessions,
  wishlistSessions,
  shopSessions,
}: {
  impressionSessions: Set<string>;
  viewSessions: Set<string>;
  wishlistSessions: Set<string>;
  shopSessions: Set<string>;
}) {
  const exposed =
    impressionSessions.size;

  if (!exposed) {
    return 0;
  }

  const viewRate =
    safeRate(
      intersectionSize(
        impressionSessions,
        viewSessions
      ),
      exposed
    );

  const saveRate =
    safeRate(
      intersectionSize(
        impressionSessions,
        wishlistSessions
      ),
      exposed
    );

  const shopIntentRate =
    safeRate(
      intersectionSize(
        impressionSessions,
        shopSessions
      ),
      exposed
    );

  return (
    viewRate * 0.2 +
    saveRate * 0.3 +
    shopIntentRate * 0.5
  );
}

type BehaviourRow = {
  key: string;
  label: string;

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

function addBehaviourEvent({
  map,
  key,
  label,
  eventType,
  sessionId,
}: {
  map: Map<
    string,
    BehaviourRow
  >;

  key: string;
  label: string;

  eventType:
    AnalyticsEventType;

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

function buildRows(
  map: Map<
    string,
    BehaviourRow
  >
) {
  return Array.from(
    map.values()
  )
    .map((row) => {
      const exposed =
        row
          .impressionSessions
          .size;

      const viewRate =
        safeRate(
          intersectionSize(
            row.impressionSessions,
            row.viewSessions
          ),
          exposed
        );

      const saveRate =
        safeRate(
          intersectionSize(
            row.impressionSessions,
            row.wishlistSessions
          ),
          exposed
        );

      const shopIntentRate =
        safeRate(
          intersectionSize(
            row.impressionSessions,
            row.shopSessions
          ),
          exposed
        );

      const score =
        strengthScore(row);

      const qualifies =
        exposed >=
        MIN_SIGNAL_SESSIONS;

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
          row
            .impressionSessions
            .size,

        uniqueViewSessions:
          row
            .viewSessions
            .size,

        uniqueWishlistSessions:
          row
            .wishlistSessions
            .size,

        uniqueShopSessions:
          row
            .shopSessions
            .size,

        viewRate,
        saveRate,
        shopIntentRate,

        strengthScore:
          score,

        qualifies,
      };
    })
    .sort((a, b) => {
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
      }

      return (
        b.uniqueImpressionSessions -
        a.uniqueImpressionSessions
      );
    });
}

function parseAgeBand(
  value: string
) {
  const decoded =
    decodeURIComponent(value);

  if (decoded === "65+") {
    return {
      label: "65+",
      min: 65,
      max: null,
    };
  }

  const match =
    decoded.match(
      /^(\d+)-(\d+)$/
    );

  if (!match) {
    return null;
  }

  const min =
    Number(match[1]);

  const max =
    Number(match[2]);

  const allowed =
    [
      "13-17",
      "18-24",
      "25-34",
      "35-44",
      "45-54",
      "55-64",
    ];

  if (
    !allowed.includes(
      decoded
    )
  ) {
    return null;
  }

  return {
    label: decoded,
    min,
    max,
  };
}

function shopperMatchesAgeBand(
  dateOfBirth: Date,
  band: {
    min: number;
    max: number | null;
  },
  referenceDate: Date
) {
  const age =
    calculateAge(
      dateOfBirth,
      referenceDate
    );

  if (age < band.min) {
    return false;
  }

  if (
    band.max != null &&
    age > band.max
  ) {
    return false;
  }

  return true;
}

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      ageBand: string;
    }>;
  }
) {
  try {
    const {
      ageBand: rawAgeBand,
    } = await params;

    const band =
      parseAgeBand(
        rawAgeBand
      );

    if (!band) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid age band",
        },
        {
          status: 400,
        }
      );
    }

    const {
      start,
      endExclusive,
    } = getDateRange(req);

    /*
     * Use the end of the selected
     * reporting period as the age
     * reference point.
     *
     * This is better than always
     * calculating age today.
     */
    const ageReferenceDate =
      new Date(
        endExclusive.getTime() -
          1
      );

    const {
      searchParams,
    } = new URL(req.url);

    const rawCountry =
  searchParams.get(
    "country"
  );

const country =
  rawCountry &&
  rawCountry.toLowerCase() !==
    "all"
    ? rawCountry
        .trim()
        .toUpperCase()
    : "all";

const rawSource =
  searchParams.get(
    "source"
  );

const requestedSource =
  rawSource &&
  rawSource.toLowerCase() !==
    "all"
    ? rawSource
        .trim()
        .toUpperCase()
    : "all";

const source =
  requestedSource === "all" ||
  DISCOVERY_SOURCES.includes(
    requestedSource as
      (typeof DISCOVERY_SOURCES)[number]
  )
    ? requestedSource
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
     * Find all registered shoppers
     * with DOB.
     */
   const shoppers =
  await prisma.shopper.findMany({
    where: {
      dateOfBirth: {
        not: null,
      },
    },

    select: {
      id: true,
      dateOfBirth: true,
      countryCode: true,
    },
  });

    /*
     * Determine which shoppers
     * belong to this age band.
     */
    const matchingShopperIds =
  shoppers
    .filter(
      (shopper) => {
        if (
          !shopper.dateOfBirth
        ) {
          return false;
        }

        const matchesAge =
          shopperMatchesAgeBand(
            shopper.dateOfBirth,
            band,
            ageReferenceDate
          );

        const matchesCountry =
          country === "all" ||
          shopper.countryCode
            ?.trim()
            .toUpperCase() ===
            country;

        return (
          matchesAge &&
          matchesCountry
        );
      }
    )
    .map(
      (shopper) =>
        shopper.id
    );

    /*
     * Total known-age audience,
     * used for audience share.
     */
   const knownAgeAudience =
  country === "all"
    ? shoppers.length
    : shoppers.filter(
        (shopper) =>
          shopper.countryCode
            ?.trim()
            .toUpperCase() ===
          country
      ).length;

    const audienceSize =
      matchingShopperIds.length;

    const audienceShare =
      safeRate(
        audienceSize,
        knownAgeAudience
      );

      /*
 * Countries represented by
 * this age audience during
 * the reporting period.
 *
 * This query is intentionally
 * NOT filtered by the selected
 * country so the dropdown keeps
 * showing all available options.
 */
const availableCountryRows =
  matchingShopperIds.length
    ? await prisma.analyticsSession.findMany({
        where: {
          shopperId: {
            in:
              matchingShopperIds,
          },

          lastSeenAt: {
            gte: start,
            lt:
              endExclusive,
          },

          shopperCountryCode: {
            not: null,
          },
        },

        select: {
          shopperCountryCode:
            true,
        },

        distinct: [
          "shopperCountryCode",
        ],
      })
    : [];

const countries =
  Array.from(
    new Set(
      shoppers
        .map(
          (shopper) =>
            shopper.countryCode
              ?.trim()
              .toUpperCase()
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    )
  ).sort();

    /*
     * Find analytics sessions
     * belonging to this age group.
     */
    const sessions =
  matchingShopperIds.length
    ? await prisma.analyticsSession.findMany({
        where: {
          shopperId: {
            in:
              matchingShopperIds,
          },

          lastSeenAt: {
            gte: start,
            lt:
              endExclusive,
          },

          
        },

        select: {
          id: true,
        },
      })
    : [];

    const sessionIds =
      sessions.map(
        (session) =>
          session.id
      );

    /*
     * Pull only behaviour belonging
     * to this age segment.
     */
    const events =
      sessionIds.length
        ? await prisma.analyticsEvent.findMany({
            where: {
              sessionId: {
                in:
                  sessionIds,
              },

              createdAt: {
                gte: start,
                lt:
                  endExclusive,
              },

              eventType: {
                in: [
                  AnalyticsEventType.PRODUCT_IMPRESSION,
                  AnalyticsEventType.PRODUCT_VIEW,
                  AnalyticsEventType.WISHLIST_ADD,
                  AnalyticsEventType.SHOP_CLICK,
                ],
              },

              ...discoverySourceFilter,

              brandId: {
                not: null,
              },
            },

            select: {
              sessionId:
                true,

              eventType:
                true,

              productId:
                true,

              brandId:
                true,

              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,

                  productType:
                    true,

                  productTypes: {
                    select: {
                      productType:
                        true,
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
                      sortOrder:
                        "asc",
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
          })
        : [];
const filteredActiveSessionIds =
  new Set(
    events.map(
      (event) =>
        event.sessionId
    )
  );
    /*
     * ─────────────────────────
     * Overall shopper response
     * ─────────────────────────
     */

    const impressionSessions =
      new Set<string>();

    const viewSessions =
      new Set<string>();

    const wishlistSessions =
      new Set<string>();

    const shopSessions =
      new Set<string>();

    let impressions = 0;
    let views = 0;
    let wishlistAdds = 0;
    let shopClicks = 0;

    for (
      const event of events
    ) {
      if (
        event.eventType ===
        AnalyticsEventType.PRODUCT_IMPRESSION
      ) {
        impressions += 1;

        impressionSessions.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.PRODUCT_VIEW
      ) {
        views += 1;

        viewSessions.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.WISHLIST_ADD
      ) {
        wishlistAdds += 1;

        wishlistSessions.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.SHOP_CLICK
      ) {
        shopClicks += 1;

        shopSessions.add(
          event.sessionId
        );
      }
    }

    const exposedSessions =
      impressionSessions.size;

    const viewRate =
      safeRate(
        intersectionSize(
          impressionSessions,
          viewSessions
        ),
        exposedSessions
      );

    const saveRate =
      safeRate(
        intersectionSize(
          impressionSessions,
          wishlistSessions
        ),
        exposedSessions
      );

    const shopIntentRate =
      safeRate(
        intersectionSize(
          impressionSessions,
          shopSessions
        ),
        exposedSessions
      );

    /*
     * ─────────────────────────
     * Signal maps
     * ─────────────────────────
     */

    const productTypes =
      new Map<
        string,
        BehaviourRow
      >();

    const colours =
      new Map<
        string,
        BehaviourRow
      >();

    const styles =
      new Map<
        string,
        BehaviourRow
      >();

    const materials =
      new Map<
        string,
        BehaviourRow
      >();

    const occasions =
      new Map<
        string,
        BehaviourRow
      >();

    const brands =
      new Map<
        string,
        BehaviourRow
      >();

    const products =
      new Map<
        string,
        BehaviourRow
      >();

    for (
      const event of events
    ) {
      if (!event.product) {
        continue;
      }

      const {
        product,
        eventType,
        sessionId,
      } = event;

      /*
       * Product types
       */
      const types =
        new Set<string>();

      if (
        product.productType
      ) {
        types.add(
          product.productType
        );
      }

      for (
        const row of
          product.productTypes ??
          []
      ) {
        if (
          row.productType
        ) {
          types.add(
            row.productType
          );
        }
      }

      for (
        const type of types
      ) {
        addBehaviourEvent({
          map:
            productTypes,

          key:
            type,

          label:
            type
              .toLowerCase()
              .replaceAll(
                "_",
                " "
              )
              .replace(
                /\b\w/g,
                (m) =>
                  m.toUpperCase()
              ),

          eventType,
          sessionId,
        });
      }

      /*
       * Colours
       */
      for (
        const row of
          product.productColours ??
          []
      ) {
        if (!row.colour) {
          continue;
        }

        addBehaviourEvent({
          map:
            colours,

          key:
            row.colour.slug,

          label:
            row.colour.name,

          eventType,
          sessionId,
        });
      }

      /*
       * Styles
       */
      for (
        const row of
          product.productStyles ??
          []
      ) {
        if (!row.style) {
          continue;
        }

        addBehaviourEvent({
          map:
            styles,

          key:
            row.style.slug,

          label:
            row.style.name,

          eventType,
          sessionId,
        });
      }

      /*
       * Materials
       */
      for (
        const row of
          product.productMaterials ??
          []
      ) {
        if (!row.material) {
          continue;
        }

        addBehaviourEvent({
          map:
            materials,

          key:
            row.material.slug,

          label:
            row.material.name,

          eventType,
          sessionId,
        });
      }

      /*
       * Occasions
       */
      for (
        const row of
          product.productOccasions ??
          []
      ) {
        if (!row.occasion) {
          continue;
        }

        addBehaviourEvent({
          map:
            occasions,

          key:
            row.occasion.slug,

          label:
            row.occasion.name,

          eventType,
          sessionId,
        });
      }

      /*
       * Brands
       */
      if (
        event.brandId &&
        event.brand
      ) {
        addBehaviourEvent({
          map:
            brands,

          key:
            event.brandId,

          label:
            event.brand.name,

          eventType,
          sessionId,
        });
      }

      /*
       * Products
       */
      addBehaviourEvent({
        map:
          products,

        key:
          product.id,

        label:
          product.title,

        eventType,
        sessionId,
      });
    }

    return NextResponse.json({
      ok: true,

      filters: {
  country,
  source,

  countries,

  discoverySources:
    DISCOVERY_SOURCES,
},

      segment: {
        type: "AGE",
        key:
          band.label,
        label:
          band.label,

        audienceSize,
        audienceShare,

        activeSessions:
  source === "all"
    ? sessions.length
    : filteredActiveSessionIds.size,
      },

      range: {
        start:
          start.toISOString(),

        endExclusive:
          endExclusive.toISOString(),
      },

      behaviour: {
        impressions,
        views,
        wishlistAdds,
        shopClicks,

        uniqueExposedSessions:
          impressionSessions.size,

        uniqueViewSessions:
          viewSessions.size,

        uniqueWishlistSessions:
          wishlistSessions.size,

        uniqueShopSessions:
          shopSessions.size,

        viewRate,
        saveRate,
        shopIntentRate,
      },

      signals: {
        productTypes:
          buildRows(
            productTypes
          ).slice(0, 20),

        colours:
          buildRows(
            colours
          ).slice(0, 20),

        styles:
          buildRows(
            styles
          ).slice(0, 20),

        materials:
          buildRows(
            materials
          ).slice(0, 20),

        occasions:
          buildRows(
            occasions
          ).slice(0, 20),
      },

      brands:
        buildRows(
          brands
        ).slice(0, 20),

      products:
        buildRows(
          products
        ).slice(0, 25),
    });
  } catch (error) {
    console.error(
      "Age audience intelligence failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to load age audience intelligence",
      },
      {
        status: 500,
      }
    );
  }
}