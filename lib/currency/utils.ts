// C:\Users\Asiya\projects\dalra\lib\currency\utils.ts
import { isAllowedBrandCurrency } from "./codes";


export type Rates = Record<string, number>; // currency -> rate vs EUR

// Convert amount in `from` -> `to` using EUR as base
export function convert(amount: number, from: string, to: string, rates: Rates) {
  const f = String(from || "").toUpperCase();
  const t = String(to || "").toUpperCase();
  if (!f || !t) return null;
  if (f === t) return amount;

  const rFrom = rates[f];
  const rTo = rates[t];
  if (!rFrom || !rTo) return null;

  const eur = amount / rFrom;
  return eur * rTo;
}

// helper to keep conversions only within your Currency enum
export function safeCurrency(code: string): string | null {
  const c = String(code || "").trim().toUpperCase();
  return isAllowedBrandCurrency(c) ? c : null;
}
