import "server-only";

import type { PrismaClient } from "@prisma/client";

import { shouldBlockNewsletterConfirmation } from "./shouldBlockNewsletterConfirmation";

type ConsentCheckResult =
  | { status: "READY" }
  | { status: "BLOCKED" }
  | { status: "CONFLICT" };

type ConsentDatabase = Pick<
  PrismaClient,
  | "newsletterWelcomeEvent"
  | "newsletterSubscriber"
  | "shopper"
  | "shopperMarketingConsentSync"
>;

export async function checkNewsletterWelcomeConsentBeforeSend(
  db: ConsentDatabase,
  eventId: string,
  claimToken: string,
  expectedEmail: string,
  expectedUnsubscribeToken: string
): Promise<ConsentCheckResult> {
  const event = await db.newsletterWelcomeEvent.findUnique({
    where: { id: eventId },
    select: {
      subscriberId: true,
      subscriptionGeneration: true,
      status: true,
      claimToken: true,
    },
  });

  if (
    !event ||
    event.status !== "SUBMITTING" ||
    event.claimToken !== claimToken
  ) {
    return { status: "CONFLICT" };
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id: event.subscriberId },
    select: {
      email: true,
      status: true,
      subscriptionGeneration: true,
      unsubscribeToken: true,
      unsubscribedAt: true,
    },
  });

  if (!subscriber) {
    return { status: "BLOCKED" };
  }

  const email = subscriber.email.trim().toLowerCase();

  if (
    subscriber.status !== "subscribed" ||
    subscriber.unsubscribedAt !== null ||
    subscriber.subscriptionGeneration !== event.subscriptionGeneration ||
    !subscriber.unsubscribeToken ||
    email !== expectedEmail.trim().toLowerCase() ||
    subscriber.unsubscribeToken !== expectedUnsubscribeToken
  ) {
    return { status: "BLOCKED" };
  }

  const verifiedShoppers = await db.shopper.findMany({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
      emailVerifiedAt: { not: null },
    },
    select: {
      id: true,
      marketingConsent: true,
      marketingConsentVersion: true,
    },
    take: 2,
  });

  const verifiedShopper = verifiedShoppers[0];

  const latestOperation =
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

  const blocked = shouldBlockNewsletterConfirmation({
    verifiedShopperCount: verifiedShoppers.length,
    shopperMarketingConsent:
      verifiedShopper?.marketingConsent ?? null,
    shopperConsentVersion:
      verifiedShopper?.marketingConsentVersion ?? null,
    latestAccountOperation:
      latestOperation?.reason === "ACCOUNT_OPT_IN" ||
      latestOperation?.reason === "ACCOUNT_OPT_OUT"
        ? latestOperation.reason
        : null,
    latestAccountOperationVersion:
      latestOperation?.consentVersion ?? null,
  });

  return blocked ? { status: "BLOCKED" } : { status: "READY" };
}