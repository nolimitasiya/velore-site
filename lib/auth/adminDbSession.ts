import "server-only";

import { prisma } from "@/lib/prisma";
import {
  ADMIN_IDLE_TIMEOUT_SECONDS,
  ADMIN_SESSION_DURATION_SECONDS,
  SESSION_ACTIVITY_UPDATE_INTERVAL_SECONDS,
  generateSessionToken,
  hashSessionToken,
  sessionExpiresAt,
} from "@/lib/auth/sessionCrypto";

export async function createAdminSession(adminId: string): Promise<string> {
  const token = generateSessionToken();

  await prisma.adminAuthSession.create({
    data: {
      adminId,
      tokenHash: hashSessionToken(token),
      expiresAt: sessionExpiresAt(ADMIN_SESSION_DURATION_SECONDS),
    },
  });

  return token;
}

export async function getAdminSession(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const now = new Date();
  const tokenHash = hashSessionToken(token);

  const idleMs = ADMIN_IDLE_TIMEOUT_SECONDS * 1000;
  const updateIntervalMs =
    SESSION_ACTIVITY_UPDATE_INTERVAL_SECONDS * 1000;

  const idleCutoff = new Date(now.getTime() - idleMs);
  const updateCutoff = new Date(now.getTime() - updateIntervalMs);

  const session = await prisma.adminAuthSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      adminId: true,
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
    await prisma.adminAuthSession.updateMany({
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

  // Re-check the database after the optional activity update.
  // This also handles another request refreshing lastSeenAt first.
  const active = await prisma.adminAuthSession.findFirst({
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

  return { adminId: session.adminId };
}

export async function revokeAdminSession(token: string): Promise<void> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return;
  }

  await prisma.adminAuthSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllAdminSessions(adminId: string): Promise<void> {
  await prisma.adminAuthSession.updateMany({
    where: {
      adminId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}