import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrackedProductUrl } from "@/lib/affiliate/url";
import { ClickSourcePage } from "@prisma/client";

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
  const normalized = (value ?? "").trim().toUpperCase();

  if (normalized === "HOME") return ClickSourcePage.HOME;
  if (normalized === "SEARCH") return ClickSourcePage.SEARCH;
  if (normalized === "BRAND") return ClickSourcePage.BRAND;
  if (normalized === "DIARY") return ClickSourcePage.DIARY;

  return null;
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

  const diaryPostId = normalizeUuidLike(
    searchParams.get("diaryPostId") ??
      searchParams.get("dpid")
  );

  const sectionId = normalizeUuidLike(searchParams.get("sid"));
  const sectionKey = normalizeSectionKey(searchParams.get("skey"));
  const position = normalizePosition(searchParams.get("pos"));
  const pageNumber = normalizePageNumber(searchParams.get("page"));

  const isExpandedPageOne = normalizeBooleanFlag(
    searchParams.get("expanded")
  );

  const contextType = normalizeContextType(
    searchParams.get("ctx")
  );

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

  return NextResponse.json({
    destinationUrl,
    brandName: product.brand.name,
  });
}