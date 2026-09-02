import {
  AnalyticsEventType,
  AnalyticsSourcePage,
  Prisma,
} from "@prisma/client";

import {
  DISCOVERY_SOURCES as ALL_DISCOVERY_SOURCES,
  normalizeDiscoverySource,
} from "@/lib/analytics/discoverySource";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISCOVERY_SOURCES =
  ALL_DISCOVERY_SOURCES.filter(
    (source) =>
      source !== "PRODUCT"
  ) as readonly Exclude<
    (typeof ALL_DISCOVERY_SOURCES)[number],
    "PRODUCT"
  >[];

const AGE_BANDS = [
  "13-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

const MIN_SIGNAL_SESSIONS =
  5;

function startOfUtcDay(
  date: Date
) {
  const copy =
    new Date(date);

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

function getInsightsDiscoverySource(
  metadata: unknown,
  fallbackSource?:
    | AnalyticsSourcePage
    | null
): string {
  let metadataSource:
    string | null = null;

  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata)
  ) {
    const value =
      (
        metadata as {
          discoverySource?: unknown;
        }
      ).discoverySource;

    if (
      typeof value === "string"
    ) {
      metadataSource =
        normalizeDiscoverySource(
          value
        );
    }
  }

  /*
   * PRODUCT is a physical PDP
   * location, not an Insights
   * discovery source.
   */
  if (
    metadataSource &&
    metadataSource !== "PRODUCT"
  ) {
    return metadataSource;
  }

  const fallback =
    normalizeDiscoverySource(
      fallbackSource
    );

  if (
    fallback &&
    fallback !== "PRODUCT"
  ) {
    return fallback;
  }

  return "OTHER";
}

