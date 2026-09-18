import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const LOCK_KEY = 884_621_307;

type TransactionClient = Prisma.TransactionClient;

/**
 * Runs a short database operation while holding a PostgreSQL
 * transaction-scoped advisory lock.
 *
 * The lock exists only for the duration of this transaction.
 * External HTTP checks must NOT happen inside this callback.
 */
export async function withCatalogueHealthClaimLock<T>(
  work: (tx: TransactionClient) => Promise<T>
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
    const rows = await tx.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_xact_lock(${LOCK_KEY}) AS acquired
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