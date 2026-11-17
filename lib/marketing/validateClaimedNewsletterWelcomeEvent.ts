import "server-only";

import type { PrismaClient } from "@prisma/client";

import { shouldBlockNewsletterConfirmation } from "./shouldBlockNewsletterConfirmation";

type ValidationDatabase = Pick<
  PrismaClient,
  | "newsletterWelcomeEvent"
  | "newsletterSubscriber"
  | "shopper"
  | "shopperMarketingConsentSync"
>;

export type NewsletterWelcomeValidation =
  | {
      status: "INVALID_CLAIM";
      reason:
        | "NOT_FOUND"
        | "NOT_PROCESSING"
        | "TOKEN_MISMATCH";
    }
  | {
      status: "BLOCKED";
      reason:
        | "SUBSCRIBER_NOT_FOUND"
        | "NOT_SUBSCRIBED"
        | "GENERATION_MISMATCH"
        | "INVALID_EMAIL"
        | "MISSING_UNSUBSCRIBE_TOKEN"
        | "ACCOUNT_MARKETING_CONSENT";
    }
  | {
      status: "READY";
      eventId: string;
      subscriberId: string;
      subscriptionGeneration: number;
      email: string;
      unsubscribeToken: string;
      eventKey: string;
      claimToken: string;
    };

/**
 * Read-only validation of a claimed newsletter welcome event.
 *
 * READY is a snapshot decision, not permission to submit email.
 * The final submission transition must recheck ownership and
 * consent under appropriate locks.
 *
 * This function never sends email or modifies event status.
 */
export async function validateClaimedNewsletterWelcomeEvent(
  db: ValidationDatabase,
  eventId: string,
  claimToken: string
): Promise<NewsletterWelcomeValidation> {
  if (!eventId || !claimToken) {
    return {
      status: "INVALID_CLAIM",
      reason: "TOKEN_MISMATCH",
    };
  }

  const event = await db.newsletterWelcomeEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      subscriberId: true,
      subscriptionGeneration: true,
      eventKey: true,
      status: true,
      claimToken: true,
    },
  });

  if (!event) {
    return {
      status: "INVALID_CLAIM",
      reason: "NOT_FOUND",
    };
  }

  if (event.status !== "PROCESSING") {
    return {
      status: "INVALID_CLAIM",
      reason: "NOT_PROCESSING",
    };
  }

  if (event.claimToken !== claimToken) {
    return {
      status: "INVALID_CLAIM",
      reason: "TOKEN_MISMATCH",
    };
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id: event.subscriberId },
    select: {
      id: true,
      email: true,
      status: true,
      subscriptionGeneration: true,
      unsubscribeToken: true,
    },
  });

  if (!subscriber) {
    return {
      status: "BLOCKED",
      reason: "SUBSCRIBER_NOT_FOUND",
    };
  }

  if (subscriber.status !== "subscribed") {
    return {
      status: "BLOCKED",
      reason: "NOT_SUBSCRIBED",
    };
  }

  if (
    subscriber.subscriptionGeneration !==
    event.subscriptionGeneration
  ) {
    return {
      status: "BLOCKED",
      reason: "GENERATION_MISMATCH",
    };
  }

  const email = subscriber.email.trim().toLowerCase();

  if (
    !email ||
    email.length > 254 ||
    /\s/.test(email) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return {
      status: "BLOCKED",
      reason: "INVALID_EMAIL",
    };
  }

  if (!subscriber.unsubscribeToken) {
    return {
      status: "BLOCKED",
      reason: "MISSING_UNSUBSCRIBE_TOKEN",
    };
  }

  const verifiedShoppers = await db.shopper.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
      emailVerifiedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      marketingConsent: true,
      marketingConsentVersion: true,
    },
    take: 2,
  });

  const verifiedShopper = verifiedShoppers[0];

  const latestConsentOperation =
    verifiedShoppers.length === 1
      ? await db.shopperMarketingConsentSync.findFirst({
          where: {
            shopperId: verifiedShopper.id,
            email: {
              equals: email,
              mode: "insensitive",
            },
            reason: {
              in: ["ACCOUNT_OPT_IN", "ACCOUNT_OPT_OUT"],
            },
          },
          orderBy: [
            { consentVersion: "desc" },
            { createdAt: "desc" },
          ],
          select: {
            reason: true,
            consentVersion: true,
          },
        })
      : null;

  if (
    shouldBlockNewsletterConfirmation({
      verifiedShopperCount: verifiedShoppers.length,
      shopperMarketingConsent:
        verifiedShopper?.marketingConsent ?? null,
      shopperConsentVersion:
        verifiedShopper?.marketingConsentVersion ?? null,
      latestAccountOperation:
        latestConsentOperation?.reason === "ACCOUNT_OPT_IN" ||
        latestConsentOperation?.reason === "ACCOUNT_OPT_OUT"
          ? latestConsentOperation.reason
          : null,
      latestAccountOperationVersion:
        latestConsentOperation?.consentVersion ?? null,
    })
  ) {
    return {
      status: "BLOCKED",
      reason: "ACCOUNT_MARKETING_CONSENT",
    };
  }

  return {
    status: "READY",
    eventId: event.id,
    subscriberId: subscriber.id,
    subscriptionGeneration: event.subscriptionGeneration,
    email,
    unsubscribeToken: subscriber.unsubscribeToken,
    eventKey: event.eventKey,
    claimToken,
  };
}