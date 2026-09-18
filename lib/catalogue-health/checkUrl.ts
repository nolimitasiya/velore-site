import {
  CatalogueHealthFailureType,
  CatalogueHealthStatus,
  CatalogueHealthTargetType,
} from "@prisma/client";

import dns from "node:dns/promises";
import net from "node:net";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

const USER_AGENT =
  "VeiloraCatalogueHealth/1.0 (+https://veiloraclub.com)";

type CheckResult = {
  status: CatalogueHealthStatus;
  failureType: CatalogueHealthFailureType | null;

  httpStatus: number | null;
  finalUrl: string | null;
  contentType: string | null;
  responseTimeMs: number | null;

  errorMessage: string | null;
};

export async function checkCatalogueUrl(args: {
  url: string;
  targetType: CatalogueHealthTargetType;
}): Promise<CheckResult> {
  const startedAt = Date.now();

  try {
    const initialUrl = await validateExternalUrl(args.url);

    const response = await fetchWithSafeRedirects(initialUrl);

    const responseTimeMs = Date.now() - startedAt;

    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? null;

    const httpStatus = response.status;

    if (httpStatus >= 200 && httpStatus < 400) {
      if (
        args.targetType === CatalogueHealthTargetType.PRODUCT_IMAGE &&
        !contentType?.startsWith("image/")
      ) {
        await cancelBody(response);

        return {
          status: CatalogueHealthStatus.DEGRADED,
          failureType:
            CatalogueHealthFailureType.INVALID_CONTENT_TYPE,
          httpStatus,
          finalUrl: response.url,
          contentType,
          responseTimeMs,
          errorMessage: "Image URL did not return an image content type.",
        };
      }

      await cancelBody(response);

      return {
        status: CatalogueHealthStatus.HEALTHY,
        failureType: null,
        httpStatus,
        finalUrl: response.url,
        contentType,
        responseTimeMs,
        errorMessage: null,
      };
    }

    await cancelBody(response);

    return {
      status: CatalogueHealthStatus.DEGRADED,
      failureType: classifyHttpFailure(httpStatus),
      httpStatus,
      finalUrl: response.url,
      contentType,
      responseTimeMs,
      errorMessage: `HTTP ${httpStatus}`,
    };
  } catch (error) {
    return classifyThrownError(error, Date.now() - startedAt);
  }
}

async function fetchWithSafeRedirects(
  initialUrl: URL
): Promise<Response> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await validateExternalUrl(currentUrl.toString());

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let response: Response;

    try {
      response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,

        headers: {
          "User-Agent": USER_AGENT,
          Accept: "*/*",

          // We only need enough of the resource to establish that
          // the destination is serving something.
          Range: "bytes=0-1023",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!isRedirect(response.status)) {
      return response;
    }

    const location = response.headers.get("location");

    await cancelBody(response);

    if (!location) {
      throw new CatalogueHealthError(
        CatalogueHealthFailureType.OTHER,
        `HTTP ${response.status} redirect did not contain a Location header.`
      );
    }

    if (redirectCount === MAX_REDIRECTS) {
      throw new CatalogueHealthError(
        CatalogueHealthFailureType.TOO_MANY_REDIRECTS,
        `URL exceeded the maximum of ${MAX_REDIRECTS} redirects.`
      );
    }

    currentUrl = new URL(location, currentUrl);

    // Every redirect destination is validated independently.
    // An external URL is never allowed to redirect into a private network.
    await validateExternalUrl(currentUrl.toString());
  }

  throw new CatalogueHealthError(
    CatalogueHealthFailureType.TOO_MANY_REDIRECTS,
    "Too many redirects."
  );
}

