import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrackedProductUrl } from "@/lib/affiliate/url";
import {  AnalyticsEventType,  AnalyticsSourcePage,  ClickSourcePage,} from "@prisma/client";

import {
  attachAnalyticsSessionCookie,
  getOrCreateAnalyticsSession,
} from "@/lib/analytics/session";

import {
  normalizeDiscoverySource,
} from "@/lib/analytics/discoverySource";



export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickHeader(req: NextRequest, keys: string[]) {
  for (const key of keys) {
    const value = req.headers.get(key);

    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeCountryCode(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized.length === 2 ? normalized : null;
}

function normalizeCurrencyCode(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized.length === 3 ? normalized : null;
}

function normalizeUuidLike(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

function normalizeSectionKey(value: string | null) {
  const normalized = (value ?? "").trim();
  return normalized || null;
}

function normalizePosition(value: string | null) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const integer = Math.floor(number);
  return integer > 0 ? integer : null;
}

function normalizeSourcePage(
  value: string | null
): ClickSourcePage | null {
  const normalized =
    (value ?? "")
      .trim()
      .toUpperCase();

  switch (normalized) {
    case "HOME":
      return ClickSourcePage.HOME;

    case "SEARCH":
      return ClickSourcePage.SEARCH;

    case "BRAND":
      return ClickSourcePage.BRAND;

    case "CATEGORY":
      return ClickSourcePage.CATEGORY;

    case "PRODUCT":
      return ClickSourcePage.PRODUCT;

    case "DIARY":
      return ClickSourcePage.DIARY;

    case "STYLE_FEED":
      return ClickSourcePage.STYLE_FEED;

    case "CONTINENT":
      return ClickSourcePage.CONTINENT;

    case "EMERGING_BRANDS":
      return ClickSourcePage.EMERGING_BRANDS;

    case "OTHER":
      return ClickSourcePage.OTHER;

    default:
      return null;
  }
}

function normalizePageNumber(value: string | null) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const integer = Math.floor(number);
  return integer > 0 ? integer : null;
}

function normalizeBooleanFlag(value: string | null) {
  if (value === "1") return true;
  if (value === "0") return false;

  return null;
}

function normalizeContextType(value: string | null) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized || null;
}

const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|whatsapp|slack|discord|telegram|preview|prefetch/i;



  

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const userAgent = req.headers.get("user-agent") ?? "";

  if (BOT_PATTERN.test(userAgent)) {
    return NextResponse.json(
      { error: "Automated request rejected" },
      { status: 403 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      brandId: true,
      sourceUrl: true,
      affiliateUrl: true,
      brand: {
        select: {
          name: true,
          affiliateStatus: true,
          affiliateBaseUrl: true,
        },
      },
    },
  });

  if (!product || product.brand?.affiliateStatus !== "ACTIVE") {
    return NextResponse.json(
      { error: "Product unavailable" },
      { status: 404 }
    );
  }

  const sourceUrl = String(product.sourceUrl || "").trim();

  if (!sourceUrl) {
    return NextResponse.json(
      { error: "Destination unavailable" },
      { status: 404 }
    );
  }

  const destinationUrl =
    product.affiliateUrl?.trim() ||
    buildTrackedProductUrl({
      sourceUrl,
      affiliateBaseUrl: product.brand.affiliateBaseUrl ?? null,
    });

  if (!destinationUrl) {
    return NextResponse.json(
      { error: "Destination unavailable" },
      { status: 404 }
    );
  }

  const countryRaw = pickHeader(req, [
    "x-vercel-ip-country",
    "x-country",
    "cf-ipcountry",
  ]);

  const region = pickHeader(req, [
    "x-vercel-ip-country-region",
    "x-region",
  ]);

  const city = pickHeader(req, ["x-vercel-ip-city", "x-city"]);

  const countryCode = normalizeCountryCode(countryRaw);

  const shopperCountryCode = normalizeCountryCode(
    req.cookies.get("vc_country")?.value ?? null
  );

  const shopperCurrencyCode = normalizeCurrencyCode(
    req.cookies.get("vc_currency")?.value ?? null
  );

  const { searchParams } = new URL(req.url);

  const sourcePage = normalizeSourcePage(searchParams.get("src"));

  const discoverySource =
  normalizeDiscoverySource(
    searchParams.get("src")
  );

  const diaryPostId = normalizeUuidLike(
    searchParams.get("diaryPostId") ??
      searchParams.get("dpid")
  );

  const sectionId = normalizeUuidLike(searchParams.get("sid"));
  const sectionKey = normalizeSectionKey(searchParams.get("skey"));
  const position = normalizePosition(searchParams.get("pos"));
  const pageNumber = normalizePageNumber(searchParams.get("page"));

  const searchQuery =
  String(
    searchParams.get("q") ?? ""
  ).trim() || null;

  const isExpandedPageOne = normalizeBooleanFlag(
    searchParams.get("expanded")
  );

  const contextType = normalizeContextType(
    searchParams.get("ctx")
  );

  const entrySectionKey =
  normalizeSectionKey(
    searchParams.get("entry_skey")
  );

const entryPosition =
  normalizePosition(
    searchParams.get("entry_pos")
  );

const entryPageNumber =
  normalizePageNumber(
    searchParams.get("entry_page")
  );

const entryContextType =
  normalizeContextType(
    searchParams.get("entry_ctx")
  );

const {
  sessionId,
  shopperCountryCode:
    analyticsShopperCountryCode,
  shopperCurrencyCode:
    analyticsShopperCurrencyCode,
} =
  await getOrCreateAnalyticsSession(req);

  try {
    await prisma.affiliateClick.create({
      data: {
        brandId: product.brandId,
        productId: product.id,
        destinationUrl,

        countryCode,
        region,
        city,

        shopperCountryCode,
        shopperCurrencyCode,

        sourcePage,
        sectionId,
        sectionKey,
        position,
        pageNumber,
        isExpandedPageOne,
        contextType,
        diaryPostId,
      },
    });
  } catch (error) {
    console.error("affiliateClick.create failed", error);
  }

  try {
  await prisma.analyticsEvent.create({
    data: {
      sessionId,

      eventType:
        AnalyticsEventType.SHOP_CLICK,

      productId: product.id,
      brandId: product.brandId,

      // The click physically happened on the PDP
      sourcePage:
        AnalyticsSourcePage.PRODUCT,

      sourcePath:
        `/b/product`,

      position,
      sectionKey,
      pageNumber,
      contextType,

      shopperCountryCode:
        analyticsShopperCountryCode,

      shopperCurrencyCode:
        analyticsShopperCurrencyCode,

      metadata: {
  discoverySource,
  searchQuery,
  searchPosition:
  position,
  sectionKey,
  pageNumber,
  contextType,
  entrySectionKey,
  entryPosition,
  entryPageNumber,
  entryContextType,
},
    },
  });
} catch (error) {
  console.error(
    "SHOP_CLICK analytics failed",
    error
  );
}

  const response =
  NextResponse.json({
    destinationUrl,
    brandName:
      product.brand.name,
  });

attachAnalyticsSessionCookie(
  response,
  sessionId
);

return response;
}