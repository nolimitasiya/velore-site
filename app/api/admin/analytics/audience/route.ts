import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import {
  AnalyticsEventType,
  Prisma,
} from "@prisma/client";

import {
  AGE_BANDS,
  getAgeBand,
} from "@/lib/analytics/ageBands";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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

function getDateRange(
  req: NextRequest
) {
  const {
    searchParams,
  } =
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

  const endExclusive =
    addUtcDays(
      startOfUtcDay(now),
      1
    );

  if (
    range === "today"
  ) {
    return {
      start:
        startOfUtcDay(
          now
        ),

      endExclusive,
    };
  }

  if (
    range === "7d"
  ) {
    return {
      start:
        addUtcDays(
          endExclusive,
          -7
        ),

      endExclusive,
    };
  }

  if (
    range === "90d"
  ) {
    return {
      start:
        addUtcDays(
          endExclusive,
          -90
        ),

      endExclusive,
    };
  }

  if (
    range === "1y"
  ) {
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
  return {
    start:
      addUtcDays(
        endExclusive,
        -30
      ),

    endExclusive,
  };
}

export async function GET(
  req: NextRequest
) {
  try {
    const {
      start,
      endExclusive,
    } =
      getDateRange(req);

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

    /*
     * ─────────────────────────────
     * Registered shoppers
     * ─────────────────────────────
     */

    const shoppers =
  await prisma.shopper.findMany({
    select: {
      id: true,
      dateOfBirth: true,
      countryCode: true,
    },
  });

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

const filteredShoppers =
  country === "all"
    ? shoppers
    : shoppers.filter(
        (shopper) =>
          shopper.countryCode
            ?.trim()
            .toUpperCase() ===
          country
      );

const filteredShopperIds =
  filteredShoppers.map(
    (shopper) =>
      shopper.id
  );

    const registeredShoppers =
  filteredShoppers.length;

    const knownAgeShoppers =
  filteredShoppers.filter(
    (shopper) =>
      shopper.dateOfBirth
  );

    const knownAgeCount =
      knownAgeShoppers.length;

    const ageCoverage =
      registeredShoppers > 0
        ? knownAgeCount /
          registeredShoppers
        : 0;

    /*
     * ─────────────────────────────
     * Age distribution
     * ─────────────────────────────
     */

    const ageMap =
      new Map<
        string,
        number
      >();

    for (
      const band of AGE_BANDS
    ) {
      ageMap.set(
        band,
        0
      );
    }

    for (
      const shopper of
        knownAgeShoppers
    ) {
      const band =
        getAgeBand(
          shopper.dateOfBirth
        );

      if (!band) {
        continue;
      }

      ageMap.set(
        band,
        (
          ageMap.get(
            band
          ) ?? 0
        ) + 1
      );
    }

    const ageDistribution =
      AGE_BANDS.map(
        (band) => {
          const shoppers =
            ageMap.get(
              band
            ) ?? 0;

          return {
            ageBand:
              band,

            shoppers,

            share:
              knownAgeCount > 0
                ? shoppers /
                  knownAgeCount
                : 0,
          };
        }
      );

    /*
     * ─────────────────────────────
     * Active audience
     * ─────────────────────────────
     *
     * These include anonymous
     * sessions as well as sessions
     * attached to accounts.
     */

   const candidateSessions =
  await prisma.analyticsSession.findMany({
    where: {
      lastSeenAt: {
        gte: start,
        lt:
          endExclusive,
      },

      ...(country !== "all"
        ? {
            shopperId: {
              in:
                filteredShopperIds,
            },
          }
        : {}),
    },

    select: {
      id: true,
    },
  });

let activeSessions =
  candidateSessions;

/*
 * Discovery Source is a
 * behavioural filter.
 *
 * If a source is selected,
 * keep only sessions that
 * generated behaviour attributed
 * to that discovery source.
 */
if (
  source !== "all" &&
  candidateSessions.length
) {
  const candidateSessionIds =
    candidateSessions.map(
      (session) =>
        session.id
    );

  const sourceEvents =
    await prisma.analyticsEvent.findMany({
      where: {
        sessionId: {
          in:
            candidateSessionIds,
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

        metadata: {
          path: [
            "discoverySource",
          ],

          equals:
            source,
        },
      },

      select: {
        sessionId:
          true,
      },

      distinct: [
        "sessionId",
      ],
    });

  const sourceSessionIds =
    new Set(
      sourceEvents.map(
        (event) =>
          event.sessionId
      )
    );

  activeSessions =
    candidateSessions.filter(
      (session) =>
        sourceSessionIds.has(
          session.id
        )
    );
}

const activeAudience =
  activeSessions.length;

    /*
 * ─────────────────────────────
 * Geography / Brand markets
 * ─────────────────────────────
 *
 * Geography represents the home
 * markets of the brands/products
 * shoppers were exposed to.
 *
 * Example:
 * GB = products belonging to
 * brands whose baseCountryCode
 * is GB.
 *
 * If a registered-country filter
 * is applied, candidateSessions
 * already limits this to shoppers
 * based in that country.
 */

const activeSessionIds =
  activeSessions.map(
    (session) =>
      session.id
  );

const geographyEvents =
  activeSessionIds.length
    ? await prisma.analyticsEvent.findMany({
        where: {
          sessionId: {
            in:
              activeSessionIds,
          },

          createdAt: {
            gte: start,
            lt:
              endExclusive,
          },

          /*
           * Geography is exposure-led.
           *
           * A shopper belongs to a
           * market when they were
           * actually shown a product
           * from a brand in that market.
           */
          eventType:
            AnalyticsEventType.PRODUCT_IMPRESSION,

          ...(source !== "all"
            ? {
                metadata: {
                  path: [
                    "discoverySource",
                  ],
                  equals:
                    source,
                },
              }
            : {}),

          brandId: {
            not: null,
          },

          brand: {
            baseCountryCode: {
              not: null,
            },
          },
        },

        select: {
          sessionId: true,

          brand: {
            select: {
              baseCountryCode:
                true,
            },
          },
        },

        take: 50_000,
      })
    : [];

const marketSessionMap =
  new Map<
    string,
    Set<string>
  >();

const knownMarketAudience =
  new Set<string>();

for (
  const event of
    geographyEvents
) {
  const marketCountryCode =
    event.brand
      ?.baseCountryCode
      ?.trim()
      .toUpperCase();

  if (!marketCountryCode) {
    continue;
  }

  knownMarketAudience.add(
    event.sessionId
  );

  const sessions =
    marketSessionMap.get(
      marketCountryCode
    ) ??
    new Set<string>();

  sessions.add(
    event.sessionId
  );

  marketSessionMap.set(
    marketCountryCode,
    sessions
  );
}

const geography =
  Array.from(
    marketSessionMap.entries()
  )
    .map(
      ([
        countryCode,
        sessions,
      ]) => ({
        countryCode,

        uniqueSessions:
          sessions.size,

        share:
          knownMarketAudience.size >
          0
            ? sessions.size /
              knownMarketAudience.size
            : 0,
      })
    )
    .sort(
      (a, b) =>
        b.uniqueSessions -
        a.uniqueSessions
    );

const knownCountrySessions =
  knownMarketAudience.size;

    /*
     * ─────────────────────────────
     * Response
     * ─────────────────────────────
     */

    return NextResponse.json({
      ok: true,

      filters: {
  country,
  source,

  countries,

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
        registeredShoppers,

        knownAgeShoppers:
          knownAgeCount,

        ageCoverage,

        activeAudience,

        knownCountrySessions,
      },

      ageDistribution,

      geography,
    });
  } catch (error) {
    console.error(
      "Audience analytics failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          "Unable to load audience analytics",
      },
      {
        status: 500,
      }
    );
  }
}