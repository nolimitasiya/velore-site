import Link from "next/link";
import { AnalyticsEventType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import PerformanceTrendChart from "@/components/analytics/PerformanceTrendChart";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

const regionNames =
  new Intl.DisplayNames(
    ["en"],
    {
      type: "region",
    }
  );

function countryLabel(
  code: string
) {
  return (
    regionNames.of(
      code.toUpperCase()
    ) ?? code
  );
}

function parseRange(
  input?: string
): RangeKey {
  const value = String(
    input ?? ""
  ).toLowerCase();

  if (
    value === "today" ||
    value === "7d" ||
    value === "30d" ||
    value === "custom"
  ) {
    return value;
  }

  return "30d";
}

function startOfDayUTC(
  date = new Date()
) {
  const value = new Date(date);

  value.setUTCHours(
    0,
    0,
    0,
    0
  );

  return value;
}

function parseUTCDate(
  value: string
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !==
      month - 1 ||
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
    const from =
      parseUTCDate(fromParam);

    const to =
      parseUTCDate(toParam);

    if (
      !from ||
      !to ||
      from > to
    ) {
      return null;
    }

    const until =
      new Date(to);

    until.setUTCDate(
      until.getUTCDate() + 1
    );

    return {
      from,
      until,
    };
  }

  const from =
    startOfDayUTC();

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

function intersectionCount(
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

function percentage(
  numerator: number,
  denominator: number
) {
  if (!denominator) {
    return 0;
  }

  return Math.round(
    (numerator /
      denominator) *
      1000
  ) / 10;
}

function rangeLabel(
  range: RangeKey,
  fromParam?: string,
  toParam?: string
) {
  if (range === "today") {
    return "Today";
  }

  if (range === "7d") {
    return "Last 7 days";
  }

  if (
    range === "custom" &&
    fromParam &&
    toParam
  ) {
    return `${fromParam} → ${toParam}`;
  }

  return "Last 30 days";
}

type TrendPoint = {
  date: string;
  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;
};

function buildDailyTrend(
  events: Array<{
    sessionId: string;
    createdAt: Date;
    eventType: AnalyticsEventType;
  }>,
  from: Date,
  until: Date | null
): TrendPoint[] {
  const start = startOfDayUTC(from);

  const end = until
    ? new Date(until)
    : startOfDayUTC();

  if (until) {
    end.setUTCDate(end.getUTCDate() - 1);
  }

  const buckets = new Map<
    string,
    {
      date: string;
      impressionSessions: Set<string>;
      viewSessions: Set<string>;
      wishlistSessions: Set<string>;
      shopSessions: Set<string>;
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
      impressionSessions: new Set(),
      viewSessions: new Set(),
      wishlistSessions: new Set(),
      shopSessions: new Set(),
    });

    cursor.setUTCDate(
      cursor.getUTCDate() + 1
    );
  }

  for (const event of events) {
    const key = [
      event.createdAt.getUTCFullYear(),
      String(
        event.createdAt.getUTCMonth() + 1
      ).padStart(2, "0"),
      String(
        event.createdAt.getUTCDate()
      ).padStart(2, "0"),
    ].join("-");

    const bucket = buckets.get(key);

    if (!bucket) continue;

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_IMPRESSION
    ) {
      bucket.impressionSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      bucket.viewSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      bucket.wishlistSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      bucket.shopSessions.add(
        event.sessionId
      );
    }
  }

  return Array.from(
    buckets.values()
  ).map((bucket) => ({
    date: bucket.date,
    impressions:
      bucket.impressionSessions.size,
    views:
      bucket.viewSessions.size,
    wishlistAdds:
      bucket.wishlistSessions.size,
    shopClicks:
      bucket.shopSessions.size,
  }));
}



function RangeLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-white bg-white text-[#7B2D3E] shadow-sm"
          : "border-white/25 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default async function BrandRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp =
    await searchParams;

  const range =
    parseRange(sp.range);

  const fromParam =
    sp.from ?? "";

  const toParam =
    sp.to ?? "";

  const {
    brandId,
  } =
    await requireBrandContext();

  /*
   * Invalid / incomplete custom URLs
   * fall back safely to 30 days.
   */
  const dateWindow =
    getDateWindow(
      range,
      fromParam,
      toParam
    );

  const effectiveRange:
    RangeKey =
      dateWindow
        ? range
        : "30d";

  const effectiveWindow =
    dateWindow ??
    getDateWindow(
      "30d",
      "",
      ""
    )!;

  const {
    from,
    until,
  } =
    effectiveWindow;

  /*
   * Canonical Brand Analytics events.
   * No AffiliateClick usage.
   */
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
    });

  /*
   * Brand-level unique-session funnel.
   */
  const impressionSessions =
    new Set<string>();

  const viewSessions =
    new Set<string>();

  const wishlistSessions =
    new Set<string>();

  const shopSessions =
    new Set<string>();

  for (const event of events) {
    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_IMPRESSION
    ) {
      impressionSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      viewSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      wishlistSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      shopSessions.add(
        event.sessionId
      );
    }
  }

  /*
 * All unique sessions that interacted
 * with this brand in the selected range.
 */
const interactionSessionIds = new Set<string>([
  ...impressionSessions,
  ...viewSessions,
  ...wishlistSessions,
  ...shopSessions,
]);

const interactionSessions =
  interactionSessionIds.size > 0
    ? await prisma.analyticsSession.findMany({
        where: {
          id: {
            in: Array.from(
              interactionSessionIds
            ),
          },
        },

        select: {
          id: true,
          shopperCountryCode: true,

          shopper: {
            select: {
              id: true,
              dateOfBirth: true,
              countryCode: true,
            },
          },
        },
      })
    : [];

  const uniqueImpressions =
    impressionSessions.size;

  const uniqueViews =
    viewSessions.size;

  const uniqueWishlistAdds =
    wishlistSessions.size;

  const uniqueShopClicks =
    shopSessions.size;

    /*
 * Brand-level audience.
 *
 * Anonymous sessions remain part of
 * behavioural analytics but do not
 * contribute to identified demographics.
 */
const demographicSessionCount =
  interactionSessionIds.size;

const identifiedSessions =
  interactionSessions.filter(
    (session) =>
      Boolean(session.shopper)
  );



const identifiedShopperIds =
  new Set(
    identifiedSessions
      .map(
        (session) =>
          session.shopper?.id
      )
      .filter(
        (
          id
        ): id is string =>
          Boolean(id)
      )
  );

const identifiedShopperCount =
  identifiedShopperIds.size;


