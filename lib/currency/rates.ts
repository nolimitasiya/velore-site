// C:\Users\Asiya\projects\dalra\lib\currency\rates.ts
import "server-only";
import type { Rates } from "./utils";

const ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

// Simple in-memory cache (works on serverless per-instance; good enough for now)
let cached: { at: number; rates: Rates } | null = null;

function parseEcbRates(xml: string): Rates {
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
    cache: "force-cache",
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!res.ok) throw new Error(`ECB rates fetch failed (${res.status})`);

  const xml = await res.text();
  const rates = parseEcbRates(xml);

  cached = { at: now, rates };
  return rates;
}
