// C:\Users\Asiya\projects\dalra\app\out\[id]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrackedProductUrl } from "@/lib/affiliate/url";
import { ClickSourcePage } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function pickHeader(req: NextRequest, keys: string[]) {
  for (const k of keys) {
    const v = req.headers.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function normalizeCountryCode(v: string | null) {
  const s = (v ?? "").trim().toUpperCase();
  return s.length === 2 ? s : null;
}

function normalizeCurrencyCode(v: string | null) {
  const s = (v ?? "").trim().toUpperCase();
  return s.length === 3 ? s : null;
}

function normalizeUuidLike(v: string | null) {
  const s = (v ?? "").trim();
  return s || null;
}

function normalizeSectionKey(v: string | null) {
  const s = (v ?? "").trim();
  return s || null;
}

function normalizePosition(v: string | null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i > 0 ? i : null;
}

function normalizeSourcePage(v: string | null): ClickSourcePage | null {
  const s = (v ?? "").trim().toUpperCase();
  if (s === "HOME") return ClickSourcePage.HOME;
  if (s === "SEARCH") return ClickSourcePage.SEARCH;
  if (s === "BRAND") return ClickSourcePage.BRAND;
  return null;
}

function normalizePageNumber(v: string | null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i > 0 ? i : null;
}

function normalizeBooleanFlag(v: string | null) {
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

function normalizeContextType(v: string | null) {
  const s = (v ?? "").trim().toUpperCase();
  return s || null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      brandId: true,
      sourceUrl: true,
      affiliateUrl: true,
      brand: {
        select: {
          affiliateStatus: true,
          affiliateBaseUrl: true,
        },
      },
    },
  });

  if (!product) return NextResponse.redirect(new URL("/", req.url));
  if (product.brand?.affiliateStatus !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const sourceUrl = String(product.sourceUrl || "").trim();
  if (!sourceUrl) return NextResponse.redirect(new URL("/", req.url));

  const destinationUrl =
    (product.affiliateUrl?.trim() || "") ||
    buildTrackedProductUrl({
      sourceUrl,
      affiliateBaseUrl: product.brand?.affiliateBaseUrl ?? null,
    });

  if (!destinationUrl) return NextResponse.redirect(new URL("/", req.url));

  const countryRaw = pickHeader(req, [
    "x-vercel-ip-country",
    "x-country",
    "cf-ipcountry",
  ]);

  const region = pickHeader(req, [
    "x-vercel-ip-country-region",
    "x-region",
  ]);

  const city = pickHeader(req, [
    "x-vercel-ip-city",
    "x-city",
  ]);

  const countryCode = normalizeCountryCode(countryRaw);
  const shopperCountryCode = normalizeCountryCode(
    req.cookies.get("vc_country")?.value ?? null
  );
  const shopperCurrencyCode = normalizeCurrencyCode(
    req.cookies.get("vc_currency")?.value ?? null
  );

  // NEW
  const { searchParams } = new URL(req.url);
  const sourcePage = normalizeSourcePage(searchParams.get("src"));
  const sectionId = normalizeUuidLike(searchParams.get("sid"));
  const sectionKey = normalizeSectionKey(searchParams.get("skey"));
  const position = normalizePosition(searchParams.get("pos"));
  const pageNumber = normalizePageNumber(searchParams.get("page"));
  const isExpandedPageOne = normalizeBooleanFlag(searchParams.get("expanded"));
  const contextType = normalizeContextType(searchParams.get("ctx"));

  try {
  await prisma.affiliateClick.create({
    data: {
      brandId: product.brandId,
      productId: product.id,
      destinationUrl,

      countryCode,
      region: region ?? null,
      city: city ?? null,

      shopperCountryCode,
      shopperCurrencyCode,

      sourcePage,
      sectionId,
      sectionKey,
      position,
      pageNumber,
      isExpandedPageOne,
      contextType,
    },
  });
} catch (error) {
  console.error("affiliateClick.create failed", error);
}

return NextResponse.redirect(destinationUrl);
}