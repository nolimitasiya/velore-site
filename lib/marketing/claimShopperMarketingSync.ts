import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export type ClaimedMarketingSync = {
  id: string;
  shopperId: string;
  email: string;
  consentVersion: number;
  desiredConsent: boolean;
  reason: string;
  claimToken: string;
};

type ClaimDatabase = Pick<
  PrismaClient,
  "$transaction"
>;

/**
 * DEVELOPMENT ONLY.
 *
 * This function atomically claims one queue row.
 *
 * It does not yet guarantee per-shopper serialisation across
 * concurrent workers, and must not be activated as a
 * multi-worker production queue.
 *
 * Provider submission remains disabled.
 */
export async function claimShopperMarketingSync(
  db: ClaimDatabase,
  allowedEmail?: string
): Promise<ClaimedMarketingSync | null> {
  const normalisedAllowedEmail = allowedEmail?.trim().toLowerCase();

  if (allowedEmail !== undefined && !normalisedAllowedEmail) {
    throw new Error("Marketing sync email filter cannot be empty.");
  }

  const claimToken = randomUUID();

  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        shopperId: string;
        email: string;
        consentVersion: number;
        desiredConsent: boolean;
        reason: string;
      }>
    >`
      SELECT
        queue."id",
        queue."shopperId",
        queue."email",
        queue."consentVersion",
        queue."desiredConsent",
        queue."reason"::text AS "reason"
      FROM "ShopperMarketingConsentSync" AS queue
      INNER JOIN "Shopper" AS shopper
        ON shopper."id" = queue."shopperId"
      WHERE
        (
          ${normalisedAllowedEmail}::text IS NULL
          OR LOWER(BTRIM(queue."email")) = ${normalisedAllowedEmail}
        )
        AND (
          queue."status" = 'PENDING'::"ShopperMarketingConsentSyncStatus"
          OR (
            queue."status" = 'FAILED'::"ShopperMarketingConsentSyncStatus"
            AND (
              queue."nextAttemptAt" IS NULL
              OR queue."nextAttemptAt" <= NOW()
            )
          )
        )
        AND queue."claimToken" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "ShopperMarketingConsentSync" AS active
          WHERE active."id" <> queue."id"
            AND (
              active."shopperId" = queue."shopperId"
              OR LOWER(BTRIM(active."email")) =
                 LOWER(BTRIM(queue."email"))
            )
            AND active."status" IN (
              'PROCESSING'::"ShopperMarketingConsentSyncStatus",
              'SUBMITTED'::"ShopperMarketingConsentSyncStatus",
              'UNKNOWN'::"ShopperMarketingConsentSyncStatus"
            )
        )
      ORDER BY queue."createdAt" ASC, queue."id" ASC
      FOR UPDATE OF queue, shopper SKIP LOCKED
      LIMIT 1
    `;

    const row = rows[0];

    if (!row) {
      return null;
    }

    // Transaction-level email lock. All marketing-sync claim workers
    // must follow this protocol before claiming an email operation.
    //
    // hashtextextended returns a PostgreSQL bigint advisory-lock key.
    // Hash collisions conservatively serialise unrelated emails.
    const normalisedEmail = row.email.trim().toLowerCase();

    const emailLock = await tx.$queryRaw<
      Array<{ acquired: boolean }>
    >`
      SELECT pg_try_advisory_xact_lock(
        hashtextextended(${normalisedEmail}, 214211)
      ) AS acquired
    `;

    if (emailLock[0]?.acquired !== true) {
      return null;
    }

    // Recheck after acquiring the email lock.
    // The initial NOT EXISTS filter is not sufficient for concurrency.
    const unresolved = await tx.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT active."id"
      FROM "ShopperMarketingConsentSync" AS active
      WHERE active."id" <> ${row.id}
        AND (
          active."shopperId" = ${row.shopperId}
          OR LOWER(BTRIM(active."email")) = ${normalisedEmail}
        )
        AND active."status" IN (
          'PROCESSING'::"ShopperMarketingConsentSyncStatus",
          'SUBMITTED'::"ShopperMarketingConsentSyncStatus",
          'UNKNOWN'::"ShopperMarketingConsentSyncStatus"
        )
      LIMIT 1
    `;

    if (unresolved.length > 0) {
      return null;
    }

    // Recheck the selected operation before claiming it.
    // The update below is conditional on its current status and ownership.
    const current = await tx.shopperMarketingConsentSync.findUnique({
      where: { id: row.id },
      select: {
        status: true,
        claimToken: true,
        nextAttemptAt: true,
      },
    });

    if (!current || current.claimToken !== null) {
      return null;
    }

    const eligible =
      current.status === "PENDING" ||
      (current.status === "FAILED" &&
        (current.nextAttemptAt === null ||
          current.nextAttemptAt <= new Date()));

    if (!eligible) {
      return null;
    }

    const claimedAt = new Date();

    const updated = await tx.shopperMarketingConsentSync.updateMany({
      where: {
        id: row.id,
        status: current.status,
        claimToken: null,
      },
      data: {
        status: "PROCESSING",
        claimedAt,
        claimToken,
        attemptCount: {
          increment: 1,
        },
        nextAttemptAt: null,
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    return {
      ...row,
      claimToken,
    };
  });
}
