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

type ProductViewBody = {
  productId?: string;
  sourcePath?: string;

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
      key: `analytics:product-view:${clientIp}`,
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
      (await req.json()) as ProductViewBody;

    const discoverySource =
  normalizeDiscoverySource(
    body.discoverySource
  );

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
     * Verify the product ourselves.
     * Never trust product/brand information sent by the browser.
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

    /*
     * Avoid development rerenders / immediate duplicate requests.
     *
     * But we still want to preserve genuine repeat interest later.
     */
    const duplicateWindowStart =
      new Date(Date.now() - 60_000);

    const recentDuplicate =
      await prisma.analyticsEvent.findFirst({
        where: {
          sessionId,
          eventType:
            AnalyticsEventType.PRODUCT_VIEW,
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

          eventType:
            AnalyticsEventType.PRODUCT_VIEW,

          productId: product.id,
          brandId: product.brandId,

          sourcePage:
            AnalyticsSourcePage.PRODUCT,

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
      "Product view analytics failed",
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