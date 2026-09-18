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

const MIN_SIGNAL_SESSIONS = 5;

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
      .filter(
        (event) =>
          event.eventType === eventType
      )
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

export default async function BrandProductPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
  range?: string;
  from?: string;
  to?: string;
}>;
}) {
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

  const events =
    await prisma.analyticsEvent.findMany({
      where: {
        brandId,

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
        productId: true,
      },
    });

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

  const productMap = new Map(
    products.map((product) => [
      product.id,
      product,
    ])
  );

  const rows = productIds
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

      const impressionSessions =
        uniqueSessionIds(
          productEvents,
          AnalyticsEventType.PRODUCT_IMPRESSION
        );

      const viewSessions =
        uniqueSessionIds(
          productEvents,
          AnalyticsEventType.PRODUCT_VIEW
        );

      const saveSessions =
        uniqueSessionIds(
          productEvents,
          AnalyticsEventType.WISHLIST_ADD
        );

      const shopSessions =
        uniqueSessionIds(
          productEvents,
          AnalyticsEventType.SHOP_CLICK
        );

      const impressionToView =
        intersectionCount(
          impressionSessions,
          viewSessions
        );

      const viewToSave =
        intersectionCount(
          viewSessions,
          saveSessions
        );

      const viewToShop =
        intersectionCount(
          viewSessions,
          shopSessions
        );

      return {
        id: product.id,
        title: product.title,

        imageUrl:
          product.images[0]?.url ?? null,

        price:
          product.price?.toString() ??
          null,

        currency: product.currency,

        impressions:
          impressionSessions.size,

        views:
          viewSessions.size,

        saves:
          saveSessions.size,

        shopClicks:
          shopSessions.size,

        viewRate: percentage(
          impressionToView,
          impressionSessions.size
        ),

        viewRateQualified:
          impressionSessions.size >=
          MIN_SIGNAL_SESSIONS,

        saveRate: percentage(
          viewToSave,
          viewSessions.size
        ),

        saveRateQualified:
          viewSessions.size >=
          MIN_SIGNAL_SESSIONS,

        shopIntentRate: percentage(
          viewToShop,
          viewSessions.size
        ),

        shopIntentQualified:
          viewSessions.size >=
          MIN_SIGNAL_SESSIONS,
      };
    })
    .filter(
      (
        row
      ): row is NonNullable<
        typeof row
      > => row !== null
    )
    .sort(
      (a, b) =>
        b.views - a.views ||
        b.saves - a.saves ||
        b.shopClicks - a.shopClicks
    );

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
        <a
          href={`/brand/revenue${qs(
            effectiveRange
          )}`}
          className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50 hover:text-white/80"
        >
          ← Back to Analytics
        </a>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          Product performance
        </h1>

        <p className="mt-1 text-sm text-white/60">
          See how shoppers are engaging
          with your products.
        </p>
      </div>

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
                  ? "/brand/revenue/products?range=custom"
                  : `/brand/revenue/products${qs(
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
    </div>

    {/* Custom range row */}
    {range === "custom" && (
      <form
        method="GET"
        action="/brand/revenue/products"
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

      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            Products
          </div>

          <div className="mt-0.5 font-semibold text-black">
            Performance
          </div>

          <div className="text-xs text-neutral-400">
            {rangeLabel(effectiveRange, fromParam, toParam)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#fdf7f4] text-left text-[#a89280]">
              <tr>
                <th className="px-4 py-3">
                  Product
                </th>
                <th className="px-4 py-3 text-right">
                  Impressions
                </th>
                <th className="px-4 py-3 text-right">
                  Views
                </th>
                <th className="px-4 py-3 text-right">
                  Saves
                </th>
                <th className="px-4 py-3 text-right">
                  Shop clicks
                </th>
                <th className="px-4 py-3 text-right">
                  View rate
                </th>
                <th className="px-4 py-3 text-right">
                  Save rate
                </th>
                <th className="px-4 py-3 text-right">
                  Shop intent
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-black/5"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-neutral-50">
                        {row.imageUrl ? (
                          <img
                            src={row.imageUrl}
                            alt={row.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-neutral-400">
                            No image
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <Link
                          href={`/brand/revenue/products/${row.id}${qs(
                            effectiveRange
                          )}`}
                          className="block max-w-[220px] truncate font-medium text-black hover:underline"
                        >
                          {row.title}
                        </Link>

                        <div className="mt-0.5 text-xs text-neutral-400">
                          {row.price
                            ? `${row.currency} ${row.price}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.impressions}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.views}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.saves}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.shopClicks}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.viewRate}%
                  </td>

                  <td className="px-4 py-3 text-right">
                    {row.saveRate}%
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-[#7B2D3E]">
                    {row.shopIntentRate}%
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No product activity yet
                    for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-black/5 px-5 py-4 text-xs leading-5 text-neutral-400">
          Rates are based on unique
          shopper sessions. Products need
          at least 5 relevant sessions
          before their rate is used for
          comparative performance
          highlights.
        </div>
      </div>
    </div>
  );
}