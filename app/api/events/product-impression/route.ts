import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AnalyticsEventType,
  AnalyticsSourcePage,
} from "@prisma/client";
import {
  attachAnalyticsSessionCookie,
  getOrCreateAnalyticsSession,
} from "@/lib/analytics/session";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {  normalizeDiscoverySource,} from "@/lib/analytics/discoverySource";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|whatsapp|slack|discord|telegram|preview|prefetch/i;

function getClientIp(req: NextRequest) {
  const forwardedFor =
    req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp =
      forwardedFor.split(",")[0]?.trim();

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

type ImpressionBody = {
  productId?: string;

  sourcePage?: string | null;
  sectionKey?: string | null;
  position?: number | null;

  pageNumber?: number | null;
  contextType?: string | null;

  searchQuery?: string | null;

  entrySectionKey?: string | null;
  entryPosition?: number | null;
  entryPageNumber?: number | null;
  entryContextType?: string | null;

  sourcePath?: string | null;
};

function normalizeSourcePage(
  value: string | null | undefined
): AnalyticsSourcePage | null {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

  switch (normalized) {
    case "HOME":
      return AnalyticsSourcePage.HOME;

    case "SEARCH":
      return AnalyticsSourcePage.SEARCH;

    case "BRAND":
      return AnalyticsSourcePage.BRAND;

    case "CATEGORY":
      return AnalyticsSourcePage.CATEGORY;

    case "PRODUCT":
      return AnalyticsSourcePage.PRODUCT;

    case "DIARY":
      return AnalyticsSourcePage.DIARY;

    case "STYLE_FEED":
      return AnalyticsSourcePage.STYLE_FEED;

    case "CONTINENT":
      return AnalyticsSourcePage.CONTINENT;

    case "EMERGING_BRANDS":
      return AnalyticsSourcePage.EMERGING_BRANDS;

    case "NEW_IN":
      return AnalyticsSourcePage.NEW_IN;

    case "SALE":
      return AnalyticsSourcePage.SALE;

    case "OTHER":
      return AnalyticsSourcePage.OTHER;

    default:
      return null;
  }
}

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

    /*
     * Impressions naturally happen much more frequently
     * than searches or product views.
     */
    const rateLimit = await checkRateLimit({
      key: `analytics:product-impression:${clientIp}`,
      limit: 600,
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
        }
      );
    }

    const body =
      (await req.json()) as ImpressionBody;

    const productId =
      String(body.productId ?? "").trim();

    if (!productId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product ID is required",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get the real product and brand ourselves.
     */
    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          brandId: true,
          status: true,
          isActive: true,
          publishedAt: true,
        },
      });

    if (
      !product ||
      product.status !== "APPROVED" ||
      !product.isActive ||
      !product.publishedAt
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product unavailable",
        },
        {
          status: 404,
        }
      );
    }

    const {
      sessionId,
      shopperCountryCode,
      shopperCurrencyCode,
    } =
      await getOrCreateAnalyticsSession(req);

    const sourcePage =
      normalizeSourcePage(body.sourcePage);

      const discoverySource =
  normalizeDiscoverySource(
    body.sourcePage
  );

    const position =
      typeof body.position === "number" &&
      Number.isFinite(body.position)
        ? Math.max(
            1,
            Math.floor(body.position)
          )
        : null;

        const pageNumber =
  typeof body.pageNumber === "number" &&
  Number.isFinite(body.pageNumber)
    ? Math.max(
        1,
        Math.floor(body.pageNumber)
      )
    : null;

const contextType =
  String(
    body.contextType ?? ""
  ).trim() || null;

const sectionKey =
  String(
    body.sectionKey ?? ""
  ).trim() || null;

    const searchQuery =
      String(
        body.searchQuery ?? ""
      ).trim() || null;

      const entrySectionKey =
  String(
    body.entrySectionKey ?? ""
  ).trim() || null;

const entryPosition =
  typeof body.entryPosition === "number" &&
  Number.isFinite(body.entryPosition)
    ? Math.max(
        1,
        Math.floor(body.entryPosition)
      )
    : null;

const entryPageNumber =
  typeof body.entryPageNumber === "number" &&
  Number.isFinite(body.entryPageNumber)
    ? Math.max(
        1,
        Math.floor(body.entryPageNumber)
      )
    : null;

const entryContextType =
  String(
    body.entryContextType ?? ""
  ).trim() || null;

    /*
     * Don't record the same product repeatedly because
     * IntersectionObserver may fire more than once.
     */
    const duplicateWindowStart =
      new Date(Date.now() - 30_000);

    const recentDuplicate =
      await prisma.analyticsEvent.findFirst({
        where: {
          sessionId,

          eventType:
            AnalyticsEventType.PRODUCT_IMPRESSION,

          productId: product.id,

          sourcePage,

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
            AnalyticsEventType.PRODUCT_IMPRESSION,

          productId: product.id,
          brandId: product.brandId,

          sourcePage,

          sourcePath:
            String(
              body.sourcePath ?? ""
            ).trim() || null,

          position,
          sectionKey,
          pageNumber,
          contextType,
          shopperCountryCode,
          shopperCurrencyCode,       
          metadata: {
              discoverySource,
              searchQuery,
              sectionKey,

               entrySectionKey,
               entryPosition,
               entryPageNumber,
               entryContextType,
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
      "Product impression analytics failed",
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