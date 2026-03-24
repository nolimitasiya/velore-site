// C:\Users\Asiya\projects\dalra\lib\shopperPreferences.ts
import "server-only";

import { cookies } from "next/headers";
import {
  DEFAULT_LOCATION,
  isSupportedCountry,
  normalizeCountryCode,
} from "@/data/locations";
import {
  isAllowedBrandCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency/codes";

export type ShopperPreferences = {
  country: string;
  currency: string;
};

export async function getShopperPreferences(): Promise<ShopperPreferences> {
  const cookieStore = await cookies();

  const rawCountry =
    cookieStore.get("vc_country")?.value ??
    cookieStore.get("dalra_country")?.value ??
    DEFAULT_LOCATION.code;

  const rawCurrency =
    cookieStore.get("vc_currency")?.value ??
    cookieStore.get("dalra_currency")?.value ??
    DEFAULT_LOCATION.currency;

  const country = isSupportedCountry(rawCountry)
    ? normalizeCountryCode(rawCountry)
    : DEFAULT_LOCATION.code;

  const currency = isAllowedBrandCurrency(normalizeCurrencyCode(rawCurrency))
    ? normalizeCurrencyCode(rawCurrency)
    : DEFAULT_LOCATION.currency;

  return { country, currency };
}