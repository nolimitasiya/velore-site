import { createHash, randomBytes } from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";

import {
  ShopperSessionCreationReason,
  ShopperSessionRevocationReason,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const SHOPPER_AUTH_COOKIE =
  "shopper_authed";

const SHOPPER_SESSION_LIFETIME_SECONDS =
  60 * 60 * 24 * 30;

const SHOPPER_SESSION_LIFETIME_MS =
  SHOPPER_SESSION_LIFETIME_SECONDS *
  1000;

/*
 * Hash the opaque browser token before
 * looking it up or storing it.
 *
 * The usable token itself never belongs
 * in the database.
 */
function hashSessionToken(
  token: string
) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

/*
 * Create a new revocable shopper session.
 *
 * Returns the raw token exactly once so
 * the caller can place it in the secure
 * HTTP-only cookie.
 */
export async function createShopperSession(
  shopperId: string,
  creationReason: ShopperSessionCreationReason
) {
  const token =
    randomBytes(32).toString("hex");

  const tokenHash =
    hashSessionToken(token);

  const expiresAt =
    new Date(
      Date.now() +
        SHOPPER_SESSION_LIFETIME_MS
    );

  await prisma.shopperAuthSession.create({
    data: {
      shopperId,
      tokenHash,
      expiresAt,
      creationReason,
    },
  });

  return {
    token,
    expiresAt,
  };
}

/*
 * Apply the authentication cookie to a
 * response.
 *
 * Keeping this here prevents login and
 * registration from defining slightly
 * different cookie policies.
 */
export function setShopperSessionCookie(
  response: NextResponse,
  token: string
) {
  response.cookies.set(
    SHOPPER_AUTH_COOKIE,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge:
        SHOPPER_SESSION_LIFETIME_SECONDS,
    }
  );
}

/*
 * Remove the authentication cookie from
 * the browser.
 */
export function clearShopperSessionCookie(
  response: NextResponse
) {
  response.cookies.set(
    SHOPPER_AUTH_COOKIE,
    "",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );
}

/*
 * Resolve the current shopper through a
 * real server-side session.
 */
async function resolveAuthenticatedShopperFromToken(
  token: string | null
) {
  const normalizedToken =
    token?.trim() || null;

  if (!normalizedToken) {
    return null;
  }

  const tokenHash =
    hashSessionToken(normalizedToken);

  /*
   * Resolve the authentication session first.
   *
   * Keep the opaque browser token / token hash
   * separate from the Shopper UUID. The session's
   * shopperId is the only value used to resolve
   * the Shopper record.
   */
  const session =
    await prisma.shopperAuthSession.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        shopperId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    return null;
  }

  if (
    session.expiresAt.getTime() <=
    Date.now()
  ) {
    return null;
  }

  /*
   * Resolve the shopper explicitly from the
   * UUID stored on the authenticated session.
   */
  const shopper =
    await prisma.shopper.findUnique({
      where: {
        id: session.shopperId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

  if (!shopper) {
    return null;
  }

  /*
   * Keep a lightweight record of recent
   * session activity.
   *
   * Avoid writing on every single request.
   */
  const now = new Date();

  await prisma.shopperAuthSession.updateMany({
    where: {
      id: session.id,
      revokedAt: null,

      lastSeenAt: {
        lt: new Date(
          now.getTime() -
            5 * 60 * 1000
        ),
      },
    },

    data: {
      lastSeenAt: now,
    },
  });

  return shopper;
}

/*
 * Resolve shopper identity from a
 * NextRequest.
 *
 * Used by route handlers and other
 * request-based server code.
 */
export async function getAuthenticatedShopper(
  request: NextRequest
) {
  const token =
    request.cookies
      .get(SHOPPER_AUTH_COOKIE)
      ?.value ?? null;

  return resolveAuthenticatedShopperFromToken(
    token
  );
}

/*
 * Resolve shopper identity from a
 * Server Component.
 *
 * Session validation remains centralized
 * in the same token resolver used by
 * request-based authentication.
 */
export async function getAuthenticatedShopperFromServerComponent() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore
      .get(SHOPPER_AUTH_COOKIE)
      ?.value ?? null;

  return resolveAuthenticatedShopperFromToken(
    token
  );
}

export async function requireAuthenticatedShopper(
  request: NextRequest
) {
  const shopper =
    await getAuthenticatedShopper(request);

  if (!shopper) {
    throw new Error(
      "UNAUTHENTICATED_SHOPPER"
    );
  }

  return shopper;
}

/*
 * Revoke the exact session represented by
 * this request's cookie.
 */
export async function revokeCurrentShopperSession(
  request: NextRequest,
  reason: ShopperSessionRevocationReason
) {
  const token =
    request.cookies
      .get(SHOPPER_AUTH_COOKIE)
      ?.value
      ?.trim() || null;

  if (!token) {
    return;
  }

  const tokenHash =
    hashSessionToken(token);

  await prisma.shopperAuthSession.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },

    data: {
      revokedAt: new Date(),
      revocationReason: reason,
    },
  });
}

/*
 * Revoke every active session belonging
 * to a shopper.
 *
 * This will be used for sensitive security
 * events such as a password change.
 */
export async function revokeAllShopperSessions(
  shopperId: string,
  reason: ShopperSessionRevocationReason
) {
  await prisma.shopperAuthSession.updateMany({
    where: {
      shopperId,
      revokedAt: null,
    },

    data: {
      revokedAt: new Date(),
      revocationReason: reason,
    },
  });
}