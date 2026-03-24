import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

let loaded = false;
function ensure() {
  if (!loaded) {
    countries.registerLocale(en);
    loaded = true;
  }
}

export function iso2ToIso3(iso2: string): string | null {
  ensure();
  const code = String(iso2 || "").toUpperCase();
  const iso3 = countries.alpha2ToAlpha3(code);
  return iso3 ? String(iso3).toUpperCase() : null;
}

// ✅ NEW: world-atlas uses ISO numeric ids (e.g. GB=826)
export function iso2ToIsoNumeric(iso2: string): string | null {
  ensure();
  const code = String(iso2 || "").toUpperCase();

  // returns number as string e.g. "826"
  const numeric = countries.alpha2ToNumeric(code);
  if (!numeric) return null;

  // world-atlas ids are typically 3-digit numeric strings
  return String(numeric).padStart(3, "0");
}