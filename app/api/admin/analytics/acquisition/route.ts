import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

type Range = "today" | "7d" | "30d" | "custom";

type DimensionRow = {
  sessions: number;
  waitlist: number;
  brandApps: number;
};

function startOfDay(d: Date) {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function parseDateYYYYMMDD(value: string | null) {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function getDateRange(req: NextRequest) {
  const now = new Date();

  const rawRange =
    req.nextUrl.searchParams.get("range");

  const range: Range =
    rawRange === "today" ||
    rawRange === "7d" ||
    rawRange === "30d" ||
    rawRange === "custom"
      ? rawRange
      : "30d";

  if (range === "today") {
    return {
      range,
      from: startOfDay(now),
      to: addDays(startOfDay(now), 1),
    };
  }

  if (range === "7d") {
    return {
      range,
      from: startOfDay(addDays(now, -6)),
      to: addDays(startOfDay(now), 1),
    };
  }

  if (range === "custom") {
    const parsedFrom = parseDateYYYYMMDD(
      req.nextUrl.searchParams.get("from")
    );

    const parsedTo = parseDateYYYYMMDD(
      req.nextUrl.searchParams.get("to")
    );

    return {
      range,
      from:
        parsedFrom ??
        startOfDay(addDays(now, -29)),
      to: parsedTo
        ? addDays(startOfDay(parsedTo), 1)
        : addDays(startOfDay(now), 1),
    };
  }

  return {
    range: "30d" as const,
    from: startOfDay(addDays(now, -29)),
    to: addDays(startOfDay(now), 1),
  };
}

function normalizeDimension(
  value: string | null,
  fallback: string
) {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

function conversionRate(
  conversions: number,
  sessions: number
) {
  if (sessions <= 0) return 0;

  return Number(
    ((conversions / sessions) * 100).toFixed(1)
  );
}

function buildDimension<T extends string>(
  sessions: Array<{
    id: string;
    acquisitionSource: string | null;
    acquisitionMedium: string | null;
    acquisitionCampaign: string | null;
    acquisitionContent: string | null;
  }>,
  waitlistSessionIds: Set<string>,
  brandAppSessionIds: Set<string>,
  getKey: (
    session: (typeof sessions)[number]
  ) => T
) {
  const map = new Map<T, DimensionRow>();

  for (const session of sessions) {
    const key = getKey(session);

    const row =
      map.get(key) ?? {
        sessions: 0,
        waitlist: 0,
        brandApps: 0,
      };

    row.sessions += 1;

    if (waitlistSessionIds.has(session.id)) {
      row.waitlist += 1;
    }

    if (brandAppSessionIds.has(session.id)) {
      row.brandApps += 1;
    }

    map.set(key, row);
  }

  return Array.from(map.entries())
    .map(([key, row]) => ({
      key,
      sessions: row.sessions,
      waitlist: row.waitlist,
      brandApps: row.brandApps,

      waitlistConversionRate:
        conversionRate(
          row.waitlist,
          row.sessions
        ),

      brandAppConversionRate:
        conversionRate(
          row.brandApps,
          row.sessions
        ),
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const { range, from, to } =
      getDateRange(req);

    /*
     * Acquisition cohort:
     *
     * 1. Select sessions that STARTED in the period.
     * 2. Find conversions linked to those exact sessions.
     * 3. Attribute conversion to the acquisition metadata
     *    stored on the originating session.
     */

    const sessions =
      await prisma.analyticsSession.findMany({
        where: {
          startedAt: {
            gte: from,
            lt: to,
          },
        },
        select: {
          id: true,
          acquisitionSource: true,
          acquisitionMedium: true,
          acquisitionCampaign: true,
          acquisitionContent: true,
        },
      });

    const sessionIds =
      sessions.map((session) => session.id);

    /*
     * If there are no sessions in the cohort,
     * avoid querying with an empty IN unnecessarily.
     */
    const [
      linkedWaitlist,
      linkedBrandApplications,
    ] =
      sessionIds.length > 0
        ? await Promise.all([
            prisma.waitlistSubscriber.findMany({
              where: {
                analyticsSessionId: {
                  in: sessionIds,
                },
              },
              select: {
                analyticsSessionId: true,
              },
            }),

            prisma.brandApplication.findMany({
              where: {
                analyticsSessionId: {
                  in: sessionIds,
                },
              },
              select: {
                analyticsSessionId: true,
              },
            }),
          ])
        : [[], []];

    /*
     * Sets mean one session counts as one converted
     * session even if duplicate conversion records
     * somehow exist.
     */

    const waitlistSessionIds = new Set(
      linkedWaitlist
        .map((row) => row.analyticsSessionId)
        .filter(
          (id): id is string => Boolean(id)
        )
    );

    const brandAppSessionIds = new Set(
      linkedBrandApplications
        .map((row) => row.analyticsSessionId)
        .filter(
          (id): id is string => Boolean(id)
        )
    );

    /*
 * ACTUAL BUSINESS ACTIVITY
 *
 * These are all conversion records CREATED during
 * the selected period, regardless of whether they
 * can be linked back to an analytics session.
 *
 * This is different from attributed conversions.
 */

const [
  totalWaitlistReceived,
  totalBrandAppsReceived,
] = await Promise.all([
  prisma.waitlistSubscriber.count({
    where: {
      createdAt: {
        gte: from,
        lt: to,
      },
    },
  }),

  prisma.brandApplication.count({
    where: {
      createdAt: {
        gte: from,
        lt: to,
      },
    },
  }),
]);
    /*
     * SOURCE
     */

    const sources = buildDimension(
      sessions,
      waitlistSessionIds,
      brandAppSessionIds,
      (session) =>
        normalizeDimension(
          session.acquisitionSource,
          "unattributed"
        )
    ).map(({ key, ...row }) => ({
      source: key,
      ...row,
    }));

    /*
     * MEDIUM
     */

    const mediums = buildDimension(
      sessions,
      waitlistSessionIds,
      brandAppSessionIds,
      (session) =>
        normalizeDimension(
          session.acquisitionMedium,
          "unassigned"
        )
    ).map(({ key, ...row }) => ({
      medium: key,
      ...row,
    }));

    /*
     * CAMPAIGN
     */

    const campaigns = buildDimension(
      sessions,
      waitlistSessionIds,
      brandAppSessionIds,
      (session) =>
        normalizeDimension(
          session.acquisitionCampaign,
          "unassigned"
        )
    ).map(({ key, ...row }) => ({
      campaign: key,
      ...row,
    }));

    /*
     * CONTENT
     *
     * This lets us distinguish:
     *
     * Instagram → Launch 2026 → Bio
     * Instagram → Launch 2026 → Founder Post
     */

    const contents = buildDimension(
      sessions,
      waitlistSessionIds,
      brandAppSessionIds,
      (session) =>
        normalizeDimension(
          session.acquisitionContent,
          "unassigned"
        )
    ).map(({ key, ...row }) => ({
      content: key,
      ...row,
    }));

    /*
     * SOURCE + CAMPAIGN + CONTENT
     *
     * This is the most useful detailed acquisition view.
     */

    const journeys = buildDimension(
      sessions,
      waitlistSessionIds,
      brandAppSessionIds,
      (session) => {
        const source = normalizeDimension(
          session.acquisitionSource,
          "unattributed"
        );

        const campaign = normalizeDimension(
          session.acquisitionCampaign,
          "unassigned"
        );

        const content = normalizeDimension(
          session.acquisitionContent,
          "unassigned"
        );

        return `${source}|||${campaign}|||${content}`;
      }
    ).map(({ key, ...row }) => {
      const [
        source,
        campaign,
        content,
      ] = key.split("|||");

      return {
        source,
        campaign,
        content,
        ...row,
      };
    });

    /*
     * OVERVIEW
     */

    const totalSessions = sessions.length;

    const totalWaitlist =
      waitlistSessionIds.size;

    const totalBrandApps =
      brandAppSessionIds.size;

    return NextResponse.json({
      range,

      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },

      overview: {
  sessions: totalSessions,

  /*
   * Actual records received during the period.
   */
  waitlistReceived: totalWaitlistReceived,
  brandAppsReceived: totalBrandAppsReceived,

  /*
   * Sessions in this acquisition cohort that
   * produced a linked conversion.
   */
  attributedWaitlist: totalWaitlist,
  attributedBrandApps: totalBrandApps,

  waitlistConversionRate:
    conversionRate(
      totalWaitlist,
      totalSessions
    ),

  brandAppConversionRate:
    conversionRate(
      totalBrandApps,
      totalSessions
    ),
},

      sources,
      mediums,
      campaigns,
      contents,
      journeys,
    });
  } catch (error) {
    console.error(
      "[admin acquisition analytics]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load acquisition analytics",
      },
      {
        status: 500,
      }
    );
  }
}