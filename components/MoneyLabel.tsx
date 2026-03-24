// C:\Users\Asiya\projects\dalra\components\MoneyLabel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { convert, safeCurrency } from "@/lib/currency/utils";
import { formatMoney } from "@/lib/formatMoney";

type Rates = Record<string, number>;

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

function chosenCurrencyFromCookies(): string {
  const vc = readCookie("vc_currency");
  const dalra = readCookie("dalra_currency");
  return safeCurrency(vc || dalra || "") ?? "GBP";
}

export default function MoneyLabel({
  amount,
  currency,
  className,
}: {
  amount: string | number | null | undefined;
  currency: string | null | undefined;
  className?: string;
}) {
  const [rates, setRates] = useState<Rates | null>(null);
  const [chosen, setChosen] = useState<string>(() => chosenCurrencyFromCookies());

  useEffect(() => {
    const syncChosen = () => setChosen(chosenCurrencyFromCookies());

    syncChosen();
    window.addEventListener("vc_preferences_changed", syncChosen);
    window.addEventListener("vc_currency_changed", syncChosen);

    return () => {
      window.removeEventListener("vc_preferences_changed", syncChosen);
      window.removeEventListener("vc_currency_changed", syncChosen);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRates() {
      try {
        const cached = sessionStorage.getItem("vc_ecb_rates");
        if (cached) {
          const parsed = JSON.parse(cached) as { at: number; rates: Rates };
          if (Date.now() - parsed.at < 1000 * 60 * 60 * 12) {
            setRates(parsed.rates);
            return;
          }
        }

        const res = await fetch("/api/currency/ecb", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as { at: number; rates: Rates };
        if (cancelled) return;

        sessionStorage.setItem("vc_ecb_rates", JSON.stringify(data));
        setRates(data.rates);
      } catch {
        // fallback handled below
      }
    }

    loadRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const display = useMemo(() => {
    const base = amount == null || amount === "" ? null : Number(amount);
    if (base == null || !Number.isFinite(base)) return "—";

    const from = String(currency || "").toUpperCase();
    const to = String(chosen || "GBP").toUpperCase();

    if (!rates) {
      return formatMoney(base, (safeCurrency(from) ?? "GBP") as any);
    }

    const converted = convert(base, from, to, rates);
    if (converted == null) {
      return formatMoney(base, (safeCurrency(from) ?? "GBP") as any);
    }

    return formatMoney(converted, (safeCurrency(to) ?? "GBP") as any);
  }, [amount, currency, chosen, rates]);

  return <span className={className}>{display}</span>;
}