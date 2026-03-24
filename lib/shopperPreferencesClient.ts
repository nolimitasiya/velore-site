// C:\Users\Asiya\projects\dalra\lib\shopperPreferencesClient.ts
"use client";

import {
  DEFAULT_LOCATION,
  getLocationByCountry,
  isSupportedCountry,
  normalizeCountryCode,
  type Location,
} from "@/data/locations";
import {
  isAllowedBrandCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency/codes";

export const LS_LOCATION_KEY = "dalra_location";
export const LS_PREFS_HANDLED_KEY = "vc_prefs_modal_handled";

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export function getSuggestedCurrencyForCountry(countryCode: string) {
  const loc = getLocationByCountry(countryCode);
  const suggested = normalizeCurrencyCode(loc?.currency ?? "");
  return isAllowedBrandCurrency(suggested)
    ? suggested
    : DEFAULT_LOCATION.currency;
}

export function readInitialShopperPreferences() {
  const cookieCountry = normalizeCountryCode(
    readCookie("vc_country") || readCookie("dalra_country")
  );
  const cookieCurrency = normalizeCurrencyCode(
    readCookie("vc_currency") || readCookie("dalra_currency")
  );

  let country = isSupportedCountry(cookieCountry)
    ? cookieCountry
    : DEFAULT_LOCATION.code;

  let currency = isAllowedBrandCurrency(cookieCurrency)
    ? cookieCurrency
    : getSuggestedCurrencyForCountry(country);

  const hasSavedPrefs = Boolean(cookieCountry && cookieCurrency);

  if (!hasSavedPrefs) {
    try {
      const raw = localStorage.getItem(LS_LOCATION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Location;
        const migratedCountry = normalizeCountryCode(parsed?.code);
        const migratedCurrency = normalizeCurrencyCode(parsed?.currency);

        if (isSupportedCountry(migratedCountry)) {
          country = migratedCountry;
        }

        if (isAllowedBrandCurrency(migratedCurrency)) {
          currency = migratedCurrency;
        } else {
          currency = getSuggestedCurrencyForCountry(country);
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    country,
    currency,
    hasSavedPrefs,
    shouldPrompt: !hasSavedPrefs,
  };
}

export async function saveShopperPreferences(input: {
  country: string;
  currency: string;
}) {
  const res = await fetch("/api/shopper-preferences/set", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Could not save preferences.");
  }

  const currentLocation = getLocationByCountry(input.country) ?? DEFAULT_LOCATION;

  try {
    localStorage.setItem(
      LS_LOCATION_KEY,
      JSON.stringify({
        code: input.country,
        name: currentLocation.name,
        currency: input.currency,
        symbol: currentLocation.symbol,
      })
    );
  } catch {
    // ignore
  }

  try {
    localStorage.setItem(LS_PREFS_HANDLED_KEY, "1");
  } catch {
    // ignore
  }

  window.dispatchEvent(
    new CustomEvent("vc_preferences_changed", {
      detail: { country: input.country, currency: input.currency },
    })
  );

  return data;
}