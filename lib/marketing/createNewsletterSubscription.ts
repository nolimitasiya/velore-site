import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { decideNewsletterSubscriptionGeneration } from "./newsletterSubscriptionGeneration";
import { shouldBlockNewsletterConfirmation } from "./shouldBlockNewsletterConfirmation";
import { lockNewsletterEmail } from "./lockNewsletterEmail";

type SubscriptionInput = {
  email: string;
  source?: string;
  tags?: string[];
};

type SubscriptionResult =
  | {
      status: "subscribed";
      sendConfirmation: false;
    }
  | {
      status: "pending";
      sendConfirmation: true;
      email: string;
      confirmToken: string;
      unsubscribeToken: string;
      subscriptionGeneration: number;
    };

const makeToken = () => randomBytes(24).toString("hex");

export async function createNewsletterSubscription({
  email,
  source,
  tags,
}: SubscriptionInput): Promise<SubscriptionResult> {
  const normalisedEmail = email.trim().toLowerCase();

  if (
    !normalisedEmail ||
    normalisedEmail.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)
  ) {
    throw new Error("Invalid newsletter email.");
  }

  return prisma.$transaction(
    async (tx) => {
      await lockNewsletterEmail(tx, normalisedEmail);

      const verifiedShoppers = await tx.shopper.findMany({
        where: {
          email: normalisedEmail,
          emailVerifiedAt: { not: null },
        },
        select: {
          id: true,
          marketingConsent: true,
          marketingConsentVersion: true,
        },
        take: 2,
      });

      let latestAccountOperation:
        | "ACCOUNT_OPT_IN"
        | "ACCOUNT_OPT_OUT"
        | null = null;

      let latestAccountOperationVersion: number | null = null;

      if (verifiedShoppers.length === 1) {
        const latestOperation =
          await tx.shopperMarketingConsentSync.findFirst({
            where: {
              shopperId: verifiedShoppers[0].id,
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
          });

        if (
          latestOperation?.reason === "ACCOUNT_OPT_IN" ||
          latestOperation?.reason === "ACCOUNT_OPT_OUT"
        ) {
          latestAccountOperation = latestOperation.reason;
          latestAccountOperationVersion =
            latestOperation.consentVersion;
        }
      }

      if (
        shouldBlockNewsletterConfirmation({
          verifiedShopperCount: verifiedShoppers.length,
          shopperMarketingConsent:
            verifiedShoppers.length === 1
              ? verifiedShoppers[0].marketingConsent
              : null,
          shopperConsentVersion:
            verifiedShoppers.length === 1
              ? verifiedShoppers[0].marketingConsentVersion
              : null,
          latestAccountOperation,
          latestAccountOperationVersion,
        })
      ) {
        throw new Error(
          "Newsletter subscription blocked by account marketing consent."
        );
      }
      const existing = await tx.newsletterSubscriber.findUnique({
        where: { email: normalisedEmail },
        select: {
          id: true,
          status: true,
          confirmToken: true,
          unsubscribeToken: true,
          subscriptionGeneration: true,
        },
      });

      const existingStatus = existing?.status ?? null;

      if (
        existingStatus !== null &&
        existingStatus !== "pending" &&
        existingStatus !== "subscribed" &&
        existingStatus !== "unsubscribed"
      ) {
        throw new Error("Unexpected newsletter subscription status.");
      }

      const decision = decideNewsletterSubscriptionGeneration(
        existingStatus
      );

      if (!decision.sendConfirmation) {
        return {
          status: "subscribed" as const,
          sendConfirmation: false as const,
        };
      }

      const confirmToken =
        existingStatus === "pending" &&
        existing?.confirmToken
          ? existing.confirmToken
          : makeToken();

      const unsubscribeToken =
        existing?.unsubscribeToken ?? makeToken();

      if (!existing) {
        const subscriber = await tx.newsletterSubscriber.create({
          data: {
            email: normalisedEmail,
            source: source ?? "unknown",
            tags: tags ?? [],
            status: "pending",
            confirmToken,
            unsubscribeToken,
            subscriptionGeneration: 0,
          },
        });

        return {
          status: "pending" as const,
          sendConfirmation: true as const,
          email: subscriber.email,
          confirmToken,
          unsubscribeToken,
          subscriptionGeneration: subscriber.subscriptionGeneration,
        };
      }

      const subscriber = await tx.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: "pending",
          confirmToken,
          unsubscribeToken,
          source: source ?? undefined,
          tags: tags ?? undefined,
          ...(decision.incrementGeneration
            ? {
                subscriptionGeneration: {
                  increment: 1,
                },
              }
            : {}),
        },
      });

      return {
        status: "pending" as const,
        sendConfirmation: true as const,
        email: subscriber.email,
        confirmToken,
        unsubscribeToken,
        subscriptionGeneration: subscriber.subscriptionGeneration,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 10000,
    }
  );
}