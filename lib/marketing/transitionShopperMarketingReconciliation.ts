import "server-only";

import type { PrismaClient } from "@prisma/client";

type ReconciliationDatabase = Pick<PrismaClient, "$transaction">;

type ReconciliationTransition =
  | {
      decision: "APPLIED";
      providerEvidenceVerified: true;
      providerJobId: string;
    }
  | {
      decision: "UNKNOWN";
      reason: string;
    };

type TransitionResult =
  | { outcome: "UPDATED" }
  | { outcome: "NOT_UPDATED" };

export async function transitionShopperMarketingReconciliation(
  db: ReconciliationDatabase,
  operationId: string,
  transition: ReconciliationTransition
): Promise<TransitionResult> {
  if (!operationId.trim()) {
    throw new Error("Missing reconciliation operation ID");
  }

  if (
    transition.decision === "UNKNOWN" &&
    !transition.reason.trim()
  ) {
    throw new Error("Missing reconciliation uncertainty reason");
  }

  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT queue."id"
      FROM "ShopperMarketingConsentSync" AS queue
      INNER JOIN "Shopper" AS shopper
        ON shopper."id" = queue."shopperId"
      WHERE queue."id" = ${operationId}::uuid
      FOR UPDATE OF queue, shopper
    `;

    if (locked.length !== 1) {
      return { outcome: "NOT_UPDATED" };
    }

    const operation =
      await tx.shopperMarketingConsentSync.findUnique({
        where: { id: operationId },
        select: {
          id: true,
          shopperId: true,
          email: true,
          desiredConsent: true,
          reason: true,
          status: true,
          providerJobId: true,
          consentVersion: true,
        },
      });

    if (
      !operation ||
      (operation.status !== "SUBMITTED" &&
        operation.status !== "UNKNOWN")
    ) {
      return { outcome: "NOT_UPDATED" };
    }

    if (transition.decision === "APPLIED") {
      if (
        !transition.providerEvidenceVerified ||
        !transition.providerJobId.trim() ||
        operation.providerJobId !== transition.providerJobId
      ) {
        return { outcome: "NOT_UPDATED" };
      }

      const shopper = await tx.shopper.findUnique({
        where: { id: operation.shopperId },
        select: {
          email: true,
          marketingConsent: true,
          marketingConsentVersion: true,
        },
      });

      if (!shopper) {
        return { outcome: "NOT_UPDATED" };
      }

      const currentEmail = shopper.email.trim().toLowerCase();
      const operationEmail = operation.email.trim().toLowerCase();

      if (operation.reason === "EMAIL_CHANGE_OLD_ADDRESS") {
        // An old-address opt-out is a historical operation.
        // It must never be interpreted as consent for the new address.
        if (
          operation.desiredConsent !== false ||
          operationEmail === currentEmail ||
          !Number.isSafeInteger(operation.consentVersion) ||
          !Number.isSafeInteger(shopper.marketingConsentVersion) ||
          operation.consentVersion < 0 ||
          shopper.marketingConsentVersion < operation.consentVersion
        ) {
          return { outcome: "NOT_UPDATED" };
        }

        // A shared email or separate subscriber record requires
        // manual reconciliation. Do not infer ownership.
        const [otherShoppers, newsletterSubscribers, waitlistSubscribers] =
          await Promise.all([
            tx.shopper.count({
              where: {
                id: { not: operation.shopperId },
                email: { equals: operation.email, mode: "insensitive" },
              },
            }),
            tx.newsletterSubscriber.count({
              where: {
                email: { equals: operation.email, mode: "insensitive" },
              },
            }),
            tx.waitlistSubscriber.count({
              where: {
                email: { equals: operation.email, mode: "insensitive" },
              },
            }),
          ]);

        if (
          otherShoppers > 0 ||
          newsletterSubscribers > 0 ||
          waitlistSubscribers > 0
        ) {
          return { outcome: "NOT_UPDATED" };
        }
      } else if (
        operation.consentVersion !== shopper.marketingConsentVersion ||
        operationEmail !== currentEmail ||
        operation.desiredConsent !== shopper.marketingConsent
      ) {
        return { outcome: "NOT_UPDATED" };
      }

      const updated =
        await tx.shopperMarketingConsentSync.updateMany({
          where: {
            id: operationId,
            status: operation.status,
            providerJobId: transition.providerJobId,
            consentVersion: operation.consentVersion,
          },
          data: {
            status: "APPLIED",
            appliedAt: new Date(),
            reconciledAt: new Date(),
            lastCheckedAt: new Date(),
            lastError: null,
          },
        });

      return {
        outcome: updated.count === 1
          ? "UPDATED"
          : "NOT_UPDATED",
      };
    }

    const updated =
      await tx.shopperMarketingConsentSync.updateMany({
        where: {
          id: operationId,
          status: operation.status,
          providerJobId: operation.providerJobId,
          consentVersion: operation.consentVersion,
        },
        data: {
          status: "UNKNOWN",
          lastCheckedAt: new Date(),
          lastError: transition.reason,
        },
      });

    return {
      outcome: updated.count === 1
        ? "UPDATED"
        : "NOT_UPDATED",
    };
  });
}
