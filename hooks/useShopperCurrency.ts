"use client";

import { useEffect, useState } from "react";

type Rates = Record<string, number>;

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function convert(amount: number, from: string, to: string, rates: Rates): number | null {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  const rFrom = rates[f];
  const rTo = rates[t];
  if (!rFrom || !rTo) return amount; // fallback: return unconverted
  return (amount / rFrom) * rTo;
}

export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function useShopperCurrency() {
  const [currency, setCurrency] = useState<string>("GBP");
  const [rates, setRates] = useState<Rates | null>(null);

  useEffect(() => {
    // Read currency from cookie (vc_currency takes priority)
    const saved =
      readCookie("vc_currency") || readCookie("dalra_currency") || "GBP";
    setCurrency(saved.toUpperCase());

    // Listen for currency changes via the preferences modal
    function onPrefChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.currency) setCurrency(detail.currency.toUpperCase());
    }
    window.addEventListener("vc_preferences_changed", onPrefChange);

    // Fetch ECB rates
    fetch("/api/currency/ecb")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates) setRates(data.rates);
      })
      .catch(() => {}); // silent fail — prices will show in original currency

    return () => window.removeEventListener("vc_preferences_changed", onPrefChange);
  }, []);

  // Convert a price string from its original currency to the shopper's currency
  function convertPrice(amount: string | null, fromCurrency: string): string | null {
    if (!amount) return null;
    const num = parseFloat(amount);
    if (isNaN(num)) return null;
    if (!rates) return formatPrice(num, fromCurrency); // rates not loaded yet
    const converted = convert(num, fromCurrency, currency, rates);
    if (converted === null) return formatPrice(num, fromCurrency);
    return formatPrice(converted, currency);
  }

  // Convert a raw number from a given currency to shopper currency
  function convertAmount(amount: number, fromCurrency: string): number {
    if (!rates) return amount;
    return convert(amount, fromCurrency, currency, rates) ?? amount;
  }

  return { currency, rates, convertPrice, convertAmount, formatPrice: (n: number) => formatPrice(n, currency) };
}