function getDateRange(
  req: NextRequest
) {
  const {
    searchParams,
  } = new URL(req.url);

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

  if (
    range === "today"
  ) {
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
        : range ===
            "90d"
          ? 90
          : 30;

    const endExclusive =
      addUtcDays(
        startOfUtcDay(
          now
        ),
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

  if (
    range === "1y"
  ) {
    const endExclusive =
      addUtcDays(
        startOfUtcDay(
          now
        ),
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
    range ===
      "custom" &&
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

function intersectionSize(
  left: Set<string>,
  right: Set<string>
) {
  let count =
    0;

  for (
    const value of left
  ) {
    if (
      right.has(value)
    ) {
      count +=
        1;
    }
  }

  return count;
}

type SignalBucket = {
  exposed: Set<string>;
  viewed: Set<string>;
  saved: Set<string>;
  shopped: Set<string>;
};

type SignalEvent = {
  sessionId: string;
  eventType?: AnalyticsEventType;
  signals: string[];
};

type AgeProductTypeCell = {
  ageBand: string;
  productType: string;

  exposedSessions: number;
  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;

  eligible: boolean;

  status:
    | "QUALIFYING"
    | "LOW_SAMPLE";
};

type DiscoveryProductTypeCell = {
  discoverySource: string;
  productType: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;

  eligible: boolean;

  status:
    | "QUALIFYING"
    | "LOW_SAMPLE";
};

type OpportunityRow = {
  countryCode: string;
  ageBand: string;
  marketCode: string;
  discoverySource: string;
  productType: string;

  exposedSessions: number;

  viewSessions: number;
  saveSessions: number;
  shopSessions: number;

  viewRate: number;
  saveRate: number;
  shopIntentRate: number;

  strength: number;
  strengthScore: number;
};

function buildResponseSignals(
  exposureEvents: SignalEvent[],
  responseEvents: SignalEvent[]
) {
  const signalMap =
    new Map<
      string,
      SignalBucket
    >();

  /*
   * Exposure creates the signal.
   */
  for (
    const event of
      exposureEvents
  ) {
    for (
      const signal of
        event.signals
    ) {
      let bucket =
        signalMap.get(
          signal
        );

      if (!bucket) {
        bucket = {
          exposed:
            new Set<string>(),
          viewed:
            new Set<string>(),
          saved:
            new Set<string>(),
          shopped:
            new Set<string>(),
        };

        signalMap.set(
          signal,
          bucket
        );
      }

      bucket.exposed.add(
        event.sessionId
      );
    }
  }

  /*
   * Response can only contribute
   * to a signal that had qualifying
   * exposure.
   */
  for (
    const event of
      responseEvents
  ) {
    for (
      const signal of
        event.signals
    ) {
      const bucket =
        signalMap.get(
          signal
        );

      if (!bucket) {
        continue;
      }

      if (
        event.eventType ===
        AnalyticsEventType.PRODUCT_VIEW
      ) {
        bucket.viewed.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.WISHLIST_ADD
      ) {
        bucket.saved.add(
          event.sessionId
        );
      }

      if (
        event.eventType ===
        AnalyticsEventType.SHOP_CLICK
      ) {
        bucket.shopped.add(
          event.sessionId
        );
      }
    }
  }

  return Array.from(
    signalMap.entries()
  )
    .map(
      ([
        signal,
        bucket,
      ]) => {
        const exposedSessions =
          bucket.exposed.size;

        const viewSessions =
          intersectionSize(
            bucket.exposed,
            bucket.viewed
          );

        const saveSessions =
          intersectionSize(
            bucket.exposed,
            bucket.saved
          );

        const shopSessions =
          intersectionSize(
            bucket.exposed,
            bucket.shopped
          );

        const viewRate =
          safeRate(
            viewSessions,
            exposedSessions
          );

        const saveRate =
          safeRate(
            saveSessions,
            exposedSessions
          );

        const shopIntentRate =
          safeRate(
            shopSessions,
            exposedSessions
          );

        const strength =
          viewRate * 0.2 +
          saveRate * 0.3 +
          shopIntentRate * 0.5;

        const eligible =
          exposedSessions >=
          MIN_SIGNAL_SESSIONS;

        return {
          signal,
          exposedSessions,
          viewSessions,
          saveSessions,
          shopSessions,
          viewRate,
          saveRate,
          shopIntentRate,
          strength,
          strengthScore:
            strength * 100,
          eligible,
          status:
            eligible
              ? "QUALIFYING"
              : "LOW_SAMPLE",
        };
      }
    )
    .sort(
      (a, b) => {
        if (
          a.eligible !==
          b.eligible
        ) {
          return a.eligible
            ? -1
            : 1;
        }

        if (
          a.eligible &&
          b.eligible
        ) {
          return (
            b.strength -
              a.strength ||
            b.exposedSessions -
              a.exposedSessions
          );
        }

        return (
          b.exposedSessions -
          a.exposedSessions
        );
      }
    );
}

function calculateAge(
  dateOfBirth: Date,
  referenceDate: Date
) {
  let age =
    referenceDate.getUTCFullYear() -
    dateOfBirth.getUTCFullYear();

  const referenceMonth =
    referenceDate.getUTCMonth();

  const birthMonth =
    dateOfBirth.getUTCMonth();

  if (
    referenceMonth <
      birthMonth ||
    (
      referenceMonth ===
        birthMonth &&
      referenceDate.getUTCDate() <
        dateOfBirth.getUTCDate()
    )
  ) {
    age -= 1;
  }

  return age;
}

function getAgeBand(
  dateOfBirth:
    | Date
    | null,
  referenceDate: Date
) {
  if (!dateOfBirth) {
    return null;
  }

  const age =
    calculateAge(
      dateOfBirth,
      referenceDate
    );

  if (
    age >= 13 &&
    age <= 17
  ) {
    return "13-17";
  }

  if (
    age >= 18 &&
    age <= 24
  ) {
    return "18-24";
  }

  if (
    age >= 25 &&
    age <= 34
  ) {
    return "25-34";
  }

  if (
    age >= 35 &&
    age <= 44
  ) {
    return "35-44";
  }

  if (
    age >= 45 &&
    age <= 54
  ) {
    return "45-54";
  }

  if (
    age >= 55 &&
    age <= 64
  ) {
    return "55-64";
  }

  if (
    age >= 65
  ) {
    return "65+";
  }

  return null;
}

export async function GET(
  req: NextRequest
) {
  try {
    const {
      start,
      endExclusive,
    } = getDateRange(req);

    const {
      searchParams,
    } = new URL(req.url);

    /*
     * ─────────────────────────
     * Filters
     * ─────────────────────────
     */

    const rawMarket =
      searchParams
        .get("market")
        ?.trim();

    const market =
      !rawMarket ||
      rawMarket.toLowerCase() ===
        "all"
        ? "all"
        : rawMarket.toUpperCase();

    const rawCountry =
      searchParams
        .get("country")
        ?.trim();

    const country =
      !rawCountry ||
      rawCountry.toLowerCase() ===
        "all"
        ? "all"
        : rawCountry.toUpperCase();

    const rawAge =
      searchParams
        .get("age")
        ?.trim();

    const requestedAge =
      !rawAge ||
      rawAge.toLowerCase() ===
        "all"
        ? "all"
        : rawAge;

    const age =
      requestedAge ===
        "all" ||
      AGE_BANDS.includes(
        requestedAge as
          (typeof AGE_BANDS)[number]
      )
        ? requestedAge
        : "all";

    const rawSource =
      searchParams
        .get("source")
        ?.trim();

    const requestedSource =
      !rawSource ||
      rawSource.toLowerCase() ===
        "all"
        ? "all"
        : rawSource.toUpperCase();

    const source =
      requestedSource ===
        "all" ||
      DISCOVERY_SOURCES.includes(
        requestedSource as
          (typeof DISCOVERY_SOURCES)[number]
      )
        ? requestedSource
        : "all";

    /*
     * Discovery source is attributed
     * using metadata.discoverySource.
     */
    const responseDiscoverySourceFilter:
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

const impressionDiscoverySourceFilter:
  Prisma.AnalyticsEventWhereInput =
  source !== "all"
    ? {
        OR: [
          {
            metadata: {
              path: [
                "discoverySource",
              ],

              equals:
                source,
            },
          },

          {
            sourcePage:
              source as
                AnalyticsSourcePage,
          },
        ],
      }
    : {};

    /*
     * ─────────────────────────
     * Filter dropdown data
     * ─────────────────────────
     */

    const [
      shoppers,
      marketRows,
    ] =
      await Promise.all([
        prisma.shopper.findMany({
          select: {
            id: true,
            countryCode:
              true,
            dateOfBirth:
              true,
          },
        }),

        prisma.brand.findMany({
          where: {
            baseCountryCode: {
              not: null,
            },
          },

          select: {
            baseCountryCode:
              true,
          },
        }),
      ]);

    const countries =
      Array.from(
        new Set(
          shoppers
            .map(
              (
                shopper
              ) =>
                shopper.countryCode
                  ?.trim()
                  .toUpperCase()
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
        )
      ).sort();

    const markets =
      Array.from(
        new Set(
          marketRows
            .map(
              (
                row
              ) =>
                row.baseCountryCode
                  ?.trim()
                  .toUpperCase()
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(
                  value
                )
            )
        )
      ).sort();

    /*
     * Shopper lookup allows us to
     * attach registered country and
     * age to each session.
     */

    const shopperMap =
      new Map(
        shoppers.map(
          (
            shopper
          ) => [
            shopper.id,
            shopper,
          ]
        )
      );

    /*
     * ─────────────────────────
     * Candidate sessions
     * ─────────────────────────
     */

    const sessions =
      await prisma.analyticsSession.findMany({
        select: {
          id: true,
          shopperId:
            true,
        },
      });

    /*
     * Apply registered-country and
     * age filters here.
     *
     * Anonymous sessions remain when
     * country/age are both ALL.
     *
     * Selecting either demographic
     * filter naturally restricts the
     * cohort to registered shoppers.
     */

    const ageReferenceDate =
      new Date(
        endExclusive.getTime() -
          1
      );

    const filteredSessions =
      sessions.filter(
        (
          session
        ) => {
          if (
            country ===
            "all" &&
            age === "all"
          ) {
            return true;
          }

          if (
            !session.shopperId
          ) {
            return false;
          }

          const shopper =
            shopperMap.get(
              session.shopperId
            );

          if (
            !shopper
          ) {
            return false;
          }

          if (
            country !==
              "all" &&
            shopper.countryCode
              ?.trim()
              .toUpperCase() !==
              country
          ) {
            return false;
          }

          if (
            age !==
            "all"
          ) {
            const shopperAgeBand =
              getAgeBand(
                shopper.dateOfBirth,
                ageReferenceDate
              );

            if (
              shopperAgeBand !==
              age
            ) {
              return false;
            }
          }

          return true;
        }
      );

    const sessionIds =
      filteredSessions.map(
        (
          session
        ) =>
          session.id
      );

    const sessionShopperMap =
      new Map(
        filteredSessions.map(
          (
            session
          ) => [
            session.id,
            session.shopperId,
          ]
        )
      );

    /*
     * ─────────────────────────
     * Exposure cohort
     * ─────────────────────────
     *
     * Insights starts from
     * PRODUCT_IMPRESSION.
     *
     * This is important:
     * WHO wants WHAT should be
     * based on shoppers who were
     * actually exposed.
     */

    const impressionEvents =
      sessionIds.length
        ? await prisma.analyticsEvent.findMany({
            where: {
              sessionId: {
                in:
                  sessionIds,
              },

              createdAt: {
                gte:
                  start,

                lt:
                  endExclusive,
              },

              eventType:
                AnalyticsEventType.PRODUCT_IMPRESSION,

              ...impressionDiscoverySourceFilter,
              brandId: {
                not: null,
              },

              brand:
                market !==
                "all"
                  ? {
                      is: {
                        baseCountryCode:
                          market,
                      },
                    }
                  : {
                      is: {
                        baseCountryCode: {
                          not: null,
                        },
                      },
                    },
            },

           select: {
  sessionId: true,

  metadata: true,

  sourcePage: true,

  productId: true,

  brand: {
    select: {
      baseCountryCode:
        true,
    },
  },

  product: {
  select: {
    productTypes: {
      select: {
        productType: true,
      },
    },

    productOccasions: {
      select: {
        occasion: {
          select: {
            name: true,
          },
        },
      },
    },

    productColours: {
      select: {
        colour: {
          select: {
            name: true,
          },
        },
      },
    },

    productStyles: {
      select: {
        style: {
          select: {
            name: true,
          },
        },
      },
    },

    productMaterials: {
      select: {
        material: {
          select: {
            name: true,
          },
        },
      },
    },
  },
},
},

            take: 50_000,
          })
        : [];

    /*
     * Unique exposed sessions
     * after ALL global filters.
     */

    const exposedSessionIds =
      new Set(
        impressionEvents.map(
          (
            event
          ) =>
            event.sessionId
        )
      );

      /*
 * ─────────────────────────
 * Identified shopper cohort
 * ─────────────────────────
 *
 * Sessions measure visits.
 * Shoppers measure people.
 *
 * A registered shopper may
 * have multiple exposed
 * sessions in the reporting
 * period.
 */

const exposedShopperIds =
  new Set<string>();

  const identifiedExposedSessionIds =
  new Set<string>();

const shopperExposedSessionMap =
  new Map<
    string,
    Set<string>
  >();

for (
  const sessionId of
    exposedSessionIds
) {
  const shopperId =
    sessionShopperMap.get(
      sessionId
    );

  if (!shopperId) {
    continue;
  }

    identifiedExposedSessionIds.add(
    sessionId
  );

  exposedShopperIds.add(
    shopperId
  );

  const sessions =
    shopperExposedSessionMap.get(
      shopperId
    ) ??
    new Set<string>();

  sessions.add(
    sessionId
  );

  shopperExposedSessionMap.set(
    shopperId,
    sessions
  );
}

/*
 * Returning shopper =
 * identified shopper with
 * more than one qualifying
 * exposed session during the
 * selected reporting period.
 */

let returningShoppers =
  0;

for (
  const sessions of
    shopperExposedSessionMap.values()
) {
  if (
    sessions.size > 1
  ) {
    returningShoppers +=
      1;
  }
}

const sessionsPerShopper =
  exposedShopperIds.size > 0
    ? identifiedExposedSessionIds.size /
      exposedShopperIds.size
    : 0;

const returningShopperRate =
  safeRate(
    returningShoppers,
    exposedShopperIds.size
  );

    /*
     * ─────────────────────────
     * Question 1
     *
     * Who responds to this
     * brand market?
     *
     * Registered country
     * distribution among exposed
     * sessions.
     * ─────────────────────────
     */

    const countrySessionMap =
  new Map<
    string,
    Set<string>
  >();

const countryShopperMap =
  new Map<
    string,
    Set<string>
  >();

for (
  const sessionId of
    exposedSessionIds
) {
  const shopperId =
    sessionShopperMap.get(
      sessionId
    );

  if (!shopperId) {
    continue;
  }

  const shopper =
    shopperMap.get(
      shopperId
    );

  const shopperCountry =
    shopper?.countryCode
      ?.trim()
      .toUpperCase();

  if (
    !shopperCountry
  ) {
    continue;
  }

  const sessionSet =
    countrySessionMap.get(
      shopperCountry
    ) ??
    new Set<string>();

  sessionSet.add(
    sessionId
  );

  countrySessionMap.set(
    shopperCountry,
    sessionSet
  );

  const shopperSet =
    countryShopperMap.get(
      shopperCountry
    ) ??
    new Set<string>();

  shopperSet.add(
    shopperId
  );

  countryShopperMap.set(
    shopperCountry,
    shopperSet
  );
}

const knownCountrySessionIds =
  new Set<string>();

for (
  const set of
    countrySessionMap.values()
) {
  for (
    const sessionId of
      set
  ) {
    knownCountrySessionIds.add(
      sessionId
    );
  }
}

const knownCountryShopperIds =
  new Set<string>();

for (
  const set of
    countryShopperMap.values()
) {
  for (
    const shopperId of
      set
  ) {
    knownCountryShopperIds.add(
      shopperId
    );
  }
}

const audienceByCountry =
  Array.from(
    countryShopperMap.entries()
  )
    .map(
      ([
        countryCode,
        shoppers,
      ]) => ({
        countryCode,

        shoppers:
          shoppers.size,

        exposedSessions:
          countrySessionMap.get(
            countryCode
          )?.size ?? 0,

        share:
          safeRate(
            shoppers.size,
            knownCountryShopperIds.size
          ),
      })
    )
    .sort(
      (
        a,
        b
      ) =>
        b.shoppers -
          a.shoppers ||
        b.exposedSessions -
          a.exposedSessions
    );

    /*
     * ─────────────────────────
     * Question 2
     *
     * Which age groups respond
     * to this brand market?
     * ─────────────────────────
     */

    const ageSessionMap =
  new Map<
    string,
    Set<string>
  >();

const ageShopperMap =
  new Map<
    string,
    Set<string>
  >();

for (
  const sessionId of
    exposedSessionIds
) {
  const shopperId =
    sessionShopperMap.get(
      sessionId
    );

  if (!shopperId) {
    continue;
  }

  const shopper =
    shopperMap.get(
      shopperId
    );

  if (
    !shopper?.dateOfBirth
  ) {
    continue;
  }

  const shopperAgeBand =
    getAgeBand(
      shopper.dateOfBirth,
      ageReferenceDate
    );

  if (
    !shopperAgeBand
  ) {
    continue;
  }

  const sessionSet =
    ageSessionMap.get(
      shopperAgeBand
    ) ??
    new Set<string>();

  sessionSet.add(
    sessionId
  );

  ageSessionMap.set(
    shopperAgeBand,
    sessionSet
  );

  const shopperSet =
    ageShopperMap.get(
      shopperAgeBand
    ) ??
    new Set<string>();

  shopperSet.add(
    shopperId
  );

  ageShopperMap.set(
    shopperAgeBand,
    shopperSet
  );
}

const knownAgeSessionIds =
  new Set<string>();

for (
  const set of
    ageSessionMap.values()
) {
  for (
    const sessionId of
      set
  ) {
    knownAgeSessionIds.add(
      sessionId
    );
  }
}

const knownAgeShopperIds =
  new Set<string>();

for (
  const set of
    ageShopperMap.values()
) {
  for (
    const shopperId of
      set
  ) {
    knownAgeShopperIds.add(
      shopperId
    );
  }
}

const audienceByAge =
  AGE_BANDS.map(
    (
      ageBand
    ) => {
      const shoppers =
        ageShopperMap.get(
          ageBand
        ) ??
        new Set<string>();

      const sessions =
        ageSessionMap.get(
          ageBand
        ) ??
        new Set<string>();

      return {
        ageBand,

        shoppers:
          shoppers.size,

        exposedSessions:
          sessions.size,

        share:
          safeRate(
            shoppers.size,
            knownAgeShopperIds.size
          ),
      };
    }
  );

    /*
     * Useful headline/context
     */

    const marketExposureMap =
      new Map<
        string,
        Set<string>
      >();

    for (
      const event of
        impressionEvents
    ) {
      const marketCode =
        event.brand
          ?.baseCountryCode
          ?.trim()
          .toUpperCase();

      if (
        !marketCode
      ) {
        continue;
      }

      const set =
        marketExposureMap.get(
          marketCode
        ) ??
        new Set<string>();

      set.add(
        event.sessionId
      );

      marketExposureMap.set(
        marketCode,
        set
      );
    }

    const marketExposure =
      Array.from(
        marketExposureMap.entries()
      )
        .map(
          ([
            countryCode,
            sessions,
          ]) => ({
            countryCode,

            exposedSessions:
              sessions.size,
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.exposedSessions -
            a.exposedSessions
        );

        /*
 * ─────────────────────────
 * Question 3
 *
 * What does this audience
 * respond to?
 *
 * V1: Product Type
 * ─────────────────────────
 *
 * Exposure:
 * PRODUCT_IMPRESSION
 *
 * Response:
 * PRODUCT_VIEW
 * WISHLIST_ADD
 * SHOP_CLICK
 *
 * Rates use unique session
 * intersections.
 */

const responseEvents =
  exposedSessionIds.size > 0
    ? await prisma.analyticsEvent.findMany({
        where: {
          sessionId: {
            in:
              Array.from(
                exposedSessionIds
              ),
          },

          createdAt: {
            gte:
              start,

            lt:
              endExclusive,
          },

          eventType: {
            in: [
              AnalyticsEventType.PRODUCT_VIEW,
              AnalyticsEventType.WISHLIST_ADD,
              AnalyticsEventType.SHOP_CLICK,
            ],
          },

          ...responseDiscoverySourceFilter,

          productId: {
            not: null,
          },

          brand:
            market !==
            "all"
              ? {
                  is: {
                    baseCountryCode:
                      market,
                  },
                }
              : {
                  is: {
                    baseCountryCode: {
                      not: null,
                    },
                  },
                },
        },

        select: {
          sessionId:
            true,

          metadata: 
          true,

          eventType:
            true,

          sourcePage: true,

          productId:
            true,
            brand: {
  select: {
    baseCountryCode: true,
  },
},

          product: {
  select: {
    productTypes: {
      select: {
        productType: true,
      },
    },

    productOccasions: {
      select: {
        occasion: {
          select: {
            name: true,
          },
        },
      },
    },

    productColours: {
      select: {
        colour: {
          select: {
            name: true,
          },
        },
      },
    },

    productStyles: {
      select: {
        style: {
          select: {
            name: true,
          },
        },
      },
    },

    productMaterials: {
      select: {
        material: {
          select: {
            name: true,
          },
        },
      },
    },
  },
},
        },

        take: 50_000,
      })
    : [];







    /*
 * ─────────────────────────
 * Fashion signal extraction
 * ─────────────────────────
 */

function cleanSignals(
  values: Array<
    string | null | undefined
  >
) {
  return Array.from(
    new Set(
      values
        .map(
          (value) =>
            value?.trim()
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(value)
        )
    )
  );
}

const exposureProductTypes =
  impressionEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      signals:
        cleanSignals(
          event.product
            ?.productTypes.map(
              (relation) =>
                relation.productType
            ) ?? []
        ),
    })
  );

const responseProductTypes =
  responseEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      eventType:
        event.eventType,

      signals:
        cleanSignals(
          event.product
            ?.productTypes.map(
              (relation) =>
                relation.productType
            ) ?? []
        ),
    })
  );
const exposureOccasions =
  impressionEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      signals:
        cleanSignals(
          event.product
            ?.productOccasions.map(
              (relation) =>
                relation.occasion.name
            ) ?? []
        ),
    })
  );

const responseOccasions =
  responseEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      eventType:
        event.eventType,

      signals:
        cleanSignals(
          event.product
            ?.productOccasions.map(
              (relation) =>
                relation.occasion.name
            ) ?? []
        ),
    })
  );

  const exposureColours =
  impressionEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      signals:
        cleanSignals(
          event.product
            ?.productColours.map(
              (relation) =>
                relation.colour.name
            ) ?? []
        ),
    })
  );

