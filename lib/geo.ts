import { Region } from "@prisma/client";
import countryToRegion from "@/lib/country-to-region.json";

export function regionFromCountry(code?: string | null): Region | null {
  const c = String(code ?? "").trim().toUpperCase();
  if (c.length !== 2) return null;
  return ((countryToRegion as any)[c] ?? null) as Region | null;
}
