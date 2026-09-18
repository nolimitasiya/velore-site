import { NextResponse } from "next/server";
import { AnalyticsEventType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RangeKey =
  | "today"
  | "7d"
  | "30d"
  | "custom";

const PERFORMANCE_EVENT_TYPES: AnalyticsEventType[] = [
  AnalyticsEventType.PRODUCT_IMPRESSION,
  AnalyticsEventType.PRODUCT_VIEW,
  AnalyticsEventType.WISHLIST_ADD,
  AnalyticsEventType.SHOP_CLICK,
];

const MIN_DEMOGRAPHIC_SESSIONS = 20;
const MIN_DEMOGRAPHIC_SHOPPERS = 5;

function startOfDayUTC(date = new Date()) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function parseUTCDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function getDateWindow(
  range: RangeKey,
  fromParam: string,
  toParam: string
) {
  if (range === "custom") {
    const from = parseUTCDate(fromParam);
    const to = parseUTCDate(toParam);

    if (!from || !to || from > to) {
      return null;
    }

    const until = new Date(to);

    until.setUTCDate(
      until.getUTCDate() + 1
    );

    return {
      from,
      until,
    };
  }

  const from = startOfDayUTC();

  if (range === "7d") {
    from.setUTCDate(
      from.getUTCDate() - 6
    );
  }

  if (range === "30d") {
    from.setUTCDate(
      from.getUTCDate() - 29
    );
  }

  return {
    from,
    until: null,
  };
}

function percentage(
  numerator: number,
  denominator: number
) {
  if (denominator <= 0) {
    return 0;
  }

  return Number(
    ((numerator / denominator) * 100).toFixed(1)
  );
}

function intersectionCount(
  left: Set<string>,
  right: Set<string>
) {
  let count = 0;

  for (const value of left) {
    if (right.has(value)) {
      count += 1;
    }
  }

  return count;
}

function ageFromDateOfBirth(
  dateOfBirth: Date,
  now = new Date()
) {
  let age =
    now.getFullYear() -
    dateOfBirth.getFullYear();

  const month =
    now.getMonth() - dateOfBirth.getMonth();

  if (
    month < 0 ||
    (month === 0 &&
      now.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function ageBucket(age: number) {
  if (age < 18) return "Under 18";
  if (age <= 24) return "18–24";
  if (age <= 34) return "25–34";
  if (age <= 44) return "35–44";
  if (age <= 54) return "45–54";
  return "55+";
}

function buildDailyTrend(
  events: Array<{
    createdAt: Date;
    eventType: AnalyticsEventType;
  }>,
  from: Date,
  until: Date | null
) {
  if (!events.length && !from) {
    return [];
  }

  const start = startOfDayUTC(from);

const end = until
  ? new Date(until)
  : startOfDayUTC();

if (until) {
  end.setUTCDate(
    end.getUTCDate() - 1
  );
}

  const buckets = new Map<
    string,
    {
      date: string;
      impressions: number;
      views: number;
      wishlistAdds: number;
      shopClicks: number;
    }
  >();

  const cursor = new Date(start);

  while (cursor <= end) {
    const key = [
  cursor.getUTCFullYear(),
  String(cursor.getUTCMonth() + 1).padStart(2, "0"),
  String(cursor.getUTCDate()).padStart(2, "0"),
].join("-");

    buckets.set(key, {
      date: key,
      impressions: 0,
      views: 0,
      wishlistAdds: 0,
      shopClicks: 0,
    });

    cursor.setUTCDate(
  cursor.getUTCDate() + 1
);
  }

  for (const event of events) {
    const date = event.createdAt;

    const key = [
  date.getUTCFullYear(),
  String(date.getUTCMonth() + 1).padStart(2, "0"),
  String(date.getUTCDate()).padStart(2, "0"),
].join("-");

    const bucket = buckets.get(key);

    if (!bucket) {
      continue;
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_IMPRESSION
    ) {
      bucket.impressions += 1;
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      bucket.views += 1;
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      bucket.wishlistAdds += 1;
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      bucket.shopClicks += 1;
    }
  }

  return Array.from(buckets.values());
}

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { brandId } =
      await requireBrandContext();

    const { id } = await params;

    const url = new URL(req.url);

    

    const requestedRange =
  url.searchParams.get("range") ?? "30d";

const range: RangeKey =
  requestedRange === "today" ||
  requestedRange === "7d" ||
  requestedRange === "30d" ||
  requestedRange === "custom"
    ? requestedRange
    : "30d";

const fromParam =
  url.searchParams.get("from") ?? "";

const toParam =
  url.searchParams.get("to") ?? "";

const dateWindow = getDateWindow(
  range,
  fromParam,
  toParam
);

if (!dateWindow) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "A valid from and to date is required for a custom range.",
    },
    {
      status: 400,
    }
  );
}

const {
  from,
  until,
} = dateWindow;

    /*
     * --------------------------------------------------
     * SECURITY:
     * The product must belong to the logged-in brand.
     * --------------------------------------------------
     */

    const product =
      await prisma.product.findFirst({
        where: {
          id,
          brandId,
        },

        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          currency: true,
          isActive: true,
          publishedAt: true,
          status: true,

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
            select: {
              url: true,
              sortOrder: true,
            },
          },
        },
      });

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product not found",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * --------------------------------------------------
     * PERFORMANCE EVENTS
     *
     * Anonymous + logged-in sessions are both included.
     * --------------------------------------------------
     */

  const events =
  await prisma.analyticsEvent.findMany({
    where: {
      brandId,
      productId: id,

      eventType: {
        in: PERFORMANCE_EVENT_TYPES,
      },

      createdAt: {
        gte: from,
        ...(until
          ? {
              lt: until,
            }
          : {}),
      },
    },

    select: {
      sessionId: true,
      eventType: true,
      createdAt: true,
      shopperCountryCode: true,

      session: {
        select: {
          shopperId: true,

          shopper: {
            select: {
              id: true,
              dateOfBirth: true,
              countryCode: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });

    /*
     * --------------------------------------------------
     * RAW EVENT COUNTS
     * --------------------------------------------------
     */

    const impressions = events.filter(
      (event) =>
        event.eventType ===
        AnalyticsEventType.PRODUCT_IMPRESSION
    ).length;

    const views = events.filter(
      (event) =>
        event.eventType ===
        AnalyticsEventType.PRODUCT_VIEW
    ).length;

    const wishlistAdds = events.filter(
      (event) =>
        event.eventType ===
        AnalyticsEventType.WISHLIST_ADD
    ).length;

    const shopClicks = events.filter(
      (event) =>
        event.eventType ===
        AnalyticsEventType.SHOP_CLICK
    ).length;

    /*
     * --------------------------------------------------
     * UNIQUE SESSION FUNNEL
     * --------------------------------------------------
     */

    const impressionSessions = new Set(
      events
        .filter(
          (event) =>
            event.eventType ===
            AnalyticsEventType.PRODUCT_IMPRESSION
        )
        .map((event) => event.sessionId)
    );

    const viewSessions = new Set(
      events
        .filter(
          (event) =>
            event.eventType ===
            AnalyticsEventType.PRODUCT_VIEW
        )
        .map((event) => event.sessionId)
    );

    const wishlistSessions = new Set(
      events
        .filter(
          (event) =>
            event.eventType ===
            AnalyticsEventType.WISHLIST_ADD
        )
        .map((event) => event.sessionId)
    );

    const shopSessions = new Set(
      events
        .filter(
          (event) =>
            event.eventType ===
            AnalyticsEventType.SHOP_CLICK
        )
        .map((event) => event.sessionId)
    );

    const impressionToViewSessions =
      intersectionCount(
        impressionSessions,
        viewSessions
      );

    const viewToWishlistSessions =
      intersectionCount(
        viewSessions,
        wishlistSessions
      );

    const viewToShopSessions =
      intersectionCount(
        viewSessions,
        shopSessions
      );

    /*
     * --------------------------------------------------
     * CURRENT WISHLIST COUNT
     *
     * This is different from wishlistAdds.
     *
     * wishlistAdds = activity during selected period
     * currentWishlistCount = currently saved right now
     * --------------------------------------------------
     */

    const currentWishlistCount =
      await prisma.wishlistItem.count({
        where: {
          productId: id,
        },
      });

    /*
     * --------------------------------------------------
     * IDENTIFIED PRODUCT AUDIENCE
     *
     * IMPORTANT:
     * We only use shoppers who actually interacted with
     * THIS PRODUCT.
     *
     * We dedupe by shopper so one highly active shopper
     * does not dominate the demographic percentages.
     * --------------------------------------------------
     */

    const identifiedShopperMap = new Map<
      string,
      {
        id: string;
        dateOfBirth: Date | null;
        countryCode: string | null;
      }
    >();

    for (const event of events) {
      const shopper = event.session.shopper;

      if (!shopper) {
        continue;
      }

      if (!identifiedShopperMap.has(shopper.id)) {
        identifiedShopperMap.set(
          shopper.id,
          shopper
        );
      }
    }

    const identifiedShoppers =
      Array.from(
        identifiedShopperMap.values()
      );

    const allProductSessions = new Set(
      events.map((event) => event.sessionId)
    );

    const demographicSessionCount =
  allProductSessions.size;

    const identifiedSessionIds = new Set(
      events
        .filter(
          (event) =>
            Boolean(event.session.shopperId)
        )
        .map((event) => event.sessionId)
    );

    /*
     * --------------------------------------------------
     * AGE
     * --------------------------------------------------
     */

    const shoppersWithAge =
      identifiedShoppers.filter(
        (
          shopper
        ): shopper is typeof shopper & {
          dateOfBirth: Date;
        } => Boolean(shopper.dateOfBirth)
      );

    const ageCounts = new Map<
      string,
      number
    >();

    for (const shopper of shoppersWithAge) {
      const age = ageFromDateOfBirth(
        shopper.dateOfBirth
      );

      const bucket = ageBucket(age);

      ageCounts.set(
        bucket,
        (ageCounts.get(bucket) ?? 0) + 1
      );
    }

    const AGE_ORDER = [
      "Under 18",
      "18–24",
      "25–34",
      "35–44",
      "45–54",
      "55+",
    ];

    const ageVisible =
  demographicSessionCount >=
    MIN_DEMOGRAPHIC_SESSIONS &&
  shoppersWithAge.length >=
    MIN_DEMOGRAPHIC_SHOPPERS;

    const ageGroups = ageVisible
      ? AGE_ORDER.map((label) => {
          const count =
            ageCounts.get(label) ?? 0;

          return {
            label,
            count,
            percentage: percentage(
              count,
              shoppersWithAge.length
            ),
          };
        })
      : [];

    /*
     * --------------------------------------------------
     * CUSTOMER MARKETS
     *
     * We use the interaction-time market first.
     * If unavailable, fall back to the shopper account
     * country.
     *
     * Dedupe by shopper + country so repeated events from
     * one shopper do not dominate the result.
     * --------------------------------------------------
     */

    const shopperMarkets = new Map<
      string,
      string
    >();

    for (const event of events) {
      const shopper =
        event.session.shopper;

      if (!shopper) {
        continue;
      }

      const countryCode =
        event.shopperCountryCode ??
        shopper.countryCode;

      if (
        countryCode &&
        !shopperMarkets.has(shopper.id)
      ) {
        shopperMarkets.set(
          shopper.id,
          countryCode.toUpperCase()
        );
      }
    }

    const marketCounts = new Map<
      string,
      number
    >();

    for (const countryCode of shopperMarkets.values()) {
      marketCounts.set(
        countryCode,
        (marketCounts.get(countryCode) ?? 0) +
          1
      );
    }

    const marketSampleSize =
      shopperMarkets.size;

    const marketsVisible =
  demographicSessionCount >=
    MIN_DEMOGRAPHIC_SESSIONS &&
  marketSampleSize >=
    MIN_DEMOGRAPHIC_SHOPPERS;

    const customerMarkets =
      marketsVisible
        ? Array.from(
            marketCounts.entries()
          )
            .map(
              ([countryCode, count]) => ({
                countryCode,
                count,
                percentage: percentage(
                  count,
                  marketSampleSize
                ),
              })
            )
            .sort(
              (a, b) =>
                b.count - a.count
            )
        : [];

    /*
     * --------------------------------------------------
     * PERFORMANCE OVER TIME
     * --------------------------------------------------
     */

    const trend = buildDailyTrend(
  events,
  from,
  until
);


    /*
     * --------------------------------------------------
     * RESPONSE
     * --------------------------------------------------
     */

    return NextResponse.json({
      ok: true,

      range,

from:
  from.toISOString(),

to:
  until?.toISOString() ?? null,

generatedAt:
        new Date().toISOString(),

      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,

        price:
          product.price?.toString() ??
          null,

        currency: product.currency,

        isActive:
          product.isActive,

        publishedAt:
          product.publishedAt,

        status:
          product.status,

        live:
          product.isActive &&
          product.status === "APPROVED" &&
          Boolean(product.publishedAt),

        brand: product.brand,

        images:
          product.images,
      },

      performance: {
        impressions,
        views,
        wishlistAdds,
        shopClicks,

        uniqueImpressionSessions:
          impressionSessions.size,

        uniqueViewSessions:
          viewSessions.size,

        uniqueWishlistSessions:
          wishlistSessions.size,

        uniqueShopSessions:
          shopSessions.size,

        viewRate: percentage(
          impressionToViewSessions,
          impressionSessions.size
        ),

        saveRate: percentage(
          viewToWishlistSessions,
          viewSessions.size
        ),

        shopIntentRate: percentage(
          viewToShopSessions,
          viewSessions.size
        ),
      },

      trend,

      wishlist: {
        currentWishlistCount,
        wishlistAdds,
        saveRate: percentage(
          viewToWishlistSessions,
          viewSessions.size
        ),
      },

      audience: {
        totalInteractionSessions:
          allProductSessions.size,

        identifiedSessions:
          identifiedSessionIds.size,

        identifiedShoppers:
          identifiedShoppers.length,

        identifiedSessionCoverage:
          percentage(
            identifiedSessionIds.size,
            allProductSessions.size
          ),

       age: {
  available: ageVisible,

  sessionSampleSize:
    demographicSessionCount,

  identifiedSampleSize:
    shoppersWithAge.length,

  minimumSessions:
    MIN_DEMOGRAPHIC_SESSIONS,

  minimumIdentifiedShoppers:
    MIN_DEMOGRAPHIC_SHOPPERS,

  groups: ageGroups,
},

customerMarkets: {
  available: marketsVisible,

  sessionSampleSize:
    demographicSessionCount,

  identifiedSampleSize:
    marketSampleSize,

  minimumSessions:
    MIN_DEMOGRAPHIC_SESSIONS,

  minimumIdentifiedShoppers:
    MIN_DEMOGRAPHIC_SHOPPERS,

  rows: customerMarkets,
},
      },

   
    });
  } catch (error: any) {
    const message =
      error?.message ??
      "Failed to load product analytics";

    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
        ? 403
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status,
      }
    );
  }
}