const responseColours =
  responseEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      eventType:
        event.eventType,

      signals:
        cleanSignals(
          event.product
            ?.productColours.map(
              (relation) =>
                relation.colour.name
            ) ?? []
        ),
    })
  );

  const exposureStyles =
  impressionEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      signals:
        cleanSignals(
          event.product
            ?.productStyles.map(
              (relation) =>
                relation.style.name
            ) ?? []
        ),
    })
  );

const responseStyles =
  responseEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      eventType:
        event.eventType,

      signals:
        cleanSignals(
          event.product
            ?.productStyles.map(
              (relation) =>
                relation.style.name
            ) ?? []
        ),
    })
  );

  const exposureMaterials =
  impressionEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      signals:
        cleanSignals(
          event.product
            ?.productMaterials.map(
              (relation) =>
                relation.material.name
            ) ?? []
        ),
    })
  );

const responseMaterials =
  responseEvents.map(
    (event) => ({
      sessionId:
        event.sessionId,

      eventType:
        event.eventType,

      signals:
        cleanSignals(
          event.product
            ?.productMaterials.map(
              (relation) =>
                relation.material.name
            ) ?? []
        ),
    })
  );

  const productTypeSignals =
  buildResponseSignals(
    exposureProductTypes,
    responseProductTypes
  );

