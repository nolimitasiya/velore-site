import "server-only";

import type { PrismaClient } from "@prisma/client";

import { lockNewsletterEmail } from "./lockNewsletterEmail";
import { shouldBlockNewsletterConfirmation } from "./shouldBlockNewsletterConfirmation";

type TransitionDatabase = Pick<PrismaClient, "$transaction">;

export type NewsletterWelcomeTransitionResult =
  | { status: "READY"; eventKey: string; email: string; unsubscribeToken: string }
  | { status: "CANCELLED" }
  | { status: "CONFLICT" };

export async function prepareNewsletterWelcomeSubmission(
  db: TransitionDatabase,
  eventId: string,
  claimToken: string
): Promise<NewsletterWelcomeTransitionResult> {
  return db.$transaction(async (tx) => {
    const candidate = await tx.newsletterWelcomeEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        subscriberId: true,
        subscriptionGeneration: true,
        eventKey: true,
        status: true,
        claimToken: true,
        subscriber: {
          select: { email: true },
        },
      },
    });

    if (
      !candidate ||
      candidate.status !== "PROCESSING" ||
      candidate.claimToken !== claimToken
    ) {
      return { status: "CONFLICT" } as const;
    }

    await lockNewsletterEmail(tx, candidate.subscriber.email);

    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "NewsletterWelcomeEvent"
      WHERE "id" = ${eventId}
      FOR UPDATE
    `;

    if (locked.length !== 1) {
      return { status: "CONFLICT" } as const;
    }

    const event = await tx.newsletterWelcomeEvent.findUnique({
      where: { id: eventId },
      select: {
        subscriberId: true,
        subscriptionGeneration: true,
        eventKey: true,
        status: true,
        claimToken: true,
      },
    });

    if (
      !event ||
      event.status !== "PROCESSING" ||
      event.claimToken !== claimToken
    ) {
      return { status: "CONFLICT" } as const;
    }

    const subscriber = await tx.newsletterSubscriber.findUnique({
      where: { id: event.subscriberId },
      select: {
        id: true,
        email: true,
        status: true,
        subscriptionGeneration: true,
        unsubscribeToken: true,
        unsubscribedAt: true,
      },
    });

    if (!subscriber) {
      return { status: "CONFLICT" } as const;
    }

    const verifiedShoppers = await tx.shopper.findMany({
      where: {
        email: subscriber.email,
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
        ? await tx.shopperMarketingConsentSync.findFirst({
            where: {
              shopperId: verifiedShopper.id,
              email: subscriber.email,
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

    const blocked =
      subscriber.status !== "subscribed" ||
      subscriber.unsubscribedAt !== null ||
      subscriber.subscriptionGeneration !== event.subscriptionGeneration ||
      !subscriber.unsubscribeToken ||
      shouldBlockNewsletterConfirmation({
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

    if (blocked) {
      await tx.newsletterWelcomeEvent.update({
        where: { id: eventId },
        data: {
          status: "CANCELLED",
          claimToken: null,
          claimedAt: null,
          nextAttemptAt: null,
        },
      });

      return { status: "CANCELLED" } as const;
    }

    const updated = await tx.newsletterWelcomeEvent.updateMany({
      where: {
        id: eventId,
        status: "PROCESSING",
        claimToken,
      },
      data: {
        status: "SUBMITTING",
      },
    });

    if (updated.count !== 1) {
      return { status: "CONFLICT" } as const;
    }

    return {
      status: "READY",
      eventKey: event.eventKey,
      email: subscriber.email,
      unsubscribeToken: subscriber.unsubscribeToken!,
    } as const;
  });
}