async function validateExternalUrl(rawUrl: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new CatalogueHealthError(
      CatalogueHealthFailureType.INVALID_URL,
      "URL is malformed."
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new CatalogueHealthError(
      CatalogueHealthFailureType.INVALID_URL,
      "Only HTTP and HTTPS URLs may be checked."
    );
  }

  if (url.username || url.password) {
    throw new CatalogueHealthError(
      CatalogueHealthFailureType.INVALID_URL,
      "URLs containing credentials are not allowed."
    );
  }

  const hostname = normalizeHostname(url.hostname);

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "localhost.localdomain"
  ) {
    throw new CatalogueHealthError(
      CatalogueHealthFailureType.INVALID_URL,
      "Local network destinations are not allowed."
    );
  }

  if (net.isIP(hostname)) {
    if (isUnsafeIp(hostname)) {
      throw new CatalogueHealthError(
        CatalogueHealthFailureType.INVALID_URL,
        "Private or reserved IP destinations are not allowed."
      );
    }

    return url;
  }

 let addresses: Array<{
  address: string;
  family: number;
}>;

try {
  addresses = await dns.lookup(hostname, {
    all: true,
    verbatim: true,
  });
} catch {
    throw new CatalogueHealthError(
      CatalogueHealthFailureType.NETWORK_ERROR,
      "Hostname could not be resolved."
    );
  }

  if (addresses.length === 0) {
    throw new CatalogueHealthError(
      CatalogueHealthFailureType.NETWORK_ERROR,
      "Hostname did not resolve to an IP address."
    );
  }

  for (const address of addresses) {
    if (isUnsafeIp(address.address)) {
      throw new CatalogueHealthError(
        CatalogueHealthFailureType.INVALID_URL,
        "Hostname resolves to a private or reserved IP address."
      );
    }
  }

  return url;
}

function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.$/, "");
}

function isUnsafeIp(address: string): boolean {
  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    const parts = address.split(".").map(Number);

    if (parts.length !== 4) return true;

    const [a, b, c] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 192 && b === 168) ||
      (a === 198 && b >= 18 && b <= 19) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();

    if (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized)
    ) {
      return true;
    }

    // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
    if (normalized.startsWith("::ffff:")) {
      const mapped = normalized.slice("::ffff:".length);

      if (net.isIP(mapped) === 4) {
        return isUnsafeIp(mapped);
      }
    }

    return false;
  }

  return true;
}

function classifyHttpFailure(
  status: number
): CatalogueHealthFailureType {
  switch (status) {
    case 401:
      return CatalogueHealthFailureType.UNAUTHORIZED;

    case 403:
      return CatalogueHealthFailureType.FORBIDDEN;

    case 404:
      return CatalogueHealthFailureType.NOT_FOUND;

    case 410:
      return CatalogueHealthFailureType.GONE;

    case 429:
      return CatalogueHealthFailureType.RATE_LIMITED;

    default:
      if (status >= 500) {
        return CatalogueHealthFailureType.SERVER_ERROR;
      }

      return CatalogueHealthFailureType.OTHER;
  }
}

function classifyThrownError(
  error: unknown,
  responseTimeMs: number
): CheckResult {
  if (error instanceof CatalogueHealthError) {
    return {
      status: CatalogueHealthStatus.DEGRADED,
      failureType: error.failureType,
      httpStatus: null,
      finalUrl: null,
      contentType: null,
      responseTimeMs,
      errorMessage: error.message,
    };
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError")
  ) {
    return {
      status: CatalogueHealthStatus.DEGRADED,
      failureType: CatalogueHealthFailureType.TIMEOUT,
      httpStatus: null,
      finalUrl: null,
      contentType: null,
      responseTimeMs,
      errorMessage: "Request timed out.",
    };
  }

  return {
    status: CatalogueHealthStatus.DEGRADED,
    failureType: CatalogueHealthFailureType.NETWORK_ERROR,
    httpStatus: null,
    finalUrl: null,
    contentType: null,
    responseTimeMs,
    errorMessage:
      error instanceof Error
        ? error.message
        : "Unknown network error.",
  };
}

function isRedirect(status: number) {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

async function cancelBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // Body cleanup failure does not change resource health.
  }
}

class CatalogueHealthError extends Error {
  constructor(
    public readonly failureType: CatalogueHealthFailureType,
    message: string
  ) {
    super(message);
    this.name = "CatalogueHealthError";
  }
}