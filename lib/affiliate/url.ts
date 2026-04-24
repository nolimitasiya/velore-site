// lib/affiliate/url.ts
export function buildTrackedProductUrl(args: {
  sourceUrl: string;
  affiliateBaseUrl?: string | null;
}) {
  const source = String(args.sourceUrl || "").trim();
  if (!source) return null;

  const base = String(args.affiliateBaseUrl || "").trim();
  if (!base) return source;

  // Pattern 1:
  // Template-style affiliate URL with destination placeholder
  // Example:
  // https://affiliate.example/track?url={url}
  if (base.includes("{url}")) {
    return base.replaceAll("{url}", encodeURIComponent(source));
  }

  let dest: URL;
  let baseUrl: URL;

  try {
    dest = new URL(source);
    baseUrl = new URL(base);
  } catch {
    return source;
  }

  // Pattern 2:
  // Same-host tracking params copied onto the product URL
  // Example:
  // base:   https://merchant.com/?ref=veilora
  // source: https://merchant.com/products/item-1
  if (baseUrl.host === dest.host) {
    baseUrl.searchParams.forEach((value, key) => {
      if (!dest.searchParams.has(key)) {
        dest.searchParams.set(key, value);
      }
    });

    return dest.toString();
  }

  // Pattern 3:
  // Different host but no {url} placeholder
  // We do NOT guess, because different affiliate systems format these differently.
  // Safer fallback: raw source URL.
  return source;
}