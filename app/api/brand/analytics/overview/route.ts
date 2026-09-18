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

const MIN_SIGNAL_SESSIONS = 5;

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

function uniqueSessionIds(
  events: Array<{
    sessionId: string;
    eventType: AnalyticsEventType;
  }>,
  eventType: AnalyticsEventType
) {
  return new Set(
    events
      .filter((event) => event.eventType === eventType)
      .map((event) => event.sessionId)
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

export async function GET(req: Request) {
  try {
    const { brandId } =
      await requireBrandContext();

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

    const events =
      await prisma.analyticsEvent.findMany({
        where: {
          brandId,
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
          productId: true,
          createdAt: true,
        },

        orderBy: {
          createdAt: "asc",
        },
      });

    /*
     * --------------------------------------------------
     * Brand-level raw event counts
     * --------------------------------------------------
     */

    const impressions = events.filter(
      (event) =>
        event.eventType ===
        AnalyticsEventType.PRODUCT_IMPRESSION
    ).length;

    const productViews = events.filter(
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
     * Brand-level unique session funnel
     * --------------------------------------------------
     */

    const impressionSessions =
      uniqueSessionIds(
        events,
        AnalyticsEventType.PRODUCT_IMPRESSION
      );

    const viewSessions =
      uniqueSessionIds(
        events,
        AnalyticsEventType.PRODUCT_VIEW
      );

    const wishlistSessions =
      uniqueSessionIds(
        events,
        AnalyticsEventType.WISHLIST_ADD
      );

    const shopSessions =
      uniqueSessionIds(
        events,
        AnalyticsEventType.SHOP_CLICK
      );

    /*
     * We use intersections for the rates.
     *
     * Example:
     * saveRate =
     * sessions that viewed AND saved
     * /
     * sessions that viewed
     */

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
     * Product-level analytics
     * --------------------------------------------------
     */

    const productIds = Array.from(
      new Set(
        events
          .map((event) => event.productId)
          .filter(
            (id): id is string =>
              Boolean(id)
          )
      )
    );

    const products = productIds.length
      ? await prisma.product.findMany({
          where: {
            id: {
              in: productIds,
            },
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
        })
      : [];

    const productMap = new Map(
      products.map((product) => [
        product.id,
        product,
      ])
    );

    const productRows = productIds
      .map((productId) => {
        const product =
          productMap.get(productId);

        if (!product) {
          return null;
        }

        const productEvents =
          events.filter(
            (event) =>
              event.productId === productId
          );

        const productImpressions =
          productEvents.filter(
            (event) =>
              event.eventType ===
              AnalyticsEventType.PRODUCT_IMPRESSION
          ).length;

        const views =
          productEvents.filter(
            (event) =>
              event.eventType ===
              AnalyticsEventType.PRODUCT_VIEW
          ).length;

        const saves =
          productEvents.filter(
            (event) =>
              event.eventType ===
              AnalyticsEventType.WISHLIST_ADD
          ).length;

        const clicks =
          productEvents.filter(
            (event) =>
              event.eventType ===
              AnalyticsEventType.SHOP_CLICK
          ).length;

        const pImpressionSessions =
          uniqueSessionIds(
            productEvents,
            AnalyticsEventType.PRODUCT_IMPRESSION
          );

        const pViewSessions =
          uniqueSessionIds(
            productEvents,
            AnalyticsEventType.PRODUCT_VIEW
          );

        const pWishlistSessions =
          uniqueSessionIds(
            productEvents,
            AnalyticsEventType.WISHLIST_ADD
          );

        const pShopSessions =
          uniqueSessionIds(
            productEvents,
            AnalyticsEventType.SHOP_CLICK
          );

        const pImpressionToView =
          intersectionCount(
            pImpressionSessions,
            pViewSessions
          );

        const pViewToWishlist =
          intersectionCount(
            pViewSessions,
            pWishlistSessions
          );

        const pViewToShop =
          intersectionCount(
            pViewSessions,
            pShopSessions
          );

        return {
          productId: product.id,
          title: product.title,
          slug: product.slug,

          price:
            product.price?.toString() ??
            null,

          currency: product.currency,

          imageUrl:
            product.images[0]?.url ?? null,

          isActive: product.isActive,
          publishedAt:
            product.publishedAt,
          status: product.status,

          impressions:
            productImpressions,

          views,
          wishlistAdds: saves,
          shopClicks: clicks,

          uniqueImpressionSessions:
            pImpressionSessions.size,

          uniqueViewSessions:
            pViewSessions.size,

          uniqueWishlistSessions:
            pWishlistSessions.size,

          uniqueShopSessions:
            pShopSessions.size,

          viewRate: percentage(
  pImpressionToView,
  pImpressionSessions.size
),

viewRateQualified:
  pImpressionSessions.size >=
  MIN_SIGNAL_SESSIONS,

saveRate: percentage(
  pViewToWishlist,
  pViewSessions.size
),

saveRateQualified:
  pViewSessions.size >=
  MIN_SIGNAL_SESSIONS,

shopIntentRate: percentage(
  pViewToShop,
  pViewSessions.size
),

shopIntentQualified:
  pViewSessions.size >=
  MIN_SIGNAL_SESSIONS,

        };
      })
      .filter(
        (
          product
        ): product is NonNullable<
          typeof product
        > => product !== null
      )
      .sort(
        (a, b) =>
          b.uniqueShopSessions -
            a.uniqueShopSessions ||
          b.uniqueWishlistSessions -
            a.uniqueWishlistSessions ||
          b.uniqueViewSessions -
            a.uniqueViewSessions
      );

    return NextResponse.json({
      ok: true,

      range,

from:
  from.toISOString(),

to:
  until?.toISOString() ?? null,

generatedAt:
  new Date().toISOString(),

      overview: {
        impressions,
        productViews,
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

        productViewRate: percentage(
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

      products: productRows,
    });
  } catch (error: any) {
    const message =
      error?.message ??
      "Failed to load brand analytics";

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