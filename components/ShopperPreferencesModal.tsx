// C:\Users\Asiya\projects\dalra\components\ShopperPreferencesModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  LS_PREFS_HANDLED_KEY,
  readInitialShopperPreferences,
  saveShopperPreferences,
} from "@/lib/shopperPreferencesClient";

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

export default function ShopperPreferencesModal() {
  const router = useRouter();

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

    if (initial.shouldPrompt) {
      setOpen(true);
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!open) {
      document.documentElement.style.overflow = "";
      return;
    }

    document.documentElement.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWithoutSaving();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeWithoutSaving() {
    try {
      localStorage.setItem(LS_PREFS_HANDLED_KEY, "1");
    } catch {
      // ignore
    }

    window.dispatchEvent(new CustomEvent("vc_preferences_modal_closed"));
    setOpen(false);
  }

  async function submit() {
    setSaving(true);
    setError("");

    try {
      await saveShopperPreferences({ country, currency });
      window.dispatchEvent(new CustomEvent("vc_preferences_modal_closed"));
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close preferences modal"
        onClick={closeWithoutSaving}
        className="absolute inset-0 bg-black/45"
      />

      <div
        className="relative z-[91] w-full max-w-2xl rounded-3xl border border-black/10 bg-white text-black shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your country and currency"
      >
        <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <div className="font-heading text-xl text-black">
              Choose your country and currency
            </div>
          </div>

          <button
            type="button"
            onClick={closeWithoutSaving}
            className="rounded-full px-3 py-2 text-black/60 hover:bg-black/5 hover:text-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <label
              htmlFor="shopper-country-select"
              className="mb-2 block text-xs tracking-[0.18em] text-black/50"
            >
              COUNTRY
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <Flag code={currentLocation.code} name={currentLocation.name} size={20} />

              <select
                id="shopper-country-select"
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
              htmlFor="shopper-currency-select"
              className="mb-2 block text-xs tracking-[0.18em] text-black/50"
            >
              CURRENCY
            </label>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <select
                id="shopper-currency-select"
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
              onClick={closeWithoutSaving}
              className="rounded-full border border-black/15 px-5 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}