import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeCountryCode(v: string | null) {
  const s = (v ?? "").trim().toUpperCase();
  return s.length === 2 ? s : null;
}

function normalizeCurrencyCode(v: string | null) {
  const s = (v ?? "").trim().toUpperCase();
  return s.length === 3 ? s : null;
}

function pickHeader(req: NextRequest, keys: string[]) {
  for (const k of keys) {
    const v = req.headers.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

// Only block obvious server-side crawlers, not browsers
const BOT_PATTERN = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|linkedinbot|twitterbot/i;

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (BOT_PATTERN.test(ua)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await req.json().catch(() => ({}));
    const { productId } = body;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing productId" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, brandId: true },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const countryCode = normalizeCountryCode(
      pickHeader(req, ["x-vercel-ip-country", "x-country", "cf-ipcountry"])
    );
    const region = pickHeader(req, ["x-vercel-ip-country-region", "x-region"]);
    const city = pickHeader(req, ["x-vercel-ip-city", "x-city"]);
    const shopperCountryCode = normalizeCountryCode(
      req.cookies.get("vc_country")?.value ?? null
    );
    const shopperCurrencyCode = normalizeCurrencyCode(
      req.cookies.get("vc_currency")?.value ?? null
    );

    await prisma.affiliateClick.create({
      data: {
        brandId: product.brandId,
        productId: product.id,
        type: "PRODUCT_VIEW",
        countryCode,
        region: region ?? null,
        city: city ?? null,
        shopperCountryCode,
        shopperCurrencyCode,
        sourcePage: "SEARCH",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("product-view click failed", error);
    return NextResponse.json({ ok: true });
  }
}