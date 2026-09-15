import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

export const ANALYTICS_SESSION_COOKIE =
  "vc_session";

export const ANALYTICS_ATTRIBUTION_COOKIE =
  "vc_attribution";

const SESSION_LENGTH_MS =
  30 * 60 * 1000;

const SESSION_COOKIE_MAX_AGE =
  30 * 60;

/*
 * Keep acquisition attribution
 * for 30 days.
 *
 * This is separate from the
 * 30-minute behavioural session.
 */
const ATTRIBUTION_COOKIE_MAX_AGE =
  30 * 24 * 60 * 60;

export type AnalyticsAttributionInput = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
};

type StoredAttribution = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  landingPath: string | null;
  referrer: string | null;
};

function normalizeCountryCode(
  value:
    | string
    | null
    | undefined
) {
  const normalized =
    (value ?? "")
      .trim()
      .toUpperCase();

  return normalized.length === 2
    ? normalized
    : null;
}

function normalizeCurrencyCode(
  value:
    | string
    | null
    | undefined
) {
  const normalized =
    (value ?? "")
      .trim()
      .toUpperCase();

  return normalized.length === 3
    ? normalized
    : null;
}

function cleanValue(
  value:
    | string
    | null
    | undefined
) {
  const cleaned =
    (value ?? "").trim();

  return cleaned
    ? cleaned.slice(0, 1000)
    : null;
}

function normalizeUtmValue(
  value:
    | string
    | null
    | undefined
) {
  const cleaned =
    cleanValue(value);

  return cleaned
    ? cleaned.toLowerCase()
    : null;
}

function classifyReferrer(
  referrer:
    | string
    | null
    | undefined
) {
  const cleaned =
    cleanValue(referrer);

  if (!cleaned) {
    return {
      source: "direct",
      medium: "none",
    };
  }

  try {
    const url =
      new URL(cleaned);

    const hostname =
      url.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    /*
     * Same-site navigation is not
     * a new acquisition source.
     */
    if (
      hostname === "veiloraclub.com" ||
      hostname.endsWith(
        ".veiloraclub.com"
      ) ||
      hostname === "localhost" ||
      hostname === "127.0.0.1"
    ) {
      return {
        source: "direct",
        medium: "none",
      };
    }

    if (
      hostname === "tiktok.com" ||
      hostname.endsWith(
        ".tiktok.com"
      )
    ) {
      return {
        source: "tiktok",
        medium: "organic_social",
      };
    }

    if (
      hostname === "instagram.com" ||
      hostname.endsWith(
        ".instagram.com"
      )
    ) {
      return {
        source: "instagram",
        medium: "organic_social",
      };
    }

    if (
      hostname === "linkedin.com" ||
      hostname.endsWith(
        ".linkedin.com"
      )
    ) {
      return {
        source: "linkedin",
        medium: "organic_social",
      };
    }

    if (
      hostname === "facebook.com" ||
      hostname.endsWith(
        ".facebook.com"
      ) ||
      hostname === "fb.com" ||
      hostname.endsWith(".fb.com")
    ) {
      return {
        source: "facebook",
        medium: "organic_social",
      };
    }

    if (
      hostname === "google.com" ||
      hostname.endsWith(
        ".google.com"
      ) ||
      hostname.startsWith(
        "google."
      )
    ) {
      return {
        source: "google",
        medium: "organic_search",
      };
    }

    if (
      hostname === "bing.com" ||
      hostname.endsWith(
        ".bing.com"
      )
    ) {
      return {
        source: "bing",
        medium: "organic_search",
      };
    }

    return {
      source: hostname,
      medium: "referral",
    };
  } catch {
    return {
      source: "referral",
      medium: "referral",
    };
  }
}

function buildAttribution(
  input:
    | AnalyticsAttributionInput
    | undefined
): StoredAttribution {
  const utmSource =
    normalizeUtmValue(
      input?.utmSource
    );

  const utmMedium =
    normalizeUtmValue(
      input?.utmMedium
    );

  const utmCampaign =
    normalizeUtmValue(
      input?.utmCampaign
    );

  const utmContent =
    normalizeUtmValue(
      input?.utmContent
    );

  const utmTerm =
    normalizeUtmValue(
      input?.utmTerm
    );

  const landingPath =
    cleanValue(
      input?.landingPath
    );

  const referrer =
    cleanValue(
      input?.referrer
    );

  const classified =
    classifyReferrer(
      referrer
    );

  return {
    /*
     * Explicit campaign tagging
     * always wins over inferred
     * referrer attribution.
     */
    source:
      utmSource ??
      classified.source,

    medium:
      utmMedium ??
      classified.medium,

    campaign:
      utmCampaign,

    content:
      utmContent,

    term:
      utmTerm,

    landingPath,

    referrer,
  };
}

function readStoredAttribution(
  req: NextRequest
): StoredAttribution | null {
  const raw =
    req.cookies.get(
      ANALYTICS_ATTRIBUTION_COOKIE
    )?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        decodeURIComponent(raw)
      ) as StoredAttribution;

    return {
      source:
        cleanValue(parsed.source),

      medium:
        cleanValue(parsed.medium),

      campaign:
        cleanValue(parsed.campaign),

      content:
        cleanValue(parsed.content),

      term:
        cleanValue(parsed.term),

      landingPath:
        cleanValue(
          parsed.landingPath
        ),

      referrer:
        cleanValue(parsed.referrer),
    };
  } catch {
    return null;
  }
}