const occasionSignals =
  buildResponseSignals(
    exposureOccasions,
    responseOccasions
  );

const colourSignals =
  buildResponseSignals(
    exposureColours,
    responseColours
  );

const styleSignals =
  buildResponseSignals(
    exposureStyles,
    responseStyles
  );

const materialSignals =
  buildResponseSignals(
    exposureMaterials,
    responseMaterials
  );

  /*
 * ─────────────────────────
 * Age × Product Type
 * ─────────────────────────
 *
 * Each cell independently
 * measures product-type
 * response within an age band.
 */

const heatmapAgeBands =
  age === "all"
    ? AGE_BANDS
    : AGE_BANDS.filter(
        (band) =>
          band === age
      );

const ageProductTypeHeatmap:
  AgeProductTypeCell[] =
  [];

for (
  const ageBand of
    heatmapAgeBands
) {
  /*
   * Only sessions belonging
   * to registered shoppers
   * in this age band.
   */

  const ageBandSessionIds =
    ageSessionMap.get(
      ageBand
    ) ??
    new Set<string>();

  /*
   * Exposure events for this
   * particular age cohort.
   */

  const ageExposureEvents =
    exposureProductTypes.filter(
      (event) =>
        ageBandSessionIds.has(
          event.sessionId
        )
    );

  /*
   * Response events for the
   * same age cohort.
   */

  const ageResponseEvents =
    responseProductTypes.filter(
      (event) =>
        ageBandSessionIds.has(
          event.sessionId
        )
    );

  const signals =
    buildResponseSignals(
      ageExposureEvents,
      ageResponseEvents
    );

  for (
    const signal of
      signals
  ) {
    ageProductTypeHeatmap.push({
      ageBand,

      productType:
        signal.signal,

      exposedSessions:
        signal.exposedSessions,

      viewSessions:
        signal.viewSessions,

      saveSessions:
        signal.saveSessions,

      shopSessions:
        signal.shopSessions,

      viewRate:
        signal.viewRate,

      saveRate:
        signal.saveRate,

      shopIntentRate:
        signal.shopIntentRate,

      strength:
        signal.strength,

      strengthScore:
        signal.strengthScore,

      eligible:
        signal.eligible,

      status:
        signal.status as
          | "QUALIFYING"
          | "LOW_SAMPLE",
    });
  }
}

