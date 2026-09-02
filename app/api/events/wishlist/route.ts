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

import {
  normalizeDiscoverySource,
} from "@/lib/analytics/discoverySource";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|whatsapp|slack|discord|telegram|preview|prefetch/i;

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();

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

function normalizeActionSourcePage(
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

    case "OTHER":
      return AnalyticsSourcePage.OTHER;

    default:
      return null;
  }
}

type WishlistAnalyticsBody = {
  productId?: string;
  action?: "ADD" | "REMOVE";

  sourcePath?: string | null;
  actionSourcePage?: string | null;
  discoverySource?: string | null;
  searchQuery?: string | null;
  searchPosition?: number | null;

  sectionKey?: string | null;
  pageNumber?: number | null;
  contextType?: string | null;
  entrySectionKey?: string | null;
  entryPosition?: number | null;
  entryPageNumber?: number | null;
  entryContextType?: string | null;
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
      key: `analytics:wishlist:${clientIp}`,
      limit: 120,
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
      (await req.json()) as WishlistAnalyticsBody;

    const productId =
      String(body.productId ?? "").trim();

    const action =
      body.action === "REMOVE"
        ? "REMOVE"
        : body.action === "ADD"
        ? "ADD"
        : null;

    if (!productId || !action) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product ID and action are required",
        },
        {
          status: 400,
        }
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          brandId: true,
          isActive: true,
          status: true,
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

    const discoverySource =
  normalizeDiscoverySource(
    body.discoverySource
  );

    const {
      sessionId,
      shopperCountryCode,
      shopperCurrencyCode,
    } =
      await getOrCreateAnalyticsSession(req);

    const eventType =
      action === "ADD"
        ? AnalyticsEventType.WISHLIST_ADD
        : AnalyticsEventType.WISHLIST_REMOVE;

    /*
     * Avoid accidental duplicate requests caused by
     * rapid rerenders or double-clicks.
     */
    const duplicateWindowStart =
      new Date(Date.now() - 5_000);

    const recentDuplicate =
      await prisma.analyticsEvent.findFirst({
        where: {
          sessionId,
          eventType,
          productId: product.id,
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

          eventType,

          productId: product.id,
          brandId: product.brandId,

          sourcePage:
          normalizeActionSourcePage(
             body.actionSourcePage
              ),

          sourcePath:
            String(
              body.sourcePath ?? ""
            ).trim() || null,
            position:
  typeof body.searchPosition === "number" &&
  Number.isFinite(body.searchPosition)
    ? Math.max(
        1,
        Math.floor(body.searchPosition)
      )
    : null,

sectionKey:
  String(
    body.sectionKey ?? ""
  ).trim() || null,

pageNumber:
  typeof body.pageNumber === "number" &&
  Number.isFinite(body.pageNumber)
    ? Math.max(
        1,
        Math.floor(body.pageNumber)
      )
    : null,

contextType:
  String(
    body.contextType ?? ""
  ).trim() || null,

          shopperCountryCode,
          shopperCurrencyCode,

         metadata: {
  discoverySource,

  searchQuery:
    String(
      body.searchQuery ?? ""
    ).trim() || null,

  searchPosition:
    typeof body.searchPosition === "number" &&
    Number.isFinite(
      body.searchPosition
    )
      ? Math.max(
          1,
          Math.floor(
            body.searchPosition
          )
        )
      : null,

  sectionKey:
    String(
      body.sectionKey ?? ""
    ).trim() || null,

    pageNumber:
    typeof body.pageNumber === "number" &&
    Number.isFinite(body.pageNumber)
      ? Math.max(
          1,
          Math.floor(body.pageNumber)
        )
      : null,

  contextType:
    String(
      body.contextType ?? ""
    ).trim() || null,

    entrySectionKey:
  String(
    body.entrySectionKey ?? ""
  ).trim() || null,

entryPosition:
  typeof body.entryPosition === "number" &&
  Number.isFinite(body.entryPosition)
    ? Math.max(
        1,
        Math.floor(body.entryPosition)
      )
    : null,

entryPageNumber:
  typeof body.entryPageNumber === "number" &&
  Number.isFinite(body.entryPageNumber)
    ? Math.max(
        1,
        Math.floor(body.entryPageNumber)
      )
    : null,

entryContextType:
  String(
    body.entryContextType ?? ""
  ).trim() || null,
  
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
      "Wishlist analytics failed",
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