function hasExplicitAcquisition(
  input:
    | AnalyticsAttributionInput
    | undefined
) {
  return Boolean(
    cleanValue(input?.utmSource) ||
      cleanValue(input?.utmMedium) ||
      cleanValue(
        input?.utmCampaign
      ) ||
      cleanValue(input?.utmContent) ||
      cleanValue(input?.utmTerm)
  );
}

export async function getOrCreateAnalyticsSession(
  req: NextRequest,
  attributionInput?: AnalyticsAttributionInput
) {
  const now = new Date();

  const existingSessionId =
    req.cookies
      .get(
        ANALYTICS_SESSION_COOKIE
      )
      ?.value
      ?.trim() || null;

  const shopperCountryCode =
    normalizeCountryCode(
      req.cookies.get(
        "vc_country"
      )?.value
    );

  const shopperCurrencyCode =
    normalizeCurrencyCode(
      req.cookies.get(
        "vc_currency"
      )?.value
    );

  const shopperCookieId =
    req.cookies
      .get("shopper_authed")
      ?.value
      ?.trim() || null;

  const authenticatedShopper =
    shopperCookieId
      ? await prisma.shopper.findUnique({
          where: {
            id: shopperCookieId,
          },

          select: {
            id: true,
          },
        })
      : null;

  const shopperId =
    authenticatedShopper?.id ??
    null;

  /*
   * Existing behavioural session
   * continues exactly as before.
   */
  if (existingSessionId) {
    const existingSession =
      await prisma.analyticsSession.findUnique({
        where: {
          id:
            existingSessionId,
        },

        select: {
          id: true,
          lastSeenAt: true,
          shopperId: true,
        },
      });

    if (existingSession) {
      const age =
        now.getTime() -
        existingSession.lastSeenAt.getTime();

      const isFresh =
        age <=
        SESSION_LENGTH_MS;

      const sameIdentity =
        existingSession.shopperId ===
        shopperId;

      if (
        isFresh &&
        sameIdentity
      ) {
        await prisma.analyticsSession.update({
          where: {
            id:
              existingSession.id,
          },

          data: {
            lastSeenAt:
              now,

            shopperCountryCode,

            shopperCurrencyCode,
          },
        });

        return {
          sessionId:
            existingSession.id,

          isNew:
            false,

          shopperId,

          shopperCountryCode,

          shopperCurrencyCode,

          attribution:
            null as StoredAttribution | null,

          shouldSetAttributionCookie:
            false,
        };
      }
    }
  }

  /*
   * Attribution strategy:
   *
   * 1. Explicit UTMs on this landing
   *    take priority.
   *
   * 2. Otherwise preserve the
   *    visitor's existing 30-day
   *    acquisition attribution.
   *
   * 3. Otherwise infer attribution
   *    from the referrer/direct visit.
   */
  const storedAttribution =
    readStoredAttribution(req);

  const explicitAcquisition =
    hasExplicitAcquisition(
      attributionInput
    );

  const attribution =
    explicitAcquisition
      ? buildAttribution(
          attributionInput
        )
      : storedAttribution ??
        buildAttribution(
          attributionInput
        );

  const session =
    await prisma.analyticsSession.create({
      data: {
        startedAt:
          now,

        lastSeenAt:
          now,

        shopperCountryCode,

        shopperCurrencyCode,

        shopperId,

        acquisitionSource:
          attribution.source,

        acquisitionMedium:
          attribution.medium,

        acquisitionCampaign:
          attribution.campaign,

        acquisitionContent:
          attribution.content,

        acquisitionTerm:
          attribution.term,

        landingPath:
          attribution.landingPath,

        referrer:
          attribution.referrer,
      },

      select: {
        id: true,
      },
    });

  return {
    sessionId:
      session.id,

    isNew:
      true,

    shopperId,

    shopperCountryCode,

    shopperCurrencyCode,

    attribution,

    shouldSetAttributionCookie:
      explicitAcquisition ||
      !storedAttribution,
  };
}

export function attachAnalyticsSessionCookie(
  response: NextResponse,
  sessionId: string
) {
  response.cookies.set({
    name:
      ANALYTICS_SESSION_COOKIE,

    value:
      sessionId,

    httpOnly:
      true,

    sameSite:
      "lax",

    secure:
      process.env.NODE_ENV ===
      "production",

    path:
      "/",

    maxAge:
      SESSION_COOKIE_MAX_AGE,
  });

  return response;
}

export function attachAnalyticsAttributionCookie(
  response: NextResponse,
  attribution: StoredAttribution
) {
  response.cookies.set({
    name:
      ANALYTICS_ATTRIBUTION_COOKIE,

    value:
      encodeURIComponent(
        JSON.stringify(
          attribution
        )
      ),

    httpOnly:
      true,

    sameSite:
      "lax",

    secure:
      process.env.NODE_ENV ===
      "production",

    path:
      "/",

    maxAge:
      ATTRIBUTION_COOKIE_MAX_AGE,
  });

  return response;
}