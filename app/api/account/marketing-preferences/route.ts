import { createShopperMarketingConsentSync } from "@/lib/marketing/createShopperMarketingConsentSync";
import { lockNewsletterEmail } from "@/lib/marketing/lockNewsletterEmail";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  requireAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

import {
  getShopperAge,
  isShopperMarketingEligible,
} from "@/lib/marketing/shopperMarketingEligibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthenticatedResponse() {
  return NextResponse.json(
    { error: "Authentication required." },
    { status: 401 }
  );
}

export async function GET(req: NextRequest) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(req);

    const shopper =
      await prisma.shopper.findUnique({
        where: {
          id: authenticatedShopper.id,
        },
        select: {
          marketingConsent: true,
          marketingConsentAt: true,
          dateOfBirth: true,
        },
      });

    if (!shopper) {
      return NextResponse.json(
        { error: "Shopper account not found." },
        { status: 404 }
      );
    }

    const age = shopper.dateOfBirth
      ? getShopperAge(shopper.dateOfBirth)
      : null;

    return NextResponse.json({
      marketingConsent: shopper.marketingConsent,
      eligibleToOptIn:
        age !== null && age >= 18,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHENTICATED_SHOPPER"
    ) {
      return unauthenticatedResponse();
    }

    console.error(
      "[shopper-marketing-preferences-get]",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(req);

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof (
        body as Record<string, unknown>
      ).marketingConsent !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "marketingConsent must be a boolean.",
        },
        { status: 400 }
      );
    }

    const requestedConsent = (
      body as {
        marketingConsent: boolean;
      }
    ).marketingConsent;

    const result = await prisma.$transaction(
      async (tx) => {
        const shopper =
          await tx.shopper.findUnique({
            where: {
              id: authenticatedShopper.id,
            },
            select: {
              id: true,
              dateOfBirth: true,
              email: true,
              emailVerifiedAt: true,
              marketingConsent: true,
              marketingConsentAt: true,
              marketingConsentVersion: true,
            },
          });

        if (!shopper) {
          return {
            status: "NOT_FOUND" as const,
          };
        }

        await lockNewsletterEmail(tx, shopper.email);

        const now = new Date();

        const age = shopper.dateOfBirth
          ? getShopperAge(
              shopper.dateOfBirth,
              now
            )
          : null;

        if (requestedConsent && !shopper.emailVerifiedAt) {
          return {
            status: "EMAIL_NOT_VERIFIED" as const,
          };
        }

        if (
          requestedConsent &&
          (age === null || age < 18)
        ) {
          return {
            status: "UNDERAGE" as const,
          };
        }

        if (
          requestedConsent &&
          shopper.marketingConsent
        ) {
          return {
            status: "UNCHANGED" as const,
            marketingConsent:
              shopper.marketingConsent,
          };
        }

        const consentChanged =
          shopper.marketingConsent !== requestedConsent;

        let recordExplicitWithdrawal = false;

        if (
          !requestedConsent &&
          !shopper.marketingConsent &&
          shopper.emailVerifiedAt
        ) {
          const latestAccountOperation =
            await tx.shopperMarketingConsentSync.findFirst({
              where: {
                shopperId: shopper.id,
                email: shopper.email.trim().toLowerCase(),
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
              },
            });

          recordExplicitWithdrawal =
            latestAccountOperation?.reason !== "ACCOUNT_OPT_OUT";
        }

        const recordConsentDecision =
          consentChanged || recordExplicitWithdrawal;

        if (recordConsentDecision) {
          await tx.shopper.update({
            where: {
              id: shopper.id,
            },
            data: {
              marketingConsent: requestedConsent,
              marketingConsentAt: requestedConsent
                ? now
                : null,
              marketingConsentSource: requestedConsent
                ? "ACCOUNT_PROFILE"
                : null,
              marketingConsentVersion: {
                increment: 1,
              },
            },
          });
        }

        if (!requestedConsent) {
          await tx.shopperMarketingEvent.updateMany({
            where: {
              shopperId: shopper.id,
              status: {
                in: ["PENDING", "FAILED"],
              },
            },
            data: {
              status: "CANCELLED",
              nextAttemptAt: null,
            },
          });
        }

        if (
          !requestedConsent &&
          shopper.emailVerifiedAt
        ) {
          await tx.newsletterSubscriber.updateMany({
            where: {
              email: shopper.email,
              status: {
                in: ["pending", "subscribed"],
              },
            },
            data: {
              status: "unsubscribed",
              unsubscribedAt: now,
              confirmToken: null,
            },
          });
        }

        if (recordConsentDecision) {
          await createShopperMarketingConsentSync({
            tx,
            shopperId: shopper.id,
            email: shopper.email,
            consentVersion:
              shopper.marketingConsentVersion + 1,
            desiredConsent: requestedConsent,
            reason: requestedConsent
              ? "ACCOUNT_OPT_IN"
              : "ACCOUNT_OPT_OUT",
          });
        }

        return {
          status: "UPDATED" as const,
          marketingConsent:
            requestedConsent,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    if (result.status === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Shopper account not found." },
        { status: 404 }
      );
    }

    if (result.status === "EMAIL_NOT_VERIFIED") {
      return NextResponse.json(
        {
          error:
            "Please verify your email address before opting into marketing updates.",
        },
        { status: 403 }
      );
    }

    if (result.status === "UNDERAGE") {
      return NextResponse.json(
        {
          error:
            "Marketing updates are available to shoppers aged 18 or over.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      marketingConsent:
        result.marketingConsent,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHENTICATED_SHOPPER"
    ) {
      return unauthenticatedResponse();
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "Your marketing preferences could not be saved. Please try again.",
        },
        { status: 409 }
      );
    }

    console.error(
      "[shopper-marketing-preferences-update]",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}