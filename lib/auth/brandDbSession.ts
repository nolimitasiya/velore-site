import "server-only";

import { prisma } from "@/lib/prisma";
import {
  BRAND_IDLE_TIMEOUT_SECONDS,
  BRAND_SESSION_DURATION_SECONDS,
  SESSION_ACTIVITY_UPDATE_INTERVAL_SECONDS,
  generateSessionToken,
  hashSessionToken,
  sessionExpiresAt,
} from "@/lib/auth/sessionCrypto";

import type { Prisma } from "@prisma/client";

export async function createBrandSession(
  userId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<string> {
  const token = generateSessionToken();

  await db.brandAuthSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: sessionExpiresAt(BRAND_SESSION_DURATION_SECONDS),
    },
  });

  return token;
}

export async function getBrandSession(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const now = new Date();
  const tokenHash = hashSessionToken(token);

  const idleMs = BRAND_IDLE_TIMEOUT_SECONDS * 1000;
  const updateIntervalMs =
    SESSION_ACTIVITY_UPDATE_INTERVAL_SECONDS * 1000;

  const idleCutoff = new Date(now.getTime() - idleMs);
  const updateCutoff = new Date(now.getTime() - updateIntervalMs);

  const session = await prisma.brandAuthSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      lastSeenAt: true,
      revokedAt: true,
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    session.lastSeenAt <= idleCutoff
  ) {
    return null;
  }

  if (session.lastSeenAt <= updateCutoff) {
    await prisma.brandAuthSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
        lastSeenAt: {
          gt: idleCutoff,
          lte: updateCutoff,
        },
      },
      data: { lastSeenAt: now },
    });
  }

  // Re-check after the optional update to handle concurrent requests
  // and sessions revoked between the initial lookup and this check.
  const active = await prisma.brandAuthSession.findFirst({
    where: {
      id: session.id,
      revokedAt: null,
      expiresAt: { gt: now },
      lastSeenAt: { gt: idleCutoff },
    },
    select: { id: true },
  });

  if (!active) {
    return null;
  }

  return { userId: session.userId };
}

export async function revokeBrandSession(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return;
  }

  await prisma.brandAuthSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllBrandSessions(userId: string): Promise<void> {
  await prisma.brandAuthSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}