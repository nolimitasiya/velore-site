import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/*
 * Dedicated transaction-scoped advisory lock
 * for Platform Health history maintenance.
 *
 * This is intentionally different from:
 *
 * 1_746_203_911 — health-check claiming
 * 1_746_203_912 — database incident convergence
 */
const PLATFORM_HEALTH_HISTORY_LOCK_KEY =
  1_746_203_913;

type TransactionClient =
  Prisma.TransactionClient;

export async function withPlatformHealthHistoryLock<T>(
  work: (
    tx: TransactionClient
  ) => Promise<T>
): Promise<
  | {
      acquired: true;
      value: T;
    }
  | {
      acquired: false;
    }
> {
  return prisma.$transaction(
  async (tx) => {
    const rows =
      await tx.$queryRaw<
        Array<{ acquired: boolean }>
      >`
        SELECT pg_try_advisory_xact_lock(
          ${PLATFORM_HEALTH_HISTORY_LOCK_KEY}
        ) AS acquired
      `;

    if (rows[0]?.acquired !== true) {
      return {
        acquired: false as const,
      };
    }

    const value = await work(tx);

    return {
      acquired: true as const,
      value,
    };
  },
  {
    maxWait: 5_000,
    timeout: 120_000,
    isolationLevel:
      Prisma.TransactionIsolationLevel
        .RepeatableRead,
  }
);
}