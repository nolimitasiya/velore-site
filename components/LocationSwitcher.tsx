// C:\Users\Asiya\projects\dalra\components\LocationSwitcher.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCATION,
  getLocationByCountry,
  MAJOR_LOCATIONS,
  normalizeCountryCode,
} from "@/data/locations";
import {
  BRAND_CURRENCY_OPTIONS,
  normalizeCurrencyCode,
} from "@/lib/currency/codes";
import { saveShopperPreferences, readInitialShopperPreferences } from "@/lib/shopperPreferencesClient";

function flagUrl(code: string) {
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}

function Flag({
  code,
  name,
  size = 20,
}: {
  code: string;
  name: string;
  size?: number;
}) {
  return (
    <img
      src={flagUrl(code)}
      alt={`${name} flag`}
      width={size}
      height={Math.round((size * 3) / 4)}
      className="rounded-sm ring-1 ring-black/10"
      loading="lazy"
    />
  );
}

export default function LocationSwitcher() {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState(DEFAULT_LOCATION.code);
  const [currency, setCurrency] = useState(DEFAULT_LOCATION.currency);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const countries = useMemo(
    () => [...MAJOR_LOCATIONS].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const currencies = useMemo(() => BRAND_CURRENCY_OPTIONS, []);
  const currentLocation = getLocationByCountry(country) ?? DEFAULT_LOCATION;

  useEffect(() => {
    const initial = readInitialShopperPreferences();
    setCountry(initial.country);
    setCurrency(initial.currency);
  }, []);

  useEffect(() => {
    const onPrefsChanged = (event: Event) => {
      const custom = event as CustomEvent<{ country?: string; currency?: string }>;
      if (custom.detail?.country) setCountry(normalizeCountryCode(custom.detail.country));
      if (custom.detail?.currency) setCurrency(normalizeCurrencyCode(custom.detail.currency));
    };

    window.addEventListener("vc_preferences_changed", onPrefsChanged as EventListener);
    return () =>
      window.removeEventListener("vc_preferences_changed", onPrefsChanged as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function save() {
    setSaving(true);
    setError("");

    try {
      await saveShopperPreferences({ country, currency });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Change location and currency"
        className="inline-flex items-center gap-3 rounded-full px-3 py-2 text-white/90 transition-colors hover:text-white"
      >
        <Flag code={currentLocation.code} name={currentLocation.name} size={22} />

        <span className="hidden lg:inline text-sm tracking-widest text-white/80">
          {currency}
        </span>

        <span className="text-white/60 text-sm">▾</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/45"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={[
          "fixed left-1/2 top-1/2 z-[71] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-black/10 bg-white text-black shadow-2xl",
          "transition-opacity duration-200",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Change location and currency"
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <div className="font-heading text-lg text-black">
              Change location and currency
            </div>
            <div className="mt-1 text-sm text-black/60">
              Veilora shows estimated local pricing. Final checkout currency may vary by retailer.
            </div>
          </div>

          <button
            type="button"
            className="rounded-full px-3 py-2 text-black/60 hover:bg-black/[0.04] hover:text-black"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <label
              htmlFor="header-country-select"
              className="mb-2 block text-xs tracking-[0.18em] text-black/50"
            >
              COUNTRY
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <Flag code={currentLocation.code} name={currentLocation.name} size={20} />
              <select
                id="header-country-select"
                value={country}
                onChange={(e) => setCountry(normalizeCountryCode(e.target.value))}
                className="w-full bg-white text-sm text-black outline-none"
              >
                {countries.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="header-currency-select"
              className="mb-2 block text-xs tracking-[0.18em] text-black/50"
            >
              CURRENCY
            </label>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <select
                id="header-currency-select"
                value={currency}
                onChange={(e) => setCurrency(normalizeCurrencyCode(e.target.value))}
                className="w-full bg-white text-sm text-black outline-none"
              >
                {currencies.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-black/15 px-5 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}