const demographicsQualified =
  demographicSessionCount >=
    MIN_DEMOGRAPHIC_SESSIONS &&
  identifiedShopperCount >=
    MIN_DEMOGRAPHIC_SHOPPERS;

    function ageFromDateOfBirth(
  dateOfBirth: Date
) {
  const today = new Date();

  let age =
    today.getUTCFullYear() -
    dateOfBirth.getUTCFullYear();

  const monthDifference =
    today.getUTCMonth() -
    dateOfBirth.getUTCMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getUTCDate() <
        dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

const ageCounts = {
  "18–24": 0,
  "25–34": 0,
  "35–44": 0,
  "45+": 0,
};

const shoppersSeenForAge =
  new Set<string>();

for (const session of identifiedSessions) {
  const shopper =
    session.shopper;

  if (
    !shopper ||
    !shopper.dateOfBirth ||
    shoppersSeenForAge.has(
      shopper.id
    )
  ) {
    continue;
  }

  shoppersSeenForAge.add(
    shopper.id
  );

  const age =
    ageFromDateOfBirth(
      shopper.dateOfBirth
    );

  if (age >= 18 && age <= 24) {
    ageCounts["18–24"] += 1;
  } else if (
    age >= 25 &&
    age <= 34
  ) {
    ageCounts["25–34"] += 1;
  } else if (
    age >= 35 &&
    age <= 44
  ) {
    ageCounts["35–44"] += 1;
  } else if (age >= 45) {
    ageCounts["45+"] += 1;
  }
}

const totalAgeShoppers =
  Object.values(
    ageCounts
  ).reduce(
    (sum, count) =>
      sum + count,
    0
  );

const ageRows =
  Object.entries(ageCounts).map(
    ([label, count]) => ({
      label,
      count,

      percentage:
        percentage(
          count,
          totalAgeShoppers
        ),
    })
  );

  const marketCounts =
  new Map<string, number>();

const shoppersSeenForMarket =
  new Set<string>();

for (const session of identifiedSessions) {
  const shopper =
    session.shopper;

  if (
    !shopper ||
    shoppersSeenForMarket.has(
      shopper.id
    )
  ) {
    continue;
  }

  shoppersSeenForMarket.add(
    shopper.id
  );

  const countryCode =
    shopper.countryCode ??
    session.shopperCountryCode;

  if (!countryCode) {
    continue;
  }

  const normalizedCode =
    countryCode.toUpperCase();

  marketCounts.set(
    normalizedCode,
    (marketCounts.get(
      normalizedCode
    ) ?? 0) + 1
  );
}

const totalMarketShoppers =
  Array.from(
    marketCounts.values()
  ).reduce(
    (sum, count) =>
      sum + count,
    0
  );

const marketRows =
  Array.from(
    marketCounts.entries()
  )
    .map(
      ([
        countryCode,
        count,
      ]) => ({
        countryCode,
        count,

        percentage:
          percentage(
            count,
            totalMarketShoppers
          ),
      })
    )
    .sort(
      (a, b) =>
        b.count - a.count
    )
    .slice(0, 6);

  /*
   * View rate:
   * impression sessions that also viewed
   * ÷ impression sessions.
   */
  const viewRate =
    percentage(
      intersectionCount(
        impressionSessions,
        viewSessions
      ),
      impressionSessions.size
    );

  /*
   * Brand-facing save/shop rates:
   * PDP view session denominator.
   */
  const saveRate =
    percentage(
      intersectionCount(
        viewSessions,
        wishlistSessions
      ),
      viewSessions.size
    );

  const shopIntentRate =
    percentage(
      intersectionCount(
        viewSessions,
        shopSessions
      ),
      viewSessions.size
    );

  const trend = buildDailyTrend(
      events,
      from,
      until
    );

  /*
   * Product-level aggregation.
   */
  const productMap =
    new Map<
      string,
      {
        impressionSessions:
          Set<string>;
        viewSessions:
          Set<string>;
        wishlistSessions:
          Set<string>;
        shopSessions:
          Set<string>;
      }
    >();

  for (const event of events) {
    if (!event.productId) {
      continue;
    }

    let row =
      productMap.get(
        event.productId
      );

    if (!row) {
      row = {
        impressionSessions:
          new Set<string>(),
        viewSessions:
          new Set<string>(),
        wishlistSessions:
          new Set<string>(),
        shopSessions:
          new Set<string>(),
      };

      productMap.set(
        event.productId,
        row
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_IMPRESSION
    ) {
      row.impressionSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.PRODUCT_VIEW
    ) {
      row.viewSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.WISHLIST_ADD
    ) {
      row.wishlistSessions.add(
        event.sessionId
      );
    }

    if (
      event.eventType ===
      AnalyticsEventType.SHOP_CLICK
    ) {
      row.shopSessions.add(
        event.sessionId
      );
    }
  }

  const productIds =
    Array.from(
      productMap.keys()
    );

  const products =
    productIds.length
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
            price: true,
            currency: true,

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

  const productsById =
    new Map(
      products.map(
        (product) => [
          product.id,
          product,
        ]
      )
    );

  const productRows =
    Array.from(
      productMap.entries()
    )
      .map(
        ([
          productId,
          data,
        ]) => {
          const product =
            productsById.get(
              productId
            );

          if (!product) {
            return null;
          }

          const productViewRate =
            percentage(
              intersectionCount(
                data.impressionSessions,
                data.viewSessions
              ),
              data.impressionSessions
                .size
            );

          const productSaveRate =
            percentage(
              intersectionCount(
                data.viewSessions,
                data.wishlistSessions
              ),
              data.viewSessions.size
            );

          const productShopIntent =
            percentage(
              intersectionCount(
                data.viewSessions,
                data.shopSessions
              ),
              data.viewSessions.size
            );

          return {
            id: product.id,
            title:
              product.title,
            price:
              product.price
                ? String(
                    product.price
                  )
                : null,
            currency:
              product.currency,
            imageUrl:
              product.images[0]
                ?.url ?? null,

            impressions:
              data
                .impressionSessions
                .size,

            views:
              data.viewSessions
                .size,

            saves:
              data
                .wishlistSessions
                .size,

            shopClicks:
              data.shopSessions
                .size,

            viewRate:
              productViewRate,

            saveRate:
              productSaveRate,

            shopIntentRate:
              productShopIntent,
          };
        }
      )
      .filter(
        (
          row
        ): row is NonNullable<
          typeof row
        > => Boolean(row)
      )
      .sort(
        (a, b) =>
          b.views -
            a.views ||
          b.shopClicks -
            a.shopClicks ||
          b.saves -
            a.saves ||
          b.impressions -
            a.impressions
      );

  /*
   * Overview only shows a concise
   * preview. Full table remains on
   * Product Performance.
   */
  const topProducts =
    productRows.slice(0, 5);

  const qs = (
    value: RangeKey
  ) => {
    if (
      value === "custom" &&
      fromParam &&
      toParam
    ) {
      return `?range=custom&from=${encodeURIComponent(
        fromParam
      )}&to=${encodeURIComponent(
        toParam
      )}`;
    }

    return value === "30d"
      ? ""
      : `?range=${value}`;
  };

  const selectedRangeLabel =
    rangeLabel(
      effectiveRange,
      fromParam,
      toParam
    );

  const productPerformanceHref =
    `/brand/revenue/products${qs(
      effectiveRange
    )}`;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-[28px] bg-[#7B2D3E] px-7 py-8 shadow-sm md:px-10 md:py-9">
        <div className="flex flex-col gap-6">
          {/* Top row */}
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Analytics
              </h1>

              <p className="mt-1 text-sm text-white/60">
                Understand how
                shoppers discover
                and engage with your
                products.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RangeLink
                href="/brand/revenue?range=today"
                label="Today"
                active={
                  effectiveRange ===
                  "today"
                }
              />

              <RangeLink
                href="/brand/revenue?range=7d"
                label="Last 7 days"
                active={
                  effectiveRange ===
                  "7d"
                }
              />

              <RangeLink
                href="/brand/revenue"
                label="Last 30 days"
                active={
                  effectiveRange ===
                  "30d"
                }
              />

              <RangeLink
                href="/brand/revenue?range=custom"
                label="Custom range"
                active={
                  range ===
                  "custom"
                }
              />
            </div>
          </div>

          {/* Custom range */}
          {range ===
            "custom" && (
            <form
              method="GET"
              action="/brand/revenue"
              className="flex flex-wrap items-center gap-3"
            >
              <input
                type="hidden"
                name="range"
                value="custom"
              />

              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
                From
              </span>

              <input
                type="date"
                name="from"
                defaultValue={
                  fromParam
                }
                required
                className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
              />

              <span className="ml-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
                To
              </span>

              <input
                type="date"
                name="to"
                defaultValue={
                  toParam
                }
                required
                className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
              />

              <button
                type="submit"
                className="h-10 rounded-xl bg-white px-5 text-sm font-semibold text-[#7B2D3E] transition hover:bg-white/90"
              >
                Apply
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Overview */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            Overview
          </div>

          <h2 className="mt-1 text-md font-medium text-black">
            Shopper engagement
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Unique shopper
            sessions in the
            selected period.
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[#e8ddd4] lg:grid-cols-4 lg:divide-y-0">
          <Metric
            label="Product impressions"
            value={
              uniqueImpressions
            }
          />

          <Metric
            label="Product views"
            value={uniqueViews}
          />

          <Metric
            label="Wishlist adds"
            value={
              uniqueWishlistAdds
            }
          />

          <Metric
            label="Shop clicks"
            value={
              uniqueShopClicks
            }
          />
        </div>
      </section>

      {/* Engagement rates */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
              Engagement
            </div>

            <h2 className="mt-1 text-md font-medium text-black">
              Shopper intent
            </h2>
          </div>

          <div className="text-xs text-neutral-400">
            {selectedRangeLabel}
          </div>
        </div>

        <div className="grid gap-px bg-[#e8ddd4] md:grid-cols-3">
          <RateCard
            label="View rate"
            value={viewRate}
            description="Impression sessions that opened a product page."
          />

          <RateCard
            label="Save rate"
            value={saveRate}
            description="Product-view sessions that added a product to wishlist."
          />

          <RateCard
            label="Shop intent"
            value={
              shopIntentRate
            }
            description="Product-view sessions that clicked through to shop."
          />
        </div>
      </section>

      {/* Performance over time */}
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-4">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
        Performance
      </div>

      <h2 className="mt-1 text-md font-medium text-black">
        Performance over time
      </h2>

      <p className="mt-1 text-xs text-neutral-500">
        Daily unique shopper sessions
        across your products.
      </p>
    </div>

    <div className="text-xs text-neutral-400">
      {selectedRangeLabel}
    </div>
  </div>

  <div className="px-6 py-6">
    <PerformanceTrendChart
  data={trend}
  ariaLabel="Brand performance over time"
  emptyMessage="Performance will appear here as shoppers interact with your products."
/>
  </div>
</section>

      {/* Product performance */}
      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
              Performance
            </div>

            <h2 className="mt-1 text-md font-medium text-black">
              Product performance
            </h2>

            <p className="mt-1 text-xs text-neutral-500">
              A snapshot of your
              most viewed products
              in this period.
            </p>
          </div>

          <Link
            href={
              productPerformanceHref
            }
            className="rounded-full border border-[#7B2D3E]/20 bg-white px-4 py-2 text-xs font-semibold text-[#7B2D3E] transition hover:bg-[#7B2D3E]/5"
          >
            View all products →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#fdf7f4] text-left text-[#a89280]">
              <tr>
                <th className="px-5 py-3 font-medium">
                  Product
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  Impressions
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  Views
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  Saves
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  Shop clicks
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  View rate
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  Save rate
                </th>

                <th className="px-5 py-3 text-right font-medium">
                  Shop intent
                </th>
              </tr>
            </thead>

            <tbody>
              {topProducts.map(
                (row) => (
                  <tr
                    key={row.id}
                    className="border-t border-black/6"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/brand/revenue/products/${row.id}${qs(
                          effectiveRange
                        )}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-[#faf8f4]">
                          {row.imageUrl ? (
                            <img
                              src={
                                row.imageUrl
                              }
                              alt={
                                row.title
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-neutral-400">
                              —
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium text-neutral-900 hover:text-[#7B2D3E]">
                            {
                              row.title
                            }
                          </div>

                          <div className="mt-0.5 text-xs text-neutral-400">
                            {row.price
                              ? `${row.currency} ${row.price}`
                              : "—"}
                          </div>
                        </div>
                      </Link>
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {
                        row.impressions
                      }
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.views}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {row.saves}
                    </td>

                    <td className="px-5 py-4 text-right text-neutral-700">
                      {
                        row.shopClicks
                      }
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-neutral-900">
                      {
                        row.viewRate
                      }
                      %
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-neutral-900">
                      {
                        row.saveRate
                      }
                      %
                    </td>

                    <td className="px-5 py-4 text-right font-medium text-neutral-900">
                      {
                        row.shopIntentRate
                      }
                      %
                    </td>
                  </tr>
                )
              )}

              {topProducts.length ===
                0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-neutral-400"
                  >
                    No product
                    activity yet in
                    this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audience */}
<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8ddd4] bg-[#fdf7f4] px-6 py-5">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
        Audience
      </div>

      <h2 className="mt-1 text-md font-medium text-black">
        Shopper demographics
      </h2>

      <p className="mt-1 text-xs text-neutral-500">
        An aggregated view of
        identified shoppers who
        interacted with your
        products.
      </p>
    </div>

    <div className="text-xs text-neutral-400">
      {selectedRangeLabel}
    </div>
  </div>



  {demographicsQualified ? (
    <div className="grid lg:grid-cols-2">
      {/* Age groups */}
      <div className="border-b border-[#e8ddd4] p-6 lg:border-b-0 lg:border-r">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-neutral-900">
            Age groups
          </h3>

          <p className="mt-1 text-xs text-neutral-400">
            Based on identified
            shoppers with a date of
            birth.
          </p>
        </div>

        <div className="space-y-5">
          {ageRows.map(
            (row) => (
              <div
                key={row.label}
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-700">
                    {row.label}
                  </span>

                  <span className="text-sm font-semibold text-neutral-900">
                    {
                      row.percentage
                    }
                    %
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#ece7dc]">
                  <div
                    className="h-full rounded-full bg-[#7B2D3E]/70"
                    style={{
                      width: `${row.percentage}%`,
                    }}
                  />
                </div>
              </div>
            )
          )}

          {totalAgeShoppers ===
            0 && (
            <p className="text-sm text-neutral-400">
              No age information is
              available yet.
            </p>
          )}
        </div>
      </div>

      {/* Markets */}
      <div className="p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-neutral-900">
            Shopper markets
          </h3>

          <p className="mt-1 text-xs text-neutral-400">
            Based on the country of
            identified shoppers.
          </p>
        </div>

        <div className="space-y-5">
          {marketRows.map(
            (row) => (
              <div
                key={
                  row.countryCode
                }
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-700">
                    {countryLabel(
                      row.countryCode
                    )}
                  </span>

                  <span className="text-sm font-semibold text-neutral-900">
                    {
                      row.percentage
                    }
                    %
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#ece7dc]">
                  <div
                    className="h-full rounded-full bg-[#7B2D3E]/70"
                    style={{
                      width: `${row.percentage}%`,
                    }}
                  />
                </div>
              </div>
            )
          )}

          {marketRows.length ===
            0 && (
            <p className="text-sm text-neutral-400">
              No shopper market
              information is
              available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="px-6 py-8">
      <div className="rounded-2xl border border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
        <div className="text-sm font-medium text-neutral-800">
          Audience insights are
          building
        </div>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">
          Age and market breakdowns
          will appear once there is
          enough identified shopper
          activity to provide useful
          aggregated insights.
        </p>
      </div>
    </div>
  )}
</section>


    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white px-6 py-6">
      <div className="text-xs text-neutral-400">
        {label}
      </div>

      <div className="mt-1 text-3xl font-semibold tracking-tight text-black">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function RateCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="bg-white px-6 py-6">
      <div className="text-xs text-neutral-400">
        {label}
      </div>

      <div className="mt-1 text-3xl font-semibold tracking-tight text-[#7B2D3E]">
        {value}%
      </div>

      <p className="mt-2 max-w-xs text-xs leading-5 text-neutral-400">
        {description}
      </p>
    </div>
  );
}