/*
 * ─────────────────────────
 * Market × Shopper Country
 * ─────────────────────────
 *
 * Each cell measures how
 * registered shoppers from
 * one country respond to
 * products belonging to
 * brands from one market.
 */

const marketCountryCellMap =
  new Map<
    string,
    SignalBucket
  >();

function getMarketCountryBucket(
  marketCode: string,
  countryCode: string
) {
  const key =
    `${marketCode}:${countryCode}`;

  let bucket =
    marketCountryCellMap.get(
      key
    );

  if (!bucket) {
    bucket = {
      exposed:
        new Set<string>(),
      viewed:
        new Set<string>(),
      saved:
        new Set<string>(),
      shopped:
        new Set<string>(),
    };

    marketCountryCellMap.set(
      key,
      bucket
    );
  }

  return bucket;
}

/*
 * Denominator:
 * qualifying impressions.
 */

for (
  const event of
    impressionEvents
) {
  const marketCode =
    event.brand
      ?.baseCountryCode
      ?.trim()
      .toUpperCase();

  if (!marketCode) {
    continue;
  }

  const shopperId =
    sessionShopperMap.get(
      event.sessionId
    );

  if (!shopperId) {
    continue;
  }

  const shopper =
    shopperMap.get(
      shopperId
    );

  const countryCode =
    shopper?.countryCode
      ?.trim()
      .toUpperCase();

  if (!countryCode) {
    continue;
  }

  getMarketCountryBucket(
    marketCode,
    countryCode
  ).exposed.add(
    event.sessionId
  );
}

