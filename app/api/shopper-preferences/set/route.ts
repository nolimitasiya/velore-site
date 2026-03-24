// C:\Users\Asiya\projects\dalra\app\api\shopper-preferences\set\route.ts
import { NextResponse } from "next/server";
import {
  isAllowedBrandCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency/codes";
import {
  isSupportedCountry,
  normalizeCountryCode,
} from "@/data/locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const country = normalizeCountryCode(body.country);
  const currency = normalizeCurrencyCode(body.currency);

  if (!isSupportedCountry(country)) {
    return NextResponse.json(
      { ok: false, error: "Invalid country" },
      { status: 400 }
    );
  }

  if (!isAllowedBrandCurrency(currency)) {
    return NextResponse.json(
      { ok: false, error: "Invalid currency" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    country,
    currency,
  });

  const cookieOptions = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  // New source of truth
  res.cookies.set("vc_country", country, cookieOptions);
  res.cookies.set("vc_currency", currency, cookieOptions);

  // Legacy compatibility during migration
  res.cookies.set("dalra_country", country, cookieOptions);
  res.cookies.set("dalra_currency", currency, cookieOptions);

  return res;
}