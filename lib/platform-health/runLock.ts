import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/*
 * Platform Health has its own advisory lock.
 * Catalogue Health uses a different lock key.
 */
const PLATFORM_HEALTH_LOCK_KEY =
  1_746_203_911;

type TransactionClient =
  Prisma.TransactionClient;

/**
 * Runs a short database operation while holding
 * the Platform Health transaction-scoped
 * PostgreSQL advisory lock.
 *
 * External HTTP checks must NOT happen inside
 * this callback.
 */
export async function withPlatformHealthClaimLock<T>(
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
  return prisma.$transaction(async (tx) => {
    const rows =
      await tx.$queryRaw<
        Array<{ acquired: boolean }>
      >`
        SELECT pg_try_advisory_xact_lock(
          ${PLATFORM_HEALTH_LOCK_KEY}
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
  });
}