/*
 * Numerators:
 * response to products from
 * the SAME brand market.
 */

for (
  const event of
    responseEvents
) {
  const marketCode =
    event.brand
      ?.baseCountryCode
      ?.trim()
      .toUpperCase();

  if (!marketCode) {
    continue;
  }

  const shopperId =
    sessionShopperMap.get(
      event.sessionId
    );

  if (!shopperId) {
    continue;
  }

  const shopper =
    shopperMap.get(
      shopperId
    );

  const countryCode =
    shopper?.countryCode
      ?.trim()
      .toUpperCase();

  if (!countryCode) {
    continue;
  }

  const bucket =
    marketCountryCellMap.get(
      `${marketCode}:${countryCode}`
    );

  /*
   * No qualifying exposure
   * means this response cannot
   * create a matrix cell.
   */
  if (!bucket) {
    continue;
  }

  if (
    event.eventType ===
    AnalyticsEventType.PRODUCT_VIEW
  ) {
    bucket.viewed.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.WISHLIST_ADD
  ) {
    bucket.saved.add(
      event.sessionId
    );
  }

  if (
    event.eventType ===
    AnalyticsEventType.SHOP_CLICK
  ) {
    bucket.shopped.add(
      event.sessionId
    );
  }
}

const marketByShopperCountry =
  Array.from(
    marketCountryCellMap.entries()
  )
    .map(
      ([
        key,
        bucket,
      ]) => {
        const [
          marketCode,
          countryCode,
        ] =
          key.split(":");

        const exposedSessions =
          bucket.exposed.size;

        const viewSessions =
          intersectionSize(
            bucket.exposed,
            bucket.viewed
          );

        const saveSessions =
          intersectionSize(
            bucket.exposed,
            bucket.saved
          );

        const shopSessions =
          intersectionSize(
            bucket.exposed,
            bucket.shopped
          );

        const viewRate =
          safeRate(
            viewSessions,
            exposedSessions
          );

        const saveRate =
          safeRate(
            saveSessions,
            exposedSessions
          );

        const shopIntentRate =
          safeRate(
            shopSessions,
            exposedSessions
          );

        const strength =
          viewRate * 0.2 +
          saveRate * 0.3 +
          shopIntentRate * 0.5;

        const eligible =
          exposedSessions >=
          MIN_SIGNAL_SESSIONS;

        return {
          marketCode,
          countryCode,

          exposedSessions,
          viewSessions,
          saveSessions,
          shopSessions,

          viewRate,
          saveRate,
          shopIntentRate,

          strength,
          strengthScore:
            strength * 100,

          eligible,

          status:
            eligible
              ? "QUALIFYING"
              : "LOW_SAMPLE",
        };
      }
    );

    /*
 * ───────────────────────────────
 * Discovery Source × Product Type
 * ───────────────────────────────
 */

