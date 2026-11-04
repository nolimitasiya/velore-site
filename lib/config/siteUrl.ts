import "server-only";

/**
 * Canonical public website URL.
 *
 * NEXT_PUBLIC_SITE_URL is the single source of truth.
 *
 * Local development may use localhost.
 * Production requires an explicitly configured public HTTPS URL.
 */

function parseSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be configured in production."
      );
    }

    return new URL("http://localhost:3000");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL is not a valid URL.");
  }

  if (
    parsedUrl.protocol !== "http:" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS."
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must not contain credentials."
    );
  }

  if (
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.pathname !== "/"
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must not contain a path, query or fragment."
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (parsedUrl.protocol !== "https:") {
      throw new Error(
        "Production NEXT_PUBLIC_SITE_URL must use HTTPS."
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Reject trailing-dot hostnames to avoid ambiguous DNS forms.
    if (hostname.endsWith(".")) {
      throw new Error(
        "Production NEXT_PUBLIC_SITE_URL must not use a trailing-dot hostname."
      );
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    ) {
      throw new Error(
        "Production NEXT_PUBLIC_SITE_URL must not use localhost."
      );
    }

    // Public website configuration must use a DNS hostname.
    // Reject IPv4 and IPv6 address literals.
    const isIpv4Literal =
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname);

    const isIpv6Literal =
      hostname.startsWith("[") && hostname.endsWith("]");

    if (isIpv4Literal || isIpv6Literal) {
      throw new Error(
        "Production NEXT_PUBLIC_SITE_URL must use a public DNS hostname."
      );
    }

    // Reject single-label and reserved internal hostnames.
    const reservedSuffixes = [
      ".localhost",
      ".local",
      ".internal",
      ".test",
      ".invalid",
      ".example",
    ];

    const isSingleLabelHostname = !hostname.includes(".");

    const isReservedHostname = reservedSuffixes.some(
      (suffix) => hostname.endsWith(suffix)
    );

    if (isSingleLabelHostname || isReservedHostname) {
      throw new Error(
        "Production NEXT_PUBLIC_SITE_URL must use a public DNS hostname."
      );
    }
  }

  return parsedUrl;
}

/**
 * Returns a validated canonical website base URL.
 *
 * Example:
 * https://www.veiloraclub.com
 */
export function getSiteBaseUrl(): string {
  return parseSiteUrl().origin;
}

/**
 * Returns the trusted website origin for security checks.
 *
 * Never derive this value from request Host headers.
 */
export function getTrustedSiteOrigin(): string {
  return parseSiteUrl().origin;
}

/**
 * Constructs an absolute website URL from an application path.
 *
 * Example:
 * buildSiteUrl("/account/reset")
 */
export function buildSiteUrl(path: string): string {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    throw new Error(
      "Site URL paths must begin with a single forward slash."
    );
  }

  // Reject literal and encoded dot-segment traversal.
  // Only the pathname is checked; query parameters are preserved.
  const pathname = path.split(/[?#]/, 1)[0];

  const hasDotSegment = pathname
    .split("/")
    .some((segment) =>
      /^(?:\.|%2e){1,2}$/i.test(segment)
    );

  if (hasDotSegment) {
    throw new Error(
      "Site URL paths must not contain dot-segment traversal."
    );
  }

  const trustedOrigin = getTrustedSiteOrigin();
  const resolvedUrl = new URL(path, `${trustedOrigin}/`);

  if (resolvedUrl.origin !== trustedOrigin) {
    throw new Error(
      "Site URL path resolved outside the trusted origin."
    );
  }

  return resolvedUrl.toString();
}