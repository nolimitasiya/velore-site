import type {
  Prisma,
} from "@prisma/client";

type TransactionClient =
  Prisma.TransactionClient;

/*
 * Dedicated PostgreSQL transaction-scoped
 * advisory lock for canonical database incident
 * mutation.
 *
 * This is intentionally separate from:
 *
 * - Catalogue Health run locking
 * - Platform Health run locking
 *
 * Only database-incident convergence uses this
 * key.
 *
 * The lock is released automatically when the
 * surrounding database transaction ends.
 *
 * No external HTTP work should ever run while
 * this lock is held.
 */
const DATABASE_INCIDENT_LOCK_KEY =
  1_746_203_912;

export async function lockDatabaseIncidentConvergence(
  tx: TransactionClient
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      ${DATABASE_INCIDENT_LOCK_KEY}
    )
  `;
}