const discoveryProductTypeMap =
  new Map<
    string,
    SignalBucket
  >();

function getDiscoveryProductTypeBucket(
  discoverySource: string,
  productType: string
) {
  const key =
    `${discoverySource}:${productType}`;

  let bucket =
    discoveryProductTypeMap.get(
      key
    );

  if (!bucket) {
    bucket = {
      exposed:
        new Set<string>(),
      viewed:
        new Set<string>(),
      saved:
        new Set<string>(),
      shopped:
        new Set<string>(),
    };

    discoveryProductTypeMap.set(
      key,
      bucket
    );
  }

  return bucket;
}

for (
  const event of impressionEvents
) {
  const discoverySource =
    getInsightsDiscoverySource(
      event.metadata,
      event.sourcePage

    );

  const productTypes =
    event.product
      ?.productTypes
      ?.map(
        (item) =>
          item.productType
      )
      .filter(Boolean) ?? [];

  for (
    const productType of
      productTypes
  ) {
    getDiscoveryProductTypeBucket(
      discoverySource,
      productType
    ).exposed.add(
      event.sessionId
    );
  }
}

for (
  const event of responseEvents
) {
  const discoverySource =
      getInsightsDiscoverySource(
      event.metadata,
      event.sourcePage

    );

  const productTypes =
    event.product
      ?.productTypes
      ?.map(
        (item) =>
          item.productType
      )
      .filter(Boolean) ?? [];

  for (
    const productType of
      productTypes
  ) {
    const bucket =
      discoveryProductTypeMap.get(
        `${discoverySource}:${productType}`
      );

    /*
     * A response cannot create
     * a cell without an exposure
     * denominator.
     */
    if (!bucket) {
      continue;
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      bucket.viewed.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      bucket.saved.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      bucket.shopped.add(
        event.sessionId
      );
    }
  }
}

const discoveryByProductType:
  DiscoveryProductTypeCell[] =
  Array.from(
    discoveryProductTypeMap.entries()
  ).map(
    ([key, bucket]) => {
      const separatorIndex =
        key.indexOf(":");

      const discoverySource =
        key.slice(
          0,
          separatorIndex
        );

      const productType =
        key.slice(
          separatorIndex + 1
        );

      const exposedSessions =
        bucket.exposed.size;

      const viewSessions =
        intersectionSize(
          bucket.exposed,
          bucket.viewed
        );

      const saveSessions =
        intersectionSize(
          bucket.exposed,
          bucket.saved
        );

      const shopSessions =
        intersectionSize(
          bucket.exposed,
          bucket.shopped
        );

      const viewRate =
        safeRate(
          viewSessions,
          exposedSessions
        );

      const saveRate =
        safeRate(
          saveSessions,
          exposedSessions
        );

      const shopIntentRate =
        safeRate(
          shopSessions,
          exposedSessions
        );

      const strength =
        viewRate * 0.2 +
        saveRate * 0.3 +
        shopIntentRate * 0.5;

      const eligible =
        exposedSessions >=
        MIN_SIGNAL_SESSIONS;

      return {
        discoverySource,
        productType,

        exposedSessions,
        viewSessions,
        saveSessions,
        shopSessions,

        viewRate,
        saveRate,
        shopIntentRate,

        strength,
        strengthScore:
          strength * 100,

        eligible,

        status:
          eligible
            ? "QUALIFYING"
            : "LOW_SAMPLE",
      };
    }
  );

  /*
 * ───────────────────────────────
 * Strongest Opportunities
 * ───────────────────────────────
 *
 * Registered Country
 * × Age
 * × Brand Market
 * × Discovery Source
 * × Product Type
 *
 * Only qualifying combinations
 * are returned.
 */

const opportunityMap =
  new Map<
    string,
    SignalBucket
  >();

function buildOpportunityKey({
  countryCode,
  ageBand,
  marketCode,
  discoverySource,
  productType,
}: {
  countryCode: string;
  ageBand: string;
  marketCode: string;
  discoverySource: string;
  productType: string;
}) {
  return [
    countryCode,
    ageBand,
    marketCode,
    discoverySource,
    productType,
  ].join("|||");
}

function getOpportunityBucket(
  key: string
) {
  let bucket =
    opportunityMap.get(
      key
    );

  if (!bucket) {
    bucket = {
      exposed:
        new Set<string>(),
      viewed:
        new Set<string>(),
      saved:
        new Set<string>(),
      shopped:
        new Set<string>(),
    };

    opportunityMap.set(
      key,
      bucket
    );
  }

  return bucket;
}

for (
  const event of
    impressionEvents
) {
  const shopperId =
    sessionShopperMap.get(
      event.sessionId
    );

  if (!shopperId) {
    continue;
  }

  const shopper =
    shopperMap.get(
      shopperId
    );

  const countryCode =
    shopper?.countryCode
      ?.trim()
      .toUpperCase();

  if (
    !countryCode ||
    !shopper?.dateOfBirth
  ) {
    continue;
  }

  const ageBand =
    getAgeBand(
      shopper.dateOfBirth,
      ageReferenceDate
    );

  if (!ageBand) {
    continue;
  }

  const marketCode =
    event.brand
      ?.baseCountryCode
      ?.trim()
      .toUpperCase();

  if (!marketCode) {
    continue;
  }

  const discoverySource =
    getInsightsDiscoverySource(
      event.metadata,
      event.sourcePage
    );

  /*
   * OTHER is technically valid,
   * but it is not useful enough
   * for opportunity ranking.
   */
  if (
    discoverySource ===
    "OTHER"
  ) {
    continue;
  }

  const productTypes =
    cleanSignals(
      event.product
        ?.productTypes.map(
          (relation) =>
            relation.productType
        ) ?? []
    );

  for (
    const productType of
      productTypes
  ) {
    const key =
      buildOpportunityKey({
        countryCode,
        ageBand,
        marketCode,
        discoverySource,
        productType,
      });

    getOpportunityBucket(
      key
    ).exposed.add(
      event.sessionId
    );
  }
}

