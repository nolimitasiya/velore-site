// C:\Users\Asiya\projects\dalra\app\out\[id]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrackedProductUrl } from "@/lib/affiliate/url";

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

  // ✅ GEO from Vercel/infra headers (Node runtime)
  const countryRaw = pickHeader(req, [
    "x-vercel-ip-country",
    "x-country",
    "cf-ipcountry", // cloudflare fallback if ever used
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

  await prisma.affiliateClick.create({
    data: {
      brandId: product.brandId,
      productId: product.id,
      destinationUrl,

      countryCode,
      region: region ?? null,
      city: city ?? null,
    },
  });

  return NextResponse.redirect(destinationUrl);
}