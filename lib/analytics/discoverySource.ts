export const DISCOVERY_SOURCES = [
  "HOME",
  "SEARCH",
  "BRAND",
  "CATEGORY",
  "PRODUCT",
  "DIARY",
  "STYLE_FEED",
  "CONTINENT",
  "EMERGING_BRANDS",
  "NEW_IN",
  "SALE",
  "OTHER",
] as const;

export type DiscoverySource =
  (typeof DISCOVERY_SOURCES)[number];

export function normalizeDiscoverySource(
  value:
    | string
    | null
    | undefined
): DiscoverySource | null {
  const normalized =
    String(value ?? "")
      .trim()
      .toUpperCase();

  return (
    DISCOVERY_SOURCES as readonly string[]
  ).includes(normalized)
    ? (normalized as DiscoverySource)
    : null;
}