for (
  const event of
    responseEvents
) {
  const shopperId =
    sessionShopperMap.get(
      event.sessionId
    );

  if (!shopperId) {
    continue;
  }

  const shopper =
    shopperMap.get(
      shopperId
    );

  const countryCode =
    shopper?.countryCode
      ?.trim()
      .toUpperCase();

  if (
    !countryCode ||
    !shopper?.dateOfBirth
  ) {
    continue;
  }

  const ageBand =
    getAgeBand(
      shopper.dateOfBirth,
      ageReferenceDate
    );

  if (!ageBand) {
    continue;
  }

  const marketCode =
    event.brand
      ?.baseCountryCode
      ?.trim()
      .toUpperCase();

  if (!marketCode) {
    continue;
  }

  /*
   * Responses must preserve the
   * ORIGINAL discovery source.
   *
   * Never fall back to PRODUCT.
   */
  const discoverySource =
    getInsightsDiscoverySource(
      event.metadata
    );

  if (
    discoverySource ===
    "OTHER"
  ) {
    continue;
  }

  const productTypes =
    cleanSignals(
      event.product
        ?.productTypes.map(
          (relation) =>
            relation.productType
        ) ?? []
    );

  for (
    const productType of
      productTypes
  ) {
    const key =
      buildOpportunityKey({
        countryCode,
        ageBand,
        marketCode,
        discoverySource,
        productType,
      });

    const bucket =
      opportunityMap.get(
        key
      );

    /*
     * Response can't create
     * an opportunity without
     * qualifying exposure.
     */
    if (!bucket) {
      continue;
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      bucket.viewed.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      bucket.saved.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      bucket.shopped.add(
        event.sessionId
      );
    }
  }
}

const strongestOpportunities:
  OpportunityRow[] =
  Array.from(
    opportunityMap.entries()
  )
    .map(
      ([
        key,
        bucket,
      ]) => {
        const [
          countryCode,
          ageBand,
          marketCode,
          discoverySource,
          productType,
        ] =
          key.split(
            "|||"
          );

        const exposedSessions =
          bucket.exposed.size;

        const viewSessions =
          intersectionSize(
            bucket.exposed,
            bucket.viewed
          );

        const saveSessions =
          intersectionSize(
            bucket.exposed,
            bucket.saved
          );

        const shopSessions =
          intersectionSize(
            bucket.exposed,
            bucket.shopped
          );

        const viewRate =
          safeRate(
            viewSessions,
            exposedSessions
          );

        const saveRate =
          safeRate(
            saveSessions,
            exposedSessions
          );

        const shopIntentRate =
          safeRate(
            shopSessions,
            exposedSessions
          );

        const strength =
          viewRate * 0.2 +
          saveRate * 0.3 +
          shopIntentRate * 0.5;

        return {
          countryCode,
          ageBand,
          marketCode,
          discoverySource,
          productType,

          exposedSessions,

          viewSessions,
          saveSessions,
          shopSessions,

          viewRate,
          saveRate,
          shopIntentRate,

          strength,

          strengthScore:
            strength * 100,
        };
      }
    )

    /*
     * This is crucial.
     *
     * Tiny combinations never become
     * executive recommendations.
     */
    .filter(
      (row) =>
        row.exposedSessions >=
        MIN_SIGNAL_SESSIONS
    )

    .sort(
      (a, b) =>
        b.strengthScore -
          a.strengthScore ||
        b.exposedSessions -
          a.exposedSessions
    )

    .slice(
      0,
      12
    );
   return NextResponse.json({
      ok: true,

      filters: {
        market,
        country,
        age,
        source,

        markets,
        countries,

        ageBands:
          AGE_BANDS,

        discoverySources:
          DISCOVERY_SOURCES,
      },

      range: {
        start:
          start.toISOString(),

        endExclusive:
          endExclusive.toISOString(),
      },

      overview: {
  exposedSessions:
    exposedSessionIds.size,

  identifiedShoppers:
    exposedShopperIds.size,

  sessionsPerShopper,

  returningShoppers,

  returningShopperRate,

  knownCountryShoppers:
    knownCountryShopperIds.size,

  knownAgeShoppers:
    knownAgeShopperIds.size,

  knownCountrySessions:
    knownCountrySessionIds.size,

  knownAgeSessions:
    knownAgeSessionIds.size,
},

      audienceByCountry,

audienceByAge,

marketExposure,

responseSignals: {
  productTypes:
    productTypeSignals,

  occasions:
    occasionSignals,

  colours:
    colourSignals,

  styles:
    styleSignals,

  materials:
    materialSignals,
},

crossIntelligence: {
  ageByProductType:
    ageProductTypeHeatmap,

  marketByShopperCountry,

  discoveryByProductType,
},

opportunities: {
  strongest:
    strongestOpportunities,
},

    });

  } catch (error) {
    console.error(
      "Insights analytics failed",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    return NextResponse.json(
      {
        ok: false,
        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}