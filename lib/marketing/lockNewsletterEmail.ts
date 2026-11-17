import type { Prisma } from "@prisma/client";

/**
 * Serialises newsletter operations for the same normalised email.
 *
 * This must be acquired before reading or modifying subscription
 * state in every participating transaction.
 *
 * Account withdrawal and confirmation routes must adopt the same
 * locking convention before end-to-end concurrency is guaranteed.
 */
export async function lockNewsletterEmail(
  tx: Prisma.TransactionClient,
  email: string
): Promise<void> {
  const normalisedEmail = email.trim().toLowerCase();

  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtextextended(${normalisedEmail}, 0)
    )
  `;
}