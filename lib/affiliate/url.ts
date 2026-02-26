// lib/affiliate/url.ts
export function buildTrackedProductUrl(args: {
  sourceUrl: string;
  affiliateBaseUrl?: string | null;
}) {
  const source = String(args.sourceUrl || "").trim();
  if (!source) return null;

  // Start from product page
  const dest = new URL(source);

  const base = String(args.affiliateBaseUrl || "").trim();
  if (!base) return dest.toString(); // no tracking yet, just product page

  // Parse brand tracking template
  const baseUrl = new URL(base);

  // Safety: only copy params if same host (prevents mistakes / open redirect style issues)
  if (baseUrl.host && dest.host && baseUrl.host !== dest.host) {
    // still return product URL, but don’t copy params from a different domain
    return dest.toString();
  }

  // Copy all tracking query params from base into product URL
  baseUrl.searchParams.forEach((value, key) => {
    // Don’t overwrite if product already has that param
    if (!dest.searchParams.has(key)) dest.searchParams.set(key, value);
  });

  return dest.toString();
}
