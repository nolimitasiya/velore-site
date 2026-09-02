import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AnalyticsEventType,
  AnalyticsSourcePage,
  Prisma,
} from "@prisma/client";
import {
  attachAnalyticsSessionCookie,
  getOrCreateAnalyticsSession,
} from "@/lib/analytics/session";

import { checkRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|whatsapp|slack|discord|telegram|preview|prefetch/i;

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-vercel-forwarded-for") ??
    "unknown"
  );
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

type SearchAnalyticsBody = {
  query?: string;
  resultsCount?: number;

  intent?: {
    productTypes?: string[];
    occasions?: string[];
    colours?: string[];
    styles?: string[];
    materials?: string[];
  };

  filters?: Prisma.InputJsonValue;

  sourcePath?: string;
};

export async function POST(req: NextRequest) {
  try {
    const userAgent =
      req.headers.get("user-agent") ?? "";

    if (BOT_PATTERN.test(userAgent)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Automated request rejected",
        },
        {
          status: 403,
        }
      );
    }

    const clientIp = getClientIp(req);

    const rateLimit = await checkRateLimit({
      key: `analytics:search:${clientIp}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many requests",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(
                1,
                Math.ceil(
                  (rateLimit.resetAt.getTime() -
                    Date.now()) /
                    1000
                )
              )
            ),
          },
        }
      );
    }

    const body =
      (await req.json()) as SearchAnalyticsBody;

    const query =
      String(body.query ?? "").trim();

    if (!query) {
      return NextResponse.json(
        {
          error: "Search query is required",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedQuery =
      normalizeText(query);

    const resultsCount =
      Number.isFinite(body.resultsCount)
        ? Math.max(
            0,
            Math.floor(
              Number(body.resultsCount)
            )
          )
        : 0;

    const {
      sessionId,
      shopperCountryCode,
      shopperCurrencyCode,
    } =
      await getOrCreateAnalyticsSession(
        req
      );

    const duplicateWindowStart =
      new Date(Date.now() - 5_000);

    const recentDuplicate =
      await prisma.analyticsEvent.findFirst({
        where: {
          sessionId,
          eventType:
            AnalyticsEventType.SEARCH,
          normalizedQuery,
          createdAt: {
            gte: duplicateWindowStart,
          },
        },
        select: {
          id: true,
        },
      });

    if (!recentDuplicate) {
      await prisma.analyticsEvent.create({
        data: {
          sessionId,

          eventType:
            AnalyticsEventType.SEARCH,

          query,
          normalizedQuery,
          resultsCount,

          sourcePage:
            AnalyticsSourcePage.SEARCH,

          sourcePath:
            String(
              body.sourcePath ?? ""
            ).trim() || "/search",

          shopperCountryCode,
          shopperCurrencyCode,

          filters:
            body.filters ?? undefined,

          metadata: {
            intent: {
              productTypes:
                body.intent
                  ?.productTypes ?? [],

              occasions:
                body.intent
                  ?.occasions ?? [],

              colours:
                body.intent
                  ?.colours ?? [],

              styles:
                body.intent
                  ?.styles ?? [],

              materials:
                body.intent
                  ?.materials ?? [],
            },

            zeroResults:
              resultsCount === 0,
          },
        },
      });
    }

    const response =
      NextResponse.json({
        ok: true,
        duplicate:
          Boolean(recentDuplicate),
      });

    attachAnalyticsSessionCookie(
      response,
      sessionId
    );

    return response;
  } catch (error) {
    console.error(
      "Search analytics tracking failed",
      error
    );

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 200,
      }
    );
  }
}