import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

export const ANALYTICS_SESSION_COOKIE =
  "vc_session";

const SESSION_LENGTH_MS =
  30 * 60 * 1000;

const SESSION_COOKIE_MAX_AGE =
  30 * 60;

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

export async function getOrCreateAnalyticsSession(
  req: NextRequest
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

  /*
   * Resolve the currently
   * authenticated shopper.
   */
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
   * Check whether the browser's
   * existing analytics session
   * can safely continue.
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

      /*
       * Identity rules:
       *
       * anonymous -> anonymous
       * same shopper -> same shopper
       *
       * Anything else means the
       * browser's identity changed
       * and therefore requires a
       * new analytics session.
       */
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
        };
      }
    }
  }

  /*
   * Create a new session when:
   *
   * - no session exists
   * - session expired
   * - anonymous -> logged in
   * - logged in -> anonymous
   * - shopper A -> shopper B
   *
   * Historical session ownership
   * is therefore never rewritten.
   */
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