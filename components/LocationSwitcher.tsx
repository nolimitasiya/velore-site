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
      className="
        inline-flex items-center gap-3 rounded-full
        border border-transparent px-3 py-2
        font-body text-black/70
        transition-colors
        hover:border-black/10 hover:bg-black/[0.025] hover:text-black
      "
    >
      <Flag
        code={currentLocation.code}
        name={currentLocation.name}
        size={22}
      />

      <span className="hidden text-[13px] tracking-[0.08em] lg:inline">
        {currency}
      </span>

      <span className="text-xs text-black/35">▾</span>
    </button>

    {open && (
      <div
        className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
    )}

    <div
      className={[
        "fixed left-1/2 top-1/2 z-[71]",
        "w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2",
        "overflow-hidden rounded-[28px]",
        "border border-black/10 bg-[#fcfbf8] text-black",
        "shadow-[0_28px_90px_rgba(0,0,0,0.18)]",
        "transition-all duration-200",
        open
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-[0.98] opacity-0",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label="Change location and currency"
    >
      <div className="flex items-start justify-between gap-6 border-b border-black/10 px-6 py-6 md:px-8">
        <div>
          <div className="font-heading text-2xl tracking-[0.02em] text-[#7B2D3E]">
            Change location and currency
          </div>

          <div className="mt-2 max-w-xl font-body text-sm leading-6 text-black/55">
            Veilora shows estimated local pricing. Final checkout currency may
            vary by retailer.
          </div>
        </div>

        <button
          type="button"
          className="
            flex h-10 w-10 shrink-0 items-center justify-center rounded-full
            text-black/45 transition
            hover:bg-black/[0.04] hover:text-black
          "
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div>
          <label
            htmlFor="header-country-select"
            className="
              mb-2.5 block font-body text-[11px] font-medium
              uppercase tracking-[0.2em] text-black/45
            "
          >
            Country
          </label>

          <div
            className="
              flex items-center gap-3 rounded-2xl
              border border-black/10 bg-white px-4 py-3.5
              transition
              focus-within:border-[#7B2D3E]/40
              focus-within:ring-2 focus-within:ring-[#7B2D3E]/10
            "
          >
            <Flag
              code={currentLocation.code}
              name={currentLocation.name}
              size={20}
            />

            <select
              id="header-country-select"
              value={country}
              onChange={(e) =>
                setCountry(normalizeCountryCode(e.target.value))
              }
              className="
                w-full cursor-pointer bg-transparent
                font-body text-sm text-black outline-none
              "
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
            className="
              mb-2.5 block font-body text-[11px] font-medium
              uppercase tracking-[0.2em] text-black/45
            "
          >
            Currency
          </label>

          <div
            className="
              rounded-2xl border border-black/10 bg-white
              px-4 py-3.5 transition
              focus-within:border-[#7B2D3E]/40
              focus-within:ring-2 focus-within:ring-[#7B2D3E]/10
            "
          >
            <select
              id="header-currency-select"
              value={currency}
              onChange={(e) =>
                setCurrency(normalizeCurrencyCode(e.target.value))
              }
              className="
                w-full cursor-pointer bg-transparent
                font-body text-sm text-black outline-none
              "
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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="
              rounded-full border border-black/15 px-5 py-2.5
              font-body text-sm text-black/65
              transition hover:border-black/25 hover:bg-black/[0.025]
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="
              rounded-full bg-[#7B2D3E] px-6 py-2.5
              font-body text-sm font-medium text-white
              transition hover:bg-[#692536]
              disabled:cursor-not-allowed disabled:opacity-60
            "
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        </div>
      </div>
    </div>
  </>
);
}