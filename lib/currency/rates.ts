import "server-only";
import { Currency } from "@prisma/client";

type Rates = Record<string, number>; // currency -> rate vs EUR

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

// Simple in-memory cache (works on serverless per-instance; good enough for now)
let cached: { at: number; rates: Rates } | null = null;

function parseEcbRates(xml: string): Rates {
  // very small XML parse without deps (good enough for ECB format)
  const rates: Rates = { EUR: 1 };

  const re = /currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    rates[m[1]] = Number(m[2]);
  }
  return rates;
}

export async function getEcbRates(): Promise<Rates> {
  const now = Date.now();
  if (cached && now - cached.at < 1000 * 60 * 60 * 12) return cached.rates; // 12h

  const res = await fetch(ECB_URL, {
    // Next cache hint (helps in Next server runtime)
    cache: "force-cache",
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!res.ok) throw new Error(`ECB rates fetch failed (${res.status})`);

  const xml = await res.text();
  const rates = parseEcbRates(xml);

  cached = { at: now, rates };
  return rates;
}

// Convert amount in `from` -> `to` using EUR as base
export function convert(amount: number, from: string, to: string, rates: Rates) {
  if (from === to) return amount;

  const rFrom = rates[from];
  const rTo = rates[to];
  if (!rFrom || !rTo) return null;

  const eur = amount / rFrom;
  return eur * rTo;
}

// helper to keep conversions only within your Currency enum
export function safeCurrency(code: string): Currency | null {
  const allowed = Object.values(Currency) as string[];
  return allowed.includes(code) ? (code as Currency) : null;
}
