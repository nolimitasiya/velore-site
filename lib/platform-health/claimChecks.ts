import type {
  PlatformHealthCheck,
  Prisma,
} from "@prisma/client";

import {
  withPlatformHealthClaimLock,
} from "@/lib/platform-health/runLock";

type TransactionClient =
  Prisma.TransactionClient;

type ClaimOptions = {
  limit?: number;
  now?: Date;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeLimit(
  value: number | undefined
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(value))
  );
}

async function claimDueChecks(
  tx: TransactionClient,
  options: {
    limit: number;
    now: Date;
  }
): Promise<PlatformHealthCheck[]> {
  const dueChecks =
    await tx.platformHealthCheck.findMany({
      where: {
        isActive: true,

        OR: [
          {
            nextCheckAt: null,
          },
          {
            nextCheckAt: {
              lte: options.now,
            },
          },
        ],
      },

      orderBy: [
        {
          nextCheckAt: "asc",
        },
        {
          checkKey: "asc",
        },
      ],

      take: options.limit,
    });

  /*
   * Reserve each selected check before
   * releasing the advisory lock.
   *
   * This prevents another overlapping run
   * from immediately selecting the same
   * checks.
   */
  for (const check of dueChecks) {
    const nextCheckAt = new Date(
      options.now.getTime() +
        check.intervalSeconds * 1000
    );

    await tx.platformHealthCheck.update({
      where: {
        id: check.id,
      },
      data: {
        nextCheckAt,
      },
    });

    check.nextCheckAt = nextCheckAt;
  }

  return dueChecks;
}

export async function claimPlatformHealthChecks(
  options: ClaimOptions = {}
) {
  const now = options.now ?? new Date();
  const limit = normalizeLimit(
    options.limit
  );

  const result =
    await withPlatformHealthClaimLock(
      async (tx) =>
        claimDueChecks(tx, {
          limit,
          now,
        })
    );

  if (!result.acquired) {
    return {
      lockAcquired: false as const,
      checks: [] as PlatformHealthCheck[],
    };
  }

  return {
    lockAcquired: true as const,
    checks: result.value,
  };
}