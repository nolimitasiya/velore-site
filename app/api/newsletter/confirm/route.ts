import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildSiteUrl } from "@/lib/config/siteUrl";

import { shouldBlockNewsletterConfirmation } from "@/lib/marketing/shouldBlockNewsletterConfirmation";
import { lockNewsletterEmail } from "@/lib/marketing/lockNewsletterEmail";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  let confirmPageUrl: string;

  try {
    confirmPageUrl = buildSiteUrl("/newsletter/confirm");
  } catch {
    console.error(
      "Newsletter confirmation URL configuration unavailable."
    );

    return new Response("Service temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (!token) {
    return NextResponse.redirect(
      `${confirmPageUrl}?status=missing`
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const candidate = await tx.newsletterSubscriber.findFirst({
          where: { confirmToken: token },
          select: { email: true },
        });

        if (!candidate) {
          return { status: "INVALID" as const };
        }

        await lockNewsletterEmail(tx, candidate.email);

        const subscribers = await tx.$queryRaw<
          Array<{
            id: string;
            email: string;
            status: string;
            subscriptionGeneration: number;
            unsubscribeToken: string | null;
          }>
        >`
          SELECT
            "id",
            "email",
            "status",
            "subscriptionGeneration",
            "unsubscribeToken"
          FROM "NewsletterSubscriber"
          WHERE "confirmToken" = ${token}
          FOR UPDATE
        `;

        const subscriber = subscribers[0];

        if (
          !subscriber ||
          subscriber.status !== "pending" ||
          subscriber.email.trim().toLowerCase() !==
            candidate.email.trim().toLowerCase()
        ) {
          return { status: "INVALID" as const };
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

        const latestConsentOperation =
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
          return { status: "BLOCKED" as const };
        }

        const unsubscribeToken =
          subscriber.unsubscribeToken ??
          globalThis.crypto.randomUUID();

        await tx.newsletterSubscriber.update({
          where: { id: subscriber.id },
          data: {
            status: "subscribed",
            confirmedAt: new Date(),
            confirmToken: null,
            unsubscribeToken,
          },
        });

        await tx.newsletterWelcomeEvent.create({
          data: {
            subscriberId: subscriber.id,
            subscriptionGeneration: subscriber.subscriptionGeneration,
            eventKey: `newsletter-welcome:${subscriber.id}:${subscriber.subscriptionGeneration}`,
            status: "PENDING",
            attemptCount: 0,
          },
        });

        return {
          status: "CONFIRMED" as const,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    if (result.status === "INVALID") {
      return NextResponse.redirect(
        `${confirmPageUrl}?status=invalid`
      );
    }

    if (result.status === "BLOCKED") {
      return NextResponse.redirect(
        `${confirmPageUrl}?status=marketing-preferences`
      );
    }


    return NextResponse.redirect(
      `${confirmPageUrl}?status=success`
    );
  } catch (error) {
    console.error(
      "[newsletter-confirm] Confirmation failed",
      error
    );

    return new Response(
      "Newsletter confirmation temporarily unavailable.",
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
