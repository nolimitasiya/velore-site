import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

import {
  AnalyticsEventType,
  AnalyticsSourcePage,
  BrandAccountStatus,
  AffiliateStatus,
} from "@prisma/client";

import {
  attachAnalyticsSessionCookie,
  getOrCreateAnalyticsSession,
} from "@/lib/analytics/session";

import {
  checkRateLimit,
} from "@/lib/security/rateLimit";

import {
  normalizeDiscoverySource,
} from "@/lib/analytics/discoverySource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|whatsapp|slack|discord|telegram|preview|prefetch/i;

function getClientIp(
  req: NextRequest
) {
  const forwardedFor =
    req.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  return (
    req.headers.get(
      "x-real-ip"
    ) ??
    req.headers.get(
      "x-vercel-forwarded-for"
    ) ??
    "unknown"
  );
}

type BrandViewBody = {
  brandId?: string;
  sourcePath?: string;

  discoverySource?:
    | string
    | null;

  searchQuery?:
    | string
    | null;

  position?:
    | number
    | null;

  sectionKey?:
    | string
    | null;

  pageNumber?:
    | number
    | null;

  contextType?:
    | string
    | null;

  entrySectionKey?:
    | string
    | null;

  entryPosition?:
    | number
    | null;

  entryPageNumber?:
    | number
    | null;

  entryContextType?:
    | string
    | null;
};

export async function POST(
  req: NextRequest
) {
  try {
    /*
     * ─────────────────────────────
     * Reject bots
     * ─────────────────────────────
     */

    const userAgent =
      req.headers.get(
        "user-agent"
      ) ?? "";

    if (
      BOT_PATTERN.test(
        userAgent
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Automated request rejected",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ─────────────────────────────
     * Rate limit
     * ─────────────────────────────
     */

    const clientIp =
      getClientIp(req);

    const rateLimit =
      await checkRateLimit({
        key:
          `analytics:brand-view:${clientIp}`,

        limit: 120,

        windowMs:
          60_000,
      });

    if (
      !rateLimit.allowed
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Too many requests",
        },
        {
          status: 429,
        }
      );
    }

    /*
     * ─────────────────────────────
     * Request body
     * ─────────────────────────────
     */

    const body =
      (await req.json()) as BrandViewBody;

    const brandId =
      String(
        body.brandId ?? ""
      ).trim();

    if (!brandId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Brand ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const discoverySource =
  normalizeDiscoverySource(
    body.discoverySource
  ) ?? "BRAND";

    /*
     * ─────────────────────────────
     * Verify brand server-side
     * ─────────────────────────────
     */

    const brand =
      await prisma.brand.findUnique({
        where: {
          id: brandId,
        },

        select: {
          id: true,
          accountStatus: true,
          affiliateStatus: true,
        },
      });

    if (
      !brand ||
      brand.accountStatus !==
        BrandAccountStatus.ACTIVE ||
      brand.affiliateStatus !==
        AffiliateStatus.ACTIVE
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Brand unavailable",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ─────────────────────────────
     * Analytics session
     * ─────────────────────────────
     */

    const {
      sessionId,
      shopperCountryCode,
      shopperCurrencyCode,
    } =
      await getOrCreateAnalyticsSession(
        req
      );

    /*
     * Avoid immediate duplicate
     * brand-profile views.
     *
     * Genuine repeat interest later
     * can still become another raw view.
     */

    const duplicateWindowStart =
      new Date(
        Date.now() -
          60_000
      );

    const recentDuplicate =
      await prisma.analyticsEvent.findFirst({
        where: {
          sessionId,

          eventType:
            AnalyticsEventType.BRAND_VIEW,

          brandId:
            brand.id,

          createdAt: {
            gte:
              duplicateWindowStart,
          },
        },

        select: {
          id: true,
        },
      });

    /*
     * ─────────────────────────────
     * Record BRAND_VIEW
     * ─────────────────────────────
     */

    if (
      !recentDuplicate
    ) {
      await prisma.analyticsEvent.create({
        data: {
          sessionId,

          eventType:
            AnalyticsEventType.BRAND_VIEW,

          brandId:
            brand.id,

          /*
           * Physical page where
           * this event happened.
           */
          sourcePage:
            AnalyticsSourcePage.BRAND,

          sourcePath:
            String(
              body.sourcePath ??
                ""
            ).trim() ||
            null,

          position:
            typeof body.position ===
              "number" &&
            Number.isFinite(
              body.position
            )
              ? Math.max(
                  1,
                  Math.floor(
                    body.position
                  )
                )
              : null,

          sectionKey:
            String(
              body.sectionKey ??
                ""
            ).trim() ||
            null,

          pageNumber:
            typeof body.pageNumber ===
              "number" &&
            Number.isFinite(
              body.pageNumber
            )
              ? Math.max(
                  1,
                  Math.floor(
                    body.pageNumber
                  )
                )
              : null,

          contextType:
            String(
              body.contextType ??
                ""
            ).trim() ||
            null,

          shopperCountryCode,
          shopperCurrencyCode,

          /*
           * Original discovery
           * attribution.
           */
          metadata: {
            discoverySource,

            searchQuery:
              String(
                body.searchQuery ??
                  ""
              ).trim() ||
              null,

            position:
              typeof body.position ===
                "number" &&
              Number.isFinite(
                body.position
              )
                ? Math.max(
                    1,
                    Math.floor(
                      body.position
                    )
                  )
                : null,

            sectionKey:
              String(
                body.sectionKey ??
                  ""
              ).trim() ||
              null,

            pageNumber:
              typeof body.pageNumber ===
                "number" &&
              Number.isFinite(
                body.pageNumber
              )
                ? Math.max(
                    1,
                    Math.floor(
                      body.pageNumber
                    )
                  )
                : null,

            contextType:
              String(
                body.contextType ??
                  ""
              ).trim() ||
              null,

            entrySectionKey:
              String(
                body.entrySectionKey ??
                  ""
              ).trim() ||
              null,

            entryPosition:
              typeof body.entryPosition ===
                "number" &&
              Number.isFinite(
                body.entryPosition
              )
                ? Math.max(
                    1,
                    Math.floor(
                      body.entryPosition
                    )
                  )
                : null,

            entryPageNumber:
              typeof body.entryPageNumber ===
                "number" &&
              Number.isFinite(
                body.entryPageNumber
              )
                ? Math.max(
                    1,
                    Math.floor(
                      body.entryPageNumber
                    )
                  )
                : null,

            entryContextType:
              String(
                body.entryContextType ??
                  ""
              ).trim() ||
              null,
          },
        },
      });
    }

    const response =
      NextResponse.json({
        ok: true,

        duplicate:
          Boolean(
            recentDuplicate
          ),
      });

    attachAnalyticsSessionCookie(
      response,
      sessionId
    );

    return response;
  } catch (error) {
    console.error(
      "Brand view analytics failed",
      error
    );

    /*
     * Analytics should never break
     * the shopping experience.
     */
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