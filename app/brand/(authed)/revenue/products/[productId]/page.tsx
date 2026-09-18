import Link from "next/link";
import { AnalyticsEventType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RangeKey =
  | "today"
  | "7d"
  | "30d"
  | "custom";

const MIN_DEMOGRAPHIC_SESSIONS = 20;
const MIN_DEMOGRAPHIC_SHOPPERS = 5;

function parseRange(input?: string): RangeKey {
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

function startOfDayUTC(date = new Date()) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function parseUTCDate(value: string) {
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
  if (denominator <= 0) return 0;

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
type TrendPoint = {
  date: string;
  impressions: number;
  views: number;
  wishlistAdds: number;
  shopClicks: number;
};

function buildDailyTrend(
  events: Array<{
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

  const buckets = new Map<string, TrendPoint>();

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

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const event of events) {
    const date = event.createdAt;

    const key = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");

    const bucket = buckets.get(key);

    if (!bucket) continue;

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


function formatTrendDate(
  value: string,
  includeDay = false
) {
  const date = new Date(`${value}T00:00:00Z`);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(includeDay
      ? { weekday: "short" as const }
      : {}),
    timeZone: "UTC",
  }).format(date);
}

function TrendChart({
  data,
}: {
  data: TrendPoint[];
}) {
  const width = 1000;
  const height = 300;

  const padding = {
    top: 20,
    right: 20,
    bottom: 48,
    left: 48,
  };

  const chartWidth =
    width - padding.left - padding.right;

  const chartHeight =
    height - padding.top - padding.bottom;

  const series = [
    {
      key: "impressions" as const,
      label: "Impressions",
      color: "#C8A99A",
    },
    {
      key: "views" as const,
      label: "PDP views",
      color: "#7B2D3E",
    },
    {
      key: "wishlistAdds" as const,
      label: "Wishlist adds",
      color: "#A96B78",
    },
    {
      key: "shopClicks" as const,
      label: "Shop clicks",
      color: "#4F6B5A",
    },
  ];

  const maxValue = Math.max(
    1,
    ...data.flatMap((point) =>
      series.map(
        (item) => point[item.key]
      )
    )
  );

  const roundedMax =
    maxValue <= 10
      ? 10
      : Math.ceil(maxValue / 10) * 10;

  const x = (index: number) => {
    if (data.length <= 1) {
      return padding.left + chartWidth / 2;
    }

    return (
      padding.left +
      (index / (data.length - 1)) *
        chartWidth
    );
  };

  const y = (value: number) =>
    padding.top +
    chartHeight -
    (value / roundedMax) * chartHeight;

  const gridValues = [
    0,
    roundedMax * 0.25,
    roundedMax * 0.5,
    roundedMax * 0.75,
    roundedMax,
  ];

  const labelEvery =
    data.length <= 7
      ? 1
      : data.length <= 14
      ? 2
      : Math.ceil(data.length / 7);

  const hasActivity = data.some((point) =>
    series.some(
      (item) => point[item.key] > 0
    )
  );

  if (!hasActivity) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-[#fdf7f4] px-6 text-center">
        <div>
          <div className="text-sm font-medium text-neutral-700">
            No activity in this period
          </div>

          <p className="mt-1 text-xs text-neutral-400">
            Performance will appear here as
            shoppers interact with this product.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Product performance over time"
          className="min-w-[700px] w-full"
        >
          {/* Horizontal grid */}
          {gridValues.map((value) => {
            const gridY = y(value);

            return (
              <g key={value}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={gridY}
                  y2={gridY}
                  stroke="#000000"
                  strokeOpacity="0.06"
                  strokeWidth="1"
                />

                <text
                  x={padding.left - 12}
                  y={gridY + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#A3A3A3"
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* Date labels */}
          {data.map((point, index) => {
            const show =
              index % labelEvery === 0 ||
              index === data.length - 1;

            if (!show) return null;

            return (
              <text
                key={point.date}
                x={x(index)}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#A3A3A3"
              >
                {formatTrendDate(
                  point.date,
                  data.length <= 7
                )}
              </text>
            );
          })}

          {/* Lines */}
          {series.map((item) => {
            const points = data
              .map(
                (point, index) =>
                  `${x(index)},${y(
                    point[item.key]
                  )}`
              )
              .join(" ");

            return (
              <g key={item.key}>
                {data.length > 1 && (
                  <polyline
                    points={points}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={
                      item.key === "views"
                        ? 3
                        : 2
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {data.map(
                  (point, index) => (
                    <circle
                      key={`${item.key}-${point.date}`}
                      cx={x(index)}
                      cy={y(point[item.key])}
                      r={
                        item.key === "views"
                          ? 4
                          : 3
                      }
                      fill={item.color}
                      stroke="white"
                      strokeWidth="1.5"
                    />
                  )
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2">
        {series.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2 text-xs text-neutral-500"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  item.color,
              }}
            />

            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ageFromDateOfBirth(
  dateOfBirth: Date,
  now = new Date()
) {
  let age =
    now.getUTCFullYear() -
    dateOfBirth.getUTCFullYear();

  const month =
    now.getUTCMonth() -
    dateOfBirth.getUTCMonth();

  if (
    month < 0 ||
    (month === 0 &&
      now.getUTCDate() <
        dateOfBirth.getUTCDate())
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

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{
  range?: string;
  from?: string;
  to?: string;
}>;
}) {
  const { productId } = await params;

  const sp = await searchParams;
const range = parseRange(sp.range);

const fromParam = sp.from ?? "";
const toParam = sp.to ?? "";

const { brandId } =
  await requireBrandContext();

const dateWindow = getDateWindow(
  range,
  fromParam,
  toParam
);

const effectiveRange =
  dateWindow ? range : "30d";

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
} = effectiveWindow;

  const product =
    await prisma.product.findFirst({
      where: {
        id: productId,
        brandId,
      },

      select: {
        id: true,
        title: true,
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
    });

  if (!product) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-black/10 bg-white p-6">
          <div className="font-semibold">
            Product not found
          </div>

          <Link
            href="/brand/revenue/products"
            className="mt-2 inline-block underline"
          >
            Back
          </Link>
        </div>
      </div>
    );
  }

  const events =
    await prisma.analyticsEvent.findMany({
      where: {
        brandId,
        productId,

        eventType: {
          in: [
            AnalyticsEventType.PRODUCT_IMPRESSION,
            AnalyticsEventType.PRODUCT_VIEW,
            AnalyticsEventType.WISHLIST_ADD,
            AnalyticsEventType.SHOP_CLICK,
          ],
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
    });

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

  const impressionToView =
    intersectionCount(
      impressionSessions,
      viewSessions
    );

  const viewToWishlist =
    intersectionCount(
      viewSessions,
      wishlistSessions
    );

  const viewToShop =
    intersectionCount(
      viewSessions,
      shopSessions
    );

  const viewRate = percentage(
    impressionToView,
    impressionSessions.size
  );

  const saveRate = percentage(
    viewToWishlist,
    viewSessions.size
  );

  const shopIntentRate = percentage(
    viewToShop,
    viewSessions.size
  );

  const trend = buildDailyTrend(
  events,
  from,
  until
);

  const currentWishlistCount =
    await prisma.wishlistItem.count({
      where: {
        productId,
      },
    });

  /*
   * Identified audience
   */

  const allProductSessions = new Set(
    events.map((event) => event.sessionId)
  );

  const identifiedSessionIds = new Set(
    events
      .filter((event) =>
        Boolean(event.session.shopperId)
      )
      .map((event) => event.sessionId)
  );

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

    if (
      shopper &&
      !identifiedShopperMap.has(shopper.id)
    ) {
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

  const identifiedCoverage =
    percentage(
      identifiedSessionIds.size,
      allProductSessions.size
    );

  /*
   * Age
   */

  const shoppersWithAge =
    identifiedShoppers.filter(
      (
        shopper
      ): shopper is typeof shopper & {
        dateOfBirth: Date;
      } => Boolean(shopper.dateOfBirth)
    );

  const ageCounts =
    new Map<string, number>();

  for (const shopper of shoppersWithAge) {
    const bucket = ageBucket(
      ageFromDateOfBirth(
        shopper.dateOfBirth
      )
    );

    ageCounts.set(
      bucket,
      (ageCounts.get(bucket) ?? 0) + 1
    );
  }

  const ageVisible =
    allProductSessions.size >=
      MIN_DEMOGRAPHIC_SESSIONS &&
    shoppersWithAge.length >=
      MIN_DEMOGRAPHIC_SHOPPERS;

  const AGE_ORDER = [
    "Under 18",
    "18–24",
    "25–34",
    "35–44",
    "45–54",
    "55+",
  ];

  const ageGroups = ageVisible
    ? AGE_ORDER.map((label) => ({
        label,
        count:
          ageCounts.get(label) ?? 0,

        percentage: percentage(
          ageCounts.get(label) ?? 0,
          shoppersWithAge.length
        ),
      }))
    : [];

  /*
   * Customer markets
   */

  const shopperMarkets =
    new Map<string, string>();

  for (const event of events) {
    const shopper =
      event.session.shopper;

    if (!shopper) continue;

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

  const marketCounts =
    new Map<string, number>();

  for (const countryCode of shopperMarkets.values()) {
    marketCounts.set(
      countryCode,
      (marketCounts.get(countryCode) ??
        0) + 1
    );
  }

  const marketsVisible =
    allProductSessions.size >=
      MIN_DEMOGRAPHIC_SESSIONS &&
    shopperMarkets.size >=
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
              percentage:
                percentage(
                  count,
                  shopperMarkets.size
                ),
            })
          )
          .sort(
            (a, b) =>
              b.count - a.count
          )
      : [];

  const qs = (value: RangeKey) => {
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

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
  <div className="flex flex-col gap-6">
    {/* Top row */}
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <Link
          href={`/brand/revenue/products${qs(
            effectiveRange
          )}`}
          className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50 hover:text-white/80"
        >
          ← Back to product performance
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          {product.title}
        </h1>

        <p className="mt-1 text-sm text-white/60">
          {rangeLabel(
            effectiveRange,
            fromParam,
            toParam
          )}
        </p>
      </div>

      <div className="flex items-end gap-5">
        {/* Range pills */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              "today",
              "7d",
              "30d",
              "custom",
            ] as RangeKey[]
          ).map((value) => {
            const active =
              value === effectiveRange;

            const label =
              value === "today"
                ? "Today"
                : value === "7d"
                ? "Last 7 days"
                : value === "30d"
                ? "Last 30 days"
                : "Custom range";

            return (
              <Link
                key={value}
                href={
                  value === "custom"
                    ? `/brand/revenue/products/${productId}?range=custom`
                    : `/brand/revenue/products/${productId}${qs(
                        value
                      )}`
                }
                className={
                  active
                    ? "rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#7B2D3E]"
                    : "rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10"
                }
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Product image */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10">
          {product.images[0]?.url ? (
            <img
              src={product.images[0].url}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-white/40">
              No image
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Custom range row */}
    {range === "custom" && (
      <form
        method="GET"
        action={`/brand/revenue/products/${productId}`}
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
          defaultValue={fromParam}
          required
          className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white outline-none [color-scheme:dark] focus:border-white/40"
        />

        <span className="ml-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
          To
        </span>

        <input
          type="date"
          name="to"
          defaultValue={toParam}
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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Impressions",
            value: impressions,
          },
          {
            label: "PDP views",
            value: views,
          },
          {
            label: "Wishlist adds",
            value: wishlistAdds,
          },
          {
            label: "Shop clicks",
            value: shopClicks,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-[24px] border border-black/10 bg-white p-5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              {metric.label}
            </div>

            <div className="mt-3 text-3xl font-semibold tracking-tight text-black">
              {metric.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "View rate",
            value: `${viewRate}%`,
            description:
              "Impression sessions that opened this product.",
          },
          {
            label: "Save rate",
            value: `${saveRate}%`,
            description:
              "PDP-view sessions that saved this product.",
          },
          {
            label: "Shop intent",
            value: `${shopIntentRate}%`,
            description:
              "PDP-view sessions that clicked Shop.",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-[24px] border border-black/10 bg-white p-5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7B2D3E]/60">
              {metric.label}
            </div>

            <div className="mt-2 text-2xl font-semibold text-[#7B2D3E]">
              {metric.value}
            </div>

            <p className="mt-2 text-xs leading-5 text-neutral-400">
              {metric.description}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-black/10 bg-white p-6 md:p-7">
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
        Performance
      </div>

      <h2 className="mt-1 font-semibold">
        Performance over time
      </h2>

      <p className="mt-1 text-xs text-neutral-400">
        Daily product interactions during{" "}
        {rangeLabel(
          effectiveRange,
          fromParam,
          toParam
        ).toLowerCase()}.
      </p>
    </div>

    <div className="text-xs text-neutral-400">
      Daily
    </div>
  </div>

  <div className="mt-7">
    <TrendChart data={trend} />
  </div>
</section>

      

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-black/10 bg-white p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            Audience
          </div>

          <h2 className="mt-1 font-semibold">
            Age groups
          </h2>

          {!ageVisible ? (
            <div className="mt-6 rounded-2xl bg-[#fdf7f4] p-5">
              <div className="text-sm font-medium">
                Not enough data yet
              </div>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Age insights appear after
                at least{" "}
                {MIN_DEMOGRAPHIC_SESSIONS}{" "}
                interaction sessions and{" "}
                {MIN_DEMOGRAPHIC_SHOPPERS}{" "}
                identified shoppers with
                age information.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {ageGroups.map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {row.label}
                    </span>
                    <span className="font-medium">
                      {row.percentage}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full bg-[#7B2D3E]/70"
                      style={{
                        width: `${row.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            Audience
          </div>

          <h2 className="mt-1 font-semibold">
            Customer markets
          </h2>

          {!marketsVisible ? (
            <div className="mt-6 rounded-2xl bg-[#fdf7f4] p-5">
              <div className="text-sm font-medium">
                Not enough data yet
              </div>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Market insights appear after
                at least{" "}
                {MIN_DEMOGRAPHIC_SESSIONS}{" "}
                interaction sessions and{" "}
                {MIN_DEMOGRAPHIC_SHOPPERS}{" "}
                identified shoppers with
                market information.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {customerMarkets.map(
                (row) => (
                  <div
                    key={
                      row.countryCode
                    }
                  >
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {
                          row.countryCode
                        }
                      </span>

                      <span>
                        {row.percentage}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full bg-[#7B2D3E]/70"
                        style={{
                          width: `${row.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}