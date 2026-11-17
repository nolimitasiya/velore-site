import "server-only";

import {
  Prisma,
  ShopperMarketingConsentSyncReason,
} from "@prisma/client";

type ConsentTransitionReason = Exclude<
  ShopperMarketingConsentSyncReason,
  "RECONCILIATION"
>;

type CreateShopperMarketingConsentSyncInput = {
  tx: Prisma.TransactionClient;
  shopperId: string;
  email: string;
  consentVersion: number;
  desiredConsent: boolean;
  reason: ConsentTransitionReason;
};

export async function createShopperMarketingConsentSync({
  tx,
  shopperId,
  email,
  consentVersion,
  desiredConsent,
  reason,
}: CreateShopperMarketingConsentSyncInput) {
  if (
    !Number.isSafeInteger(consentVersion) ||
    consentVersion < 1
  ) {
    throw new Error("Invalid marketing consent version.");
  }

  const normalisedEmail = email.trim().toLowerCase();

  if (!normalisedEmail || normalisedEmail.length > 320) {
    throw new Error("Invalid marketing consent email.");
  }

  if (!shopperId.trim()) {
    throw new Error("Invalid shopper ID.");
  }

  const operationKey = [
    "shopper-marketing-consent",
    shopperId,
    consentVersion,
    reason,
  ].join(":");

  return tx.shopperMarketingConsentSync.create({
    data: {
      shopperId,
      email: normalisedEmail,
      consentVersion,
      desiredConsent,
      reason,
      providerOperationType: desiredConsent ? "SUBSCRIBE" : null,
      operationKey,
      status: "PENDING",
    },
  });
}
