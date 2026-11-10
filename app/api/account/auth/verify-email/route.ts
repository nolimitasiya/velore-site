import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ShopperEmailVerificationStatus,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  requireAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

import {
  verifyShopperEmailVerificationCode,
  isShopperEmailVerificationExpired,
  SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS,
} from "@/lib/auth/shopperEmailVerificationCode";

import {
  processShopperWelcomeEmail,
} from "@/lib/email/processShopperWelcomeEmail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

    const code =
      body &&
      typeof body === "object" &&
      "code" in body &&
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error:
            "Enter the six-digit verification code.",
        },
        { status: 400 }
      );
    }

    const shopper =
      await prisma.shopper.findUnique({
        where: {
          id: authenticatedShopper.id,
        },
        select: {
          id: true,
          email: true,
          emailVerifiedAt: true,
        },
      });

    if (!shopper) {
      return NextResponse.json(
        { error: "Shopper account not found." },
        { status: 404 }
      );
    }

    if (shopper.emailVerifiedAt) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const challenge =
          await tx.shopperEmailVerification.findFirst({
            where: {
              shopperId: shopper.id,
              email: shopper.email,
              status:
                ShopperEmailVerificationStatus.PENDING,
            },
            orderBy: [
              { sentAt: "desc" },
              { createdAt: "desc" },
            ],
          });

        if (!challenge) {
          return {
            status: "NO_PENDING" as const,
          };
        }

        if (
          isShopperEmailVerificationExpired(
            challenge.expiresAt,
            now
          )
        ) {
          await tx.shopperEmailVerification.updateMany({
            where: {
              id: challenge.id,
              status:
                ShopperEmailVerificationStatus.PENDING,
            },
            data: {
              status:
                ShopperEmailVerificationStatus.EXPIRED,
            },
          });

          return {
            status: "EXPIRED" as const,
          };
        }

        if (
          challenge.attemptCount >=
          SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS
        ) {
          await tx.shopperEmailVerification.updateMany({
            where: {
              id: challenge.id,
              status:
                ShopperEmailVerificationStatus.PENDING,
            },
            data: {
              status:
                ShopperEmailVerificationStatus.LOCKED,
            },
          });

          return {
            status: "LOCKED" as const,
          };
        }

        const valid =
          verifyShopperEmailVerificationCode(
            code,
            challenge.codeHash,
            shopper.id,
            shopper.email
          );

        if (!valid) {
          const nextAttempts =
            challenge.attemptCount + 1;

          const updated =
            await tx.shopperEmailVerification.updateMany({
              where: {
                id: challenge.id,
                status:
                  ShopperEmailVerificationStatus.PENDING,
                attemptCount:
                  challenge.attemptCount,
              },
              data: {
                attemptCount: nextAttempts,
                ...(nextAttempts >=
                SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS
                  ? {
                      status:
                        ShopperEmailVerificationStatus.LOCKED,
                    }
                  : {}),
              },
            });

          if (updated.count !== 1) {
            return {
              status: "RETRY" as const,
            };
          }

          return {
            status:
              nextAttempts >=
              SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS
                ? ("LOCKED" as const)
                : ("INVALID" as const),
            remainingAttempts: Math.max(
              0,
              SHOPPER_EMAIL_VERIFICATION_MAX_ATTEMPTS -
                nextAttempts
            ),
          };
        }

        const consumed =
          await tx.shopperEmailVerification.updateMany({
            where: {
              id: challenge.id,
              status:
                ShopperEmailVerificationStatus.PENDING,
              attemptCount:
                challenge.attemptCount,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              status:
                ShopperEmailVerificationStatus.VERIFIED,
              usedAt: now,
            },
          });

        if (consumed.count !== 1) {
          return {
            status: "RETRY" as const,
          };
        }

        const verifiedShopper =
          await tx.shopper.updateMany({
            where: {
              id: shopper.id,
              email: shopper.email,
              emailVerifiedAt: null,
            },
            data: {
              emailVerifiedAt: now,
            },
          });

        if (verifiedShopper.count !== 1) {
          throw new Error(
            "SHOPPER_VERIFICATION_STATE_CHANGED"
          );
        }

        await tx.shopperEmailVerification.updateMany({
          where: {
            shopperId: shopper.id,
            status:
              ShopperEmailVerificationStatus.PENDING,
            id: {
              not: challenge.id,
            },
          },
          data: {
            status:
              ShopperEmailVerificationStatus.SUPERSEDED,
          },
        });

        return {
          status: "VERIFIED" as const,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    switch (result.status) {
      case "VERIFIED":
        try {
          await processShopperWelcomeEmail(shopper.id);
        } catch (welcomeError) {
          console.error(
            "[shopper-welcome-email] Processing failed after verification",
            welcomeError
          );
        }

        return NextResponse.json({
          ok: true,
          verified: true,
        });

      case "INVALID":
        return NextResponse.json(
          {
            error: "Incorrect verification code.",
            remainingAttempts:
              result.remainingAttempts,
          },
          { status: 400 }
        );

      case "EXPIRED":
        return NextResponse.json(
          {
            error:
              "This code has expired. Request a new code.",
          },
          { status: 400 }
        );

      case "LOCKED":
        return NextResponse.json(
          {
            error:
              "Too many incorrect attempts. Request a new code.",
          },
          { status: 429 }
        );

      case "RETRY":
        return NextResponse.json(
          {
            error:
              "Please try again.",
          },
          { status: 409 }
        );

      default:
        return NextResponse.json(
          {
            error:
              "No active verification code. Request a new code.",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHENTICATED_SHOPPER"
    ) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "Your verification request could not be completed. Please try again.",
        },
        { status: 409 }
      );
    }

    console.error(
      "[shopper-email-verification]",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}